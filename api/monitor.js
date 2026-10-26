// Monitor de contratos do governo (PNCP — Portal Nacional de Contratações Públicas, API pública sem chave)
// Lê os contratos publicados numa janela de dias, separa a esfera federal e aplica regras simples de anomalia.
// Regras (sinais para conferir, não acusações): aditivo acima de 25% do valor inicial; fornecedor concentrando
// vários contratos na janela; contrato de alto valor; fornecedor com CNPJ aberto há menos de 12 meses (minhareceita.org).
const PNCP = 'https://pncp.gov.br/api/consulta/v1/';
const UA = { headers: { 'User-Agent': 'acontabrasil.com.br (monitor publico)', 'Accept': 'application/json' } };
const C = global.__acbMon || (global.__acbMon = { cache: new Map(), cnpj: new Map() });
const ymd = d => new Date(d.getTime() - 3 * 3600e3).toISOString().slice(0, 10).replace(/-/g, ''); // data de Brasília
async function pagina(path, params, pg, tam) {
  const u = new URL(PNCP + path); for (const k in params) u.searchParams.set(k, params[k]); u.searchParams.set('pagina', pg); u.searchParams.set('tamanhoPagina', tam);
  const r = await fetch(u, UA); if (r.status === 204) return { data: [], totalRegistros: 0, totalPaginas: 0 }; if (!r.ok) throw new Error('PNCP ' + r.status + ' ' + path); return r.json();
}
async function todas(path, params, tam, maxPag, conc) {
  const p1 = await pagina(path, params, 1, tam); const tot = p1.totalPaginas || 0; const out = [...(p1.data || [])];
  const pgs = []; for (let p = 2; p <= Math.min(tot, maxPag); p++) pgs.push(p);
  let i = 0; await Promise.all(Array.from({ length: conc }, async () => { while (i < pgs.length) { const p = pgs[i++]; try { const r = await pagina(path, params, p, tam); out.push(...(r.data || [])); } catch (e) {} } }));
  return { itens: out, totalRegistros: p1.totalRegistros || 0, totalPaginas: tot, lidas: Math.min(tot, maxPag) };
}
async function cnpjInfo(ni) {
  if (!/^\d{14}$/.test(ni)) return null; if (C.cnpj.has(ni)) return C.cnpj.get(ni);
  try { const r = await fetch('https://minhareceita.org/' + ni, UA); if (!r.ok) { C.cnpj.set(ni, null); return null; } const j = await r.json(); const v = { abertura: j.data_inicio_atividade, porte: j.porte, capital: j.capital_social, cnae: j.cnae_fiscal_descricao, situacao: j.descricao_situacao_cadastral, uf: j.uf, municipio: j.municipio }; C.cnpj.set(ni, v); return v; } catch (e) { return null; }
}
const meses = (a, b) => (new Date(b) - new Date(a)) / (30.44 * 864e5);
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const dias = Math.max(1, Math.min(7, +(req.query.dias || 3)));
    const fim = new Date(); const ini = new Date(fim - (dias - 1) * 864e5);
    const key = ymd(ini) + '-' + ymd(fim); const cached = C.cache.get(key);
    if (cached && Date.now() - cached.t < 10 * 60e3) { res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900'); return res.end(cached.body); }
    const t0 = Date.now();
    const [ct, d8, d9] = await Promise.all([
      todas('contratos', { dataInicial: ymd(ini), dataFinal: ymd(fim) }, 500, 30, 5),
      todas('contratacoes/publicacao', { dataInicial: ymd(ini), dataFinal: ymd(fim), codigoModalidadeContratacao: 8 }, 50, 6, 3),
      todas('contratacoes/publicacao', { dataInicial: ymd(ini), dataFinal: ymd(fim), codigoModalidadeContratacao: 9 }, 50, 6, 3),
    ]);
    const todos = ct.itens; const fed = todos.filter(c => c.orgaoEntidade && c.orgaoEntidade.esferaId === 'F');
    const val = c => +(c.valorGlobal || c.valorInicial || 0);
    const soma = arr => arr.reduce((s, c) => s + val(c), 0);
    const link = c => c.numeroControlePNCP ? `https://pncp.gov.br/app/contratos/${c.orgaoEntidade.cnpj}/${c.anoContrato}/${c.sequencialContrato}` : null;
    const lite = c => ({ id: c.numeroControlePNCP, orgao: c.orgaoEntidade.razaoSocial, cnpjOrgao: c.orgaoEntidade.cnpj, poder: c.orgaoEntidade.poderId, esfera: c.orgaoEntidade.esferaId, uf: c.unidadeOrgao && c.unidadeOrgao.ufSigla, fornecedor: c.nomeRazaoSocialFornecedor, ni: c.niFornecedor, tipoPessoa: c.tipoPessoa, objeto: (c.objetoContrato || '').slice(0, 220), tipo: c.tipoContrato && c.tipoContrato.nome, categoria: c.categoriaProcesso && c.categoriaProcesso.nome, valorInicial: +(c.valorInicial || 0), valorGlobal: +(c.valorGlobal || 0), valorAcumulado: c.valorAcumulado == null ? null : +c.valorAcumulado, assinatura: c.dataAssinatura, vigFim: c.dataVigenciaFim, publicado: c.dataPublicacaoPncp, emenda: c.emendaParlamentar, adesao: c.frutoAdesao, link: link(c) });
    // regras
    const aditivos = fed.filter(c => c.valorAcumulado != null && c.valorInicial > 0 && c.valorAcumulado / c.valorInicial > 1.25).map(c => ({ ...lite(c), regra: 'aditivo', pct: Math.round((c.valorAcumulado / c.valorInicial - 1) * 100) })).sort((a, b) => b.pct - a.pct).slice(0, 40);
    const topValor = fed.slice().sort((a, b) => val(b) - val(a)).slice(0, 40).map(c => ({ ...lite(c), regra: 'alto valor' }));
    const porForn = {}; for (const c of fed) { const k = c.niFornecedor || c.nomeRazaoSocialFornecedor; if (!k) continue; const o = porForn[k] || (porForn[k] = { ni: c.niFornecedor, nome: c.nomeRazaoSocialFornecedor, n: 0, valor: 0, orgaos: new Set() }); o.n++; o.valor += val(c); o.orgaos.add(c.orgaoEntidade.razaoSocial); }
    const concentracao = Object.values(porForn).map(o => ({ ...o, orgaos: [...o.orgaos].slice(0, 5), nOrgaos: o.orgaos.size })).filter(o => o.n >= 3 || o.valor >= 50e6).sort((a, b) => b.valor - a.valor).slice(0, 40);
    // CNPJ novo: checa os 25 maiores fornecedores PJ da janela
    const cand = [...new Map(fed.filter(c => c.tipoPessoa === 'PJ' && /^\d{14}$/.test(c.niFornecedor || '')).sort((a, b) => val(b) - val(a)).map(c => [c.niFornecedor, c])).values()].slice(0, 25);
    const novos = []; let i = 0; await Promise.all(Array.from({ length: 5 }, async () => { while (i < cand.length) { const c = cand[i++]; const inf = await cnpjInfo(c.niFornecedor); if (inf && inf.abertura && c.dataAssinatura && meses(inf.abertura, c.dataAssinatura) < 12) novos.push({ ...lite(c), regra: 'cnpj novo', abertura: inf.abertura, mesesAntes: +meses(inf.abertura, c.dataAssinatura).toFixed(1), porte: inf.porte, capital: inf.capital, cnae: inf.cnae }); } }));
    const emendas = fed.filter(c => c.emendaParlamentar).length;
    const disp = { total: d8.totalRegistros, lidos: d8.itens.length, federais: d8.itens.filter(x => x.orgaoEntidade && x.orgaoEntidade.esferaId === 'F').sort((a, b) => (b.valorTotalEstimado || 0) - (a.valorTotalEstimado || 0)).slice(0, 25).map(x => ({ id: x.numeroControlePNCP, orgao: x.orgaoEntidade.razaoSocial, objeto: (x.objetoCompra || '').slice(0, 220), valor: +(x.valorTotalEstimado || 0), amparo: x.amparoLegal && x.amparoLegal.nome, publicado: x.dataPublicacaoPncp, link: `https://pncp.gov.br/app/editais/${x.orgaoEntidade.cnpj}/${x.anoCompra}/${x.sequencialCompra}` })) };
    const inex = { total: d9.totalRegistros, lidos: d9.itens.length, federais: d9.itens.filter(x => x.orgaoEntidade && x.orgaoEntidade.esferaId === 'F').sort((a, b) => (b.valorTotalEstimado || 0) - (a.valorTotalEstimado || 0)).slice(0, 25).map(x => ({ id: x.numeroControlePNCP, orgao: x.orgaoEntidade.razaoSocial, objeto: (x.objetoCompra || '').slice(0, 220), valor: +(x.valorTotalEstimado || 0), amparo: x.amparoLegal && x.amparoLegal.nome, publicado: x.dataPublicacaoPncp, link: `https://pncp.gov.br/app/editais/${x.orgaoEntidade.cnpj}/${x.anoCompra}/${x.sequencialCompra}` })) };
    const body = JSON.stringify({ gerado: new Date().toISOString(), janela: { de: ymd(ini), ate: ymd(fim), dias }, fonte: 'PNCP API pública v1 (/contratos, /contratacoes/publicacao modalidades 8 e 9); CNPJ via minhareceita.org', cobertura: { contratos_total: ct.totalRegistros, contratos_lidos: todos.length, paginas: ct.totalPaginas, paginas_lidas: ct.lidas },
      resumo: { todos: { n: todos.length, valor: soma(todos) }, federal: { n: fed.length, valor: soma(fed), emendas, porPoder: fed.reduce((o, c) => { const k = c.orgaoEntidade.poderId || '?'; o[k] = (o[k] || 0) + 1; return o; }, {}) }, dispensas: disp.total, inexigibilidades: inex.total },
      anomalias: { aditivos, cnpj_novo: novos, concentracao, alto_valor: topValor }, dispensas: disp, inexigibilidades: inex, ms: Date.now() - t0 });
    C.cache.set(key, { t: Date.now(), body });
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900'); res.end(body);
  } catch (e) { res.statusCode = 502; res.end(JSON.stringify({ erro: String(e) })); }
};

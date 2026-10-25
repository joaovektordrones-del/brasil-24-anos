// Exterior ao vivo: soma os Boletins de Urna (BU) das seções do exterior já recebidas pelo TSE,
// antes da totalização oficial (que só começa às 17h de Brasília).
// Fonte: resultados.tse.jus.br/oficial/ele2026/arquivo-urna/3221/... (pleito 3221 = 25/10/2026)
// Cada chamada avança um lote de seções ainda não lidas e devolve o agregado acumulado em memória.
const { decodeBU } = require('../lib/bu.js');
const ORIGEM = 'https://resultados.tse.jus.br/oficial/ele2026/';
const PLEITO = '3221', ELE = 6258, ELE1 = '6257';
const UA = { headers: { 'User-Agent': 'acontabrasil.com.br (leitura publica TSE)' } };

// cache de processo (persiste enquanto a instância viver)
const C = global.__acbExt || (global.__acbExt = { cfg: null, cfgAt: 0, secoes: [], feitas: new Map(), pendentes: new Set(), r1: new Map(), cursor: 0, ultimaVarredura: 0 });

async function carregarConfig() {
  if (C.cfg && Date.now() - C.cfgAt < 30 * 60e3) return;
  const r = await fetch(`${ORIGEM}arquivo-urna/${PLEITO}/config/zz/zz-p00${PLEITO}-cs.json`, UA);
  if (!r.ok) throw new Error('config ' + r.status);
  const j = await r.json();
  const zz = j.abr.find(a => a.cd === 'zz');
  const secoes = [];
  for (const m of zz.mu) for (const z of m.zon) for (const s of z.sec) if (!s.nsp) secoes.push({ mu: m.cd, nm: m.nm, z: z.cd, s: s.ns });
  C.cfg = { dg: j.dg, hg: j.hg }; C.cfgAt = Date.now(); C.secoes = secoes;
  for (const s of secoes) { const k = s.mu + s.z + s.s; if (!C.feitas.has(k)) C.pendentes.add(k); }
}
async function lerSecao(x) {
  const base = `${ORIGEM}arquivo-urna/${PLEITO}/dados/zz/${x.mu}/${x.z}/${x.s}/`;
  const r = await fetch(base + `p00${PLEITO}-zz-m${x.mu}-z${x.z}-s${x.s}-aux.json`, UA);
  if (r.status !== 200) return null;
  const j = await r.json();
  const h = (j.hashes || []).find(h => h.st === 'Recebido') || (j.hashes || [])[0];
  if (!h) return null;
  const bu = (h.arq || []).find(a => a.tp === 'bu');
  if (!bu) return null;
  const rb = await fetch(base + h.hash + '/' + bu.nm, UA);
  if (rb.status !== 200) return null;
  const d = decodeBU(new Uint8Array(await rb.arrayBuffer()), ELE);
  if (!d) return null;
  return { L: d.nominal[13] || 0, F: d.nominal[22] || 0, b: d.branco, n: d.nulo, c: d.comp || 0, a: d.aptos || 0, hr: h.hr || j.hg };
}
async function r1Cidade(mu) {
  if (C.r1.has(mu)) return C.r1.get(mu);
  try {
    const r = await fetch(`${ORIGEM}${ELE1}/dados/zz/zz${mu}-c0001-e00${ELE1}-u.json`, UA);
    if (!r.ok) { C.r1.set(mu, null); return null; }
    const j = await r.json();
    const cand = j.carg[0].agr.flatMap(a => a.par.flatMap(p => p.cand));
    const f = cand.find(c => c.n === '22'), l = cand.find(c => c.n === '13');
    const v = { L: +l.vap, F: +f.vap, vv: +j.v.vv, c: +j.e.c, a: +j.e.te };
    C.r1.set(mu, v); return v;
  } catch (e) { return null; }
}
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    await carregarConfig();
    // lote: até 120 seções pendentes por chamada, concorrência 24
    const lote = [...C.pendentes].slice(C.cursor, C.cursor + 120);
    C.cursor = (C.cursor + 120 >= C.pendentes.size) ? 0 : C.cursor + 120;
    const idx = new Map(C.secoes.map(s => [s.mu + s.z + s.s, s]));
    for (let i = 0; i < lote.length; i += 24) {
      await Promise.all(lote.slice(i, i + 24).map(async k => {
        const x = idx.get(k); if (!x) return;
        try { const d = await lerSecao(x); if (d) { C.feitas.set(k, d); C.pendentes.delete(k); } } catch (e) {}
      }));
    }
    // agregado por cidade
    const cidades = new Map();
    for (const s of C.secoes) {
      const k = s.mu + s.z + s.s;
      if (!cidades.has(s.mu)) cidades.set(s.mu, { cd: s.mu, nm: s.nm, secoes: 0, recebidas: 0, L: 0, F: 0, b: 0, n: 0, c: 0, a: 0, ult: '' });
      const c = cidades.get(s.mu); c.secoes++;
      const d = C.feitas.get(k);
      if (d) { c.recebidas++; c.L += d.L; c.F += d.F; c.b += d.b; c.n += d.n; c.c += d.c; c.a += d.a; if (d.hr > c.ult) c.ult = d.hr; }
    }
    const lista = [...cidades.values()].filter(c => c.recebidas > 0);
    await Promise.all(lista.map(async c => { c.r1 = await r1Cidade(c.cd); }));
    const tot = { L: 0, F: 0, b: 0, n: 0, c: 0, a: 0, secoes: C.secoes.length, recebidas: C.feitas.size, cidades: lista.length, cidades_total: cidades.size, r1: { L: 0, F: 0 } };
    for (const c of lista) { tot.L += c.L; tot.F += c.F; tot.b += c.b; tot.n += c.n; tot.c += c.c; tot.a += c.a; if (c.r1) { tot.r1.L += c.r1.L; tot.r1.F += c.r1.F; } }
    lista.sort((x, y) => (y.L + y.F) - (x.L + x.F));
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=60');
    res.end(JSON.stringify({ gerado: new Date().toISOString(), cfg: C.cfg, pendentes: C.pendentes.size, lote: lote.length, totais: tot, cidades: lista }));
  } catch (e) {
    res.statusCode = 502;
    res.end(JSON.stringify({ erro: String(e) }));
  }
};

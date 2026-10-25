// Projeção do resultado final corrigida por composição (município a município).
// Ideia: o viés da apuração parcial vem de QUAIS lugares já apuraram. Para cada município,
// sabemos (a) a fração de seções apuradas agora (arquivo -ab.json do TSE) e (b) como ele votou
// no 1º turno. O "esperado parcial" é o resultado que a apuração teria se cada município
// repetisse o 1º turno; a diferença entre o observado e esse esperado é a virada real.
const ORIGEM = 'https://resultados.tse.jus.br/oficial/ele2026/';
const ELE = '6258', ELE1 = '6257';
const UA = { headers: { 'User-Agent': 'acontabrasil.com.br (leitura publica TSE)' } };
const UFS = 'ac al am ap ba ce df es go ma mg ms mt pa pb pe pi pr rj rn ro rr rs sc se sp to zz'.split(' ');
const C = global.__acbProj || (global.__acbProj = { cfg: null, r1: {}, carregando: null, erro: {} });

const dorme = ms => new Promise(r => setTimeout(r, ms));
async function j(p, tent = 0) { const r = await fetch(ORIGEM + p, UA); if (r.status === 429 && tent < 3) { await dorme(800 * (tent + 1)); return j(p, tent + 1); } if (!r.ok) throw new Error(r.status + ' ' + p); return r.json(); }
function cand(x) { const c = x.carg[0].agr.flatMap(a => a.par.flatMap(p => p.cand)); const f = c.find(z => z.n === '22'), l = c.find(z => z.n === '13'); return { F: +(f && f.vap) || 0, L: +(l && l.vap) || 0 }; }
async function pool(items, n, fn) { let i = 0; const out = []; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; try { out[k] = await fn(items[k]); } catch (e) { out[k] = null; } } })); return out; }

async function carregarR1(limiteMs) {
  const t0 = Date.now();
  if (!C.cfg) { const cfg = await j(`${ELE1}/config/mun-e00${ELE1}-cm.json`); C.cfg = {}; for (const a of cfg.abr) C.cfg[a.cd] = a.mu.map(m => ({ cd: m.cd, nm: m.nm })); }
  for (const uf of UFS) {
    if (C.r1[uf]) continue;
    if (Date.now() - t0 > limiteMs) break;
    const mus = C.cfg[uf] || [];
    const res = await pool(mus, 8, async m => { const x = await j(`${ELE1}/dados/${uf}/${uf}${m.cd}-c0001-e00${ELE1}-u.json`); return [m.cd, cand(x)]; });
    const map = {}; let falhas = 0; for (const r of res) { if (r) map[r[0]] = r[1]; else falhas++; }
    if (falhas <= mus.length * 0.05) { C.r1[uf] = map; delete C.erro[uf]; } else C.erro[uf] = falhas;
  }
}
const Phi = x => { const t = 1 / (1 + 0.2316419 * Math.abs(x)); const d = 0.3989423 * Math.exp(-x * x / 2); let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; };

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    if (!C.carregando) C.carregando = carregarR1(9000).finally(() => { C.carregando = null; });
    await C.carregando;
    const poll = { f: +(req.query.poll || 51.5), sd: 2.2 }; // média calibrada das pesquisas (radar) e erro histórico
    // leituras atuais: BR, UFs (-u) e composição (-ab)
    const [br, ufsU, ufsAb] = await Promise.all([
      j(`${ELE}/dados/br/br-c0001-e00${ELE}-u.json`),
      pool(UFS, 6, uf => j(`${ELE}/dados/${uf}/${uf}-c0001-e00${ELE}-u.json`)),
      pool(UFS, 6, uf => j(`${ELE}/dados/${uf}/${uf}-e00${ELE}-ab.json`)),
    ]);
    const brC = cand(br); const O_nat = brC.F + brC.L ? brC.F / (brC.F + brC.L) * 100 : null;
    let num = 0, den = 0, Vtot = 0, Vcont = 0, swNum = 0, swDen = 0; const ufs = [];
    UFS.forEach((uf, i) => {
      const u = ufsU[i], ab = ufsAb[i], r1 = C.r1[uf];
      if (!u) return;
      const oc = cand(u); const O = oc.F + oc.L ? oc.F / (oc.F + oc.L) * 100 : null;
      let V = 0, Vc = 0, Ew = 0, P = 0, Pw = 0;
      if (r1) {
        const abm = {}; if (ab) for (const a of ab.abr) if (a.tpabr === 'mun') abm[a.cdabr] = a;
        for (const cd in r1) { const m = r1[cd]; const v = m.F + m.L; if (!v) continue; const p = m.F / v * 100; const a = abm[cd]; const f = a && +a.s.ts ? +a.s.st / +a.s.ts : 0; V += v; Pw += p * v; Vc += f * v; Ew += p * f * v; }
        P = Pw / V;
      }
      const prior = r1 ? P : null, E = Vc ? Ew / Vc : null, W = V ? Vc / V : 0;
      const swing = (O != null && E != null && W > 0.02) ? O - E : null;
      ufs.push({ uf, O, E, prior, W, swing, V, base: !!r1 });
      if (swing != null) { swNum += swing * Vc; swDen += Vc; }
      Vtot += V; Vcont += Vc;
    });
    const swing_nat = swDen ? swNum / swDen : 0;
    const Wn = Vtot ? Vcont / Vtot : 0;
    // estimativa só com dados: cada UF = base do 1º turno + virada própria (se já tem amostra) ou nacional
    for (const u of ufs) { if (u.prior == null) continue; const sw = (u.swing != null && u.W >= 0.25) ? u.swing : (u.swing != null ? (u.W / 0.25) * u.swing + (1 - u.W / 0.25) * swing_nat : swing_nat); u.est = Math.max(1, Math.min(99, u.prior + sw)); num += u.est * u.V; den += u.V; }
    const estDados = den ? num / den : null;
    const sdDados = 0.35 + 2.2 * Math.pow(1 - Wn, 1.5);
    let est = estDados, sd = sdDados;
    if (estDados != null) { const wd = 1 / (sdDados * sdDados), wp = 1 / (poll.sd * poll.sd); est = (estDados * wd + poll.f * wp) / (wd + wp); sd = Math.sqrt(1 / (wd + wp)); }
    const prF = est != null ? Phi((est - 50) / sd) : null;
    res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=60');
    res.end(JSON.stringify({ gerado: new Date().toISOString(), tse: { hg: br.hg, idg: br.idg, pst: br.s.pst }, base_ufs: Object.keys(C.r1).length, erros: C.erro, cobertura: Wn, observado: O_nat, swing_nat, estDados, sdDados, poll, est, sd, prF, ic90: est != null ? [est - 1.645 * sd, est + 1.645 * sd] : null, ufs }));
  } catch (e) {
    res.statusCode = 502; res.end(JSON.stringify({ erro: String(e) }));
  }
};

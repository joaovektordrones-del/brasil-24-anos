// Resultados por município (1º e 2º turno) para análise estatística — lê os arquivos -u.json do TSE em lotes.
// /api/munis?uf=ms&e=6258&from=0&n=250  → { uf, e, total, from, rows:[[cd, F, L, Caiado, vv, vb, vn, c, te, est, st, ts]] }
const ORIGEM = 'https://resultados.tse.jus.br/oficial/ele2026/';
const UA = { headers: { 'User-Agent': 'acontabrasil.com.br (leitura publica TSE)' } };
const C = global.__acbMunis || (global.__acbMunis = { cfg: null, cache: new Map() });
const dorme = ms => new Promise(r => setTimeout(r, ms));
async function j(p, t = 0) { const r = await fetch(ORIGEM + p, UA); if (r.status === 429 && t < 4) { await dorme(1200 * (t + 1)); return j(p, t + 1); } if (!r.ok) throw new Error(r.status); return r.json(); }
const P = x => { const c = x.carg[0].agr.flatMap(a => a.par.flatMap(p => p.cand)); const g = n => +((c.find(z => z.n === n) || {}).vap || 0); return [g('22'), g('13'), g('55'), +x.v.vv, +x.v.vb, +x.v.tvn, +x.e.c, +x.e.te, +x.e.est, +x.s.st, +x.s.ts]; };
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const uf = String(req.query.uf || '').toLowerCase(), e = String(req.query.e || '6258'), from = +(req.query.from || 0), n = Math.min(300, +(req.query.n || 250));
    if (!/^[a-z]{2}$/.test(uf) || !/^\d{4}$/.test(e)) { res.statusCode = 400; return res.end('{"erro":"parametros"}'); }
    if (!C.cfg) { const cfg = await j(`6257/config/mun-e006257-cm.json`); C.cfg = {}; for (const a of cfg.abr) C.cfg[a.cd] = a.mu.map(m => ({ cd: m.cd, nm: m.nm })); }
    const mus = (C.cfg[uf] || []).slice(from, from + n); const rows = [];
    let i = 0; await Promise.all(Array.from({ length: 6 }, async () => { while (i < mus.length) { const m = mus[i++]; const k = e + uf + m.cd; if (C.cache.has(k) && e === '6257') { rows.push(C.cache.get(k)); continue; } try { const r = [m.cd, m.nm, ...P(await j(`${e}/dados/${uf}/${uf}${m.cd}-c0001-e00${e}-u.json`))]; if (e === '6257') C.cache.set(k, r); rows.push(r); } catch (err) { rows.push([m.cd, m.nm, null]); } } }));
    res.setHeader('Cache-Control', e === '6257' ? 's-maxage=86400' : 's-maxage=120');
    res.end(JSON.stringify({ uf, e, total: (C.cfg[uf] || []).length, from, n: rows.length, rows }));
  } catch (err) { res.statusCode = 502; res.end(JSON.stringify({ erro: String(err) })); }
};

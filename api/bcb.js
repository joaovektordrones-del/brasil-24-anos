// Séries do Banco Central (SGS) para os contadores — API pública, sem chave.
const SERIES = { selic: 432, ipca_mes: 433, dbgg_pib: 13762, dlsp_pib: 4513, cambio: 1, reservas: 3546, ipca12: 13522, dbgg_rs: 13761 };
const C = global.__acbBcb || (global.__acbBcb = { t: 0, body: null });
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (C.body && Date.now() - C.t < 30 * 60e3) { res.setHeader('Cache-Control', 's-maxage=1800'); return res.end(C.body); }
  const out = {};
  await Promise.all(Object.entries(SERIES).map(async ([k, cod]) => {
    try { const r = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${cod}/dados/ultimos/13?formato=json`, { headers: { 'User-Agent': 'acontabrasil.com.br' } }); if (!r.ok) throw new Error(r.status); const j = await r.json(); out[k] = { codigo: cod, serie: j.map(x => ({ d: x.data, v: +String(x.valor).replace(',', '.') })) }; } catch (e) { out[k] = { codigo: cod, erro: String(e) }; }
  }));
  const body = JSON.stringify({ gerado: new Date().toISOString(), fonte: 'BCB SGS (api.bcb.gov.br)', series: out });
  C.t = Date.now(); C.body = body; res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600'); res.end(body);
};

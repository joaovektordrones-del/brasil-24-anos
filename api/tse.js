// Proxy de leitura dos arquivos públicos de resultado do TSE (resultados.tse.jus.br).
// O TSE não envia CORS; este endpoint repassa o JSON com cache curto na CDN da Vercel
// para que milhares de visitantes gerem poucas leituras na origem.
// Uso: /api/tse?p=6258/dados/br/br-c0001-e006258-u.json
const ORIGEM = 'https://resultados.tse.jus.br/oficial/ele2026/';
const PERMITIDO = /^\d{4}\/(dados\/[a-z]{2}\/[a-z]{2}\d{0,5}(-z\d{4})?-c\d{4}-e\d{6}-[ue]\.json|config\/mun-e\d{6}-cm\.json)$/;

module.exports = async (req, res) => {
  const p = String((req.query && req.query.p) || '');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!PERMITIDO.test(p)) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ erro: 'caminho não permitido' }));
  }
  try {
    const r = await fetch(ORIGEM + p, { headers: { 'User-Agent': 'acontabrasil.com.br (leitura publica TSE)' } });
    const corpo = await r.text();
    res.statusCode = r.status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    // CDN guarda 3 s; navegador não guarda. Config de municípios pode ficar mais.
    res.setHeader('Cache-Control', p.includes('/config/') ? 's-maxage=600, stale-while-revalidate=3600' : 's-maxage=3, stale-while-revalidate=10');
    res.setHeader('X-Origem', ORIGEM + p);
    res.end(corpo);
  } catch (e) {
    res.statusCode = 502;
    res.end(JSON.stringify({ erro: 'falha ao ler o TSE', detalhe: String(e) }));
  }
};

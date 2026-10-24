// Gera OG image + cards feed (1080x1350) + stories (1080x1920) com a identidade do site.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const F = '/tmp/claude-0/-home-claude/2d45da31-b5d9-572b-935d-dc3a6b1a6629/scratchpad/fonts';
const font = (p) => 'data:font/woff2;base64,' + fs.readFileSync(p).toString('base64');
const inter = (w) => font(`${F}/fontsource-inter-5.1.0/package/files/inter-latin-${w}-normal.woff2`);
const sg = (w) => font(`${F}/fontsource-space-grotesk-5.1.0/package/files/space-grotesk-latin-${w}-normal.woff2`);
const OUT = process.argv[2] || '/mnt/user-data/outputs/estudo_brasil/kit';
fs.mkdirSync(OUT, { recursive: true });
const SITE = 'acontabrasil.com.br';

const css = `
@font-face{font-family:Inter;font-weight:400;src:url(${inter(400)}) format('woff2')}
@font-face{font-family:Inter;font-weight:600;src:url(${inter(600)}) format('woff2')}
@font-face{font-family:Inter;font-weight:800;src:url(${inter(800)}) format('woff2')}
@font-face{font-family:SG;font-weight:700;src:url(${sg(700)}) format('woff2')}
@font-face{font-family:SG;font-weight:500;src:url(${sg(500)}) format('woff2')}
*{box-sizing:border-box;margin:0}
body{background:#0B1020;color:#EEF2FF;font-family:Inter,sans-serif;-webkit-font-smoothing:antialiased}
.c{position:relative;overflow:hidden;background:#0B1020 radial-gradient(70rem 36rem at 15% -10%,rgba(91,140,255,.28),transparent 60%),radial-gradient(50rem 26rem at 95% 15%,rgba(242,193,78,.2),transparent 60%);display:flex;flex-direction:column;justify-content:space-between}
.k{font-size:26px;letter-spacing:.22em;text-transform:uppercase;color:#F2C14E;font-weight:800}
h1{font-family:SG;font-weight:700;line-height:1.02;text-wrap:balance}
.big{font-family:SG;font-weight:700;line-height:.95;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.gold{color:#F2C14E}.red{color:#FF5C5C}.green{color:#3DDC84}.blue{color:#5B8CFF}.mut{color:#9AA6C8}
.src{font-size:24px;color:#6F7BA3;line-height:1.35}
.foot{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;border-top:1px solid #26304F;padding-top:28px}
.foot .site{font-family:SG;font-weight:700;font-size:40px;color:#F2C14E}
.foot .by{font-size:22px;color:#9AA6C8;text-align:right;line-height:1.35}
.bar{height:14px;border-radius:7px;background:#1E2A52;overflow:hidden;margin-top:14px}
.bar i{display:block;height:100%;border-radius:7px}
.row{display:flex;justify-content:space-between;align-items:baseline;font-size:30px;font-weight:600}
.row b{font-family:SG;font-size:44px}
p.lead{font-size:34px;line-height:1.35;color:#C9D2F0}
.pill{display:inline-block;font-size:26px;font-weight:800;padding:8px 20px;border-radius:999px;background:rgba(61,220,132,.16);color:#3DDC84}
`;

const foot = `<div class="foot"><div class="site">${SITE}</div><div class="by">Estudo com fonte oficial em cada número<br>Desenvolvido por João Marques · arquiteto de sistemas · (67) 99971-7070</div></div>`;

// Conteúdo dos cards (dados do site_data.json / fontes.md)
const cards = {
  '01_corrida': {
    k: 'Estudo · 2002 → 2026',
    body: `<h1 style="font-size:92px">Em 2002 o Brasil era mais rico que a China, a Índia e a Turquia.</h1>
    <p class="lead" style="margin-top:40px">Vinte e dois anos depois, três países que eram mais pobres passaram na frente e os outros correm o dobro.</p>
    <div style="margin-top:60px">
      <div class="row"><span>Brasil</span><b class="gold">+38%</b></div><div class="bar"><i style="width:33%;background:#F2C14E"></i></div>
      <div class="row" style="margin-top:30px"><span>Mediana de 19 países comparáveis</span><b class="green">+114%</b></div><div class="bar"><i style="width:100%;background:#3DDC84"></i></div>
    </div>
    <p class="src" style="margin-top:40px">Renda per capita por paridade de poder de compra, 2002–2024. Banco Mundial, NY.GDP.PCAP.PP.KD. China, Rep. Dominicana e Tailândia ultrapassaram o Brasil.</p>`
  },
  '02_esperado': {
    k: 'O Brasil esperado',
    body: `<h1 style="font-size:80px">Se o Brasil tivesse crescido como o país <span class="blue">do meio da tabela</span>:</h1>
    <div style="margin-top:70px;display:grid;gap:40px">
      <div><div class="k" style="color:#5B8CFF">Renda per capita esperada, 2024</div><div class="big blue" style="font-size:150px;margin-top:10px">US$ 30.558</div></div>
      <div><div class="k" style="color:#9AA6C8">Renda per capita real, 2024</div><div class="big gold" style="font-size:110px;margin-top:10px">US$ 19.652</div></div>
    </div>
    <p class="lead" style="margin-top:60px">São <b style="color:#EEF2FF">US$ 43.600 por ano a menos</b> para cada família de quatro pessoas. Não é o Chile nem a Coreia: é a mediana.</p>
    <p class="src" style="margin-top:36px">Cálculo: renda de 2002 × mediana do crescimento de 19 países (Banco Mundial, PPP, US$ constantes de 2021).</p>`
  },
  '03_vidas': {
    k: 'Vidas · 2002 → 2023',
    body: `<div class="big red" style="font-size:170px">1.154.327</div>
    <p class="lead" style="margin-top:16px">homicídios registrados no Brasil em 22 anos.</p>
    <div class="big red" style="font-size:120px;margin-top:60px">824.374</div>
    <p class="lead" style="margin-top:16px">mortes no trânsito no mesmo período.</p>
    <div class="big gold" style="font-size:120px;margin-top:60px">431.930</div>
    <p class="lead" style="margin-top:16px">mortes evitáveis por saúde efetiva em um único ano (2013): 73% das mortes entre 5 e 69 anos.</p>
    <p class="src" style="margin-top:50px">Ministério da Saúde (SIM), Atlas da Violência (Ipea/FBSP), Mapa da Violência, Malta et al. 2018. Soma simples das séries oficiais.</p>`
  },
  '04_custo': {
    k: 'Quanto escapa por ano',
    body: `<div class="big gold" style="font-size:150px">1,38% a 2,3%</div>
    <p class="lead" style="margin-top:16px">do PIB por ano é o custo médio da corrupção no Brasil (FIESP). A ONU, citada pelo TCU: R$ 200 bilhões por ano.</p>
    <div style="margin-top:70px;display:grid;grid-template-columns:1fr 1fr;gap:30px">
      <div><div class="big red" style="font-size:96px">2,2%</div><p class="mut" style="font-size:28px;margin-top:10px">do PIB investido em infraestrutura</p></div>
      <div><div class="big green" style="font-size:96px">4 a 4,5%</div><p class="mut" style="font-size:28px;margin-top:10px">do PIB que o país precisa investir</p></div>
    </div>
    <p class="lead" style="margin-top:60px">A diferença, cerca de 2% do PIB, é quase exatamente o custo da corrupção. E o piso da corrupção equivale a <b style="color:#EEF2FF">um terço do SUS, todo ano</b>.</p>
    <p class="src" style="margin-top:40px">FIESP/DECOMTEC 2010; TCU 2021; Inter.B/Frischtak 2024; IBGE Conta-Satélite de Saúde.</p>`
  },
  '05_maranhao': {
    k: 'Estado por estado · 24 anos',
    body: `<h1 style="font-size:84px">O mesmo país, <span class="gold">27 velocidades</span>.</h1>
    <div style="margin-top:60px;display:grid;gap:34px">
      <div class="row"><span>Maranhão · renda vs média do Brasil</span><b class="red">42%</b></div>
      <div class="row"><span>Maranhão · homicídios por 100 mil, 2004 → 2024</span><b class="red">11 → 30</b></div>
      <div class="row"><span>Brasil · homicídios por 100 mil, 2004 → 2024</span><b class="green">27 → 21</b></div>
      <div class="row"><span>Mato Grosso do Sul · renda vs média do Brasil</span><b class="green">6º do país</b></div>
    </div>
    <p class="lead" style="margin-top:70px">Enquanto a taxa nacional caía, a do estado mais pobre quase triplicou. A tabela completa das 27 unidades está no site, ordenável.</p>
    <p class="src" style="margin-top:40px">IBGE Contas Regionais 2023; Atlas da Violência 2016 e 2026 (Ipea/FBSP); PNUD Atlas Brasil.</p>`
  },
  '06_custobrasil': {
    k: 'Caro antes de ser rico',
    body: `<div class="big gold" style="font-size:160px">R$ 1,7 tri</div>
    <p class="lead" style="margin-top:16px">por ano é o Custo Brasil: 19,5% do PIB acima da média dos países da OCDE.</p>
    <div style="margin-top:70px;display:grid;grid-template-columns:1fr 1fr;gap:30px 40px">
      <div><div class="big red" style="font-size:96px">15,5%</div><p class="mut" style="font-size:28px;margin-top:10px">do PIB gasto com logística (EUA: 8,8%)</p></div>
      <div><div class="big red" style="font-size:96px">51º</div><p class="mut" style="font-size:28px;margin-top:10px">em logística no mundo (era 41º em 2010)</p></div>
      <div><div class="big red" style="font-size:96px">45º→107º</div><p class="mut" style="font-size:28px;margin-top:10px">na percepção da corrupção, 2002 → 2024</p></div>
      <div><div class="big red" style="font-size:96px">379</div><p class="mut" style="font-size:28px;margin-top:10px">em matemática no PISA (OCDE: 472)</p></div>
    </div>
    <p class="src" style="margin-top:60px">MBC/MDIC/FGV 2023; ILOS; Banco Mundial LPI 2023; Transparência Internacional; OCDE/Inep.</p>`
  },
};

function page(w, h, pad, inner, extraCss = '') {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}${extraCss}</style></head><body><div class="c" style="width:${w}px;height:${h}px;padding:${pad}px">${inner}</div></body></html>`;
}

(async () => {
  const b = await chromium.launch();
  const shoot = async (html, w, h, file) => {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.setContent(html, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, file), type: 'png' });
    await p.close();
  };
  // OG 1200x630
  await shoot(page(1200, 630, 56, `<div><div class="k" style="font-size:20px">Estudo · 2002 → 2026 · só com fonte oficial</div>
    <h1 style="font-size:66px;margin-top:16px">O Brasil que aconteceu.<br>E o Brasil que deveria existir.</h1></div>
    <div style="display:flex;gap:40px;align-items:flex-end">
      <div><div class="big gold" style="font-size:72px">+38%</div><div class="mut" style="font-size:20px;margin-top:6px">Brasil, renda per capita 2002–2024</div></div>
      <div><div class="big green" style="font-size:72px">+114%</div><div class="mut" style="font-size:20px;margin-top:6px">mediana de 19 países comparáveis</div></div>
      <div><div class="big red" style="font-size:72px">1.154.327</div><div class="mut" style="font-size:20px;margin-top:6px">homicídios, 2002–2023</div></div>
    </div>
    <div class="foot" style="padding-top:18px"><div class="site" style="font-size:28px">${SITE}</div><div class="by" style="font-size:16px">19 países · 27 estados · ano a ano</div></div>`), 1200, 630, 'og.png');
  for (const [name, c] of Object.entries(cards)) {
    // feed 1080x1350
    await shoot(page(1080, 1350, 72, `<div><div class="k">${c.k}</div><div style="margin-top:28px">${c.body}</div></div>${foot}`), 1080, 1350, `feed_${name}.png`);
    // stories 1080x1920 (mais respiro em cima e embaixo para a UI do IG/Zap)
    await shoot(page(1080, 1920, 72, `<div style="padding-top:170px"><div class="k">${c.k}</div><div style="margin-top:28px">${c.body}</div></div><div style="padding-bottom:150px">${foot}</div>`), 1080, 1920, `story_${name}.png`);
  }
  await b.close();
  console.log(fs.readdirSync(OUT).join('\n'));
})();

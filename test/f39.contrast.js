// Mesura el contrast de tot el text que es veu de veritat (F39).
//
//   fuser -k 3999/tcp
//   DICTATS_AUTH_BYPASS=1 DICTATS_DB_PATH=/tmp/contrast.db PORT=3999 node src/index.js &
//   npm i --no-save puppeteer-core && node test/f39.contrast.js
//
// Per què al navegador i no llegint `style.css`: al full hi ha les variables,
// però qui decideix el contrast és **quin color acaba sobre quin fons**, i això
// depèn de l'herència, de l'ordre de les regles i de quins elements estan
// visibles en aquell moment. Llegint el CSS es mesuren parelles que potser no
// existeixen, i s'escapen les que sí.
//
// El llindar és el de la WCAG 2.1 nivell AA, que és el que demana qualsevol
// contracte públic i el que Play espera d'una app educativa:
//
//   · Text normal .................. 4,5:1
//   · Text gran (≥24px, o ≥18,66px en negreta) ... 3:1
//
// El que NO mesura: contrast d'elements gràfics que no són text (la vora d'un
// camp, el farciment d'una barra). També és AA a 3:1 i s'ha de mirar a part.

const puppeteer = require('puppeteer-core');

const BASE = 'http://localhost:3999';
const espera = ms => new Promise(r => setTimeout(r, ms));

// La fórmula de la WCAG, tal qual. Es passa al navegador com a text.
const MESURADOR = `
  function canal(c) {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }
  function lluminositat([r, g, b]) {
    return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
  }
  function ratio(a, b) {
    const la = lluminositat(a), lb = lluminositat(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  function rgb(text) {
    const m = String(text).match(/[\\d.]+/g);
    if (!m) return null;
    const [r, g, b, a] = m.map(Number);
    return { color: [r, g, b], alfa: a === undefined ? 1 : a };
  }
  // El fons de veritat és el del primer avantpassat que en tingui un d'opac.
  function fonsDe(el) {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = rgb(getComputedStyle(n).backgroundColor);
      if (c && c.alfa > 0) return c.color;
      n = n.parentElement;
    }
    const arrel = rgb(getComputedStyle(document.documentElement).backgroundColor);
    return arrel && arrel.alfa > 0 ? arrel.color : [255, 255, 255];
  }
`;

async function mesura(page, nom) {
  return page.evaluate(new Function(MESURADOR + `
    const trobats = {};
    for (const el of document.querySelectorAll('*')) {
      // Només el text que aquest element escriu ell mateix, i que es veu.
      const propi = [...el.childNodes]
        .filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
      if (!propi) continue;
      const e = getComputedStyle(el);
      if (e.display === 'none' || e.visibility === 'hidden' || Number(e.opacity) === 0) continue;
      if (!el.getClientRects().length) continue;

      const davant = rgb(e.color);
      if (!davant || davant.alfa === 0) continue;
      const darrere = fonsDe(el);
      const r = ratio(davant.color, darrere);

      const mida = parseFloat(e.fontSize);
      const pes = parseInt(e.fontWeight, 10) || 400;
      const gran = mida >= 24 || (mida >= 18.66 && pes >= 700);
      const cal = gran ? 3 : 4.5;

      // S'agrupa AQUÍ DINS, no al node. A la pantalla de correcció cada
      // paraula del text és un <span>: tornar un objecte per cadascun vol dir
      // serialitzar milers d'objectes pel protocol de DevTools, i això tomba
      // la pestanya sense dir per què.
      const clau = davant.color.join(',') + '|' + darrere.join(',') + '|' + gran;
      if (!trobats[clau]) {
        trobats[clau] = {
          davant: 'rgb(' + davant.color.join(',') + ')',
          darrere: 'rgb(' + darrere.join(',') + ')',
          mida: Math.round(mida * 10) / 10, pes, gran,
          ratio: Math.round(r * 100) / 100, cal, passa: r >= cal,
          quants: 0, exemples: [],
        };
      }
      trobats[clau].quants++;
      if (trobats[clau].exemples.length < 3) trobats[clau].exemples.push(propi.slice(0, 40));
    }
    return Object.values(trobats);
  `));
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome', headless: 'new',
    args: ['--no-sandbox', '--hide-scrollbars'], defaultViewport: { width: 432, height: 768 },
  });
  const page = await browser.newPage();
  // Un `alert()` sense ningú que el reculli deixa la pàgina bloquejada i, des
  // de fora, sembla que el navegador hagi petat. Val més veure què deia.
  page.on('dialog', async (d) => { console.error('  [diàleg] ' + d.message()); await d.dismiss(); });
  const tots = [];

  // Es recorren les pantalles amb contingut de veritat: sense correcció feta,
  // ni el resultat ni els errors existeixen al DOM i no es mesurarien.
  await page.goto(BASE + '/mobile', { waitUntil: 'networkidle0' });
  await espera(800);
  tots.push(...(await mesura(page, 'nivells')).map(t => ({ ...t, on: 'nivells' })));
  console.error('· nivells mesurats');

  const dictat = await page.evaluate(async () => {
    // Triar el nivell primer: la llista que es veu en obrir és la de bàsic.
    for (const el of document.querySelectorAll('.level-card, [data-level]'))
      if (el.textContent.trim().toLowerCase().includes('intermedi')) el.click();
    const l = await (await fetch('/api/texts/intermedi')).json();
    return await (await fetch(`/api/texts/intermedi/${l[0].id}`)).json();
  });
  await espera(500);
  await page.evaluate((titol) => {
    for (const el of document.querySelectorAll('#m-text-list *'))
      if (el.textContent.trim().startsWith(titol)) { (el.closest('[class*="card"]') || el).click(); return; }
  }, dictat.title);
  await espera(700);
  tots.push(...(await mesura(page, 'dictat')).map(t => ({ ...t, on: 'dictat' })));
  console.error('· dictat mesurat');

  await page.evaluate((v) => {
    const ta = document.querySelector('#m-user-text');
    ta.value = v; ta.dispatchEvent(new Event('input', { bubbles: true }));
  }, dictat.text.replace('à', 'a').replace('é', 'e'));
  await espera(300);
  await page.evaluate(() => document.querySelector('#m-btn-correct')?.click());
  await espera(3000);
  tots.push(...(await mesura(page, 'correccio')).map(t => ({ ...t, on: 'correcció' })));
  console.error('· correcció mesurada');

  await page.goto(BASE + '/profile', { waitUntil: 'networkidle0' });
  await espera(900);
  tots.push(...(await mesura(page, 'perfil')).map(t => ({ ...t, on: 'perfil' })));
  console.error('· perfil mesurat');

  await page.goto(BASE + '/login', { waitUntil: 'networkidle0' });
  await espera(500);
  tots.push(...(await mesura(page, 'login')).map(t => ({ ...t, on: 'login' })));

  await browser.close();

  // Una parella color/fons/mida es repeteix a moltes files: interessa la
  // parella, no cada aparició.
  const parelles = new Map();
  for (const t of tots) {
    const clau = `${t.davant}|${t.darrere}|${t.gran}`;
    if (!parelles.has(clau)) parelles.set(clau, { ...t, quants: 0, exemples: new Set(), llocs: new Set() });
    const p = parelles.get(clau);
    p.quants += t.quants;
    for (const e of t.exemples) if (p.exemples.size < 3 && e) p.exemples.add(e);
    p.llocs.add(t.on);
  }

  const llista = [...parelles.values()].sort((a, b) => a.ratio - b.ratio);
  const fallen = llista.filter(p => !p.passa);

  const total = [...parelles.values()].reduce((a, p) => a + p.quants, 0);
  console.log(`${total} trossos de text mesurats · ${llista.length} combinacions de color diferents\n`);
  console.log('| Color | Sobre | Mida | Contrast | Cal | |');
  console.log('|---|---|---|---|---|---|');
  for (const p of llista) {
    console.log(`| \`${p.davant}\` | \`${p.darrere}\` | ${p.mida}px${p.pes >= 700 ? ' bold' : ''}`
      + ` | **${p.ratio}:1** | ${p.cal}:1 | ${p.passa ? 'AA' : '❌'} |`);
  }

  if (fallen.length) {
    console.log('\nEl que no arriba:');
    for (const p of fallen) {
      console.log(`\n  ${p.davant} sobre ${p.darrere} — ${p.ratio}:1, cal ${p.cal}:1`);
      console.log(`  ${p.quants} aparicions a: ${[...p.llocs].join(', ')}`);
      console.log(`  p. ex. «${[...p.exemples].join('», «')}»`);
    }
  }

  console.log(fallen.length
    ? `\n${fallen.length} combinacions per sota de l'AA`
    : '\nTot el text arriba a l\'AA de la WCAG 2.1');
  process.exit(fallen.length ? 1 : 0);
})().catch(e => { console.error('FALLA: ' + e.message); process.exit(1); });

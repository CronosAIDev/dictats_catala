// Comprova al navegador de veritat que l'app es pot fer servir sense mirar-la
// (F39).
//
//   fuser -k 3999/tcp
//   DICTATS_AUTH_BYPASS=1 DICTATS_DB_PATH=/tmp/a11y.db PORT=3999 node src/index.js &
//   npm i --no-save puppeteer-core && node test/f39.navegador.js
//
// Fora de `npm test` pel mateix motiu que `f33.integracio.js`: aquella suite no
// obre cap port, no escriu enlloc i no té dependències.
//
// Per què al navegador i no llegint l'HTML: els atributs estàtics es podrien
// comprovar amb un grep, però el que importa és que **es moguin**. La primera
// vegada que això es va executar va trobar que el focus NO arribava al resultat
// —s'enfocava una vista encara amagada— i que el repintat de les explicacions
// (F33) se l'enduia. Cap de les dues coses es veu llegint el codi.
const puppeteer = require('puppeteer-core');
const path = require('path');

const BASE = 'http://localhost:3999';
const SORTIDA = process.argv[2] || '.';
// 432 x 768 CSS a 2,5x = 1080 x 1920, la mida de telèfon que demana Play.
const PANTALLA = { width: 432, height: 768, deviceScaleFactor: 2.5 };
const NIVELL = 'intermedi';

const espera = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--hide-scrollbars', '--lang=ca-ES'],
    defaultViewport: PANTALLA,
  });
  const page = await browser.newPage();
  let falles = 0;
  const comprova = (nom, esperat, obtingut) => {
    const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
    console.log((ok ? '  OK   ' : '  FALLA') + '  ' + nom
      + (ok ? '' : `\n         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`));
    if (!ok) falles++;
  };
  const fes = async (nom) => {
    if (nom === '01-nivells') {
      console.log('Els atributs hi són:');
      const i = await page.evaluate(() => ({
        modul: !!window.A11y,
        barres: document.querySelectorAll('[role="progressbar"]').length,
        alertes: document.querySelectorAll('[role="alert"]').length,
        premuts: [...document.querySelectorAll('[aria-pressed]')].map(e => e.getAttribute('aria-pressed')),
        senseNom: [...document.querySelectorAll('a.btn')].filter(a => !a.getAttribute('aria-label')).length,
      }));
      comprova('el mòdul A11y s\'ha carregat', true, i.modul);
      comprova('dues barres amb role=progressbar', 2, i.barres);
      comprova('l\'avís de veu és role=alert', 1, i.alertes);
      comprova('els botons de mode diuen si estan premuts', ['true', 'false'], i.premuts);
      comprova('cap enllaç del capçal sense nom', 0, i.senseNom);
    }
    if (nom === '03-correccio') {
      console.log('\nI es mouen quan passa alguna cosa:');
      const f = await page.evaluate(() => ({
        focus: document.activeElement ? document.activeElement.id : '(cap)',
        anunci: (document.querySelector('.nomes-lector') || {}).textContent || '',
        rang: (document.querySelector('.rank-bar[role="progressbar"]') || {}).getAttribute('aria-valuenow'),
      }));
      comprova('el focus va al resultat', 'm-result-label', f.focus);
      comprova('s\'anuncia com ha anat', true, /paraules/.test(f.anunci));
      comprova('la barra de rang diu on és', true, f.rang !== null && f.rang !== '0');
      console.log('    anunci: «' + f.anunci.trim() + '»');
    }
    if (nom === '05-perfil') {
      const p2 = await page.evaluate(() => (document.querySelector('.rank-bar[role="progressbar"]') || {}).getAttribute('aria-valuenow'));
      comprova('i al perfil també', true, p2 !== null);
      console.log(falles ? `\n${falles} FALLES` : '\nF39 verificada al navegador');
      process.exitCode = falles ? 1 : 0;
    }
  };

  // ── 1. Els nivells ───────────────────────────────────────
  await page.goto(BASE + '/mobile', { waitUntil: 'networkidle0' });
  await espera(600);
  await fes('01-nivells');

  // ── 2. El dictat, amb els controls ───────────────────────
  const dictat = await page.evaluate(async (nivell) => {
    document.querySelectorAll('.level-card, [data-level]').forEach((el) => {
      if (el.textContent.trim().toLowerCase().includes('intermedi')) el.click();
    });
    const llista = await (await fetch(`/api/texts/${nivell}`)).json();
    const primer = llista[0];
    const complet = await (await fetch(`/api/texts/${nivell}/${primer.id}`)).json();
    return { id: complet.id, title: complet.title, text: complet.text };
  }, NIVELL);
  await espera(500);

  // Clicar la targeta d'aquest text pel seu títol.
  await page.evaluate((titol) => {
    for (const el of document.querySelectorAll('#m-text-list *')) {
      if (el.textContent.trim().startsWith(titol) && el.closest('[class*="card"], div')) {
        (el.closest('[class*="card"]') || el).click();
        return;
      }
    }
  }, dictat.title);
  await espera(900);
  // Chrome sense cap veu instal·lada ensenya l'avís de F21, que és correcte aquí
  // i fals a un mòbil de debò: qualsevol Android amb la veu catalana posada no el
  // veu mai. S'amaga per a la captura perquè ensenyi l'estat normal, no el d'aquesta
  // màquina. No es toca res més.
  await page.evaluate(() => { const a = document.querySelector('#m-voice-warning'); if (a) a.style.display = 'none'; });
  await espera(200);
  await fes('02-dictat');

  // ── 3. La correcció ──────────────────────────────────────
  // Dues paraules espatllades del MATEIX text, com qui escriu de pressa.
  const ambErrors = dictat.text.split(' ').reduce((acc, p) => {
    if (acc.fets < 2) {
      for (const [de, a] of [['à', 'a'], ['é', 'e'], ['í', 'i'], ['ó', 'o'], ['ç', 's'], ['è', 'e']]) {
        if (p.includes(de)) { acc.fets++; acc.mots.push(p.replace(de, a)); return acc; }
      }
    }
    acc.mots.push(p);
    return acc;
  }, { mots: [], fets: 0 });

  const ok = await page.evaluate((valor) => {
    const ta = document.querySelector('#m-user-text');
    if (!ta) return false;
    ta.value = valor;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, ambErrors.mots.join(' '));
  if (!ok) { console.error('No s\'ha trobat el textarea'); await browser.close(); process.exit(1); }

  await espera(300);
  await page.evaluate(() => document.querySelector('#m-btn-correct')?.click());
  await espera(2500);
  await fes('03-correccio');

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await espera(500);
  await fes('04-errors-classificats');

  // ── 4. El perfil ─────────────────────────────────────────
  await page.goto(BASE + '/profile', { waitUntil: 'networkidle0' });
  await espera(900);
  await fes('05-perfil');

  console.log(`\nDictat fet servir: «${dictat.title}» amb ${ambErrors.fets} errors`);
  await browser.close();
})().catch((e) => { console.error(e.message); process.exit(1); });

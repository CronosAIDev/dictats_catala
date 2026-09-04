// Captures per a la fitxa de Play (Fase 3, #19 · Fase 4, #20).
//
//   fuser -k 3999/tcp
//   DICTATS_AUTH_BYPASS=1 DICTATS_DB_PATH=/tmp/captures.db PORT=3999 node src/index.js &
//   node scripts/sembra-captures.js "connect.sid=<la galeta>"
//   npm i --no-save puppeteer-core && node scripts/captures-play.js docs/sections/publicacio/assets/captures
//
// `puppeteer-core` NO és dependència del projecte i no ha de ser-ho: fa servir
// el Chrome que ja tens instal·lat i només cal per a això. S'instal·la amb
// --no-save el dia que calgui refer les captures.
//
// Contra una BD temporal i un servidor local: no toca res de producció i el que
// s'hi veu ho ha produït l'app de veritat.
//
// El text que s'escriu surt del dictat que s'ha triat de debò —es demana a
// `/api/texts/<nivell>/<id>` i se n'espatllen dues paraules—, no d'una cadena
// inventada. Si no coincideixen, la correcció marca mig text i la captura
// ensenya un fracàs que no representa res.
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
  const fes = async (nom) => {
    await page.screenshot({ path: path.join(SORTIDA, nom + '.png') });
    console.log('  ' + nom + '.png');
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

// Comprova que la llista de textos deixa de veure's igual el primer dia que el
// trentè (F35).
//
//   npm i --no-save puppeteer-core && node test/f35.navegador.js
//
// S'aixeca el servidor sol, amb una base de dades temporal, com fa
// `f33.integracio.js`. NO entra a `npm test`: allà no hi ha dependències, no
// s'obre cap port i no s'escriu enlloc. La lògica pura ja es prova a
// `test/textos.test.js`, que sí que hi entra.
//
// Per què al navegador i no només per API: la llista es pinta a `app.js` i a
// `mobile.html`, i el risc d'aquesta feature és exactament que les dues vistes
// diguin coses diferents — que és com F17 va acabar sent el mateix bug per
// duplicat i com F50 tenia la lectura del rang escrita tres vegades.
//
// L'historial es fabrica amb correccions de VERITAT contra `/api/correct`. No
// s'insereixen files a mà: si el dia de demà canvia com es desa un dictat,
// aquesta prova se n'ha d'assabentar.

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const puppeteer = require('puppeteer-core');

const PORT = 3986;
const BASE = `http://localhost:${PORT}`;
const BD = path.join(os.tmpdir(), `dictats-f35-${process.pid}.db`);
const NIVELL = 'basic';

let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  console.log((ok ? '  OK   ' : '  FALLA') + '  ' + nom
    + (ok ? '' : `\n         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`));
  if (!ok) falles++;
}
const espera = ms => new Promise(r => setTimeout(r, ms));

/** Com queda pintada la llista, miri qui la miri. */
const LLEGEIX_APP = () => [...document.querySelectorAll('.text-item')].map(el => ({
  id: el.dataset.id,
  fet: (el.querySelector('.text-fet') || {}).textContent || '',
  marca: (el.querySelector('.text-seguent') || {}).textContent || '',
  destacat: el.classList.contains('es-seguent'),
}));
const LLEGEIX_MOBIL = () => [...document.querySelectorAll('.mobile-text-item')].map(el => ({
  id: el.dataset.id,
  fet: (el.querySelector('.text-fet') || {}).textContent || '',
  marca: (el.querySelector('.text-seguent') || {}).textContent || '',
  destacat: el.classList.contains('es-seguent'),
}));

(async () => {
  const servidor = spawn('node', [path.join(__dirname, '../src/index.js')], {
    env: { ...process.env, PORT: String(PORT), DICTATS_DB_PATH: BD, DICTATS_AUTH_BYPASS: '1', NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let registre = '';
  servidor.stdout.on('data', d => { registre += d; });
  servidor.stderr.on('data', d => { registre += d; });

  let browser = null;
  const acaba = async (codi) => {
    if (browser) await browser.close().catch(() => {});
    servidor.kill();
    try { fs.unlinkSync(BD); } catch {}
    process.exit(codi);
  };

  try {
    await espera(3000);
    const primera = await fetch(BASE + '/mobile');
    const galeta = (primera.headers.get('set-cookie') || '').split(';')[0];
    const banc = await (await fetch(`${BASE}/api/texts/${NIVELL}`, { headers: { Cookie: galeta } })).json();

    /** Fa un dictat de veritat, espatllant `quantes` paraules del text. */
    async function dicta(id, quantes) {
      const t = await (await fetch(`${BASE}/api/texts/${NIVELL}/${id}`, { headers: { Cookie: galeta } })).json();
      const net = t.text.replace(/\|\|/g, ' ').replace(/\s+/g, ' ').trim();
      // Es treuen accents a les primeres `quantes` paraules que en tinguin:
      // errors de debò, no paraules inventades.
      let fets = 0;
      const paraules = net.split(' ').map((p) => {
        if (fets >= quantes) return p;
        const sense = p.normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (sense === p) return p;
        fets++;
        return sense;
      });
      const r = await fetch(BASE + '/api/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: galeta },
        body: JSON.stringify({
          originalText: t.text, userText: paraules.join(' '),
          level: NIVELL, textId: id, textTitle: t.title,
        }),
      });
      const c = await r.json();
      return c.errors ? c.errors.length : -1;
    }

    browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome', headless: 'new',
      args: ['--no-sandbox', '--hide-scrollbars', '--lang=ca-ES'],
      defaultViewport: { width: 432, height: 768 },
    });
    const page = await browser.newPage();
    // Un `alert()` sense ningú que el reculli deixa la pàgina penjada i des de
    // fora sembla que el navegador hagi petat.
    page.on('dialog', async (d) => { console.error('  [diàleg] ' + d.message()); await d.dismiss(); });
    await page.setCookie({ name: galeta.split('=')[0], value: galeta.split('=').slice(1).join('='), domain: 'localhost' });

    async function mira(ruta, lector) {
      await page.goto(BASE + ruta, { waitUntil: 'networkidle0' });
      if (ruta === '/mobile') {
        await page.evaluate((n) => {
          for (const el of document.querySelectorAll('[data-level]'))
            if (el.dataset.level === n) el.click();
        }, NIVELL);
      }
      await espera(900);
      return page.evaluate(lector);
    }

    // ── 1. Una llista verge ────────────────────────────
    console.log('Amb la llista acabada d\'estrenar:');
    {
      const l = await mira('/', LLEGEIX_APP);
      comprova('hi són tots els textos del nivell', banc.length, l.length);
      comprova('cap porta marca de fet', 0, l.filter(t => t.fet).length);
      comprova('el primer convida a començar', 'Comença per aquí', l[0].marca);
      comprova('i es veu destacat', true, l[0].destacat);
      comprova('només n\'hi ha un de destacat', 1, l.filter(t => t.destacat).length);
    }

    // ── 2. Un dictat fet ───────────────────────────────
    const errors1 = await dicta(banc[0].id, 3);
    console.log(`\nDesprés de fer el primer text amb ${errors1} errors:`);
    {
      const l = await mira('/', LLEGEIX_APP);
      comprova('el text fet ho diu', `✓ Fet, ${errors1} errors`, l[0].fet.trim());
      comprova('i ja no és el proposat', '', l[0].marca);
      comprova('el proposat passa al següent', 'Continua per aquí', l[1].marca);
      comprova('que és el que es destaca', [false, true], [l[0].destacat, l[1].destacat]);
      comprova('els altres segueixen nets', 0, l.slice(1).filter(t => t.fet).length);
    }

    // ── 3. La vista mòbil diu exactament el mateix ─────
    console.log('\nI la vista mòbil, que és l\'altra còpia:');
    {
      const a = await mira('/', LLEGEIX_APP);
      const m = await mira('/mobile', LLEGEIX_MOBIL);
      comprova('mateixos textos i mateix ordre', a.map(t => t.id), m.map(t => t.id));
      comprova('mateixes marques de fet', a.map(t => t.fet), m.map(t => t.fet));
      comprova('mateixa proposta', a.map(t => t.marca), m.map(t => t.marca));
      comprova('i el mateix destacat', a.map(t => t.destacat), m.map(t => t.destacat));
    }

    // ── 4. Repetir un text ─────────────────────────────
    const errors2 = await dicta(banc[0].id, 1);
    console.log(`\nRepetint el mateix text, ara amb ${errors2}:`);
    {
      const l = await mira('/', LLEGEIX_APP);
      comprova('compta les dues passades', true, l[0].fet.includes('2 cops'));
      // El singular importa: «1 errors» es llegeix com una errada de l'app.
      const millor = Math.min(errors1, errors2);
      comprova('i ensenya la millor, no l\'última',
        `✓ Fet 2 cops, el millor amb ${millor} ${millor === 1 ? 'error' : 'errors'}`, l[0].fet.trim());
    }

    // ── 5. Tots fets: es proposa repassar ──────────────
    console.log('\nQuan ja estan tots fets:');
    {
      // El primer ja té el millor resultat; als altres se'ls fa pitjor a posta,
      // i al segon el pitjor de tots.
      for (let i = 1; i < banc.length; i++) await dicta(banc[i].id, i === 1 ? 6 : 2);
      const l = await mira('/', LLEGEIX_APP);
      comprova('ja no queda cap sense fer', banc.length, l.filter(t => t.fet).length);
      comprova('la proposta canvia de to', 'Per repassar', l.find(t => t.marca).marca);
      comprova('i és el que més va costar', banc[1].id, l.find(t => t.marca).id);
      comprova('segueix havent-n\'hi només un', 1, l.filter(t => t.marca).length);
    }

    // ── 6. El recompte ─────────────────────────────────
    console.log('\nEl recompte del capçal:');
    {
      await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
      await espera(900);
      const titol = await page.evaluate(() => document.getElementById('text-list-title').textContent);
      comprova('diu quants en portes', true, titol.includes(`${banc.length} de ${banc.length} fets`));
      await page.goto(BASE + '/mobile', { waitUntil: 'networkidle0' });
      await page.evaluate((n) => {
        for (const el of document.querySelectorAll('[data-level]')) if (el.dataset.level === n) el.click();
      }, NIVELL);
      await espera(900);
      const mobil = await page.evaluate(() => {
        const e = document.getElementById('m-text-resum');
        return { text: e.textContent, visible: e.style.display !== 'none' };
      });
      comprova('i al mòbil també', { text: `${banc.length} de ${banc.length} fets`, visible: true }, mobil);
    }

    // ── 7. Canviar a un nivell sense res fet ───────────
    console.log('\nCanviant a un nivell que no s\'ha tocat:');
    {
      await page.evaluate(() => {
        for (const el of document.querySelectorAll('[data-level]'))
          if (el.dataset.level === 'avancat') el.click();
      });
      await espera(900);
      const mobil = await page.evaluate(() => {
        const e = document.getElementById('m-text-resum');
        return { visible: e.style.display !== 'none' };
      });
      comprova('el recompte de l\'anterior no es queda enganxat', { visible: false }, mobil);
      const l = await page.evaluate(LLEGEIX_MOBIL);
      comprova('i allà torna a convidar a començar', 'Comença per aquí', l[0].marca);
    }

    console.log(falles === 0
      ? '\nLa llista de textos ja no es veu igual el primer dia que el trentè\n'
      : `\n${falles} comprovacions fallen\n`);
    await acaba(falles === 0 ? 0 : 1);
  } catch (e) {
    console.error('\nFALLA: ' + e.message);
    console.error(registre.slice(-1500));
    await acaba(1);
  }
})();

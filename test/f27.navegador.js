// Comprova el repàs des de la pantalla (F27).
//
//   npm i --no-save puppeteer-core && node test/f27.navegador.js
//
// La lògica ja es prova a `test/repesca.test.js` (pura) i a
// `test/f27.integracio.js` (API). Això comprova el que no es veu des d'allà:
// que la targeta apareix quan toca, que el botó obre el repàs de veritat i que
// desapareix quan ja no queda res.

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const Database = require('better-sqlite3');
const puppeteer = require('puppeteer-core');

const PORT = 3982;
const BASE = `http://localhost:${PORT}`;
const BD = path.join(os.tmpdir(), `dictats-f27nav-${process.pid}.db`);

let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  console.log((ok ? '  OK   ' : '  FALLA') + '  ' + nom
    + (ok ? '' : `\n         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`));
  if (!ok) falles++;
}
const espera = ms => new Promise(r => setTimeout(r, ms));
const AVUI = () => new Date().toISOString().slice(0, 10);

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
    for (const f of [BD, BD + '-wal', BD + '-shm']) { try { fs.unlinkSync(f); } catch {} }
    process.exit(codi);
  };

  try {
    await espera(3000);
    const primera = await fetch(BASE + '/mobile');
    const galeta = (primera.headers.get('set-cookie') || '').split(';')[0];
    const caps = { 'Content-Type': 'application/json', Cookie: galeta };

    // Dos dictats amb una frase fallada cadascun.
    for (const [id, de, a] of [['i1', 'castanyes', 'castanyas'], ['i2', 'Pirineus', 'Pirineos']]) {
      const t = await (await fetch(`${BASE}/api/texts/intermedi/${id}`, { headers: { Cookie: galeta } })).json();
      await fetch(BASE + '/api/correct', {
        method: 'POST', headers: caps,
        body: JSON.stringify({
          originalText: t.text, userText: t.text.replace(/\|\|/g, ' ').replace(de, a),
          level: 'intermedi', textId: id, textTitle: t.title,
        }),
      });
    }
    const bd = new Database(BD);
    comprova('dues frases apuntades', 2, bd.prepare('SELECT COUNT(*) n FROM repesca').get().n);

    browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome', headless: 'new',
      args: ['--no-sandbox', '--hide-scrollbars', '--lang=ca-ES'],
      defaultViewport: { width: 432, height: 900 },
    });
    const page = await browser.newPage();
    page.on('dialog', async (d) => { console.error('  [diàleg] ' + d.message()); await d.dismiss(); });
    await page.setCookie({ name: galeta.split('=')[0], value: galeta.split('=').slice(1).join('='), domain: 'localhost' });

    const mira = async () => {
      await page.goto(BASE + '/mobile', { waitUntil: 'networkidle0' });
      await espera(1200);
      return page.evaluate(() => ({
        visible: document.getElementById('m-repas-card').style.display !== 'none',
        titol: document.getElementById('m-repas-titol').textContent.trim(),
        nota: document.getElementById('m-repas-nota').textContent.trim(),
      }));
    };

    console.log('\nMentre no toca, la targeta no hi és:');
    comprova('amagada', false, (await mira()).visible);

    console.log('\nQuan toca:');
    bd.prepare('UPDATE repesca SET toca_el = ?').run(AVUI());
    const amb = await mira();
    comprova('es veu', true, amb.visible);
    comprova('i diu quantes', 'Tens 2 frases per repassar', amb.titol);
    comprova('sense renyar', false, /malament|error|fallat/i.test(amb.nota));

    console.log('\nEl botó obre el repàs:');
    await page.evaluate(() => document.getElementById('m-repas-boto').click());
    await espera(900);
    const dins = await page.evaluate(() => ({
      titol: document.getElementById('m-dictation-title').textContent.trim(),
      nivell: document.getElementById('m-level-badge').textContent.trim(),
      frases: window.__estat ? 0 : document.querySelectorAll('#m-view-dictation').length,
    }));
    comprova('el títol és el repàs', 'Repàs', dins.titol);
    comprova('i el nivell també', 'Repàs', dins.nivell);

    console.log('\nFent-lo bé, les frases pugen i la targeta marxa:');
    const escrit = await page.evaluate(async () => {
      const s = await (await fetch('/api/repesca')).json();
      const ta = document.querySelector('#m-user-text');
      ta.value = s.text.replace(/\|\|/g, ' ');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      return s.frases.length;
    });
    comprova('la sessió porta frases barrejades', true, escrit >= 4);
    await page.evaluate(() => document.querySelector('#m-btn-correct')?.click());
    await espera(3000);
    comprova('cap error', 0, await page.evaluate(() =>
      document.querySelectorAll('#m-errors-list .error-item').length));

    const files = bd.prepare('SELECT passada FROM repesca ORDER BY id').all();
    comprova('les dues han pujat un esglaó', [1, 1], files.map(f => f.passada));
    comprova('i avui ja no en queda cap', false, (await mira()).visible);

    bd.close();
    console.log(falles === 0
      ? '\nEl repàs es veu, s\'obre i desapareix quan toca\n'
      : `\n${falles} comprovacions fallen\n`);
    await acaba(falles === 0 ? 0 : 1);
  } catch (e) {
    console.error('\nFALLA: ' + e.message);
    console.error(registre.slice(-1200));
    await acaba(1);
  }
})();

// Comprova que el perfil sap dir de què són els teus errors (F26).
//
//   npm i --no-save puppeteer-core && node test/f26.navegador.js
//
// Servidor propi i BD temporal, com f33/f35/f36. Fora de `npm test`.
//
// Els dictats són correccions de VERITAT contra `/api/correct`, amb errors
// d'una regla concreta injectats a posta: així es comprova alhora que la
// classificació de F25 arriba fins a la pantalla i que l'agrupació és la bona.

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const Database = require('better-sqlite3');
const puppeteer = require('puppeteer-core');

const PORT = 3984;
const BASE = `http://localhost:${PORT}`;
const BD = path.join(os.tmpdir(), `dictats-f26-${process.pid}.db`);

let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  console.log((ok ? '  OK   ' : '  FALLA') + '  ' + nom
    + (ok ? '' : `\n         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`));
  if (!ok) falles++;
}
const espera = ms => new Promise(r => setTimeout(r, ms));

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

    /** Un dictat amb els canvis que se li demanin, que són errors d'una regla. */
    async function dicta(id, canvis) {
      const t = await (await fetch(`${BASE}/api/texts/avancat/${id}`, { headers: { Cookie: galeta } })).json();
      let user = t.text.replace(/\|\|/g, ' ');
      for (const [de, a] of canvis) {
        if (!user.includes(de)) throw new Error(`«${de}» no és a ${id}`);
        user = user.replace(de, a);
      }
      const c = await (await fetch(BASE + '/api/correct', {
        method: 'POST', headers: caps,
        body: JSON.stringify({ originalText: t.text, userText: user, level: 'avancat', textId: id, textTitle: t.title }),
      })).json();
      return (c.errors || []).map(e => e.type);
    }

    console.log('Tres dictats amb errors de regles concretes:');
    const fets = [];
    // La ela geminada, tres vegades: ha de quedar la primera.
    fets.push(await dicta('a11', [['intel·ligent', 'inteligent'], ['col·legi', 'colegi'], ['col·lecció', 'colecció']]));
    fets.push(await dicta('a11', [['intel·ligent', 'inteligent'], ['raïm', 'raim']]));
    fets.push(await dicta('a11', [['dolç', 'dols']]));
    comprova('cada error surt amb la seva regla',
      [['ela geminada', 'ela geminada', 'ela geminada'], ['ela geminada', 'dièresi'], ['ç']], fets);

    const perfil = await (await fetch(BASE + '/api/profile', { headers: { Cookie: galeta } })).json();
    console.log('\nEl perfil els agrupa:');
    comprova('mira els tres dictats', 3, perfil.onFalles.dictats);
    comprova('i els sis errors', 6, perfil.onFalles.errors);
    // L'empat entre dièresi i ç el trenca el nom, no l'atzar: «Ce trencada»
    // va abans que «Dièresi». Així l'ordre no balla entre dues càrregues.
    comprova('la regla que més surt va primera',
      ['ela geminada', 'ç', 'dièresi'], perfil.onFalles.regles.map(r => r.id));
    comprova('amb els seus comptes', [4, 1, 1], perfil.onFalles.regles.map(r => r.quants));
    comprova('el titular ho diu amb paraules', true,
      perfil.onFalles.titular.includes('ela geminada') && perfil.onFalles.titular.includes('4 de 6'));
    comprova('i no repeteix la finestra de la capçalera', false,
      perfil.onFalles.titular.includes('últims'));

    console.log('\nEls avisos de puntuació no compten:');
    const t = await (await fetch(`${BASE}/api/texts/avancat/a11`, { headers: { Cookie: galeta } })).json();
    await fetch(BASE + '/api/correct', {
      method: 'POST', headers: caps,
      body: JSON.stringify({
        originalText: t.text, userText: t.text.replace(/\|\|/g, ' ').replace(/\./g, ''),
        level: 'avancat', textId: 'a11', textTitle: t.title, punctuationDictated: false,
      }),
    });
    const dos = await (await fetch(BASE + '/api/profile', { headers: { Cookie: galeta } })).json();
    comprova('el dictat es compta', 4, dos.onFalles.dictats);
    comprova('però la puntuació no dictada no entra a les regles', false,
      dos.onFalles.regles.some(r => r.id === 'puntuació'));
    comprova('i el total d\'errors no es mou', 6, dos.onFalles.errors);

    console.log('\nA la pantalla:');
    browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome', headless: 'new',
      args: ['--no-sandbox', '--hide-scrollbars', '--lang=ca-ES'],
      defaultViewport: { width: 432, height: 900 },
    });
    const page = await browser.newPage();
    page.on('dialog', async (d) => { console.error('  [diàleg] ' + d.message()); await d.dismiss(); });
    await page.setCookie({ name: galeta.split('=')[0], value: galeta.split('=').slice(1).join('='), domain: 'localhost' });
    await page.goto(BASE + '/profile', { waitUntil: 'networkidle0' });
    await espera(900);

    const vist = await page.evaluate(() => ({
      visible: document.getElementById('falles-card').style.display !== 'none',
      noms: [...document.querySelectorAll('.falla-nom')].map(e => e.textContent.trim()),
      quants: [...document.querySelectorAll('.falla-quants')].map(e => e.textContent.trim()),
      titular: document.getElementById('falles-titular').textContent.trim(),
      regles: document.querySelectorAll('.falla-regla').length,
      amples: [...document.querySelectorAll('.falla-barra-plena')].map(e => e.style.width),
    }));
    comprova('la targeta es veu', true, vist.visible);
    comprova('amb una fila per regla', ['Ela geminada', 'Ce trencada', 'Dièresi'], vist.noms);
    comprova('i els comptes', ['4', '1', '1'], vist.quants);
    comprova('el titular hi és', true, vist.titular.length > 20);
    comprova('només la primera regla porta l\'explicació', 1, vist.regles);
    comprova('les barres van amb el percentatge', ['67%', '17%', '17%'], vist.amples);

    console.log('\nUn perfil buit no ensenya la targeta:');
    const bd = new Database(BD);
    bd.prepare('DELETE FROM dictation_errors').run();
    bd.close();
    await page.goto(BASE + '/profile', { waitUntil: 'networkidle0' });
    await espera(900);
    comprova('sense errors desats, no hi és', 'none',
      await page.evaluate(() => document.getElementById('falles-card').style.display));

    console.log(falles === 0
      ? '\nL\'app ja pot dir de què són els teus errors\n'
      : `\n${falles} comprovacions fallen\n`);
    await acaba(falles === 0 ? 0 : 1);
  } catch (e) {
    console.error('\nFALLA: ' + e.message);
    console.error(registre.slice(-1500));
    await acaba(1);
  }
})();

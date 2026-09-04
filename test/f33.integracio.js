// Comprovació d'integració de F33: la correcció surt de seguida i les
// explicacions vénen després.
//
//   node test/f33.integracio.js
//
// NO entra a `npm test` a posta. La suite d'allà no té dependències, no obre
// cap port i no escriu enlloc; això aixeca un servidor de veritat amb una BD
// temporal. Són dues coses diferents i barrejar-les faria que `npm test`
// deixés de poder-se executar en qualsevol lloc.
//
// Què cobreix, que és justament el que no es veu llegint el codi:
//   1. `/api/correct` respon SENSE esperar cap model
//   2. La resposta porta el `progressId` amb què demanar les explicacions
//   3. `/api/explicacions/:id` és idempotent: la segona vegada no crida l'API
//   4. Ningú pot llegir les explicacions d'un altre
//   5. Un id que no és un número no arriba a tocar la base

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const Database = require('better-sqlite3');

const PORT = 3987;
const BASE = `http://localhost:${PORT}`;
const BD = path.join(os.tmpdir(), `dictats-f33-${process.pid}.db`);

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

  const acaba = (codi) => { servidor.kill(); try { fs.unlinkSync(BD); } catch {} process.exit(codi); };

  try {
    await espera(3000);

    // La galeta de sessió, que amb el bypass surt de qualsevol pàgina.
    const primera = await fetch(BASE + '/mobile');
    const galeta = (primera.headers.get('set-cookie') || '').split(';')[0];
    const crida = (ruta, cos) => fetch(BASE + ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: galeta },
      body: cos ? JSON.stringify(cos) : undefined,
    });

    console.log('La correcció no espera cap model:');
    const t0 = Date.now();
    const correccio = await (await crida('/api/correct', {
      originalText: 'La meva família és petita. Tinc un germà i una germana.',
      userText: 'La meva familia es petita. Tinc un germa i una germana.',
      level: 'basic', textId: 'b2', textTitle: 'La família',
    })).json();
    const trigat = Date.now() - t0;

    comprova('respon en menys d\'un segon', true, trigat < 1000);
    comprova('troba els tres accents', 3, correccio.errors.length);
    comprova('porta el progressId per anar a buscar les explicacions', true, !!correccio.progressId);
    comprova('cap explicació és del model encara', false, !!correccio.feedbackGenerat);
    comprova('però cap error surt mut', true, correccio.errors.every(e => !!e.explanation));
    comprova('i el rang i la ratxa ja hi són', true, !!correccio.rank && !!correccio.ratxa);

    console.log('\nLes explicacions, a part:');
    const e1 = await (await crida('/api/explicacions/' + correccio.progressId)).json();
    comprova('n\'arriben tantes com errors', 3, e1.explicacions.length);
    comprova('i totes porten text', true, e1.explicacions.every(e => !!e.explanation));

    const abans = (registre.match(/Claude API error/g) || []).length;
    const t1 = Date.now();
    const e2 = await (await crida('/api/explicacions/' + correccio.progressId)).json();
    const trigat2 = Date.now() - t1;
    const despres = (registre.match(/Claude API error/g) || []).length;

    comprova('la segona vegada torna el mateix', e1.explicacions, e2.explicacions);
    comprova('sense tornar a cridar l\'API', abans, despres);
    comprova('i de pressa', true, trigat2 < 200);

    console.log('\nCada explicació és del seu amo:');
    const bd = new Database(BD);
    const altre = bd.prepare(
      'INSERT INTO user_progress (email, text_id, text_title, level, score, errors_count) VALUES (?,?,?,?,?,?)'
    ).run('altre@algu.cat', 'x', 'X', 'basic', 50, 1).lastInsertRowid;
    bd.close();

    comprova('el progrés d\'un altre dona 404', 404, (await crida('/api/explicacions/' + altre)).status);
    comprova('un id inexistent, també', 404, (await crida('/api/explicacions/99999')).status);
    comprova('i un id que no és un número no arriba a la base', 400,
      (await crida('/api/explicacions/abc')).status);

    console.log(falles ? `\n${falles} FALLES` : '\nF33 verificada de punta a punta');
    acaba(falles ? 1 : 0);
  } catch (err) {
    console.error('\nNo s\'ha pogut completar la comprovació:', err.message);
    console.error(registre.slice(-500));
    acaba(1);
  }
})();

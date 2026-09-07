// Comprova l'escriptura lliure fins on es pot sense clau d'API (F29).
//
//   node test/f29.integracio.js
//
// ⚠️ **El camí bo no es prova aquí.** F29 és l'única part de l'app que
// necessita el model: sense text original no hi ha res determinista a fer. El
// que sí que es prova, i és el que més pot fer mal, és **què passa quan no hi
// ha clau**: que es digui clar i que no es dissimuli amb un error genèric.

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const Database = require('better-sqlite3');

const PORT = 3980;
const BASE = `http://localhost:${PORT}`;
const BD = path.join(os.tmpdir(), `dictats-f29-${process.pid}.db`);

let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  console.log((ok ? '  OK   ' : '  FALLA') + '  ' + nom
    + (ok ? '' : `\n         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`));
  if (!ok) falles++;
}
const espera = ms => new Promise(r => setTimeout(r, ms));
const paraules = n => Array.from({ length: n }, (_, i) => 'mot' + i).join(' ');

(async () => {
  const servidor = spawn('node', [path.join(__dirname, '../src/index.js')], {
    // Sense clau, a posta: és el cas que es vol provar.
    env: { ...process.env, ANTHROPIC_API_KEY: 'PENDIENTE', PORT: String(PORT), DICTATS_DB_PATH: BD, DICTATS_AUTH_BYPASS: '1', NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let registre = '';
  servidor.stdout.on('data', d => { registre += d; });
  servidor.stderr.on('data', d => { registre += d; });
  const acaba = (codi) => {
    servidor.kill();
    for (const f of [BD, BD + '-wal', BD + '-shm']) { try { fs.unlinkSync(f); } catch {} }
    process.exit(codi);
  };

  try {
    await espera(3000);
    const primera = await fetch(BASE + '/mobile');
    const galeta = (primera.headers.get('set-cookie') || '').split(';')[0];
    const caps = { 'Content-Type': 'application/json', Cookie: galeta };
    const post = (cos) => fetch(BASE + '/api/escriure', { method: 'POST', headers: caps, body: JSON.stringify(cos) });

    console.log('Els temes:');
    const t = await (await fetch(BASE + '/api/temes', { headers: { Cookie: galeta } })).json();
    comprova('n\'hi ha uns quants', true, t.temes.length >= 8);
    comprova('cada un amb proposta i pista', true,
      t.temes.every(x => x.id && x.titol && x.proposta && x.pista));
    comprova('i diu que ara no hi ha clau', false, t.clau);

    console.log('\nLa pàgina es serveix:');
    comprova('/escriure respon', 200, (await fetch(BASE + '/escriure', { headers: { Cookie: galeta } })).status);

    console.log('\nEl que no es pot corregir:');
    comprova('massa curt, 400', 400, (await post({ tema: 't1', text: 'quatre paraules i prou' })).status);
    comprova('massa llarg, 400', 400, (await post({ tema: 't1', text: paraules(500) })).status);
    comprova('sense text, 400', 400, (await post({ tema: 't1' })).status);

    console.log('\nSense clau es diu, no es dissimula:');
    const res = await post({ tema: 't1', text: paraules(60) });
    comprova('respon 503 i no un error genèric', 503, res.status);
    const cos = await res.json();
    comprova('el missatge diu que és aquesta part', true, /Claude/.test(cos.error));
    comprova('i que els dictats segueixen anant', true, /dictats/i.test(cos.error));

    console.log('\nNo es desa res del que s\'ha escrit:');
    const bd = new Database(BD);
    const columnes = bd.prepare('PRAGMA table_info(escriptures)').all().map(c => c.name);
    comprova('la taula existeix', true, columnes.length > 0);
    // El que importa: que no hi hagi on desar el text.
    comprova('i no té cap columna de text', [], columnes.filter(c => /text|contingut|body/i.test(c)));
    comprova('cap fila, perquè no s\'ha corregit res', 0,
      bd.prepare('SELECT COUNT(*) n FROM escriptures').get().n);
    bd.close();

    console.log(falles === 0
      ? '\nSense clau ho diu, i el que escrius no es desa enlloc\n'
      : `\n${falles} comprovacions fallen\n`);
    acaba(falles === 0 ? 0 : 1);
  } catch (e) {
    console.error('\nFALLA: ' + e.message);
    console.error(registre.slice(-1200));
    acaba(1);
  }
})();

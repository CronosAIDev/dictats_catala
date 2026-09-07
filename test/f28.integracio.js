// Comprova els micro-exercicis de punta a punta (F28).
//
//   node test/f28.integracio.js
//
// Servidor propi i BD temporal. Fora de `npm test` perquè obre un port; la
// lògica pura ja es prova a `test/micro.test.js`.
//
// El que es comprova aquí i enlloc més: que la resposta bona NO viatja al
// client abans de contestar, que ningú pot contestar una targeta que no és
// seva, i que el compte del dia s'acumula.

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const Database = require('better-sqlite3');

const PORT = 3981;
const BASE = `http://localhost:${PORT}`;
const BD = path.join(os.tmpdir(), `dictats-f28-${process.pid}.db`);

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
    const get = async (r) => (await fetch(BASE + r, { headers: { Cookie: galeta } })).json();
    const post = async (r, c) => (await fetch(BASE + r, { method: 'POST', headers: caps, body: JSON.stringify(c) })).json();

    console.log('Sense errors desats:');
    comprova('no hi ha cap targeta', 0, (await get('/api/micro')).targetes.length);

    // Tres dictats amb errors de regles diferents.
    for (const [niv, id, de, a] of [
      ['intermedi', 'i1', 'castanyes', 'castanyas'],
      ['avancat', 'a11', 'intel·ligent', 'inteligent'],
      ['avancat', 'a11', 'raïm', 'raim'],
    ]) {
      const t = await get(`/api/texts/${niv}/${id}`);
      await post('/api/correct', {
        originalText: t.text, userText: t.text.replace(/\|\|/g, ' ').replace(de, a),
        level: niv, textId: id, textTitle: t.title,
      });
    }

    console.log('\nAmb errors, surten targetes:');
    const m = await get('/api/micro');
    comprova('una per error diferent', 3, m.targetes.length);
    comprova('cada una amb dues formes', [2, 2, 2], m.targetes.map(t => t.opcions.length));
    comprova('i el nom de la seva regla', true, m.targetes.every(t => t.nom && t.nom.length > 2));
    // El que no pot passar de cap manera.
    comprova('cap diu quina és la bona', false,
      /"correcta"|"erronia"/.test(JSON.stringify(m.targetes)));

    console.log('\nContestant:');
    const bd = new Database(BD);
    const bona = (id) => {
      const f = bd.prepare('SELECT original FROM user_errors WHERE id = ?').get(id);
      return f.original.replace(/[.,;:!?»«]/g, '');
    };
    const totBe = await post('/api/micro', {
      respostes: m.targetes.map(t => ({ id: t.id, tria: bona(t.id) })),
    });
    comprova('totes encertades', 3, totBe.encerts);
    comprova('i ho diu sense renyar', 'Totes. Aquestes ja te les saps.', totBe.text);
    comprova('ara sí que diu quina era la bona', true, totBe.detall.every(d => d.correcta));
    comprova('el compte d\'avui', { targetes: 3, encerts: 3 }, totBe.avui);

    console.log('\nUna segona tanda se suma a la del dia:');
    const malament = await post('/api/micro', {
      respostes: m.targetes.map(t => ({ id: t.id, tria: 'inventada' })),
    });
    comprova('cap encert', 0, malament.encerts);
    comprova('i tampoc renya', 'Ja saps quines has de mirar.', malament.text);
    comprova('el dia acumula', { targetes: 6, encerts: 3 }, malament.avui);

    console.log('\nEl que no es pot fer:');
    comprova('sense respostes, 400', 400,
      (await fetch(BASE + '/api/micro', { method: 'POST', headers: caps, body: '{}' })).status);
    // Una fila d'una altra persona: ni es corregeix ni es compta.
    bd.prepare(`INSERT INTO user_errors (progress_id, email, type, original, user_wrote, position, counted, taxonomia)
                VALUES (1, 'altre@exemple.cat', 'h', 'hora', 'ora', 0, 1, 1)`).run();
    const alie = bd.prepare("SELECT id FROM user_errors WHERE email = 'altre@exemple.cat'").get().id;
    const cap = await post('/api/micro', { respostes: [{ id: alie, tria: 'hora' }] });
    comprova('la targeta d\'un altre no es contesta', 0, cap.total);
    comprova('i no suma al teu dia', 6, cap.avui.targetes);

    bd.close();
    console.log(falles === 0
      ? '\nLes targetes es fan, es contesten i es compten\n'
      : `\n${falles} comprovacions fallen\n`);
    acaba(falles === 0 ? 0 : 1);
  } catch (e) {
    console.error('\nFALLA: ' + e.message);
    console.error(registre.slice(-1200));
    acaba(1);
  }
})();

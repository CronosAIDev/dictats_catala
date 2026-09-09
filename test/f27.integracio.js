// Comprova que les frases fallades tornen (F27).
//
//   node test/f27.integracio.js
//
// Servidor propi i BD temporal, com f33. Fora de `npm test` perquè obre un
// port; la lògica pura ja es prova a `test/repesca.test.js`.
//
// Els dictats són correccions de VERITAT. L'única cosa que es toca a mà és
// `toca_el`, per fer com si haguessin passat els dies: esperar-los no és una
// prova.

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const Database = require('better-sqlite3');

const PORT = 3983;
const BASE = `http://localhost:${PORT}`;
const BD = path.join(os.tmpdir(), `dictats-f27-${process.pid}.db`);

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
    const get = async (ruta) => (await fetch(BASE + ruta, { headers: { Cookie: galeta } })).json();
    const post = async (ruta, cos) => (await fetch(BASE + ruta, { method: 'POST', headers: caps, body: JSON.stringify(cos) })).json();

    const t = await get('/api/texts/intermedi/i1');
    const frases = t.text.split('||').map(f => f.trim()).filter(Boolean);

    // ── 1. Fallar una frase l'apunta ───────────────────
    console.log('En fallar una frase:');
    // S'espatlla una paraula de la frase 2 i cap més.
    const espatllat = frases.map((f, i) => (i === 2 ? f.replace('castanyes', 'castanyas') : f)).join(' ');
    const c1 = await post('/api/correct', {
      originalText: t.text, userText: espatllat,
      level: 'intermedi', textId: 'i1', textTitle: t.title,
    });
    comprova('la correcció troba un error', 1, c1.errors.length);

    const bd = new Database(BD);
    const files = () => bd.prepare('SELECT text_id, phrase_index AS frase, streak AS passada, due_on AS toca_el FROM phrase_reviews ORDER BY phrase_index').all();
    comprova('queda apuntada una frase', 1, files().length);
    comprova('i és la que has fallat', 2, files()[0].frase);
    comprova('per demà, no per avui', true, files()[0].toca_el > new Date().toISOString().slice(0, 10));

    console.log('\nAvui encara no toca:');
    comprova('el repàs està buit', 0, (await get('/api/repesca')).pendents);

    // ── 2. Passa un dia ────────────────────────────────
    console.log('\nQuan arriba el dia:');
    const avui = () => new Date().toISOString().slice(0, 10);
    bd.prepare('UPDATE phrase_reviews SET due_on = ?').run(avui());
    const sessio = await get('/api/repesca');
    comprova('hi ha una frase pendent', 1, sessio.pendents);
    comprova('però la sessió en porta més, barrejades', true, sessio.frases.length >= 4);
    comprova('el client no sap quina és la de repàs', false,
      JSON.stringify(sessio.frases).includes('repas'));
    comprova('el text són les frases separades', sessio.frases.length,
      sessio.text.split('||').length);

    // ── 3. Encertar-la la puja d'esglaó ────────────────
    console.log('\nSi l\'encertes:');
    const bo = await post('/api/repesca/correct', {
      originalText: sessio.text, userText: sessio.text.replace(/\|\|/g, ' '), frases: sessio.frases,
    });
    comprova('cap error', 0, bo.errors.length);
    comprova('segueix apuntada', 1, files().length);
    comprova('però ha pujat un esglaó', 1, files()[0].passada);
    comprova('i torna d\'aquí a tres dies', 3,
      Math.round((new Date(files()[0].toca_el) - new Date(avui())) / 86400000));
    comprova('el repàs d\'avui ja no la té', 0, (await get('/api/repesca')).pendents);

    // ── 4. Fallar-la la torna a baix de tot ────────────
    console.log('\nI si la falles, torna a començar:');
    bd.prepare('UPDATE phrase_reviews SET due_on = ?, streak = 2').run(avui());
    const s2 = await get('/api/repesca');
    const quina = s2.frases.findIndex(f => f.text_id === 'i1' && f.frase === 2);
    const malament = s2.frases.map((f, i) => (i === quina ? f.text.replace('castanyes', 'castanyas') : f.text)).join(' ');
    await post('/api/repesca/correct', { originalText: s2.text, userText: malament, frases: s2.frases });
    comprova('torna a passada zero', 0, files()[0].passada);
    comprova('i torna demà', 1,
      Math.round((new Date(files()[0].toca_el) - new Date(avui())) / 86400000));

    // ── 5. Encertar-la tres vegades l'acaba ────────────
    console.log('\nTres encerts seguits i ja no torna:');
    for (let i = 0; i < 3; i++) {
      bd.prepare('UPDATE phrase_reviews SET due_on = ?').run(avui());
      const s = await get('/api/repesca');
      if (!s.pendents) break;
      await post('/api/repesca/correct', {
        originalText: s.text, userText: s.text.replace(/\|\|/g, ' '), frases: s.frases,
      });
    }
    comprova('la fila desapareix', 0, files().length);
    comprova('i el repàs es queda buit', 0, (await get('/api/repesca')).pendents);

    // ── 6. El repàs compta com a dictat ────────────────
    console.log('\nI el repàs compta com el que és:');
    const perfil = await get('/api/profile');
    comprova('surt a l\'historial', true, perfil.history.some(h => h.level === 'repas'));
    comprova('amb el seu títol', true, perfil.history.some(h => h.text_title === 'Repàs'));

    bd.close();
    // ── Esborrar un text propi s'endú els seus repassos (F75) ──
  //
  // Els repassos apunten al text amb `text_id` i **no desen la frase**: es torna
  // a treure del banc cada vegada. Per això un text esborrat deixava repassos
  // que no es podien resoldre mai — la sessió se'ls saltava bé, però es
  // quedaven per sempre. No hi ha clau aliena que ho faci sol perquè `text_id`
  // també apunta al banc, que no és cap taula.
  console.log('\nEsborrar un text propi s\'endú els seus repassos:');
  {
    const meu = await post('/api/user-texts',
      { title: 'Un text meu', text: 'Avui fa sol. || Demà plourà. || I demà passat, qui sap.' });
    const tid = 'personal_' + meu.id;
    await post('/api/correct', {
      originalText: 'Avui fa sol. || Demà plourà. || I demà passat, qui sap.',
      userText: 'Avui fa sòl. || Demà ploura. || I demà passat, qui sap.',
      level: 'personal', textId: tid, textTitle: 'Un text meu', punctuationDictated: true,
    });
    const bd2 = new Database(BD);
    const quants = () => bd2.prepare('SELECT count(*) c FROM phrase_reviews WHERE text_id = ?').get(tid).c;
    comprova('el text fallat deixa repassos apuntats', true, quants() > 0);

    await fetch(BASE + '/api/user-texts/' + meu.id, { method: 'DELETE', headers: caps });
    comprova('en esborrar el text, no en queda cap', 0, quants());
    bd2.close();
  }

  console.log(falles === 0
      ? '\nLes frases fallades tornen, i deixen de tornar quan te les saps\n'
      : `\n${falles} comprovacions fallen\n`);
    acaba(falles === 0 ? 0 : 1);
  } catch (e) {
    console.error('\nFALLA: ' + e.message);
    console.error(registre.slice(-1200));
    acaba(1);
  }
})();

// Comprova que l'historial que ja hi havia es torna a classificar amb el
// catàleg de F25, i que no es torna a fer cada vegada.
//
//   node test/f25.migracio.js
//
// Fora de `npm test` perquè escriu una base de dades temporal; allà no
// s'escriu enlloc. La lògica de classificar ja es prova a
// `test/taxonomia.test.js`, que sí que hi entra. El que es prova AQUÍ és la
// migració, que és l'única part de F25 que reescriu dades.

const path = require('path');
const fs = require('fs');
const os = require('os');
const Database = require('better-sqlite3');
// La versió del catàleg puja cada cop que es parteix o s'afegeix una categoria
// (F71 la va pujar a 2). La prova mira que la migració marqui amb LA d'avui,
// no amb un número escrit a mà que caduca al següent canvi.
const T = require('../src/lib/taxonomia');

const BD = path.join(os.tmpdir(), `dictats-f25-${process.pid}.db`);
let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  console.log((ok ? '  OK   ' : '  FALLA') + '  ' + nom
    + (ok ? '' : `\n         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`));
  if (!ok) falles++;
}

/** Carrega `db.js` de zero, com si l'app acabés d'arrencar. */
function arrenca() {
  process.env.DICTATS_DB_PATH = BD;
  delete require.cache[require.resolve('../src/lib/db')];
  return require('../src/lib/db');
}

try {
  for (const f of [BD, BD + '-wal', BD + '-shm']) { try { fs.unlinkSync(f); } catch {} }

  // Primera arrencada: crea l'esquema.
  arrenca();

  // Historial com el que hi havia abans de F25: els sis tipus d'abans, i sense
  // versió de catàleg.
  const bd = new Database(BD);
  // La persona i el dictat han d'existir: des de la #36 els errors hi apunten
  // amb claus alienes.
  bd.prepare("INSERT OR IGNORE INTO users (uid, email) VALUES ('algu-uid', 'algu@exemple.cat')").run();
  bd.prepare(`INSERT INTO dictations (id, uid, text_id, level, error_count)
              VALUES (1, 'algu-uid', 'b1', 'basic', 9)`).run();
  const posa = bd.prepare(`INSERT INTO dictation_errors
    (dictation_id, uid, type, expected, written, position, taxonomy_version)
    VALUES (1, 'algu-uid', ?, ?, ?, 0, 0)`);
  const vells = [
    ['ortografia', 'col·legi', 'collegi', 'ela geminada'],
    ['ortografia', 'força', 'forsa', 'ç'],
    ['ortografia', 'haver', 'haber', 'b/v'],
    ['ortografia', 'passa', 'pasa', 's/ss'],
    ['accentuació', 'món', 'mon', 'diacrítics'],
    ['accentuació', 'raïm', 'raim', 'dièresi'],
    ['apostrofació', 'm’agrada', 'magrada', 'pronoms febles'],
    ['apostrofació', 'l’aigua', 'la aigua', 'apostrofació'],
    ['majúscules', 'Catalunya', 'catalunya', 'majúscules'],
  ];
  for (const [tipus, o, e] of vells) posa.run(tipus, o, e);
  bd.close();

  console.log('L\'historial que ja hi havia:');
  const db = arrenca();
  const files = db.prepare('SELECT type, expected AS original, taxonomy_version AS taxonomia FROM dictation_errors ORDER BY id').all();
  comprova('cada error passa a la seva regla', vells.map(v => v[3]), files.map(f => f.type));
  comprova('i queda marcat amb la versió del catàleg', 9,
    files.filter(f => f.taxonomia === T.VERSIO).length);

  console.log('\nI no es torna a fer:');
  db.prepare("UPDATE dictation_errors SET type = 'tocat' WHERE expected = 'força'").run();
  arrenca();
  comprova('les files ja marcades no es tornen a mirar', 'tocat',
    db.prepare("SELECT type FROM dictation_errors WHERE expected = 'força'").get().type);

  console.log('\nEls errors nous ja neixen classificats:');
  db.prepare(`INSERT INTO dictation_errors (dictation_id, uid, type, expected, written, position, taxonomy_version)
              VALUES (1, 'algu-uid', 'h', 'hora', 'ora', 0, ?)`).run(T.VERSIO);
  arrenca();
  comprova('una fila amb la versió posada no es toca', { type: 'h', taxonomia: T.VERSIO },
    db.prepare("SELECT type, taxonomy_version AS taxonomia FROM dictation_errors WHERE expected = 'hora'").get());

  console.log(falles === 0
    ? '\nL\'historial parla el mateix idioma que els errors nous\n'
    : `\n${falles} comprovacions fallen\n`);
} catch (e) {
  console.error('FALLA: ' + e.message);
  falles++;
} finally {
  for (const f of [BD, BD + '-wal', BD + '-shm']) { try { fs.unlinkSync(f); } catch {} }
}
process.exit(falles === 0 ? 0 : 1);

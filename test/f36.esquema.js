// El pas a l'esquema de la #36.
//
// Viu fora de `npm test` perquè escriu i esborra taules: és l'única part que
// **reescriu dades de veritat**, i les proves que ho fan van a part des de F25.
//
//   node test/f36.esquema.js
//
// El que es comprova no és que SQLite sàpiga copiar files, sinó les tres coses
// que fan que aquesta migració es pugui executar sobre dades de gent:
//
//   1. No es perd res, i es compta.
//   2. Passar-hi dues vegades no fa mal.
//   3. Qui tenia historial abans de Firebase el recupera en entrar.

const path = require('path');
const fs = require('fs');
const os = require('os');
const Database = require('better-sqlite3');

const BD = path.join(os.tmpdir(), `dictats-f36-${process.pid}.db`);
let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  console.log((ok ? '  OK   ' : '  FALLA') + '  ' + nom
    + (ok ? '' : `\n         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`));
  if (!ok) falles++;
}

function arrenca() {
  process.env.DICTATS_DB_PATH = BD;
  delete require.cache[require.resolve('../src/lib/db')];
  delete require.cache[require.resolve('../src/lib/migracio')];
  delete require.cache[require.resolve('../src/lib/esquema')];
  return require('../src/lib/db');
}

/** L'esquema d'abans, tal com estava a producció. */
function esquemaVell(bd) {
  bd.exec(`
    CREATE TABLE user_texts (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL,
      title TEXT NOT NULL, text TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE user_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL,
      text_id TEXT NOT NULL, text_title TEXT, level TEXT NOT NULL, score INTEGER,
      errors_count INTEGER, total_words INTEGER, feedback TEXT,
      feedback_generat INTEGER NOT NULL DEFAULT 0, completed_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE user_errors (id INTEGER PRIMARY KEY AUTOINCREMENT, progress_id INTEGER NOT NULL,
      email TEXT NOT NULL, level TEXT, text_id TEXT, type TEXT NOT NULL, original TEXT,
      user_wrote TEXT, position INTEGER, counted INTEGER NOT NULL DEFAULT 1, explanation TEXT,
      generada INTEGER NOT NULL DEFAULT 0, taxonomia INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE repesca (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL,
      text_id TEXT NOT NULL, frase INTEGER NOT NULL, passada INTEGER NOT NULL DEFAULT 0,
      toca_el TEXT NOT NULL, fallades INTEGER NOT NULL DEFAULT 1,
      creada TEXT DEFAULT (datetime('now')), UNIQUE (email, text_id, frase));
    CREATE TABLE micro_dies (email TEXT NOT NULL, dia TEXT NOT NULL,
      targetes INTEGER NOT NULL DEFAULT 0, encerts INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (email, dia));
    CREATE TABLE escriptures (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL,
      tema TEXT, paraules INTEGER NOT NULL, observacions INTEGER NOT NULL DEFAULT 0,
      model TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE content_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL,
      kind TEXT NOT NULL, content TEXT NOT NULL, context TEXT, reason TEXT, model TEXT,
      created_at TEXT DEFAULT (datetime('now')), reviewed INTEGER NOT NULL DEFAULT 0);
  `);
}

const ANNA = 'anna@exemple.cat';
const BRU = 'Bru@Exemple.CAT';          // amb majúscules a posta

try {
  for (const f of [BD, BD + '-wal', BD + '-shm']) { try { fs.unlinkSync(f); } catch {} }

  const bd = new Database(BD);
  esquemaVell(bd);
  bd.prepare(`INSERT INTO user_progress (email,text_id,text_title,level,score,errors_count,total_words,feedback,feedback_generat)
              VALUES (?,'b1','El matí','basic',88,3,26,'Molt bé',1)`).run(ANNA);
  bd.prepare(`INSERT INTO user_progress (email,text_id,text_title,level,score,errors_count,total_words)
              VALUES (?,'b2','La família','basic',94,2,34)`).run(BRU);
  bd.prepare(`INSERT INTO user_errors (progress_id,email,level,text_id,type,original,user_wrote,position,counted,explanation,generada,taxonomia)
              VALUES (1,?,'basic','b1','accentuació','família','familia',2,1,'Revisa l accent',1,2)`).run(ANNA);
  // Un error que apunta a un dictat que ja no existeix. Mai hi va haver clau
  // aliena que ho impedís, i n'hi havia 26 a la base local.
  bd.prepare(`INSERT INTO user_errors (progress_id,email,level,text_id,type,original,user_wrote,position,counted)
              VALUES (999,?,'basic','b1','b/v','blau','vlau',5,1)`).run(ANNA);
  bd.prepare("INSERT INTO user_texts (email,title,text) VALUES (?,'El meu text','Una frase. || I una altra.')").run(BRU);
  bd.prepare("INSERT INTO repesca (email,text_id,frase,passada,toca_el,fallades) VALUES (?,'b1',0,1,'2026-09-11',2)").run(ANNA);
  bd.prepare("INSERT INTO micro_dies (email,dia,targetes,encerts) VALUES (?,'2026-09-08',8,6)").run(ANNA);
  bd.prepare("INSERT INTO escriptures (email,tema,paraules,observacions,model) VALUES (?,'t1',120,7,'claude-opus-4-6')").run(BRU);
  bd.prepare("INSERT INTO content_reports (email,kind,content,reviewed) VALUES (?,'explicacio','una explicació dolenta',1)").run(ANNA);
  bd.close();

  const db = arrenca();
  const q = (s, ...a) => db.prepare(s).all(...a);
  const un = (s, ...a) => db.prepare(s).get(...a);

  console.log('\nNo es perd res pel camí:');
  comprova('els dos dictats hi són', 2, un('SELECT count(*) c FROM dictations').c);
  comprova('i els dos errors també', 2, un('SELECT count(*) c FROM dictation_errors').c);
  comprova('el text propi', 1, un('SELECT count(*) c FROM custom_texts').c);
  comprova('el repàs', 1, un('SELECT count(*) c FROM phrase_reviews').c);
  comprova('el dia de targetes', 1, un('SELECT count(*) c FROM daily_cards').c);
  comprova('l\'escriptura', 1, un('SELECT count(*) c FROM writings').c);
  comprova('la denúncia', 1, un('SELECT count(*) c FROM content_reports').c);

  console.log('\nLes columnes diuen el que guarden:');
  const d = un("SELECT * FROM dictations WHERE text_id = 'b1'");
  comprova('errors_count passa a error_count', 3, d.error_count);
  comprova('total_words passa a word_count', 26, d.word_count);
  comprova('feedback_generat passa a feedback_generated', 1, d.feedback_generated);
  const e = un("SELECT * FROM dictation_errors WHERE expected = 'família'");
  comprova('original passa a expected', 'família', e.expected);
  comprova('user_wrote passa a written', 'familia', e.written);
  comprova('taxonomia passa a taxonomy_version', true, e.taxonomy_version > 0);
  const r = un('SELECT * FROM phrase_reviews');
  comprova('frase passa a phrase_index', 0, r.phrase_index);
  comprova('passada passa a streak', 1, r.streak);
  comprova('toca_el passa a due_on, que és data local', '2026-09-11', r.due_on);
  const c = un('SELECT * FROM daily_cards');
  comprova('targetes i encerts passen a card_count i correct_count', [8, 6], [c.card_count, c.correct_count]);
  const w = un('SELECT * FROM writings');
  comprova('tema, paraules i observacions', ['t1', 120, 7], [w.topic, w.word_count, w.observation_count]);
  comprova('i writings segueix sense columna de text', false,
    db.prepare('PRAGMA table_info(writings)').all().some((x) => x.name === 'text' || x.name === 'body'));

  console.log('\nL\'error orfe es conserva, no es perd:');
  comprova('el seu dictat és NUL, que és la veritat', null,
    un("SELECT dictation_id FROM dictation_errors WHERE expected = 'blau'").dictation_id);
  comprova('però l\'error hi és i encara fa targeta', 'b/v',
    un("SELECT type FROM dictation_errors WHERE expected = 'blau'").type);

  console.log('\nEl correu surt de sis taules i es queda a una:');
  comprova('users té les dues persones', 2, un('SELECT count(*) c FROM users').c);
  comprova('el uid provisional diu el que és', 'email:anna@exemple.cat',
    un('SELECT uid FROM users WHERE email = ?', ANNA).uid);
  comprova('les majúscules del correu no fan dos comptes', 'email:bru@exemple.cat',
    un('SELECT uid FROM users WHERE email = ?', BRU).uid);
  comprova('cap taula més guarda el correu', [],
    ['dictations', 'dictation_errors', 'custom_texts', 'phrase_reviews', 'daily_cards', 'writings']
      .filter((t) => db.prepare(`PRAGMA table_info(${t})`).all().some((x) => x.name === 'email')));

  console.log('\nreviewed 0/1 passa a una data:');
  comprova('la que estava revisada porta data', true,
    !!un('SELECT reviewed_at FROM content_reports').reviewed_at);

  console.log('\nLes taules velles ja no hi són:');
  comprova('cap', [], q(`SELECT name FROM sqlite_master WHERE type='table' AND name IN
    ('user_progress','user_errors','user_texts','repesca','micro_dies','escriptures','content_reports_vell')`));

  console.log('\nPassar-hi dues vegades no fa mal:');
  arrenca();
  const db2 = arrenca();
  comprova('els dictats segueixen sent dos', 2, db2.prepare('SELECT count(*) c FROM dictations').get().c);
  comprova('i les persones, dues', 2, db2.prepare('SELECT count(*) c FROM users').get().c);

  console.log('\nQui tenia historial el recupera en entrar amb Firebase:');
  const mogudes = db2.adopta('uidDeFirebaseDeLAnna', ANNA);
  comprova('es mouen totes les seves files', 6, mogudes);
  comprova('els seus dictats són seus', 1,
    db2.prepare("SELECT count(*) c FROM dictations WHERE uid = 'uidDeFirebaseDeLAnna'").get().c);
  comprova('i els seus errors també', 2,
    db2.prepare("SELECT count(*) c FROM dictation_errors WHERE uid = 'uidDeFirebaseDeLAnna'").get().c);
  comprova('el uid provisional desapareix', undefined,
    db2.prepare('SELECT uid FROM users WHERE uid = ?').get('email:anna@exemple.cat'));
  comprova('el Bru no s\'ha mogut', 1,
    db2.prepare("SELECT count(*) c FROM dictations WHERE uid = 'email:bru@exemple.cat'").get().c);
  comprova('tornar-hi no mou res', 0, db2.adopta('uidDeFirebaseDeLAnna', ANNA));

  console.log('\nEsborrar la persona s\'endú el que hi penja, sense llista:');
  db2.prepare("DELETE FROM users WHERE uid = 'uidDeFirebaseDeLAnna'").run();
  comprova('dictats', 0, db2.prepare("SELECT count(*) c FROM dictations WHERE uid = 'uidDeFirebaseDeLAnna'").get().c);
  comprova('errors', 0, db2.prepare("SELECT count(*) c FROM dictation_errors WHERE uid = 'uidDeFirebaseDeLAnna'").get().c);
  comprova('repàs', 0, db2.prepare("SELECT count(*) c FROM phrase_reviews WHERE uid = 'uidDeFirebaseDeLAnna'").get().c);
  comprova('targetes', 0, db2.prepare("SELECT count(*) c FROM daily_cards WHERE uid = 'uidDeFirebaseDeLAnna'").get().c);

  console.log(falles === 0
    ? '\nL\'historial arriba sencer a l\'esquema nou\n'
    : `\n${falles} comprovacions fallen\n`);
} catch (e) {
  console.error('FALLA: ' + e.message);
  falles = 1;
} finally {
  for (const f of [BD, BD + '-wal', BD + '-shm']) { try { fs.unlinkSync(f); } catch {} }
}
process.exit(falles === 0 ? 0 : 1);

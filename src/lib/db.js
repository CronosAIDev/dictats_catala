const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// En producció la BD viu fora de l'arbre del repo (/var/dictats/data) perquè
// els deploys per `git pull` no la toquin.
const DB_PATH = process.env.DICTATS_DB_PATH
  || path.join(__dirname, '../../data/dictats.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS user_texts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    text_id TEXT NOT NULL,
    text_title TEXT,
    level TEXT NOT NULL,
    score INTEGER,
    errors_count INTEGER,
    completed_at TEXT DEFAULT (datetime('now'))
  );

  -- Fins ara d'un dictat només en quedava un nombre: quants errors. La llista
  -- d'errors es pintava a la pantalla i es llençava, de manera que l'app no
  -- podia respondre l'única pregunta que es fa qui vol millorar: de què fallo.
  -- Aquí es desa cada error, un per fila.
  --
  -- La columna "counted" distingeix els errors que compten a l'escala dels que
  -- només són un avís: si la puntuació no s'ha dictat, no es pot penalitzar el
  -- que no s'ha pogut sentir, però sí que val la pena guardar-ho per veure el
  -- patró.
  -- Avisos sobre el contingut que escriu el model (F64).
  --
  -- Google Play tracta les apps que generen contingut amb IA com una àrea
  -- regulada, i exigeix poder denunciar contingut ofensiu SENSE sortir de
  -- l'app. A Dictats el model escriu l'explicació de cada error i el missatge
  -- final, i tots dos es mostren a qui practica.
  --
  -- Es desa el text tal com el va veure la persona: si es reescriu el prompt o
  -- es canvia de model, l'avís ha de seguir dient què es va denunciar.
  CREATE TABLE IF NOT EXISTS content_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    kind TEXT NOT NULL,          -- 'explicacio' | 'feedback'
    content TEXT NOT NULL,       -- el text denunciat, literal
    context TEXT,                -- la paraula i el tipus d'error, si n'hi ha
    reason TEXT,                 -- el que hi hagi volgut escriure la persona
    model TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    reviewed INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS user_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    progress_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    level TEXT,
    text_id TEXT,
    type TEXT NOT NULL,
    original TEXT,
    user_wrote TEXT,
    position INTEGER,
    counted INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_user_errors_email ON user_errors (email, created_at);
  CREATE INDEX IF NOT EXISTS idx_user_errors_type  ON user_errors (email, type);
  CREATE INDEX IF NOT EXISTS idx_user_progress_email ON user_progress (email, completed_at);
  -- Els avisos es miren pendents primer: és l'única consulta que en farà ningú.
  CREATE INDEX IF NOT EXISTS idx_reports_pendents ON content_reports (reviewed, created_at);
`);

// Migració: el nombre de paraules del dictat. Fa falta per als punts (F45),
// que valen més com més llarg i més difícil és el text. SQLite no té
// `ADD COLUMN IF NOT EXISTS`, així que es mira primer.
//
// Els dictats anteriors es queden amb NULL i `src/lib/rang.js` els estima per
// la mitjana del seu nivell: val més una aproximació que no pas que
// l'historial de qui ja feia servir l'app deixi de comptar de cop.
function afegeixColumnaSiFalta(taula, columna, definicio) {
  const columnes = db.prepare(`PRAGMA table_info(${taula})`).all();
  if (columnes.some((c) => c.name === columna)) return;
  db.exec(`ALTER TABLE ${taula} ADD COLUMN ${columna} ${definicio}`);
}

afegeixColumnaSiFalta('user_progress', 'total_words', 'INTEGER');

// Migració: on es desa el que escriu el model (F33).
//
// Fins ara les explicacions es demanaven a Claude DINS de la petició de
// correcció i es llençaven en tancar la pantalla. Això costava dues coses:
// l'usuari esperava uns segons amb un spinner mut per a una part del resultat
// que ja estava calculada, i el mateix error tornava a costar diners cada
// vegada que es volia tornar a veure.
//
// Desant-les, la segona crida a `/api/explicacions/:id` no torna a demanar res
// a l'API: és idempotent i gratis. També és el primer graó de F30, que vol un
// catàleg de fitxes de regla en comptes de text redactat de nou cada cop.
afegeixColumnaSiFalta('user_errors', 'explanation', 'TEXT');
afegeixColumnaSiFalta('user_errors', 'generada', 'INTEGER NOT NULL DEFAULT 0');
afegeixColumnaSiFalta('user_progress', 'feedback', 'TEXT');
afegeixColumnaSiFalta('user_progress', 'feedback_generat', 'INTEGER NOT NULL DEFAULT 0');

module.exports = db;

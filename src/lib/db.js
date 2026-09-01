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

module.exports = db;

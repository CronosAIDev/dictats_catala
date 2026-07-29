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
`);

module.exports = db;

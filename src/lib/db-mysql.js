// Base de dades pròpia de Dictats: usuaris i sessions.
//
// Viu a MySQL, al servidor compartit `cronosai`, amb TOTES les taules sota el
// prefix `dictats_` per no trepitjar les altres apps que comparteixen aquella
// base. És el mateix patró que `aicamper_app`, per decisió d'Óscar del 30-08
// (Issue #16): no s'inventa res, es copia el que ja funciona.
//
// El PROGRÉS es queda a SQLite (`src/lib/db.js`) i no es mou. Són dades locals
// de l'app, indexades per correu, i el mateix criteri que aicamper amb la seva
// base de pernocta. Com que la clau segueix sent el correu, qui entri amb el
// mateix email conserva els seus dictats.
//
// SQL directe, sense ORM. El driver és `mysql2/promise`, així que tot el que
// toca la base és asíncron: els helpers `all/get/run` calquen el model de
// better-sqlite3 perquè la resta del codi es llegeixi igual, només que amb
// `await` al davant.

const mysql = require('mysql2/promise');

// Prefix de totes les taules d'aquesta app dins de la base compartida.
// Configurable només perquè les proves puguin treballar amb el seu propi joc de
// taules; en producció la variable no existeix i el prefix és el de sempre.
const P = process.env.DB_PREFIJO || 'dictats_';

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

// Sense credencials no es crea cap pool: així un desplegament a mig configurar
// falla en dir-ho, i no en la primera consulta amb un error del driver.
function estaConfigurada() {
  return !!(config.user && config.database);
}

let pool = null;
function obtePool() {
  if (!estaConfigurada()) {
    throw new Error('La base de dades d\'usuaris no està configurada (falten DB_USER i DB_NAME)');
  }
  if (!pool) {
    pool = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_POOL) || 5,
      charset: 'utf8mb4',
      // Dates com a text i no com a Date, per conservar el mateix tipus que
      // dona SQLite a la resta de l'app.
      dateStrings: true,
      timezone: 'Z',
    });
  }
  return pool;
}

// ── Helpers. `?` com a marcador, igual que a SQLite ──────────

async function all(sql, params = []) {
  const [files] = await obtePool().execute(sql, params);
  return files;
}

async function get(sql, params = []) {
  const files = await all(sql, params);
  return files[0] || null;
}

// Torna el ResultSetHeader: `insertId` (era `lastInsertRowid`) i `affectedRows`
// (era `changes`).
async function run(sql, params = []) {
  const [res] = await obtePool().execute(sql, params);
  return res;
}

// La config de sessions surt d'aquí perquè `express-mysql-session` obri la seva
// pròpia connexió amb les mateixes dades, sense repetir-les a `src/index.js`.
function configDeSessions() {
  return { ...config, charset: 'utf8mb4_general_ci' };
}

module.exports = { all, get, run, P, estaConfigurada, configDeSessions, config };

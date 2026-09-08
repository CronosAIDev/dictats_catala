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

const esquema = require('./esquema');
const migracio = require('./migracio');

// L'ordre importa i el va ensenyar una còpia de producció de veritat:
// `content_reports` conserva el nom i canvia de forma, així que s'ha d'apartar
// ABANS de crear l'esquema. Si no, el CREATE TABLE IF NOT EXISTS no fa res i el
// CREATE INDEX sobre una columna que encara no existeix atura l'arrencada.
// Les tres passes van dins d'UNA transacció. Separades, una còpia que peta
// deixava les taules noves creades i les velles reanomenades: un estat a mig
// fer que a la següent arrencada ja no es reconeix. Ho va ensenyar una còpia de
// producció, i la segona vegada la base local ja estava a mitges.
db.pragma('foreign_keys = ON');
let migrat = null;
db.transaction(() => {
  migracio.abansDeLEsquema(db);
  db.exec(esquema.TAULES);
  migrat = migracio.migra(db);
})();
if (migrat) {
  const quantes = Object.entries(migrat)
    .filter(([k]) => k !== 'persones')
    .map(([k, v]) => `${k} ${v}`).join(', ');
  console.log(`Esquema #36: migrat (${migrat.persones} persones) ${quantes || 'sense files'}.`);
}

// ── Reclassificar l'historial amb el catàleg d'avui (F25) ────
//
// `taxonomia.classifica` és una funció pura de (esperat, escrit), així que les
// files que ja hi ha es poden tornar a mirar. **I s'ha de fer**: sense això,
// «de què falles» diria «14 errors d'ortografia» de tot el passat, que és
// precisament la resposta que no serveix.
//
// `taxonomy_version` és el número de versió del catàleg; només es toquen les
// files que en porten una d'anterior, així que passar-hi dues vegades no fa
// res. El que NO es pot recuperar és `per/per a`: depèn de la paraula del
// costat i les files no la desen.
function reclassifica() {
  const taxonomia = require('./taxonomia');
  const pendents = db.prepare(
    'SELECT id, expected, written FROM dictation_errors WHERE taxonomy_version < ?'
  ).all(taxonomia.VERSIO);
  if (pendents.length === 0) return;

  const actualitza = db.prepare(
    'UPDATE dictation_errors SET type = ?, taxonomy_version = ? WHERE id = ?'
  );
  const totes = db.transaction((files) => {
    for (const f of files) {
      actualitza.run(taxonomia.classifica(f.expected, f.written), taxonomia.VERSIO, f.id);
    }
  });
  totes(pendents);
  console.log(`Taxonomia F25: ${pendents.length} errors reclassificats.`);
}
reclassifica();

db.adopta = (uid, email) => migracio.adopta(db, uid, email);

module.exports = db;

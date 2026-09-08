// De l'esquema antic al de la #36.
//
// Es fa una sola vegada i sola: en arrencar, si encara hi ha les taules velles,
// es copien files a files a les noves i s'esborren les velles.
//
// ── Les tres coses que la fan segura ─────────────────────────
//
// 1. **Tot dins d'una transacció.** Si qualsevol pas peta, SQLite ho desfà i la
//    base queda com estava. No hi ha cap estat intermedi que es pugui desar.
// 2. **Es compten les files abans i després**, i si no coincideixen es llança i
//    per tant es desfà. Copiar de menys és pitjor que no copiar.
// 3. **Les velles no s'esborren fins que la còpia està comptada.**
//
// ── Què passa amb qui ja tenia historial ─────────────────────
// Estava indexat per correu i encara no té `uid` de Firebase. Se li dona un
// identificador provisional que diu el que és (`email:algu@exemple.cat`) i es
// crea la seva fila a `users`. La primera vegada que entri, `adopta()` ho passa
// tot al seu `uid` de veritat.

const { uidDe } = require('./esquema');

/** Les taules velles que encara hi són. */
function velles(db) {
  const hi = new Set(db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table'"
  ).all().map((r) => r.name));
  return ['user_progress', 'user_errors', 'user_texts', 'repesca',
    'micro_dies', 'escriptures', 'content_reports_vell'].filter((t) => hi.has(t));
}

/** Si `content_reports` encara té la columna `email`, és la vella. */
function reportsVells(db) {
  const hi = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='content_reports'").get();
  if (!hi) return false;
  return db.prepare('PRAGMA table_info(content_reports)').all().some((c) => c.name === 'email');
}

const compta = (db, t) => db.prepare('SELECT count(*) AS c FROM ' + t).get().c;

/**
 * El pas que ha d'anar **abans** de crear l'esquema nou.
 *
 * `content_reports` és l'única taula que conserva el nom i canvia de forma. Si
 * es deixa on és, el `CREATE TABLE IF NOT EXISTS` de l'esquema no fa res —ja
 * existeix— i tot seguit el `CREATE INDEX` sobre `reviewed_at` peta, perquè la
 * taula que hi ha no té aquella columna.
 *
 * Es va veure provant la migració contra una còpia de producció de veritat:
 * amb una base buida no passa, i hauria petat l'arrencada en desplegar.
 */
function abansDeLEsquema(db) {
  if (!reportsVells(db)) return;
  db.exec('ALTER TABLE content_reports RENAME TO content_reports_vell');
}

/**
 * @returns {null|object} què s'ha migrat, o `null` si no hi havia res a fer.
 */
function migra(db) {
  const pendents = velles(db).filter((t) => t !== 'content_reports_vell');
  const reports = !!db.prepare(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='content_reports_vell'"
  ).get();
  if (!pendents.length && !reports) return null;

  // La còpia i l'esborrat, o cap de les dues coses.
  const fer = db.transaction(() => {
    const fet = {};
    const teTaula = (t) => pendents.includes(t);

    // Primer les persones: totes les altres taules hi apunten amb una clau
    // aliena, així que si no hi són primer, la còpia es negaria.
    const correus = new Set();
    for (const [taula, col] of [['user_progress', 'email'], ['user_errors', 'email'],
      ['user_texts', 'email'], ['repesca', 'email'], ['micro_dies', 'email'],
      ['escriptures', 'email']]) {
      if (!teTaula(taula)) continue;
      for (const r of db.prepare('SELECT DISTINCT ' + col + ' AS e FROM ' + taula).all()) {
        if (r.e) correus.add(r.e);
      }
    }
    if (reports) {
      for (const r of db.prepare('SELECT DISTINCT email AS e FROM content_reports_vell').all()) {
        if (r.e) correus.add(r.e);
      }
    }
    const posaUsuari = db.prepare(
      'INSERT OR IGNORE INTO users (uid, email) VALUES (?, ?)'
    );
    for (const e of correus) posaUsuari.run(uidDe(e), e);
    fet.persones = correus.size;

    const copia = (vella, nova, sql) => {
      if (!teTaula(vella)) return;
      const abans = compta(db, vella);
      db.exec(sql);
      const despres = compta(db, nova);
      if (despres !== abans) {
        throw new Error(`${vella}: hi havia ${abans} files i n'han arribat ${despres}`);
      }
      fet[nova] = abans;
    };

    copia('user_texts', 'custom_texts', `
      INSERT INTO custom_texts (id, uid, title, body, created_at)
      SELECT id, 'email:' || lower(trim(email)), title, text, created_at FROM user_texts`);

    copia('user_progress', 'dictations', `
      INSERT INTO dictations (id, uid, text_id, text_title, level, score,
                              error_count, word_count, feedback, feedback_generated, completed_at)
      SELECT id, 'email:' || lower(trim(email)), text_id, text_title, level, score,
             errors_count, total_words, feedback, COALESCE(feedback_generat, 0), completed_at
      FROM user_progress`);

    copia('user_errors', 'dictation_errors', `
      INSERT INTO dictation_errors (id, dictation_id, uid, level, text_id, type,
                                    expected, written, position, counted,
                                    explanation, explanation_generated, taxonomy_version, created_at)
      SELECT id,
             -- L'orfe es queda sense dictat en comptes de perdre's.
             (SELECT p.id FROM user_progress p WHERE p.id = e.progress_id),
             'email:' || lower(trim(email)), level, text_id, type,
             original, user_wrote, position, counted,
             explanation, COALESCE(generada, 0), COALESCE(taxonomia, 0), created_at
      FROM user_errors e`);

    copia('repesca', 'phrase_reviews', `
      INSERT INTO phrase_reviews (id, uid, text_id, phrase_index, streak, due_on, fail_count, created_at)
      SELECT id, 'email:' || lower(trim(email)), text_id, frase, passada, toca_el, fallades, creada
      FROM repesca`);

    copia('micro_dies', 'daily_cards', `
      INSERT INTO daily_cards (uid, day_on, card_count, correct_count)
      SELECT 'email:' || lower(trim(email)), dia, targetes, encerts FROM micro_dies`);

    copia('escriptures', 'writings', `
      INSERT INTO writings (id, uid, topic, word_count, observation_count, model, created_at)
      SELECT id, 'email:' || lower(trim(email)), tema, paraules, observacions, model, created_at
      FROM escriptures`);

    if (reports) {
      const abans = compta(db, 'content_reports_vell');
      // `reviewed` era 0/1 i no desava quan. Els que ja estaven revisats es
      // queden amb la data de creació, que és l'única fita certa que en tenim:
      // sabem que es va revisar DESPRÉS d'això, no exactament quan.
      db.exec(`
        INSERT INTO content_reports (id, uid, kind, content, context, reason, model, created_at, reviewed_at)
        SELECT id, 'email:' || lower(trim(email)), kind, content, context, reason, model, created_at,
               CASE WHEN reviewed = 1 THEN created_at ELSE NULL END
        FROM content_reports_vell
      `);
      const despres = compta(db, 'content_reports');
      if (despres !== abans) throw new Error(`content_reports: hi havia ${abans} files i n'han arribat ${despres}`);
      db.exec('DROP TABLE content_reports_vell');
      fet.content_reports = abans;
    }

    for (const t of pendents) db.exec('DROP TABLE IF EXISTS ' + t);
    return fet;
  });

  return fer();
}

/**
 * Qui torna després de Firebase recupera el seu historial.
 *
 * Es crida en obrir sessió. Si hi ha files amb el `uid` provisional d'aquest
 * correu, passen al `uid` de veritat. És la promesa de la Fase 0.
 *
 * @returns {number} quantes files s'han mogut (0 és el cas normal)
 */
function adopta(db, uid, email) {
  if (!uid || !email) return 0;
  const vell = uidDe(email);
  if (vell === uid) return 0;
  const teVell = db.prepare('SELECT 1 FROM users WHERE uid = ?').get(vell);
  if (!teVell) return 0;

  const mou = db.transaction(() => {
    // La fila de la persona ha d'existir abans de moure-li res: totes les
    // taules hi apunten amb una clau aliena. Es posa aquí i no només a
    // `/api/session` perquè això ha de ser correcte tant si es crida abans com
    // després, i no per l'ordre en què va tocar escriure-ho.
    db.prepare('INSERT OR IGNORE INTO users (uid, email) VALUES (?, ?)').run(uid, email);
    let n = 0;
    for (const t of ['custom_texts', 'dictations', 'dictation_errors',
      'phrase_reviews', 'daily_cards', 'writings', 'content_reports']) {
      n += db.prepare('UPDATE ' + t + ' SET uid = ? WHERE uid = ?').run(uid, vell).changes;
    }
    db.prepare('DELETE FROM users WHERE uid = ?').run(vell);
    return n;
  });
  const mogudes = mou();
  if (mogudes) console.log(`Historial recuperat: ${mogudes} files de ${email}.`);
  return mogudes;
}

module.exports = { abansDeLEsquema, migra, adopta, velles };

// L'esquema, i el pas de l'antic al d'ara (#36).
//
// ── La convenció ─────────────────────────────────────────────
// Tot en anglès, que és la norma de Cronos per a la infraestructura; el
// producte va en català. A més:
//
//   · La persona és `uid` amb aquest nom exacte a tota taula i tota app.
//   · El correu viu **només** a `users`. Abans era a set taules: donar de baixa
//     eren set esborrats i n'hi havia prou d'oblidar-ne un.
//   · `_at` és un moment amb hora, en UTC. `_on` és una data **local**, sense
//     hora. La ratxa i la repesca depenen del dia local i abans això no es veia.
//   · `_count` per als comptadors.
//   · Un booleà amb data es desa com a data que pot ser nul·la: `reviewed_at`
//     diu **si** i **quan**, on abans `reviewed` només deia si.
//   · Claus alienes amb `ON DELETE CASCADE`, i el pragma activat perquè les
//     apliqui el motor i no la disciplina.
//
// ── El `uid` provisional ─────────────────────────────────────
// L'historial d'abans de Firebase està indexat per correu i aquella gent encara
// no té `uid`. Aquestes files reben un identificador que **diu el que és**:
//
//     email:algu@exemple.cat
//
// La primera vegada que aquesta persona entra amb Firebase, `adopta()` ho passa
// tot al seu `uid` de veritat. És la promesa de la Fase 0 —qui repeteixi correu
// recupera el seu historial— i és verificable d'un cop d'ull perquè el
// provisional es veu a simple vista.

const PROVISIONAL = 'email:';

/** El `uid` provisional d'un correu d'abans de Firebase. */
const uidDe = (email) => PROVISIONAL + String(email || '').trim().toLowerCase();

const TAULES = `
  -- Qui ets. Firebase contesta la identitat i emet el uid; aquí hi ha el que
  -- l'app necessita saber de tu i que Firebase no ha de saber.
  --
  -- El correu hi és per dues raons i cap és tècnica: el formulari de Data Safety
  -- el declara, i sense ell una petició de baixa per correu no es pot resoldre.
  -- **No s'indexa res per correu**: un compte pot canviar d'adreça i el uid no
  -- canvia mai.
  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    email TEXT,
    display_name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    last_seen_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

  -- Els textos que s'escriu la persona. Abans user_texts.
  CREATE TABLE IF NOT EXISTS custom_texts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_custom_texts_uid ON custom_texts (uid, created_at);

  -- Un dictat fet. Abans es deia user_progress, que no era el que hi ha: no és
  -- progrés, és un dictat. Aquell nom és la raó per la qual l'escriptura lliure
  -- va haver d'explicar per què no hi entrava.
  CREATE TABLE IF NOT EXISTS dictations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    text_id TEXT NOT NULL,
    text_title TEXT,
    level TEXT NOT NULL,
    score INTEGER,
    error_count INTEGER,
    word_count INTEGER,
    feedback TEXT,
    feedback_generated INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_dictations_uid ON dictations (uid, completed_at);

  -- Un error, una fila. La columna counted distingeix els que compten a
  -- l'escala dels que només són un avís: si la puntuació no s'ha dictat, no es
  -- pot penalitzar el que no s'ha pogut sentir.
  --
  -- expected/written eren original/user_wrote: ara són simètrics i no diuen
  -- «user» dins d'una taula on tot és de l'usuari.
  -- taxonomy_version era «taxonomia», que sonava a categoria i és un número de
  -- versió del catàleg.
  CREATE TABLE IF NOT EXISTS dictation_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Pot ser NUL, i no per comoditat: a l'historial d'abans hi ha errors que
    -- apunten a un dictat que ja no existeix (mai hi va haver clau aliena que
    -- ho impedís). Esborrar-los seria perdre errors de veritat que les targetes
    -- de 60 segons encara fan servir —només necessiten el tipus i les dues
    -- formes—, així que es conserven amb el dictat a NUL, que **diu la veritat**:
    -- aquest error existeix i el seu dictat ja no. Dels nous se n'encarrega el
    -- CASCADE.
    dictation_id INTEGER REFERENCES dictations(id) ON DELETE CASCADE,
    uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    level TEXT,
    text_id TEXT,
    type TEXT NOT NULL,
    expected TEXT,
    written TEXT,
    position INTEGER,
    counted INTEGER NOT NULL DEFAULT 1,
    explanation TEXT,
    explanation_generated INTEGER NOT NULL DEFAULT 0,
    taxonomy_version INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_dictation_errors_uid  ON dictation_errors (uid, created_at);
  CREATE INDEX IF NOT EXISTS idx_dictation_errors_type ON dictation_errors (uid, type);

  -- Les frases fallades tornen. Abans repesca.
  --
  -- due_on acaba en _on perquè és una data LOCAL: comparar-la amb UTC faria que
  -- una frase toqués un dia abans o després segons l'hora a què es va fer.
  CREATE TABLE IF NOT EXISTS phrase_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    text_id TEXT NOT NULL,
    phrase_index INTEGER NOT NULL,
    streak INTEGER NOT NULL DEFAULT 0,
    due_on TEXT NOT NULL,
    fail_count INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE (uid, text_id, phrase_index)
  );
  CREATE INDEX IF NOT EXISTS idx_phrase_reviews_due ON phrase_reviews (uid, due_on);

  -- Quantes targetes cada dia. Una fila per dia, no per targeta.
  CREATE TABLE IF NOT EXISTS daily_cards (
    uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    day_on TEXT NOT NULL,
    card_count INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (uid, day_on)
  );

  -- Escriptura lliure. Fixeu-vos en el que NO hi ha: cap columna amb el text.
  -- El que s'escriu no es desa enlloc, com la foto d'un dictat a mà.
  CREATE TABLE IF NOT EXISTS writings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    topic TEXT,
    word_count INTEGER NOT NULL,
    observation_count INTEGER NOT NULL DEFAULT 0,
    model TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_writings_uid ON writings (uid, created_at);

  -- Denúncies de contingut generat per IA, que Play exigeix poder fer.
  -- reviewed_at substitueix el reviewed 0/1: diu si i quan.
  CREATE TABLE IF NOT EXISTS content_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL,
    kind TEXT NOT NULL,
    content TEXT NOT NULL,
    context TEXT,
    reason TEXT,
    model TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    reviewed_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_content_reports_pending ON content_reports (reviewed_at, created_at);
`;

module.exports = { TAULES, PROVISIONAL, uidDe };

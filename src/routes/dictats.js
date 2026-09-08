const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const Anthropic = require('@anthropic-ai/sdk');
const requireAuth = require('../middleware/requireAuth');
const limitaCorreccions = require('../middleware/limitaCorreccions');
const db = require('../lib/db');
const { compara } = require('../lib/diff');
const rang = require('../lib/rang');
const motivacio = require('../lib/motivacio');
const textos = require('../lib/textos');
const progres = require('../lib/progres');
const taxonomia = require('../lib/taxonomia');
const onfalles = require('../lib/onfalles');
const repesca = require('../lib/repesca');
const micro = require('../lib/micro');
const escriptura = require('../lib/escriptura');
const temes = require('../../data/temes');
const { treuPuntuacio } = require('../lib/paraules');
const texts = require('../../data/texts');

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// El model surt de l'entorn per no haver de tocar codi el dia que es canviï.
// Des que la comparació es fa aquí (F31), a Claude només li queda explicar, que
// és feina que cabria en un model més petit i més barat — però quin model s'hi
// posa és una decisió del projecte, no d'aquest fitxer.
const MODEL = process.env.DICTATS_MODEL || 'claude-opus-4-6';

// ── Escala motivadora ────────────────────────────────────────
function getScale(errorsCount) {
  if (errorsCount === 0) return { label: 'Excel·lent!', sub: 'Cap error. Perfecte!', cls: 'scale-excellent' };
  if (errorsCount <= 2)  return { label: 'Molt bé!',    sub: 'Quasi perfecte',       cls: 'scale-great' };
  if (errorsCount <= 5)  return { label: 'Bé!',         sub: 'Bon progrés',          cls: 'scale-good' };
  if (errorsCount <= 9)  return { label: 'Progressant!',sub: 'Continua practicant',  cls: 'scale-ok' };
  return                        { label: 'Segueix!',    sub: 'Amb pràctica ho aconseguiràs', cls: 'scale-keep' };
}

// ── Texts predefinits ────────────────────────────────────────

/**
 * Què se sap de cada text per a aquesta persona (F35).
 *
 * S'agrupa per `text_id` i **no es filtra per nivell**: els identificadors ja
 * són únics entre nivells (`b1`, `i1`, `a1`, `personal_7`) i així també
 * compten les files antigues, que es van desar amb `level = 'unknown'` quan
 * encara no s'enviava.
 */
function historialPerText(uid) {
  return db.prepare(`
    SELECT text_id,
           COUNT(*)           AS vegades,
           MIN(error_count)  AS millor,
           MAX(completed_at)  AS ultima
    FROM dictations
    WHERE uid = ?
    GROUP BY text_id
  `).all(uid);
}

/**
 * Afegeix a la llista el que se'n sap i marca quin es proposa.
 *
 * La resposta segueix sent un **array**: qui ja la consumia no s'assabenta.
 * La recomanació viatja com un camp de l'element (`seguent`), no com una
 * clau germana, per no trencar-ho.
 */
function ambProgres(llista, uid) {
  const marcats = textos.marca(llista, historialPerText(uid));
  const prop = textos.seguent(marcats);
  return marcats.map(t => (prop && t.id === prop.id
    ? { ...t, seguent: true, motiu: prop.motiu }
    : { ...t, seguent: false, motiu: null }));
}

router.get('/texts/:level', requireAuth, (req, res) => {
  const { level } = req.params;
  if (!texts[level]) return res.status(400).json({ error: 'Nivell no vàlid' });
  const list = texts[level].map(t => ({
    id: t.id, title: t.title, description: t.description,
    wordCount: t.text.replace(/\|\|/g, '').split(/\s+/).length,
  }));
  res.json(ambProgres(list, req.session.profile.uid));
});

router.get('/texts/:level/:id', requireAuth, (req, res) => {
  const { level, id } = req.params;
  if (!texts[level]) return res.status(400).json({ error: 'Nivell no vàlid' });
  const text = texts[level].find(t => t.id === id);
  if (!text) return res.status(404).json({ error: 'Text no trobat' });
  res.json(text);
});

// ── Textos personals ─────────────────────────────────────────
router.get('/user-texts', requireAuth, (req, res) => {
  const rows = db.prepare(
    'SELECT id, title, body AS text, created_at FROM custom_texts WHERE uid = ? ORDER BY created_at DESC'
  ).all(req.session.profile.uid);
  const list = rows.map(r => ({
    id: 'personal_' + r.id,
    dbId: r.id,
    title: r.title,
    text: r.text,
    description: 'Text personal',
    wordCount: r.text.replace(/\|\|/g, '').split(/\s+/).length,
    created_at: r.created_at,
  }));
  res.json(ambProgres(list, req.session.profile.uid));
});

router.post('/user-texts', requireAuth, (req, res) => {
  const { title, text } = req.body;
  if (!title || !text) return res.status(400).json({ error: 'Cal títol i text' });
  const result = db.prepare(
    'INSERT INTO custom_texts (uid, title, body) VALUES (?, ?, ?)'
  ).run(req.session.profile.uid, title.trim(), text.trim());
  res.json({ ok: true, id: result.lastInsertRowid });
});

router.delete('/user-texts/:id', requireAuth, (req, res) => {
  db.prepare(
    'DELETE FROM custom_texts WHERE id = ? AND uid = ?'
  ).run(req.params.id, req.session.profile.uid);
  res.json({ ok: true });
});

// ── Repesca (F27) ────────────────────────────────────────────

/** El text que hi ha darrere d'un `text_id`, sigui del banc o personal. */
function textDe(uid, textId) {
  const id = String(textId || '');
  if (id.startsWith('personal_')) {
    const fila = db.prepare('SELECT body AS text FROM custom_texts WHERE id = ? AND uid = ?')
      .get(id.slice('personal_'.length), uid);
    return fila ? fila.text : null;
  }
  for (const nivell of Object.keys(texts)) {
    const t = texts[nivell].find((x) => x.id === id);
    if (t) return t.text;
  }
  return null;
}

/** Avui, en data local, que és amb el que es compara `due_on`. */
const avui = () => motivacio.dia(new Date());

/**
 * Apunta les frases fallades perquè tornin (F27).
 *
 * Només compten els errors que compten: si la puntuació no s'ha dictat, els
 * seus errors no han de fer tornar una frase que en realitat has escrit bé.
 *
 * Si la frase ja hi era, torna a baix de tot. Fallar-la avui vol dir que no la
 * saps, encara que fa una setmana l'encertessis.
 */
function apuntaFallades(uid, parelles) {
  if (!parelles.length) return;
  const dema = repesca.properaData(0, new Date());
  const posa = db.prepare(`
    INSERT INTO phrase_reviews (uid, text_id, phrase_index, streak, due_on)
    VALUES (?, ?, ?, 0, ?)
    ON CONFLICT (uid, text_id, phrase_index) DO UPDATE SET
      streak = 0, due_on = excluded.due_on, fail_count = fail_count + 1
  `);
  db.transaction((llista) => {
    for (const [textId, frase] of llista) posa.run(uid, textId, frase, dema);
  })(parelles);
}

/** De quines frases són els errors que compten, per a un text sencer. */
function frasesFallades(textOriginal, correccio) {
  const limits = repesca.talls(textOriginal);
  const fora = new Set();
  for (const e of correccio.errors) {
    const f = repesca.fraseDe(limits, e.position);
    if (f !== null) fora.add(f);
  }
  return [...fora];
}

// ── Correcció ────────────────────────────────────────────────
//
// L'ordre importa i és el canvi de fons d'aquesta versió:
//   1. La comparació es fa aquí, amb un algorisme, i és exacta.
//   2. Claude només escriu les explicacions.
// Si el pas 2 falla, el dictat es corregeix igual. Abans, un error de l'API
// deixava l'alumne sense correcció.

// Quan el model no ha explicat un error —perquè l'API ha fallat o encara no
// s'han demanat les explicacions— es diu la regla de la categoria. Viu al
// catàleg de F25 i no aquí, perquè la categoria i el que se'n diu no es puguin
// separar.
const perDefecte = (tipus) => taxonomia.regla(tipus);

const PROMPT_EXPLICACIONS = (diferencies) => `Ets un professor de català.

Un alumne ha fet un dictat i la comparació amb el text original ja està feta, paraula per paraula. NO l'has de refer ni discutir: dona-la per bona.

Cada diferència ja porta la seva regla al camp "regla": és la bona i NO l'has de canviar per una altra.

La teva única feina és, per a cada diferència, escriure una explicació breu en català (màxim 15 paraules) que apliqui AQUELLA regla a AQUESTA paraula i digui com es recorda. Escriu també un missatge final d'ànim de dues frases com a màxim.

DIFERÈNCIES:
${JSON.stringify(diferencies)}

Retorna NOMÉS aquest JSON, sense cap altre text:
{"explicacions": {"0": "...", "1": "..."}, "feedback": "..."}`;

function parseClaudeJSON(responseText) {
  try { return JSON.parse(responseText.trim()); }
  catch {
    const match = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]);
    throw new Error('Resposta invàlida de Claude');
  }
}

// L'alineació és O(n*m) i reserva una matriu de (n+1)*(m+1). Amb el límit
// de 100 kB del body, un text de milers de paraules reservaria centenars de
// megues i bloquejaria el bucle d'esdeveniments. Cap dictat real s'hi acosta.
const MAX_PARAULES = 3000;

// La puntuació arriba com a booleà pel JSON i com a text pel FormData de la foto.
function volPuntuacio(valor) {
  return valor === true || valor === 'true' || valor === '1';
}

function massaLlarg(text) {
  return String(text || '').split(/\s+/).length > MAX_PARAULES;
}

function corregeix(originalText, userText, puntuacioDictada) {
  const { paraules, errors } = compara(originalText, userText);

  // Si la puntuació no s'ha dictat, no es pot penalitzar el que no s'ha pogut
  // sentir. Es continua mostrant i desant, però com a avís: fora de l'escala.
  const compten = errors.filter(e => puntuacioDictada || e.type !== 'puntuació');
  const avisos = puntuacioDictada ? [] : errors.filter(e => e.type === 'puntuació');

  // Una paraula afegida no ocupa cap posició de l'original, així que no pot
  // restar de `correctWords`. Si no se sumen al denominador, escriure sis
  // paraules on n'hi havia tres donava «3 de 3 correctes» amb 3 errors i un
  // 100 de puntuació.
  const fallades = new Set(compten.map(e => e.position).filter(p => p !== null));
  const afegides = compten.filter(e => e.position === null).length;
  const totalWords = paraules.length;
  const correctWords = Math.max(0, totalWords - fallades.size);
  const base = totalWords + afegides;

  return {
    totalWords,
    correctWords,
    score: base ? Math.round((correctWords / base) * 100) : 0,
    errors: compten,
    warnings: avisos,
    scale: getScale(compten.length),
    feedback: '',
    punctuationDictated: !!puntuacioDictada,
  };
}

// ── Les explicacions, que arriben després (F33) ──────────────
//
// Abans això passava DINS de `/api/correct`: es corregia, s'esperava Claude i
// llavors es responia. Però des de F31 la correcció sencera —marques, escala,
// punts i rang— es calcula al servidor sense xarxa, o sigui que l'usuari
// esperava uns quants segons amb un spinner mut per la ÚNICA part que encara
// depèn del model: el text que explica cada falta.
//
// Ara la correcció surt de seguida i les explicacions vénen per una segona
// petició. Les dues coses que ja hi havia i que ho fan segur:
//
//   · Quan l'API falla, la regla de la categoria (F25) omple els buits. Ja era
//     així, i per això la separació no afegeix cap camí de fallada nou: el
//     pitjor cas de la segona petició és el mateix que el d'una API caiguda.
//   · `generada` distingeix el que escriu el model del que escrivim nosaltres,
//     que és el que necessita el botó de report (F64).

/** Omple amb text nostre el que el model no hagi escrit. Mai un error mut. */
function completaPerDefecte(llista, correccio) {
  llista.forEach((e) => {
    if (!e.explanation) e.explanation = perDefecte(e.type);
  });
  if (!correccio.feedback) correccio.feedback = correccio.scale.sub;
}

/**
 * Demana a Claude l'explicació de cada error i el missatge final, i les penja
 * de la mateixa llista. Rep la llista i no la correcció sencera perquè ara se
 * la crida des de dos llocs: la ruta d'explicacions, que la reconstrueix des
 * de la BD, i les proves.
 */
async function demanaExplicacions(llista, correccio) {
  correccio.feedbackGenerat = false;
  if (!llista.length) {
    correccio.feedback = 'Cap error. Impecable!';
    return;
  }

  const diferencies = llista.map((e, i) => ({
    id: i,
    correcte: e.original,
    escrit: e.userWrote,
    tipus: e.type,
    // La regla ja està decidida per l'algorisme (F25). Dir-la-hi evita que el
    // model n'expliqui una altra: sense això, davant de `caça`/`caca` parlava
    // d'accents.
    regla: taxonomia.regla(e.type),
  }));

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: PROMPT_EXPLICACIONS(diferencies) }],
    });
    const resposta = parseClaudeJSON(message.content[0].text);
    llista.forEach((e, i) => {
      const text = resposta.explicacions && resposta.explicacions[String(i)];
      // `generada` distingeix el que ha escrit el model del que hem escrit
      // nosaltres. Ho necessita el botó de report (F64): Play demana poder
      // denunciar el contingut generat amb IA, i oferir-ho sobre un text
      // nostre embrutaria els avisos amb coses que no són d'IA.
      if (text) { e.explanation = String(text); e.generada = true; }
    });
    if (resposta.feedback) {
      correccio.feedback = String(resposta.feedback);
      correccio.feedbackGenerat = true;
    }
  } catch (err) {
    console.error('Claude API error:', err.status, err.message);
  }

  // El que no hagi arribat —perquè l'API ha fallat, o perquè el model s'ha
  // deixat una entrada— es completa aquí. Val més una explicació genèrica que
  // un error mut.
  completaPerDefecte(llista, correccio);
}

// Els punts i el rang no es desen: es recalculen recorrent l'historial. Val
// una consulta més, i a canvi el dia que s'afini la fórmula tothom queda
// recol·locat sol, sense migracions ni comptadors desincronitzats.
// ── El que anima, amb dades que ja hi eren (#23) ─────────────
// Tres coses barates: la ratxa de dies seguits, la comparació amb un mateix i
// les fites de volum. Cap taula nova. La gamificació de debò (insígnies,
// reptes) espera a que hi hagi gent a qui retenir, tal com diu la Issue.

/** Total i mitjana d'errors ABANS del dictat que s'està corregint. */
function historialAbans(uid) {
  const r = db.prepare(`
    SELECT COUNT(*) AS total, AVG(error_count) AS mitjana
    FROM dictations WHERE uid = ?
  `).get(uid);
  return { total: r.total || 0, mitjana: r.mitjana };
}

function ratxaDe(uid) {
  // Un any de dates n'hi ha de sobres: la ratxa es trenca al primer dia buit.
  const dies = db.prepare(`
    SELECT completed_at FROM dictations
    WHERE uid = ? ORDER BY completed_at DESC LIMIT 400
  `).all(uid).map(r => r.completed_at);
  return motivacio.ratxa(dies);
}

/** Penja de la correcció el que l'ha d'acompanyar a la pantalla de resultats. */
function afegeixAnim(uid, correccio, abans) {
  correccio.ratxa = ratxaDe(uid);
  correccio.fita = motivacio.fita(abans.total + 1);
  correccio.comparativa = motivacio.comparativa(correccio.errors.length, abans.mitjana, abans.total);
}

function estatDeRang(uid) {
  const historial = db.prepare(`
    SELECT level, word_count AS totalWords, error_count AS errors
    FROM dictations WHERE uid = ? ORDER BY completed_at ASC, id ASC
  `).all(uid);
  return rang.estat(historial);
}

// Torna l'id del progrés desat, que és el que el client necessita per anar a
// buscar les explicacions després (F33). `null` si la BD ha fallat: llavors no
// hi ha res a demanar i el resultat es queda amb el text per defecte.
function desa(uid, correccio, { level, textId, textTitle }) {
  try {
    const resultat = db.prepare(`
      INSERT INTO dictations (uid, text_id, text_title, level, score, error_count, word_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uid, textId || 'unknown', textTitle || '', level || 'unknown', correccio.score, correccio.errors.length, correccio.totalWords);

    const progressId = resultat.lastInsertRowid;
    const insereix = db.prepare(`
      INSERT INTO dictation_errors (dictation_id, uid, level, text_id, type, expected, written, position, counted, taxonomy_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const fila = (e, counted) => [
      progressId, uid, level || 'unknown', textId || 'unknown',
      e.type, e.original, e.userWrote, e.position, counted,
      // Ja neix classificada amb el catàleg d'avui: si no, la migració de
      // `db.js` la tornaria a mirar a cada arrencada, per sempre.
      taxonomia.VERSIO,
    ];
    // L'ordre d'aquestes files ÉS l'ordre de `errors.concat(warnings)`, i
    // `dictation_errors.id` és autoincremental: per això `ORDER BY id` el recupera
    // exacte a `/api/explicacions/:id` i el client pot casar cada explicació
    // amb el seu error per posició, sense enviar-los-hi de tornada.
    const desaTots = db.transaction((files) => { for (const f of files) insereix.run(...f); });
    desaTots([
      ...correccio.errors.map(e => fila(e, 1)),
      ...correccio.warnings.map(e => fila(e, 0)),
    ]);
    return progressId;
  } catch (dbErr) {
    console.error('DB error:', dbErr.message);
    return null;
  }
}

/**
 * Respon la correcció sencera de seguida, sense esperar cap model (F33).
 * Ho comparteixen les dues rutes: si visquessin una còpia a cada banda,
 * arreglar-ne una i oblidar l'altra seria qüestió de temps.
 */
function respon(req, res, correccio, meta) {
  const uid = req.session.profile.uid;
  const llista = correccio.errors.concat(correccio.warnings);

  const abans = historialAbans(uid);
  const progressId = desa(uid, correccio, meta);

  // Les frases fallades tornen (F27). Va aquí i no a `desa()` perquè fa falta
  // el text original, que `desa()` no rep: només compta errors.
  if (meta.originalText && meta.textId && meta.textId !== 'repas') {
    try {
      apuntaFallades(uid, frasesFallades(meta.originalText, correccio)
        .map((f) => [meta.textId, f]));
    } catch (err) {
      // Que fallar aquí no es mengi la correcció, que és el que importa.
      console.error('Repesca:', err.message);
    }
  }

  correccio.rank = estatDeRang(uid);
  afegeixAnim(uid, correccio, abans);

  correccio.feedbackGenerat = false;
  if (!llista.length) {
    correccio.feedback = 'Cap error. Impecable!';
  } else {
    completaPerDefecte(llista, correccio);
    // Sense id no hi ha res a demanar: la BD ha fallat i el resultat es queda
    // amb el text per defecte, que ja és el pitjor cas d'avui.
    if (progressId) correccio.progressId = progressId;
  }
  res.json(correccio);
}

/**
 * Les explicacions d'una correcció ja feta. Es demanen a part perquè són
 * l'única part que necessita el model (F33).
 *
 * És **idempotent i gratis a partir de la segona vegada**: es desen a
 * `dictation_errors.explanation` i, si ja hi són, no es torna a cridar l'API. Això
 * també tanca la porta a fer-ho servir per gastar diners en bucle, que és el
 * que hauria obligat a comptar-ho al límit de F14.
 */
router.post('/explicacions/:id', requireAuth, async (req, res) => {
  const uid = req.session.profile.uid;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Id no vàlid' });

  // Amb el `uid` al WHERE: ningú pot demanar les explicacions d'un altre.
  const progres = db.prepare(
    'SELECT id, feedback, feedback_generated FROM dictations WHERE id = ? AND uid = ?'
  ).get(id, uid);
  if (!progres) return res.status(404).json({ error: 'Correcció no trobada' });

  const files = db.prepare(`
    SELECT id, type, expected, written AS userWrote, explanation, explanation_generated
    FROM dictation_errors WHERE dictation_id = ? ORDER BY id ASC
  `).all(id);

  const respostaDesada = () => res.json({
    explicacions: files.map(f => ({
      explanation: f.explanation || perDefecte(f.type),
      generada: !!f.explanation_generated,
    })),
    feedback: progres.feedback,
    feedbackGenerat: !!progres.feedback_generated,
  });

  // `feedback` desat vol dir que això ja s'ha resolt una vegada — hagi escrit
  // el model o hagi fallat l'API. No es reintenta: si avui falla, avui es
  // queda amb el text nostre, exactament com passava abans de separar-ho.
  if (progres.feedback !== null || !files.length) return respostaDesada();

  const correccio = { scale: getScale(files.filter(f => f.type !== 'puntuació').length), feedback: '' };
  const llista = files.map(f => ({ type: f.type, original: f.original, userWrote: f.userWrote }));
  await demanaExplicacions(llista, correccio);

  try {
    const posa = db.prepare('UPDATE dictation_errors SET explanation = ?, explanation_generated = ? WHERE id = ?');
    db.transaction(() => {
      llista.forEach((e, i) => posa.run(e.explanation, e.generada ? 1 : 0, files[i].id));
      db.prepare('UPDATE dictations SET feedback = ?, feedback_generated = ? WHERE id = ?')
        .run(correccio.feedback, correccio.feedbackGenerat ? 1 : 0, id);
    })();
  } catch (dbErr) {
    console.error('DB error desant explicacions:', dbErr.message);   // es responen igual
  }

  res.json({
    explicacions: llista.map(e => ({ explanation: e.explanation, generada: !!e.generada })),
    feedback: correccio.feedback,
    feedbackGenerat: !!correccio.feedbackGenerat,
  });
});

router.post('/correct', requireAuth, limitaCorreccions, async (req, res) => {
  const { originalText, userText, level, textId, textTitle, punctuationDictated } = req.body;
  if (!originalText || !userText) return res.status(400).json({ error: 'Falten dades' });

  if (massaLlarg(originalText) || massaLlarg(userText)) {
    return res.status(413).json({ error: `El text és massa llarg. El màxim són ${MAX_PARAULES} paraules.` });
  }

  const correccio = corregeix(originalText, userText, volPuntuacio(punctuationDictated));
  // Res de crides a l'API aquí: tot això ja està calculat i pot sortir ara
  // mateix (F33). Les explicacions les demana el client a `/api/explicacions`.
  respon(req, res, correccio, { level, textId, textTitle, originalText });
});

// ── Correcció per foto ───────────────────────────────────────
// La visió transcriu i prou. Comparar la transcripció amb l'original és la
// mateixa feina d'abans i es fa amb el mateix algorisme, així que les
// posicions també són exactes aquí.

const PROMPT_TRANSCRIPCIO = `A la imatge hi ha un dictat en català escrit a mà.

Transcriu EXACTAMENT el que hi veus, respectant l'ortografia, els accents, les majúscules i la puntuació tal com estan escrits, encara que hi hagi errors. No corregeixis absolutament res: si hi ha una falta, transcriu la falta.

Retorna NOMÉS aquest JSON, sense cap altre text:
{"transcription": "<el text transcrit>"}`;

router.post('/correct-image', requireAuth, limitaCorreccions, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Cal adjuntar una foto' });
  const { originalText, level, textId, textTitle, punctuationDictated } = req.body;
  if (!originalText) return res.status(400).json({ error: 'Falta el text original' });
  if (massaLlarg(originalText)) {
    return res.status(413).json({ error: `El text és massa llarg. El màxim són ${MAX_PARAULES} paraules.` });
  }

  let transcripcio;
  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: req.file.mimetype || 'image/jpeg',
              data: req.file.buffer.toString('base64'),
            },
          },
          { type: 'text', text: PROMPT_TRANSCRIPCIO },
        ],
      }],
    });
    transcripcio = parseClaudeJSON(message.content[0].text).transcription;
  } catch (err) {
    console.error('Claude vision error:', err.status, err.message);
    return res.status(502).json({ error: 'No s\'ha pogut llegir la foto. Torna a provar.' });
  }

  if (!transcripcio || !String(transcripcio).trim()) {
    return res.status(422).json({ error: 'No s\'ha pogut llegir res a la foto. Prova amb més llum o més a prop.' });
  }

  if (massaLlarg(transcripcio)) {
    return res.status(422).json({ error: 'La foto conté massa text per corregir-lo.' });
  }

  const correccio = corregeix(originalText, transcripcio, volPuntuacio(punctuationDictated));
  correccio.transcription = transcripcio;
  respon(req, res, correccio, { level, textId, textTitle, originalText });
});

// ── Repàs: les frases que has fallat tornen (F27) ────────────

/** Les frases d'un text, amb els seus límits, sense demanar-lo dues vegades. */
function limitsPerText(uid) {
  const cache = new Map();
  return (id) => {
    if (!cache.has(id)) cache.set(id, repesca.talls(textDe(uid, id) || ''));
    return cache.get(id);
  };
}

router.get('/repesca', requireAuth, (req, res) => {
  const uid = req.session.profile.uid;
  const files = db.prepare(`
    SELECT text_id, phrase_index AS frase FROM phrase_reviews
    WHERE uid = ? AND due_on <= ?
    ORDER BY due_on ASC, id ASC
  `).all(uid, avui());

  const limits = limitsPerText(uid);
  const toquen = [];
  for (const f of files) {
    const l = (limits(f.text_id) || [])[f.frase];
    // Una frase que ja no existeix —text personal editat o esborrat— no fa
    // caure el repàs: se salta i prou.
    if (l) toquen.push({ text_id: f.text_id, frase: f.frase, text: l.text });
  }
  if (!toquen.length) return res.json({ pendents: 0, frases: [], text: '' });

  // Farciment: frases dels MATEIXOS textos que avui no tocaven. És el que fa
  // que no puguis saber quina és la que vas fallar.
  const jaHi = new Set(toquen.map((f) => f.text_id + '#' + f.frase));
  const altres = [];
  for (const id of new Set(toquen.map((f) => f.text_id))) {
    for (const l of limits(id)) {
      if (!jaHi.has(id + '#' + l.frase)) altres.push({ text_id: id, frase: l.frase, text: l.text });
    }
  }

  // Llavor del dia: recarregar la pàgina no rebaralla l'ordre.
  const llavor = Number(avui().replace(/-/g, '')) + toquen.length;
  const sessio = repesca.sessio(toquen, altres, llavor);

  res.json({
    pendents: toquen.length,
    // El client NO sap quines són de repàs: si ho sabés, ho sabria qui mira.
    frases: sessio.map((f) => ({ text_id: f.text_id, frase: f.frase, text: f.text })),
    text: sessio.map((f) => f.text).join(' || '),
  });
});

/**
 * Corregeix una sessió de repàs i mou cada frase al seu lloc.
 *
 * Les que tocaven pugen un esglaó si s'encerten i tornen a baix si es fallen.
 * Les de farciment no es toquen si van bé; si es fallen, entren a la repesca
 * com qualsevol altra frase fallada.
 */
function movRepesca(uid, frases, fallades) {
  const busca = db.prepare('SELECT id, streak AS passada, due_on AS tocaEl FROM phrase_reviews WHERE uid = ? AND text_id = ? AND phrase_index = ?');
  const puja = db.prepare('UPDATE phrase_reviews SET streak = ?, due_on = ? WHERE id = ?');
  const treu = db.prepare('DELETE FROM phrase_reviews WHERE id = ?');
  const apreses = [];
  const noves = [];

  db.transaction(() => {
    frases.forEach((f, i) => {
      const textId = String(f && f.text_id || '');
      const frase = Number(f && f.frase);
      if (!textId || !Number.isInteger(frase)) return;
      const encertada = !fallades.has(i);
      const fila = busca.get(uid, textId, frase);

      if (fila && fila.tocaEl <= avui()) {
        const seguent = repesca.avanca(fila.passada, encertada);
        if (seguent.apresa) { treu.run(fila.id); apreses.push(textId + '#' + frase); }
        else puja.run(seguent.passada, seguent.tocaEl, fila.id);
      } else if (!encertada && !fila) {
        noves.push([textId, frase]);
      }
    });
  })();

  if (noves.length) apuntaFallades(uid, noves);
  return { apreses: apreses.length, noves: noves.length };
}

router.post('/repesca/correct', requireAuth, limitaCorreccions, (req, res) => {
  const { originalText, userText, frases, punctuationDictated } = req.body;
  if (!originalText || !userText || !Array.isArray(frases)) {
    return res.status(400).json({ error: 'Falten dades' });
  }
  if (massaLlarg(originalText) || massaLlarg(userText)) {
    return res.status(413).json({ error: `El text és massa llarg. El màxim són ${MAX_PARAULES} paraules.` });
  }

  const correccio = corregeix(originalText, userText, volPuntuacio(punctuationDictated));

  const limits = repesca.talls(originalText);
  const fallades = new Set();
  for (const e of correccio.errors) {
    const i = repesca.fraseDe(limits, e.position);
    if (i !== null) fallades.add(i);
  }
  correccio.repas = movRepesca(req.session.profile.uid, frases, fallades);

  respon(req, res, correccio, {
    level: 'repas', textId: 'repas', textTitle: 'Repàs', originalText,
  });
});

// ── Micro-exercicis de 60 segons (F28) ───────────────────────

/** Quantes targetes has fet avui. */
function microAvui(uid) {
  const f = db.prepare('SELECT card_count, correct_count FROM daily_cards WHERE uid = ? AND day_on = ?')
    .get(uid, avui());
  return { targetes: f ? f.card_count : 0, encerts: f ? f.correct_count : 0 };
}

router.get('/micro', requireAuth, (req, res) => {
  const uid = req.session.profile.uid;
  // Es miren més errors dels que caben en una sessió perquè molts es
  // descarten: omissions, paraules de més i puntuació no fan targeta.
  const files = db.prepare(`
    SELECT id, type, expected, written
    FROM dictation_errors
    WHERE uid = ? AND counted = 1 AND expected IS NOT NULL AND written IS NOT NULL
    ORDER BY id DESC
    LIMIT 200
  `).all(uid);

  // Llavor del dia: recarregar no rebaralla quina opció va primera.
  const llavor = Number(avui().replace(/-/g, ''));
  res.json({ targetes: micro.targetes(files, llavor), avui: microAvui(uid) });
});

router.post('/micro', requireAuth, (req, res) => {
  const uid = req.session.profile.uid;
  const respostes = Array.isArray(req.body && req.body.respostes) ? req.body.respostes : null;
  if (!respostes || !respostes.length) return res.status(400).json({ error: 'Falten respostes' });
  if (respostes.length > micro.PER_SESSIO * 2) return res.status(400).json({ error: 'Massa respostes' });

  // La resposta bona NO viatja mai al client abans de contestar: es comprova
  // aquí contra la fila, que a més ha de ser d'aquesta persona.
  const busca = db.prepare('SELECT id, type, expected FROM dictation_errors WHERE id = ? AND uid = ?');
  const detall = [];
  for (const r of respostes) {
    const fila = busca.get(Number(r && r.id), uid);
    if (!fila) continue;
    detall.push({
      id: fila.id,
      encertat: micro.encerta(fila.expected, r.tria),
      correcta: treuPuntuacio(fila.expected),
      regla: taxonomia.regla(fila.type),
    });
  }

  const encerts = detall.filter((d) => d.encertat).length;
  try {
    db.prepare(`
      INSERT INTO daily_cards (uid, day_on, card_count, correct_count) VALUES (?, ?, ?, ?)
      ON CONFLICT (uid, day_on) DO UPDATE SET
        card_count = card_count + excluded.card_count,
        correct_count = correct_count + excluded.correct_count
    `).run(uid, avui(), detall.length, encerts);
  } catch (dbErr) {
    console.error('DB error desant micro:', dbErr.message);   // es respon igual
  }

  res.json({ ...micro.resultat(encerts, detall.length), detall, avui: microAvui(uid) });
});

// ── Escriptura lliure (F29) ──────────────────────────────────
//
// L'única part de l'app que NO funciona sense clau d'API: aquí no hi ha text
// original amb què comparar, així que no hi ha res determinista a fer. Quan no
// n'hi ha, es diu; no es dissimula amb un error genèric.

function hiHaClau() {
  const k = String(process.env.ANTHROPIC_API_KEY || '');
  return k.startsWith('sk-');
}

router.get('/temes', requireAuth, (req, res) => {
  res.json({ temes, clau: hiHaClau() });
});

router.post('/escriure', requireAuth, limitaCorreccions, async (req, res) => {
  const { tema, text } = req.body || {};
  const comprovacio = escriptura.valida(text);
  if (!comprovacio.ok) return res.status(400).json({ error: comprovacio.error });

  if (!hiHaClau()) {
    return res.status(503).json({
      error: 'Aquesta part necessita la connexió amb Claude i ara mateix no hi és. '
        + 'Els dictats segueixen funcionant: la seva correcció es fa aquí, sense sortir del servidor.',
    });
  }

  const elTema = temes.find((t) => t.id === tema);
  let resposta;
  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: escriptura.PROMPT(elTema ? elTema.proposta : 'lliure', text) }],
    });
    resposta = parseClaudeJSON(message.content[0].text);
  } catch (err) {
    console.error('Claude escriptura error:', err.status, err.message);
    return res.status(502).json({ error: 'No s\'ha pogut corregir ara mateix. Torna a provar.' });
  }

  const net = escriptura.neteja(resposta, text);

  // Es desa que ho has fet, no el que has escrit.
  try {
    db.prepare(`
      INSERT INTO writings (uid, topic, word_count, observation_count, model)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.session.profile.uid, elTema ? elTema.id : null,
      comprovacio.paraules, net.observacions.length, MODEL);
  } catch (dbErr) {
    console.error('DB error desant escriptura:', dbErr.message);   // es respon igual
  }

  res.json({
    ...net,
    paraules: comprovacio.paraules,
    resum: escriptura.resum(net.observacions, comprovacio.paraules),
    model: MODEL,
  });
});

// ── Perfil / historial ───────────────────────────────────────
router.get('/profile', requireAuth, (req, res) => {
  const uid = req.session.profile.uid;
  const selecciona = ordre => db.prepare(`
    SELECT text_id, text_title, level, score, error_count, completed_at
    FROM dictations
    WHERE uid = ?
    ORDER BY ${ordre}
    LIMIT 50
  `).all(uid).map(r => ({ ...r, scale: getScale(r.error_count || 0) }));

  const recents = selecciona('completed_at DESC, id DESC');
  const millors = selecciona('error_count ASC, completed_at DESC');

  // Les xifres surten de tot l'historial, no dels 50 que es pinten
  const agregats = db.prepare(`
    SELECT COUNT(*) AS total, MIN(error_count) AS best
    FROM dictations WHERE uid = ?
  `).get(uid);

  // La mitjana i la corba es calculen a `src/lib/progres.js` i no amb un AVG
  // d'SQL, per dos motius: la taxa ha de pesar per paraules (no és la mitjana
  // de les taxes) i els dictats sense `word_count` no hi poden entrar. Les
  // files hi van senceres perquè la lògica sigui provable sense base de dades.
  const files = db.prepare(`
    SELECT error_count, word_count, completed_at
    FROM dictations WHERE uid = ?
  `).all(uid);
  const xifres = progres.resum(files);
  const corba = progres.setmanes(files);

  // De què són els errors dels últims dictats (F26).
  //
  // `counted = 1` deixa fora els avisos: quan la puntuació no s'ha dictat, els
  // errors de puntuació no compten a l'escala i tampoc han de comptar aquí —
  // ensenyarien un forat que no és de qui escriu.
  //
  // El filtre per `uid` hi és dues vegades a posta: la subconsulta ja ho
  // acota, però una condició d'aïllament no ha de dependre d'una subconsulta
  // que algun dia es pugui reescriure.
  const ultims = db.prepare(`
    SELECT id FROM dictations WHERE uid = ?
    ORDER BY completed_at DESC, id DESC LIMIT ?
  `).all(uid, onfalles.DICTATS_A_MIRAR).map(r => r.id);

  const comptes = ultims.length ? db.prepare(`
    SELECT type, COUNT(*) AS quants
    FROM dictation_errors
    WHERE uid = ? AND counted = 1
      AND dictation_id IN (${ultims.map(() => '?').join(',')})
    GROUP BY type
  `).all(uid, ...ultims) : [];

  const falles = onfalles.perfil(comptes, ultims.length);

  res.json({
    uid,
    email: req.session.profile.email,
    first_name: req.session.profile.first_name,
    stats: {
      total: agregats.total,
      // Amb un decimal a posta (F36): arrodonida a enter, millorar de 2,6 a
      // 2,4 no es veia.
      avgErrors: xifres.mitjanaErrors ?? 0,
      // Errors per 100 paraules, que és l'única xifra comparable entre un text
      // de 34 paraules i un de 84. `null` si cap dictat sap quantes en tenia.
      errorsPer100: xifres.taxa,
      dictatsComptats: xifres.comptats,
      bestErrors: agregats.best ?? null,
      ratxa: ratxaDe(uid),
    },
    setmanes: corba,
    tendencia: progres.tendencia(corba),
    onFalles: { ...falles, titular: onfalles.titular(falles), nota: onfalles.nota(falles) },
    rank: estatDeRang(uid),
    ranks: rang.RANGS.map(r => ({ id: r.id, nom: r.nom, punts: r.punts, que: r.que })),
    history: recents,
    millors,
  });
});

// ── Progrés ──────────────────────────────────────────────────
router.get('/progress', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT text_id, text_title, level, score, error_count, completed_at
    FROM dictations WHERE uid = ? ORDER BY completed_at DESC LIMIT 20
  `).all(req.session.profile.uid);
  res.json(rows);
});

// ── Avisar sobre el contingut que escriu el model (F64) ──────
//
// Google Play tracta les apps que generen contingut amb IA com una àrea
// regulada i exigeix que es pugui denunciar contingut ofensiu **sense sortir
// de l'app**. A Dictats el model escriu l'explicació de cada error i el
// missatge final; això és la via.
//
// No modera res automàticament ni amaga el text: el desa perquè algú el miri.
// Amagar-lo tot sol seria pitjor —una explicació correcta desapareixeria per
// un toc sense voler— i l'app no té ningú de guàrdia.
const MAX_REPORT = 2000;

const limitReports = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Has enviat molts avisos seguits. Torna-ho a provar més tard.' },
});

router.post('/report', requireAuth, limitReports, (req, res) => {
  const { kind, content, context, reason } = req.body || {};
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Falta el text que vols avisar' });
  }
  if (kind !== 'explicacio' && kind !== 'feedback') {
    return res.status(400).json({ error: 'Tipus d\'avís desconegut' });
  }

  try {
    db.prepare(
      `INSERT INTO content_reports (uid, kind, content, context, reason, model)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      req.session.profile.uid,
      kind,
      String(content).slice(0, MAX_REPORT),
      context ? String(context).slice(0, 500) : null,
      reason ? String(reason).slice(0, MAX_REPORT) : null,
      MODEL,
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('report error:', err.message);
    res.status(500).json({ error: 'No s\'ha pogut enviar l\'avís. Torna-ho a provar.' });
  }
});

module.exports = router;

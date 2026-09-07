// Les frases que has fallat tornen (F27).
//
// És el que converteix «he fet 30 dictats» en «ja no fallo l'apostrofació».
// Sense això, cada dictat és un episodi solt: es corregeix, es desa un nombre i
// no torna a influir en res — que és exactament el que el roadmap diu que
// l'app ha de deixar de fer.
//
// ── Com funciona ─────────────────────────────────────────────
// Una frase on has fet almenys un error que compta torna **l'endemà**. Si la
// fas bé, torna als **3 dies**; si també, als **7**; i si també, s'acaba: ja no
// torna. Si la falles en qualsevol moment, se'n va a baix i torna a començar
// per l'endemà.
//
// Els intervals són els clàssics de la repetició espaiada, i el que els fa
// funcionar no és el nombre exacte sinó que **creixin cada vegada que
// encertes**.
//
// ── Barrejades entre altres ──────────────────────────────────
// Un repàs on totes les frases són les que vas fallar no entrena: saps què ve
// i pares atenció d'una manera que no faràs mai en un dictat de veritat. Per
// això la sessió s'omple amb frases dels mateixos textos que NO tocaven, i
// s'ordenen totes juntes. No pots saber quina és quina.
//
// Les funcions són pures, com les de `motivacio.js`, `textos.js`, `progres.js`
// i `onfalles.js`: reben dades i no toquen la base.

const { dia } = require('./motivacio');

// Els dies que triga a tornar segons quantes vegades seguides l'has encertada.
const DIES = [1, 3, 7];

// Mides de la sessió de repàs. Menys de quatre frases no és un dictat; més de
// vuit deixa de ser un repàs i es fa llarg.
const MINIM = 4;
const MAXIM = 8;

/**
 * On comença i on acaba cada frase d'un text, comptat en paraules.
 *
 * Fa falta perquè `user_errors.position` és l'índex de la paraula dins del text
 * SENCER: per saber de quina frase era un error, cal saber per on es talla.
 * El separador és el mateix `||` que fa servir el dictat.
 */
function talls(text) {
  const frases = String(text || '').split('||').map((f) => f.trim()).filter(Boolean);
  const fora = [];
  let inici = 0;
  frases.forEach((f, i) => {
    const quantes = f.split(/\s+/).filter(Boolean).length;
    fora.push({ frase: i, desDe: inici, finsA: inici + quantes, text: f });
    inici += quantes;
  });
  return fora;
}

/** A quina frase cau la paraula número `position`. `null` si no cau a cap. */
function fraseDe(limits, position) {
  if (position === null || position === undefined) return null;
  for (const t of limits || []) {
    if (position >= t.desDe && position < t.finsA) return t.frase;
  }
  return null;
}

/**
 * Quan torna a tocar.
 *
 * @param {number} passada  Quantes vegades seguides s'ha encertat (0, 1, 2…).
 * @returns {string|null} Data local 'YYYY-MM-DD', o `null` si ja no torna.
 */
function properaData(passada, avui = new Date()) {
  if (passada >= DIES.length) return null;      // apresa: no torna
  const d = new Date(dia(avui) + 'T12:00:00Z');  // migdia: cap sorpresa d'horari d'estiu
  d.setUTCDate(d.getUTCDate() + DIES[passada]);
  return d.toISOString().slice(0, 10);
}

/**
 * Què li passa a una frase després d'un repàs.
 *
 * Fallar-la la torna al principi **sempre**, encara que ja anés pel tercer
 * intent: si avui l'has fallat, no la saps.
 */
function avanca(passada, encertada, avui = new Date()) {
  const seguent = encertada ? (passada || 0) + 1 : 0;
  const data = properaData(seguent, avui);
  return { passada: seguent, tocaEl: data, apresa: data === null };
}

// Barreja determinista: la mateixa llavor dona sempre el mateix ordre, que és
// el que permet provar-ho.
function barrejaAmb(llista, llavor) {
  const fora = llista.slice();
  let estat = (llavor || 1) >>> 0;
  for (let i = fora.length - 1; i > 0; i--) {
    estat = (estat * 1664525 + 1013904223) >>> 0;   // congruencial lineal, prou
    const j = estat % (i + 1);
    const tmp = fora[i]; fora[i] = fora[j]; fora[j] = tmp;
  }
  return fora;
}

/**
 * Munta la sessió: les que toquen, més farciment, totes barrejades.
 *
 * @param {Array} toquen  `[{text_id, frase, text}]` — les que vencen avui.
 * @param {Array} altres  Frases dels mateixos textos que no toquen.
 * @returns {Array} Entre `MINIM` i `MAXIM` frases, en ordre imprevisible.
 */
function sessio(toquen, altres, llavor = 1) {
  const pendents = (toquen || []).slice(0, MAXIM);
  if (pendents.length === 0) return [];

  // Una de farciment per cada dues que toquen, i sempre prou per arribar al
  // mínim. El farciment no és decoració: és el que fa que no sàpigues quina és
  // la que vas fallar.
  const vol = Math.max(MINIM - pendents.length, Math.ceil(pendents.length / 2));
  const farcit = barrejaAmb(altres || [], llavor + 7)
    .slice(0, Math.max(0, Math.min(vol, MAXIM - pendents.length)));

  return barrejaAmb(
    pendents.map((f) => ({ ...f, repas: true }))
      .concat(farcit.map((f) => ({ ...f, repas: false }))),
    llavor,
  );
}

module.exports = { DIES, MINIM, MAXIM, talls, fraseDe, properaData, avanca, sessio, barrejaAmb };

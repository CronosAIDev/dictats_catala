// Que la llista de textos no es vegi igual el primer dia que el trentè (F35).
//
// Avui els 30 textos són una llista morta: no diu quins has fet, com et van
// anar ni per on continuar. I les dades hi són totes des de F24 —cada dictat
// deixa una fila a `user_progress`—, només que ningú les mira quan es pinta la
// llista.
//
// Les funcions són pures a posta, com les de `motivacio.js`: reben dades, no
// toquen la base. Així es proven sense BD i les consultes viuen en un sol lloc.
//
// La regla de `CLAUDE.md` que mana aquí: **mai renyar**. Es diu què has fet, no
// el que no has fet. Per això un text sense fer no porta cap marca —no és un
// deute— i el que es proposa per repassar no diu mai que et vagi malament.

/**
 * Ajunta cada text amb el que se'n sap de qui l'està mirant.
 *
 * @param {Array} llista     Els textos del nivell, en l'ordre del banc.
 * @param {Array} historial  Files `{text_id, vegades, millor, ultima}`.
 * @returns {Array} La mateixa llista, amb `fet`, `vegades`, `millorErrors` i `ultima`.
 */
function marca(llista, historial) {
  const per = new Map();
  for (const h of historial || []) per.set(String(h.text_id), h);

  return (llista || []).map((t) => {
    const h = per.get(String(t.id));
    if (!h) return { ...t, fet: false, vegades: 0, millorErrors: null, ultima: null };
    return {
      ...t,
      fet: true,
      vegades: h.vegades || 0,
      // `millor` és el mínim d'errors, no l'últim: qui repeteix un text vol
      // veure el seu sostre, no l'últim ensopec.
      millorErrors: h.millor === null || h.millor === undefined ? null : Number(h.millor),
      ultima: h.ultima || null,
    };
  });
}

/**
 * Quin text es proposa com «el següent».
 *
 * Dues regles, i la segona és la que fa que la llista segueixi servint el dia
 * que ja els has fet tots:
 *
 *   1. El primer que no hagis fet. El banc va ordenat de menys a més difícil,
 *      així que seguir l'ordre ja és una progressió.
 *   2. Si els has fet tots, el que et va costar més —més errors al teu millor
 *      intent—, i a igualtat, el que fa més que no toques. Que és exactament
 *      el que vol F27 (repesca) a escala de text sencer.
 *
 * @returns {{id: string, motiu: 'nou'|'repas'}|null}
 */
function seguent(marcats) {
  const tots = marcats || [];
  if (tots.length === 0) return null;

  const sensefer = tots.find((t) => !t.fet);
  if (sensefer) return { id: sensefer.id, motiu: 'nou' };

  let millor = null;
  for (const t of tots) {
    if (millor === null) { millor = t; continue; }
    const errorsT = t.millorErrors === null ? -1 : t.millorErrors;
    const errorsM = millor.millorErrors === null ? -1 : millor.millorErrors;
    if (errorsT > errorsM) { millor = t; continue; }
    // A igualtat d'errors, el que fa més temps que no es toca. Una `ultima`
    // buida es tracta com la més antiga possible.
    if (errorsT === errorsM && String(t.ultima || '') < String(millor.ultima || '')) millor = t;
  }
  return millor ? { id: millor.id, motiu: 'repas' } : null;
}

/**
 * Quants n'has fet d'aquest nivell. És el numerador de «7 de 10» i surt d'aquí
 * i no del client perquè les dues vistes diguin el mateix nombre.
 */
function compte(marcats) {
  const tots = marcats || [];
  return { fets: tots.filter((t) => t.fet).length, total: tots.length };
}

module.exports = { marca, seguent, compte };

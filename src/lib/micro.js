// Micro-exercicis de 60 segons, fets dels teus propis errors (F28).
//
// ── El problema que resol ────────────────────────────────────
// Fins ara la unitat mínima de l'app és **un dictat sencer**: cinc o deu
// minuts amb auriculars i un lloc on no molestis. Això vol dir que hi ha dies
// que no s'entra, i el que no s'entra no es practica.
//
// Una targeta són dues formes de la MATEIXA paraula —la que toca i la que vas
// escriure— i triar-ne una. Sense àudio, sense escriure, i es fa a la cua del
// súper.
//
// ── Per què surten dels teus errors i no d'una llista ────────
// Perquè ja els tenim: des de F24 cada error deixa la paraula bona i la que
// vas posar, i des de F25 sap de quina regla és. Una llista d'exercicis
// genèrics seria una altra app; això és **el teu** error, tornat a preguntar.
//
// I com F31, F25 i F26: **no fa falta cap clau d'API**. Les dues formes ja
// estan desades; no hi ha res a generar.
//
// Funcions pures: reben files i no toquen la base.

const taxonomia = require('./taxonomia');
const { treuPuntuacio } = require('./paraules');
const { barrejaAmb } = require('./atzar');

// Vuit targetes són uns 60 segons a set segons per targeta, que és el que
// triga a llegir dues paraules i decidir.
const PER_SESSIO = 8;

/**
 * Una fila d'error serveix per fer-ne targeta?
 *
 * No serveixen: les omissions i les paraules de més (no hi ha dues formes que
 * comparar) ni els errors de puntuació (tretes les comes, les dues formes són
 * la mateixa paraula i la targeta no tindria resposta).
 */
function potSerTargeta(fila) {
  if (!fila || !fila.original || !fila.user_wrote) return false;
  const bo = treuPuntuacio(fila.original);
  const mal = treuPuntuacio(fila.user_wrote);
  return bo.length > 0 && mal.length > 0 && bo !== mal;
}


/**
 * Munta la sessió de targetes.
 *
 * Les paraules repetides no fan dues targetes: fan una que **pesa més**. Si
 * has fallat `és` sis vegades, no vols sis targetes iguals seguides, vols que
 * `és` surti abans que una que has fallat un cop.
 *
 * @param {Array} files   `[{id, type, original, user_wrote}]`, de més recent a més antic.
 * @param {number} llavor Per barrejar quina forma va primera.
 * @returns {Array} `[{id, tipus, nom, regla, opcions: [a, b], vegades}]`
 */
function targetes(files, llavor = 1, quantes = PER_SESSIO) {
  const per = new Map();
  for (const f of files || []) {
    if (!potSerTargeta(f)) continue;
    const bo = treuPuntuacio(f.original);
    const mal = treuPuntuacio(f.user_wrote);
    const clau = bo + '|' + mal;
    if (!per.has(clau)) {
      per.set(clau, { id: f.id, tipus: f.type, correcta: bo, erronia: mal, vegades: 0 });
    }
    per.get(clau).vegades += 1;
  }

  const ordenades = [...per.values()]
    // Les que més t'han sortit, primer. A igualtat, la més recent, que és la
    // que ve abans a la llista.
    .sort((a, b) => (b.vegades - a.vegades) || (b.id - a.id))
    .slice(0, quantes);

  return ordenades.map((t, i) => ({
    id: t.id,
    tipus: t.tipus,
    nom: taxonomia.nom(t.tipus),
    regla: taxonomia.regla(t.tipus),
    vegades: t.vegades,
    // Quina va a dalt es decideix aquí: si la bona sortís sempre primera,
    // s'aprendria la posició i no la paraula.
    opcions: barrejaAmb([t.correcta, t.erronia], llavor + i * 31),
  }));
}

/** Encertar és triar la forma bona, sense mirar la puntuació. */
function encerta(original, tria) {
  return treuPuntuacio(String(tria ?? '')) === treuPuntuacio(String(original ?? ''));
}

/**
 * Com ha anat la sessió.
 *
 * El text **mai renya** (`CLAUDE.md`): amb un encert de vuit diu que ja saps
 * quina és la que has de mirar, no que ho hagis fet malament.
 */
function resultat(encerts, total) {
  if (!total) return { encerts: 0, total: 0, text: '' };
  if (encerts === total) return { encerts, total, text: 'Totes. Aquestes ja te les saps.' };
  if (encerts === 0) return { encerts, total, text: 'Ja saps quines has de mirar.' };
  return { encerts, total, text: `${encerts} de ${total}. Les altres tornaran.` };
}

module.exports = { PER_SESSIO, potSerTargeta, targetes, encerta, resultat, barrejaAmb };

// De què són els teus errors (F26).
//
// La pregunta que es fa qui vol millorar no és «quants errors he fet», que ja
// la contesta l'escala de cada dictat i la mitjana del perfil. És **de què**.
// Fins a F25 no es podia contestar: els sis tipus d'abans deien «ortografia» a
// la ela geminada, la ce trencada i la b/v alhora, i «ortografia» no és cap
// regla que es pugui estudiar.
//
// Això mira els últims dictats i els agrupa per regla. Funció pura: rep les
// files ja comptades i no toca la base, com `motivacio.js`, `textos.js` i
// `progres.js`.
//
// ── Dues decisions que canvien el que es veu ─────────────────
//
// **Els avisos no hi entren.** Quan la puntuació no s'ha dictat, els errors de
// puntuació es desen amb `counted = 0` perquè no es pot penalitzar el que no
// s'ha pogut sentir. Comptar-los aquí ensenyaria un forat que no és teu.
//
// **Es mira una finestra, no tot l'historial.** El que et sortia fa tres mesos
// ja no és el que has d'estudiar avui, i barrejar-ho amaga precisament la
// millora. Per defecte, els últims 20 dictats.
//
// La regla de `CLAUDE.md` que mana: **mai renyar**. Això diu «el que més et
// surt» i dona la regla per estudiar-la; no diu enlloc que ho facis malament.

const taxonomia = require('./taxonomia');

const DICTATS_A_MIRAR = 20;

// Quantes regles s'ensenyen. La cua de regles amb un sol error és soroll: amb
// vint dictats en poden sortir dotze, i una llista de dotze no es llegeix. Les
// que queden es resumeixen en una línia, que és informació sense ser una llista.
const REGLES_A_ENSENYAR = 6;

/**
 * Ordena les regles per quantes vegades t'han sortit.
 *
 * @param {Array} comptes  `[{type, quants}]` — ja agrupat per la consulta.
 * @param {number} dictats Quants dictats s'han mirat, per poder-ho dir.
 * @returns {{dictats: number, errors: number, regles: Array}}
 *   Cada regla amb `id`, `nom`, `regla`, `quants` i `part` (percentatge sencer).
 */
function perfil(comptes, dictats = 0) {
  const files = (comptes || []).filter((c) => c && c.quants > 0);
  const errors = files.reduce((a, c) => a + c.quants, 0);
  if (errors === 0) return { dictats, errors: 0, regles: [], resta: { regles: 0, errors: 0 } };

  const regles = files
    .map((c) => ({
      id: c.type,
      nom: taxonomia.nom(c.type),
      regla: taxonomia.regla(c.type),
      quants: c.quants,
      part: Math.round((c.quants * 100) / errors),
    }))
    // A igualtat, per nom, perquè l'ordre no balli entre dues càrregues.
    .sort((a, b) => (b.quants - a.quants) || a.nom.localeCompare(b.nom, 'ca'));

  return {
    dictats,
    errors,
    regles: regles.slice(0, REGLES_A_ENSENYAR),
    resta: {
      regles: Math.max(0, regles.length - REGLES_A_ENSENYAR),
      errors: regles.slice(REGLES_A_ENSENYAR).reduce((a, r) => a + r.quants, 0),
    },
  };
}

/**
 * La frase que resumeix el perfil.
 *
 * Només parla si hi ha prou material: amb dos errors, «el 50 % són
 * d'apostrofació» és una xifra que no vol dir res i que espantaria per res.
 */
function titular(p) {
  if (!p || p.errors < 4 || p.regles.length === 0) return '';
  const cap = p.regles[0];
  // Si el primer no destaca per sobre del segon, no hi ha res a destacar.
  const segon = p.regles[1];
  if (segon && cap.quants === segon.quants) return '';
  // Quins dictats s'han mirat ho diu la capçalera de la targeta; repetir-ho
  // aquí feia llegir dues vegades la mateixa frase.
  return `El que més t'ha sortit és ${cap.nom.toLowerCase()}: `
    + `${cap.quants} de ${p.errors} errors.`;
}

module.exports = { perfil, titular, DICTATS_A_MIRAR, REGLES_A_ENSENYAR };

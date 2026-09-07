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

// ── El que no és una regla no entra al rànquing ───────────────
//
// Aquesta targeta contesta «de quina REGLA falles», i tres categories del
// catàleg no en són cap: no haver escrit una paraula, haver-ne escrit una de
// més, i haver escrit una paraula que no era la del dictat. No es poden
// estudiar i no tenen fitxa possible.
//
// Deixar-les competir amb les regles no era neutral: un dictat deixat a mitges
// posa desenes de `paraula omesa` de cop i el titular passava a ser «el que més
// t'ha sortit és paraula omesa: 36 de 46 errors». Això és el mateix problema
// que F69 va arreglar al RESULTAT del dictat —una tirada de paraules no
// escrites tapava els errors que sí que es podien estudiar— però aquí feia més
// mal, perquè aquesta és justament la pantalla que ha de dir què estudiar.
//
// No s'amaguen: es diuen a part, com un fet i sense rànquing. Deixar un dictat
// a mitges no són trenta-sis problemes de gramàtica; és una sola cosa que ha
// passat, i qui ho llegeix ja ho sap.
const NO_SON_REGLA = new Set(['paraula omesa', 'paraula afegida', 'paraula incorrecta']);

/**
 * Ordena les regles per quantes vegades t'han sortit.
 *
 * @param {Array} comptes  `[{type, quants}]` — ja agrupat per la consulta.
 * @param {number} dictats Quants dictats s'han mirat, per poder-ho dir.
 * @returns {{dictats: number, errors: number, regles: Array}}
 *   Cada regla amb `id`, `nom`, `regla`, `quants` i `part` (percentatge sencer).
 */
function perfil(comptes, dictats = 0) {
  const totes = (comptes || []).filter((c) => c && c.quants > 0);
  const files = totes.filter((c) => !NO_SON_REGLA.has(c.type));
  const compta = (tipus) => totes
    .filter((c) => c.type === tipus).reduce((a, c) => a + c.quants, 0);
  // Les parts es calculen sobre els errors DE REGLA: si el denominador
  // incloïa les paraules no escrites, un dictat deixat a mitges feia que totes
  // les regles sortissin al 2 % i la barra no digués res.
  const errors = files.reduce((a, c) => a + c.quants, 0);
  const fora = {
    omeses: compta('paraula omesa'),
    altres: compta('paraula afegida') + compta('paraula incorrecta'),
  };
  fora.total = fora.omeses + fora.altres;
  if (errors === 0) {
    return { dictats, errors: 0, regles: [], resta: { regles: 0, errors: 0 }, fora };
  }

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
    fora,
  };
}

/**
 * El que no és de cap regla, dit com un fet i sense rànquing.
 *
 * Torna '' quan no n'hi ha: la regla de `CLAUDE.md` és no renyar, i una línia
 * que digui «0 paraules no escrites» és exactament renyar per res.
 */
function nota(p) {
  const f = (p && p.fora) || {};
  const trossos = [];
  if (f.omeses > 0) {
    trossos.push(f.omeses === 1
      ? 'una paraula del dictat no es va escriure'
      : `${f.omeses} paraules del dictat no es van escriure`);
  }
  if (f.altres > 0) {
    trossos.push(f.altres === 1
      ? 'una no era la del dictat'
      : `${f.altres} no eren les del dictat`);
  }
  if (!trossos.length) return '';
  return `D'aquests dictats, ${trossos.join(' i ')}.`;
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

module.exports = { perfil, titular, nota, DICTATS_A_MIRAR, REGLES_A_ENSENYAR };

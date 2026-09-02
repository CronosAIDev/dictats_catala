// Injector d'errors coneguts per al banc de proves de models (#22, F55).
//
// La idea del gameplan: el ground truth surt gratis, perquè l'app ja té el text
// correcte. Aquí s'hi injecten errors d'una classe concreta i es retorna
// exactament quins hi ha i on, per poder mesurar què en troba cadascú.
//
// Les posicions són índexs de paraula sobre `tokenitza()` de src/lib/diff.js:
// han de ser les mateixes que fa servir el corrector o la comparació menteix.

const { tokenitza } = require('../../src/lib/diff');

// ── Les classes que discriminen en català ────────────────────
// Surten de la taula de la Issue #22. Cada regla diu quines paraules pot tocar
// i com les espatlla. Es toca NOMÉS una cosa per paraula: si una regla en canvia
// dues, deixa de ser mesurable de quina classe és l'error.

const REGLES = [
  {
    classe: 'diacritic',
    nom: 'Accent diacrític (obert/tancat)',
    // La trampa clàssica: parells que només es distingeixen per l'accent.
    parells: { 'és': 'es', 'sòl': 'sol', 'déu': 'deu', 'mà': 'ma', 'més': 'mes',
               'sí': 'si', 'bé': 'be', 'què': 'que', 'sé': 'se', 'vés': 'ves',
               'dóna': 'dona', 'nét': 'net', 'ós': 'os', 'sóc': 'soc' },
    pot(p) { return this.parells[p.toLowerCase()] !== undefined; },
    espatlla(p) {
      const canvi = this.parells[p.toLowerCase()];
      return p[0] === p[0].toUpperCase() ? canvi[0].toUpperCase() + canvi.slice(1) : canvi;
    },
  },
  {
    classe: 'ela-geminada',
    nom: 'Ela geminada',
    // El punt volat és propi del català i és el primer que es perd escrivint.
    pot(p) { return /l·l/i.test(p); },
    espatlla(p) { return p.replace(/l·l/gi, (m) => m[0] + m[2]); },
  },
  {
    classe: 'apostrofacio',
    nom: 'Apostrofació',
    // l'home -> el home. Cal saber quin article hi anava: el davant de
    // consonant no és el cas, així que només es toca davant de vocal o h.
    pot(p) { return /^[ldLD]'[aeiouàèéíòóúhAEIOUÀÈÉÍÒÓÚH]/.test(p); },
    espatlla(p) {
      const lletra = p[0];
      const resta = p.slice(2);
      const article = lletra.toLowerCase() === 'l' ? 'el' : 'de';
      const ple = lletra === lletra.toUpperCase() ? article[0].toUpperCase() + article.slice(1) : article;
      return ple + ' ' + resta;   // ULL: introdueix una paraula de més, a posta
    },
    partEnDues: true,
  },
  {
    classe: 'pronoms-febles',
    nom: 'Pronoms febles apostrofats',
    // #22 els assenyala com «on més s'equivoquen els models». L'error real de
    // qui escriu no és partir-los, és enganxar-los: m'agrada -> magrada.
    pot(p) { return /^[mnstMNST]'[a-zA-ZàèéíòóúïüçÀÈÉÍÒÓÚÏÜÇ]/.test(p); },
    espatlla(p) { return p.replace("'", ''); },
  },
  {
    classe: 'dieresi',
    nom: 'Dièresi',
    pot(p) { return /[ïüÏÜ]/.test(p); },
    espatlla(p) { return p.replace(/ï/g, 'i').replace(/Ï/g, 'I').replace(/ü/g, 'u').replace(/Ü/g, 'U'); },
  },
  {
    classe: 'ce-trencada',
    nom: 'Ç i essa sorda/sonora',
    pot(p) { return /ç/i.test(p); },
    espatlla(p) { return p.replace(/ç/g, 's').replace(/Ç/g, 'S'); },
  },
  {
    classe: 'b-v',
    nom: 'B/V — interferència del castellà',
    parells: { 'haver': 'haber', 'saber': 'saver', 'trobar': 'trovar', 'avui': 'abui',
               'canviar': 'cambiar', 'provar': 'probar', 'escriure': 'escriBure' },
    pot(p) { return this.parells[p.toLowerCase()] !== undefined; },
    espatlla(p) {
      const c = this.parells[p.toLowerCase()];
      return p[0] === p[0].toUpperCase() ? c[0].toUpperCase() + c.slice(1) : c;
    },
  },
  {
    classe: 'accent-general',
    nom: 'Accent (obert/tancat, no diacrític)',
    pot(p) { return /[àèòéíóú]/i.test(p) && !/^(és|més|bé|sí|què|sé)$/i.test(p); },
    espatlla(p) {
      return p.replace(/[àá]/g, 'a').replace(/[èé]/g, 'e').replace(/í/g, 'i')
              .replace(/[òó]/g, 'o').replace(/ú/g, 'u')
              .replace(/[ÀÁ]/g, 'A').replace(/[ÈÉ]/g, 'E').replace(/Í/g, 'I')
              .replace(/[ÒÓ]/g, 'O').replace(/Ú/g, 'U');
    },
  },
];

// ── Aleatorietat reproduïble ─────────────────────────────────
// Un generador congruencial petit: la mateixa llavor dona sempre el mateix joc
// de proves, que és el que fa que dos models es puguin comparar de veritat.
function generador(llavor) {
  let estat = llavor >>> 0;
  return () => {
    estat = (estat * 1664525 + 1013904223) >>> 0;
    return estat / 4294967296;
  };
}

function netaDeVora(paraula) {
  return paraula.replace(/^[«»"'(¿¡]+/, '').replace(/[.,;:!?«»"')]+$/, '');
}

/**
 * Injecta errors coneguts en un text.
 *
 * @param {string} text        El text original (pot portar els separadors ||).
 * @param {object} opcions
 *   @param {number} opcions.llavor    Per reproduir el mateix joc de proves.
 *   @param {number} opcions.quants    Quants errors com a màxim (per defecte 6).
 *   @param {string[]} [opcions.classes] Només aquestes classes, si es diu.
 * @returns {{original: string, ambErrors: string, esperats: object[]}}
 */
function injecta(text, { llavor = 1, quants = 6, classes = null } = {}) {
  const paraules = tokenitza(text);
  const regles = REGLES.filter((r) => !classes || classes.includes(r.classe));

  // Quines paraules pot tocar cada regla, amb la seva posició.
  const candidats = [];
  paraules.forEach((paraula, posicio) => {
    const nucli = netaDeVora(paraula);
    if (!nucli) return;
    for (const regla of regles) {
      if (regla.pot(nucli)) candidats.push({ posicio, paraula, nucli, regla });
    }
  });

  // Barreja reproduïble, i com a molt un error per paraula.
  const atzar = generador(llavor);
  for (let i = candidats.length - 1; i > 0; i--) {
    const j = Math.floor(atzar() * (i + 1));
    [candidats[i], candidats[j]] = [candidats[j], candidats[i]];
  }

  const triats = [];
  const posicionsUsades = new Set();
  for (const c of candidats) {
    if (triats.length >= quants) break;
    if (posicionsUsades.has(c.posicio)) continue;
    posicionsUsades.add(c.posicio);
    triats.push(c);
  }
  triats.sort((a, b) => a.posicio - b.posicio);

  // Es reconstrueix el text substituint només les paraules triades.
  const escrites = paraules.slice();
  const esperats = [];
  for (const c of triats) {
    const espatllat = c.regla.espatlla(c.nucli);
    const sencer = c.paraula.replace(c.nucli, espatllat);
    escrites[c.posicio] = sencer;
    esperats.push({
      posicio: c.posicio,
      classe: c.regla.classe,
      nom: c.regla.nom,
      original: c.paraula,
      escrit: sencer,
      // L'apostrofació parteix una paraula en dues: el corrector ho ha de
      // comptar com UN error, no com dos, i cal saber-ho en puntuar.
      partEnDues: !!c.regla.partEnDues,
    });
  }

  return {
    original: paraules.join(' '),
    ambErrors: escrites.join(' '),
    esperats,
  };
}

/** Quantes paraules del banc pot tocar cada classe: mesura la cobertura real. */
function cobertura(text) {
  const paraules = tokenitza(text).map(netaDeVora).filter(Boolean);
  const compte = {};
  for (const regla of REGLES) {
    compte[regla.classe] = paraules.filter((p) => regla.pot(p)).length;
  }
  return compte;
}

module.exports = { injecta, cobertura, REGLES };

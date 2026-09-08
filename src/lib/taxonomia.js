// Les categories d'error del català, i com es decideix quina toca (F25).
//
// ── Per què això existeix ────────────────────────────────────
// Els sis tipus d'abans —accentuació, apostrofació, majúscules, puntuació,
// ortografia, paraula incorrecta— descriuen **una diferència**, no una regla.
// «Ortografia» s'emportava la ela geminada, la ce trencada i la b/v totes tres
// juntes, i «accentuació» s'emportava els diacrítics i la dièresi. Amb això
// l'app no pot dir mai «se t'escapa la ela geminada», que és exactament el que
// un docent —i qui practica— vol saber.
//
// Sense aquestes categories no es poden fer F26 («on falles»), F27 (repesca de
// les frases fallades) ni F28 (micro-exercicis del teu propi error): totes tres
// necessiten agrupar els errors per REGLA.
//
// ── Es classifica amb un algorisme, no amb el model ──────────
// La mateixa raó que F31: comparar i classificar dues paraules és feina d'un
// algorisme. Demanar-ho al model tornaria a fer que la correcció depengués de
// que l'API respongui, faria la categoria no reproduïble, i deixaria
// l'historial vell sense classificar. Com que `classifica` és una funció pura
// de (original, escrit), les files que ja hi ha es poden tornar a classificar
// —i es fan, a la migració de `db.js`.
//
// ── El que NO es detecta, i per què ──────────────────────────
// · **Concordança de nom i adjectiu** («les cases blanca»). Distingir-la d'una
//   errada de conjugació demana gramàtica, no comparar lletres. Aquí només es
//   diu «concordança» quan les dues paraules són determinants de la mateixa
//   família —`les`/`els`, `aquesta`/`aquest`—, que sí que és inequívoc.
// · **`per`/`per a` quan l'alumne AFEGEIX l'`a`** només es detecta si al seu
//   text hi ha més «per a» que a l'original: el diff no guarda l'índex de les
//   paraules afegides, i passar-l'hi voldria dir tocar l'alineació que va
//   arreglar F57.
// · **`l'` davant de verb** és el pronom feble «el» («l'he vist»), no
//   l'article. Aquí compta com a apostrofació: distingir-ho vol saber si el que
//   ve després és un verb.

const { treuPuntuacio, treuAccents, distancia } = require('./paraules');

// ── El catàleg ───────────────────────────────────────────────
// `regla` és el que es diu quan el model no ha explicat l'error (i el primer
// graó del catàleg de fitxes que vol F30).
const CATEGORIES = [
  { id: 'apostrofació', nom: 'Apostrofació',
    regla: 'Davant de vocal o h, l\'article i la preposició s\'apostrofen: l\'aigua, d\'hivern.' },
  { id: 'pronoms febles', nom: 'Pronoms febles',
    regla: 'El pronom no s\'enganxa al verb: m\'agrada, dona\'m, portar-lo.' },
  { id: 'diacrítics', nom: 'Accents diacrítics',
    regla: 'Són els quinze parells que només distingeix l\'accent: és/es, més/mes, sí/si.' },
  { id: 'obert/tancat', nom: 'Accent obert o tancat',
    regla: 'La e i la o porten greu si són obertes (cafè, això) i agut si són tancades (véns, córrer).' },
  { id: 'dièresi', nom: 'Dièresi',
    regla: 'La dièresi diu que la i o la u sonen: raïm, qüestió.' },
  { id: 'accentuació', nom: 'Accentuació',
    regla: 'Revisa si aquesta paraula porta accent i on va.' },
  { id: 'ela geminada', nom: 'Ela geminada',
    regla: 'La ela geminada va amb punt volat: col·legi, intel·ligent. No és ni «ll» ni «l».' },
  { id: 'b/v', nom: 'B i V',
    regla: 'En català s\'escriu amb v el que en castellà va amb b: haver, trobar, canviar.' },
  { id: 'ç', nom: 'Ce trencada',
    regla: 'La ç va davant de a, o, u: força, caça. Davant de e i de i, s\'escriu c.' },
  { id: 's/ss', nom: 'Essa sorda i sonora',
    regla: 'Entre vocals, una sola s sona sonora (casa) i cal ss per a la sorda (passa).' },
  { id: 's/c', nom: 'Essa o ce',
    regla: 'Davant de e i de i, el so de essa sorda s\'escriu amb c en unes paraules '
      + '(centre, cinema) i amb s en altres (sentir, sis): va per paraula.' },
  { id: 's/z', nom: 'Essa o zeta',
    regla: 'El so de essa sonora s\'escriu s entre vocals (casa, rosa) i z a principi de '
      + 'paraula o darrere de consonant (zero, dotze).' },
  { id: 'h', nom: 'La hac',
    regla: 'La h no sona però s\'escriu: haver, hora, ahir.' },
  { id: 'guionets', nom: 'Guionets',
    regla: 'Revisa el guionet: vint-i-un, adéu-siau, porta-ho.' },
  { id: 'concordança', nom: 'Concordança',
    regla: 'El determinant concorda en gènere i nombre amb el nom: les cases, aquests llibres.' },
  { id: 'per/per a', nom: 'Per i per a',
    regla: 'Davant d\'infinitiu, «per» indica causa i «per a», finalitat.' },
  { id: 'majúscules', nom: 'Majúscules',
    regla: 'Revisa la majúscula.' },
  { id: 'puntuació', nom: 'Puntuació',
    regla: 'Revisa el signe de puntuació.' },
  { id: 'ortografia', nom: 'Ortografia',
    regla: 'Revisa com s\'escriu aquesta paraula.' },
  { id: 'paraula incorrecta', nom: 'Paraula incorrecta',
    regla: 'Aquesta no és la paraula del dictat.' },
  { id: 'paraula omesa', nom: 'Paraula omesa',
    regla: 'Aquesta paraula no s\'ha escrit.' },
  { id: 'paraula afegida', nom: 'Paraula afegida',
    regla: 'Aquesta paraula no era al dictat.' },
];

// La versió del catàleg. Puja quan una parella de paraules passa a classificar-se
// diferent, i és el que fa que la migració de `db.js` sàpiga quines files ha de
// tornar a mirar. Les files noves ja neixen amb aquesta versió posada: si no, es
// tornarien a classificar a CADA arrencada, per sempre.
const VERSIO = 2;

// ── El que no és una regla ───────────────────────────────────
//
// Tres categories del catàleg no són cap regla que es pugui estudiar: no haver
// escrit una paraula, haver-ne escrit una de més, i haver-ne escrit una que no
// era la del dictat. No tenen fitxa possible i no es poden practicar.
//
// Viu aquí i no a qui ho fa servir perquè **ja ha calgut tres vegades**: al
// resultat del dictat, al perfil i a la llista de textos. Tres còpies d'aquesta
// llista voldria dir que un dia divergeixen i les pantalles es contradiuen.
const NO_SON_REGLA = new Set(['paraula omesa', 'paraula afegida', 'paraula incorrecta']);

/** Si aquest tipus d'error és una regla que es pugui estudiar. */
const esRegla = (tipus) => !NO_SON_REGLA.has(tipus);

const PER_ID = new Map(CATEGORIES.map((c) => [c.id, c]));
const regla = (id) => (PER_ID.get(id) || {}).regla || '';
const nom = (id) => (PER_ID.get(id) || {}).nom || id;

// ── Els quinze diacrítics ────────────────────────────────────
// Els de la norma vigent (IEC, 2016), no els d'abans: `dóna`, `sóc`, `nét` i
// `ós` van deixar de portar accent i posar-los a la llista seria ensenyar una
// ortografia que ja no existeix. Els plurals que el conserven, també hi són.
const DIACRITICS = [
  ['bé', 'be'], ['béns', 'bens'], ['déu', 'deu'], ['déus', 'deus'],
  ['és', 'es'], ['mà', 'ma'], ['mans', 'mans'], ['més', 'mes'],
  ['món', 'mon'], ['móns', 'mons'], ['pèl', 'pel'], ['pèls', 'pels'],
  ['què', 'que'], ['sé', 'se'], ['sí', 'si'], ['sòl', 'sol'], ['sòls', 'sols'],
  ['són', 'son'], ['té', 'te'], ['ús', 'us'], ['vés', 'ves'],
];
const PARELLS_DIACRITICS = new Set();
for (const [amb, sense] of DIACRITICS) {
  PARELLS_DIACRITICS.add(amb + '|' + sense);
  PARELLS_DIACRITICS.add(sense + '|' + amb);
}

// ── Determinants, per famílies ───────────────────────────────
// Per família, perquè `el`/`un` no és concordança: és triar un altre
// determinant. `les`/`els` sí que ho és.
const FAMILIES = [
  ['el', 'la', 'els', 'les'],
  ['un', 'una', 'uns', 'unes'],
  ['aquest', 'aquesta', 'aquests', 'aquestes'],
  ['aquell', 'aquella', 'aquells', 'aquelles'],
  ['meu', 'meva', 'meus', 'meves'], ['teu', 'teva', 'teus', 'teves'],
  ['seu', 'seva', 'seus', 'seves'],
  ['nostre', 'nostra', 'nostres'], ['vostre', 'vostra', 'vostres'],
  ['tot', 'tota', 'tots', 'totes'], ['molt', 'molta', 'molts', 'moltes'],
  ['poc', 'poca', 'pocs', 'poques'], ['algun', 'alguna', 'alguns', 'algunes'],
  ['altre', 'altra', 'altres'],
];
const FAMILIA = new Map();
FAMILIES.forEach((f, i) => f.forEach((p) => FAMILIA.set(p, i)));

// Pronoms febles que van sols. `el`, `la`, `els` i `les` no hi són: comparteixen
// forma amb l'article i, en un dictat, confondre'ls és molt més sovint
// concordança.
const PRONOMS_SOLTS = new Set(['em', 'et', 'es', 'li', 'ens', 'us', 'ho', 'hi', 'en', 'me', 'te', 'se', 'nos', 'vos']);
const PROCLITIC = /^[mnst]['’]/i;                       // m'agrada, s'ha, n'hi
const ENCLITIC_APOSTROF = /['’](l|ls|m|n|ns|s|t)$/i;    // dona'm, porta'l
const ENCLITIC_GUIONET = /-(lo|la|los|les|li|ne|me|te|se|nos|vos|hi|ho|n)$/i;
const APOSTROF = /['’]/;

const conte = (re, ...paraules) => paraules.some((p) => re.test(p));
const igual = (a, b) => a === b;

// ── Els normalitzadors ───────────────────────────────────────
// Cadascun esborra UNA distinció. Si esborrant-la les dues paraules es tornen
// iguals, l'error és d'aquella regla i no d'una altra.
const senseElaGeminada = (p) => p.replace(/·/g, '');
const cedillaCom = (lletra) => (p) => p.replace(/ç/g, lletra).replace(/Ç/g, lletra.toUpperCase());
const bComV = (p) => p.replace(/v/g, 'b').replace(/V/g, 'B');
const senseBiV = (p) => p.replace(/[bv]/gi, '');
const senseH = (p) => p.replace(/h/gi, '');
const senseGuionets = (p) => p.replace(/-/g, '');
// Els tres sons de essa van per separat perquè són TRES regles diferents, i
// una categoria que se les emporta totes només pot ensenyar-ne una. Vegeu la
// nota de sota, a `classifica`.
const ssComS = (p) => p.replace(/ss/g, 's');
const ceComS = (p) => p.replace(/ç/g, 's').replace(/c([ei])/g, 's$1');
const zComS = (p) => p.replace(/z/g, 's');
// Quan cap de les tres soles no explica l'error, però totes juntes sí.
const essaPlana = (p) => zComS(ceComS(ssComS(p)));

/** Quin accent porta cada vocal, per veure si el que canvia és obert/tancat. */
function marques(paraula) {
  const fora = [];
  for (const car of paraula.normalize('NFD')) {
    const codi = car.codePointAt(0);
    if (codi === 0x300) fora.push('greu');
    else if (codi === 0x301) fora.push('agut');
  }
  return fora.join(',');
}

/**
 * De quina regla és aquest error.
 *
 * @param {string|null} original  La paraula del dictat, o `null` si l'alumne
 *                               n'ha escrit una que no hi era.
 * @param {string|null} escrit    El que ha escrit, o `null` si se l'ha deixat.
 * @param {object} [context]      `{ paraules, pos, mesPerA }` — només fa falta
 *                                per a `per/per a`.
 * @returns {string} L'id d'una categoria del catàleg.
 */
function classifica(original, escrit, context = {}) {
  const { paraules = null, pos = null, mesPerA = false } = context;

  if (escrit === null) {
    // «per a» escrit «per»: el que falta és l'`a` i just abans hi ha un «per».
    const net = treuPuntuacio(String(original ?? '')).toLowerCase();
    const abans = paraules && pos > 0 ? treuPuntuacio(paraules[pos - 1]).toLowerCase() : '';
    if (net === 'a' && abans === 'per') return 'per/per a';
    return 'paraula omesa';
  }
  if (original === null) {
    const net = treuPuntuacio(String(escrit ?? '')).toLowerCase();
    if (net === 'a' && mesPerA) return 'per/per a';
    return 'paraula afegida';
  }

  const o = treuPuntuacio(original);
  const e = treuPuntuacio(escrit);
  if (igual(o, e)) return 'puntuació';

  // Els pronoms febles van ABANS de l'apostrofació: `m'agrada` escrit
  // `magrada` també és un apòstrof que falta, però la regla que s'ha vulnerat
  // és la del pronom.
  if (conte(PROCLITIC, o, e) || conte(ENCLITIC_APOSTROF, o, e) || conte(ENCLITIC_GUIONET, o, e)) {
    return 'pronoms febles';
  }
  if (APOSTROF.test(o) !== APOSTROF.test(e)) return 'apostrofació';

  const ob = o.toLowerCase();
  const eb = e.toLowerCase();
  if (igual(ob, eb)) return 'majúscules';

  // Accents: si esborrant-los les paraules són iguals, la diferència és d'accent
  // i només queda dir de quin.
  if (igual(treuAccents(ob), treuAccents(eb))) {
    if (PARELLS_DIACRITICS.has(ob + '|' + eb)) return 'diacrítics';
    if (/[ïü]/.test(ob) || /[ïü]/.test(eb)) return 'dièresi';
    // Totes dues accentuades, però amb l'accent al revés.
    if (marques(ob) && marques(eb)) return 'obert/tancat';
    return 'accentuació';
  }

  if (igual(senseGuionets(ob), senseGuionets(eb))) return 'guionets';

  if (/·/.test(ob) !== /·/.test(eb)) {
    const a = senseElaGeminada(ob), b = senseElaGeminada(eb);
    if (igual(a, b) || igual(a.replace(/ll/g, 'l'), b.replace(/ll/g, 'l'))) return 'ela geminada';
  }

  // La ç abans que l'essa: `caça` escrit `casa` és les dues coses, però la
  // regla que s'ha d'aprendre és la de la ce trencada.
  if (/ç/.test(ob) !== /ç/.test(eb)
    && (igual(cedillaCom('s')(ob), cedillaCom('s')(eb)) || igual(cedillaCom('c')(ob), cedillaCom('c')(eb)))) {
    return 'ç';
  }
  // Els sons de essa, de la regla més estreta a la més ampla. L'ordre no és
  // estètic: cada normalitzador esborra UNA distinció, i el primer que iguala
  // les dues paraules és el que diu quina regla s'ha vulnerat. Si es provés
  // amb els tres alhora —com es feia— `sentre` per `centre` sortiria com a
  // essa sorda i sonora i se li ensenyaria a l'alumne la regla de la doble
  // essa, que no té res a veure amb el seu error.
  if (igual(ssComS(ob), ssComS(eb))) return 's/ss';
  if (igual(ceComS(ob), ceComS(eb))) return 's/c';
  if (igual(zComS(ob), zComS(eb))) return 's/z';
  // Dues distincions alhora (`dotze` escrit `dotsse`): no hi ha UNA regla que
  // ho expliqui, i inventar-ne una seria pitjor que dir «mira com s'escriu».
  if (igual(essaPlana(ob), essaPlana(eb))) return 'ortografia';
  if (igual(bComV(ob), bComV(eb)) || igual(senseBiV(ob), senseBiV(eb))) return 'b/v';
  if (igual(senseH(ob), senseH(eb))) return 'h';

  if (PRONOMS_SOLTS.has(ob) && PRONOMS_SOLTS.has(eb)) return 'pronoms febles';
  if (FAMILIA.has(ob) && FAMILIA.get(ob) === FAMILIA.get(eb)) return 'concordança';

  if (distancia(ob, eb) <= 2) return 'ortografia';
  return 'paraula incorrecta';
}

/** Quantes vegades apareix «per a» en una llista de paraules. */
function comptaPerA(paraules) {
  let n = 0;
  for (let i = 0; i < (paraules || []).length - 1; i++) {
    if (treuPuntuacio(paraules[i]).toLowerCase() === 'per'
      && treuPuntuacio(paraules[i + 1]).toLowerCase() === 'a') n++;
  }
  return n;
}

module.exports = { CATEGORIES, VERSIO, NO_SON_REGLA, esRegla, classifica, regla, nom, comptaPerA, DIACRITICS };

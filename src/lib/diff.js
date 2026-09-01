// Comparació determinista entre el text original i el que ha escrit l'alumne.
//
// Per què existeix: fins ara aquesta feina la feia el model. Se li demanava el
// camp `position` —l'índex de cada paraula fallada dins l'original— i el
// frontend pintava en vermell `paraules[position]`. Comptar índexs no és feina
// d'un model de llenguatge: quan se li desviava, l'app subratllava una paraula
// que estava bé i deixava neta la que havia fallat, i qui feia el dictat veia
// un error on no n'hi havia.
//
// Comparar dues llistes de paraules sí que és feina d'un algorisme. Aquí
// s'ancoren amb una subseqüència comuna més llarga (LCS) sobre una clau laxa
// —minúscules, sense accents ni puntuació de vora— i el que queda entre àncora
// i àncora s'aparella per ordre. Les posicions són exactes per construcció.
//
// Efecte de segon ordre, i no és menor: la correcció ja no depèn de que l'API
// respongui. Si Claude falla, el dictat es corregeix igual i el que es perd
// són les explicacions, no la correcció.

const VORA = '«»“”‘’()[]{}¡!¿?.,;:…—–\'"';
const RE_VORA = new RegExp(
  `^[${VORA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]+|[${VORA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]+$`,
  'g',
);

function treuPuntuacio(paraula) {
  return paraula.replace(RE_VORA, '');
}

// Treu els diacrítics combinats, però NO la cedilla (U+0327): `caça` contra
// `caca` no és un error d'accentuació, és un altre error, i barrejar-los
// enganya justament a qui està practicant.
const CEDILLA = 0x327;
function treuAccents(paraula) {
  let net = '';
  for (const car of paraula.normalize('NFD')) {
    const codi = car.codePointAt(0);
    if (codi >= 0x300 && codi <= 0x36f && codi !== CEDILLA) continue;
    net += car;
  }
  return net.normalize('NFC');
}

// Clau d'aparellament: prou laxa perquè `camí` i `cami` s'ancorin com la
// mateixa paraula i el diff les vegi com una substitució, no com una paraula
// omesa més una d'afegida.
function clau(paraula) {
  return treuAccents(treuPuntuacio(paraula)).toLowerCase();
}

function tokenitza(text) {
  return String(text || '')
    .replace(/\|\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

function distancia(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let anterior = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const actual = [i];
    for (let j = 1; j <= n; j++) {
      actual[j] = Math.min(
        anterior[j] + 1,
        actual[j - 1] + 1,
        anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    anterior = actual;
  }
  return anterior[n];
}

// Parelles d'índexs (i,j) de les paraules que coincideixen, en ordre.
function ancores(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const parelles = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { parelles.push([i, j]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return parelles;
}

function alinea(originals, escrites) {
  const punts = ancores(originals.map(clau), escrites.map(clau));
  const diferencies = [];
  let io = 0, ie = 0;

  // El que queda entre dues àncores s'aparella per ordre: el que sobra de
  // l'original són paraules omeses i el que sobra de l'alumne, afegides.
  function buida(finsO, finsE) {
    const restaO = [], restaE = [];
    while (io < finsO) restaO.push(io++);
    while (ie < finsE) restaE.push(ie++);
    const parells = Math.min(restaO.length, restaE.length);
    for (let k = 0; k < parells; k++) {
      if (originals[restaO[k]] === escrites[restaE[k]]) continue;
      diferencies.push({ pos: restaO[k], original: originals[restaO[k]], escrit: escrites[restaE[k]] });
    }
    for (let k = parells; k < restaO.length; k++) {
      diferencies.push({ pos: restaO[k], original: originals[restaO[k]], escrit: null });
    }
    for (let k = parells; k < restaE.length; k++) {
      diferencies.push({ pos: null, original: null, escrit: escrites[restaE[k]] });
    }
  }

  for (const [ao, ae] of punts) {
    buida(ao, ae);
    // L'àncora coincideix per clau laxa, però pot no coincidir lletra per
    // lletra: `camí` i `cami` tenen la mateixa clau i són un error d'accent.
    if (originals[ao] !== escrites[ae]) {
      diferencies.push({ pos: ao, original: originals[ao], escrit: escrites[ae] });
    }
    io = ao + 1;
    ie = ae + 1;
  }
  buida(originals.length, escrites.length);
  return diferencies;
}

// L'error més freqüent del català escrit: desfer una contracció amb apòstrof
// (`l'aigua` -> `la aigua`, `s'aixequen` -> `se aixequen`). L'alineació el veu
// com dues coses —una substitució i una paraula afegida— i comptar-lo com dos
// errors infla l'escala injustament, perquè per a qui practica és una sola
// regla. Aquí es tornen a ajuntar.
function ajuntaApostrofs(diferencies) {
  const APOSTROFS = /['\u2019]/;
  const fusionades = [];
  for (let k = 0; k < diferencies.length; k++) {
    const d = diferencies[k];
    const seguent = diferencies[k + 1];
    const partit = d.original && d.escrit && seguent
      && seguent.original === null && seguent.escrit !== null
      && APOSTROFS.test(d.original);
    if (partit) {
      const senseApostrof = clau(d.original.replace(APOSTROFS, ''));
      const ajuntat = clau(d.escrit + seguent.escrit);
      if (distancia(senseApostrof, ajuntat) <= 2) {
        fusionades.push({ pos: d.pos, original: d.original, escrit: `${d.escrit} ${seguent.escrit}` });
        k++;
        continue;
      }
    }

    // Tercer cas, i el que menys es veu venir: l'alineació ha decidit que la
    // paraula apostrofada no hi és i que sobren dues paraules soltes. Passa quan
    // la partició genera una paraula que ja existeix a prop a l'original i
    // l'àncora se l'endú — «A l'estiu el sol...» escrit «A el estiu el sol...»:
    // l'«el» de l'alumne s'ancora amb l'«el» de després i queda l'apòstrof
    // convertit en una omissió més dues paraules de més. Per a qui escriu és
    // una sola falta d'apòstrof, i comptar-li'n tres és exactament el que F31
    // havia d'eliminar.
    const tercera = diferencies[k + 2];
    const esberlat = d.original && d.escrit === null && APOSTROFS.test(d.original)
      && seguent && seguent.original === null && seguent.escrit !== null
      && tercera && tercera.original === null && tercera.escrit !== null;
    if (esberlat) {
      const senseApostrof = clau(d.original.replace(APOSTROFS, ''));
      // L'ordre en què queden les dues paraules afegides depèn de quina se
      // n'ha endut l'àncora, així que es proven les dues combinacions.
      const endavant = clau(seguent.escrit + tercera.escrit);
      const enrere = clau(tercera.escrit + seguent.escrit);
      const millor = distancia(senseApostrof, endavant) <= distancia(senseApostrof, enrere)
        ? { text: `${seguent.escrit} ${tercera.escrit}`, d: distancia(senseApostrof, endavant) }
        : { text: `${tercera.escrit} ${seguent.escrit}`, d: distancia(senseApostrof, enrere) };
      if (millor.d <= 2) {
        fusionades.push({ pos: d.pos, original: d.original, escrit: millor.text });
        k += 2;
        continue;
      }
    }

    // El mateix a l'inrevés: l'original són dues paraules i l'alumne les ha
    // ajuntat amb apòstrof.
    const ajuntat = d.original && d.escrit && seguent
      && seguent.escrit === null && seguent.original !== null
      && APOSTROFS.test(d.escrit);
    if (ajuntat) {
      const senseApostrof = clau(d.escrit.replace(APOSTROFS, ''));
      const separat = clau(d.original + seguent.original);
      if (distancia(senseApostrof, separat) <= 2) {
        // Abasta dues paraules de l'original: el marcador les ha de pintar
        // totes dues, o en deixaria una en verd havent fallat.
        fusionades.push({ pos: d.pos, abasta: 2, original: `${d.original} ${seguent.original}`, escrit: d.escrit });
        k++;
        continue;
      }
    }
    fusionades.push(d);
  }
  return fusionades;
}

// Els tipus són els sis de sempre més `majúscules`, que abans queia dins
// d'`ortografia` i és una altra cosa. La taxonomia de debò —apostrofació,
// diacrítics, ela geminada, pronoms febles…— és F25.
function classifica(original, escrit) {
  if (escrit === null) return 'paraula omesa';
  if (original === null) return 'paraula afegida';

  const o = treuPuntuacio(original);
  const e = treuPuntuacio(escrit);
  if (o === e) return 'puntuació';
  if (/['\u2019]/.test(o) && !/['\u2019]/.test(e)) return 'apostrofació';
  if (!/['\u2019]/.test(o) && /['\u2019]/.test(e)) return 'apostrofació';
  if (o.toLowerCase() === e.toLowerCase()) return 'majúscules';
  if (treuAccents(o).toLowerCase() === treuAccents(e).toLowerCase()) return 'accentuació';
  if (distancia(o.toLowerCase(), e.toLowerCase()) <= 2) return 'ortografia';
  return 'paraula incorrecta';
}

/**
 * Compara el text original amb el de l'alumne.
 * Torna les paraules de l'original i la llista de diferències, cadascuna amb
 * la posició exacta dins l'original (`null` només per a les paraules afegides,
 * que no en tenen).
 */
function compara(textOriginal, textAlumne) {
  const paraules = tokenitza(textOriginal);
  const escrites = tokenitza(textAlumne);
  const errors = ajuntaApostrofs(alinea(paraules, escrites)).map((d) => ({
    position: d.pos,
    span: d.abasta || 1,
    original: d.original,
    userWrote: d.escrit,
    type: classifica(d.original, d.escrit),
    explanation: '',
  }));
  return { paraules, escrites, errors };
}

module.exports = { compara, tokenitza, classifica, treuPuntuacio, treuAccents };

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

const { treuPuntuacio, treuAccents, clau, distancia } = require('./paraules');
const taxonomia = require('./taxonomia');

function tokenitza(text) {
  return String(text || '')
    .replace(/\|\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
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
//
// La versió d'abans cosia PARELLES d'elements veïns, i amb dos apòstrofs
// seguits fallava (F57): l'aparellament per ordre de `buida` es desplaça una
// posició per cada apòstrof («L'oli d'oliva» escrit «El oli de oliva» dona
// L'oli↔El i d'oliva↔oli, més dues paraules de més), i cap parella local ho
// pot recompondre. Per això ara es treballa per TANDES: es reagafen totes les
// paraules d'un tram de diferències veïnes i es tornen a aparellar deixant que
// cada paraula apostrofada consumeixi les dues que li toquen.
function ajuntaApostrofs(diferencies) {
  const APOSTROFS = /['’]/;
  const fusionades = [];
  let k = 0;
  while (k < diferencies.length) {
    // Delimita la tanda: elements consecutius de l'array que també són veïns
    // al text. Les afegides (pos null) pertanyen al tram on apareixen; un salt
    // de posició de més de 2 tanca la tanda (una àncora encertada entremig,
    // com al cas «A l'estiu el sol», encara compta com a veí). Sense aquest
    // tall es fusionarien paraules de trams allunyats del text.
    let fi = k;
    let ultimaPos = null;
    while (fi < diferencies.length) {
      const p = diferencies[fi].pos;
      if (p !== null && ultimaPos !== null && p > ultimaPos + 2) break;
      if (p !== null) ultimaPos = p;
      fi++;
    }

    // Si a la tanda no hi ha cap apòstrof, no hi ha res a fusionar: es deixen
    // les diferències tal com estaven.
    //
    // Sense aquesta comprovació, la finestra de veïnatge (±2) ajuntava trams
    // que no tenien res a veure i els tornava a aparellar per ordre. Amb
    // «per a estudiar català» escrit «per estudiar catala», l'`a` que falta i
    // el `català` sense accent queien a la mateixa tanda i sortia que l'alumne
    // havia escrit «catala» en comptes d'«a» i que s'havia deixat «català»:
    // dos errors inventats en lloc dels dos de veritat. Ho va destapar F25,
    // buscant el cas de `per`/`per a`.
    let hiHaApostrof = false;
    for (let m = k; m < fi && !hiHaApostrof; m++) {
      const d = diferencies[m];
      hiHaApostrof = APOSTROFS.test(d.original || '') || APOSTROFS.test(d.escrit || '');
    }
    if (!hiHaApostrof) {
      for (let m = k; m < fi; m++) fusionades.push(diferencies[m]);
      k = fi;
      continue;
    }

    // Les paraules de la tanda, en l'ordre del text: `buida` emet cada tram
    // amb les substitucions primer i les sobrants després, totes dues llistes
    // en ordre, així que reagafar-les deixa cada banda ben ordenada.
    const originals = [];
    const escrites = [];
    for (let m = k; m < fi; m++) {
      const d = diferencies[m];
      if (d.original !== null) originals.push({ pos: d.pos, text: d.original });
      if (d.escrit !== null) escrites.push(d.escrit);
    }

    // Reaparella: 1↔1 com sempre, però una paraula amb apòstrof pot consumir
    // dues de l'altra banda si el resultat s'assembla més que el d'una sola.
    let i = 0;
    let j = 0;
    while (i < originals.length || j < escrites.length) {
      const o = originals[i];
      const e = escrites[j];
      if (o && e !== undefined) {
        if (APOSTROFS.test(o.text) && j + 1 < escrites.length) {
          const sense = clau(o.text.replace(APOSTROFS, ''));
          const dSol = distancia(sense, clau(e));
          // Amb més paraules escrites que originals a la tanda, si no es
          // fusiona el sobrant es filtra com a «paraula afegida»: el llindar
          // es relaxa. I es prova també l'ordre invers, perquè quan la
          // partició xoca amb una paraula que ja hi és («A l'estiu el sol»
          // escrit «A el estiu el sol») l'àncora se n'endú una i les dues
          // sobrants queden girades.
          const sobren = escrites.length - j > originals.length - i;
          const dJunt = distancia(sense, clau(e + escrites[j + 1]));
          const dGirat = distancia(sense, clau(escrites[j + 1] + e));
          const millor = dJunt <= dGirat
            ? { d: dJunt, text: `${e} ${escrites[j + 1]}` }
            : { d: dGirat, text: `${escrites[j + 1]} ${e}` };
          if (millor.d <= 2 && (millor.d < dSol || sobren)) {
            fusionades.push({ pos: o.pos, original: o.text, escrit: millor.text });
            i++;
            j += 2;
            continue;
          }
        }
        // El mateix a l'inrevés: l'original són dues paraules i l'alumne les
        // ha ajuntat amb apòstrof. Abasta dues paraules de l'original: el
        // marcador les ha de pintar totes dues, o en deixaria una en verd
        // havent fallat.
        if (APOSTROFS.test(e) && i + 1 < originals.length) {
          const sense = clau(e.replace(APOSTROFS, ''));
          const dJunt = distancia(sense, clau(o.text + originals[i + 1].text));
          if (dJunt <= 2 && dJunt < distancia(sense, clau(o.text))) {
            fusionades.push({ pos: o.pos, abasta: 2, original: `${o.text} ${originals[i + 1].text}`, escrit: e });
            i += 2;
            j++;
            continue;
          }
        }
        if (o.text !== e) fusionades.push({ pos: o.pos, original: o.text, escrit: e });
        i++;
        j++;
      } else if (o) {
        fusionades.push({ pos: o.pos, original: o.text, escrit: null });
        i++;
      } else {
        fusionades.push({ pos: null, original: null, escrit: e });
        j++;
      }
    }
    k = fi;
  }
  return fusionades;
}

// Quina regla s'ha vulnerat ho decideix `taxonomia.js` (F25). Aquí només es
// compara i es posiciona; allà es diu de què és l'error.
const classifica = taxonomia.classifica;

/**
 * Compara el text original amb el de l'alumne.
 * Torna les paraules de l'original i la llista de diferències, cadascuna amb
 * la posició exacta dins l'original (`null` només per a les paraules afegides,
 * que no en tenen).
 */
function compara(textOriginal, textAlumne) {
  const paraules = tokenitza(textOriginal);
  const escrites = tokenitza(textAlumne);
  // `mesPerA` és l'única manera que hi ha de veure un «per a» que l'alumne ha
  // afegit: el diff no guarda l'índex de les paraules de més, i posar-l'hi
  // voldria dir tocar l'alineació que va arreglar F57.
  const mesPerA = taxonomia.comptaPerA(escrites) > taxonomia.comptaPerA(paraules);
  const errors = ajuntaApostrofs(alinea(paraules, escrites)).map((d) => ({
    position: d.pos,
    span: d.abasta || 1,
    original: d.original,
    userWrote: d.escrit,
    type: classifica(d.original, d.escrit, { paraules, pos: d.pos, mesPerA }),
    // El nom que es veu a la pantalla. L'id és estable i va a la base de dades;
    // el nom pot canviar de redacció sense trencar cap consulta de F26.
    typeName: '',
    explanation: '',
  }));
  for (const e of errors) e.typeName = taxonomia.nom(e.type);
  return { paraules, escrites, errors };
}

module.exports = { compara, tokenitza, classifica, treuPuntuacio, treuAccents };

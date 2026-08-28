// Rangs i punts: la sensació de progrés que un dictat solt no pot donar.
//
// Conviu amb l'escala motivadora, no la substitueix. L'escala («Excel·lent!»,
// «Molt bé!»…) diu com ha anat AQUEST dictat i va per nombre d'errors, que és
// una decisió de producte escrita a CLAUDE.md. El rang diu on ets EN CONJUNT i
// només es mou amb el temps. Són dos eixos i es llegeixen a llocs diferents.
//
// Tres decisions que valen la pena explicar, perquè són les que caldrà afinar:
//
//   1. Els punts pugen amb la dificultat, però les pèrdues NO. Guanyar amb un
//      text avançat val molt més que amb un de bàsic; equivocar-se hi costa el
//      mateix. Si el càstig també s'escalés, provar coses difícils sortiria a
//      compte només quan ja et surten bé, que és exactament al revés del que
//      volem.
//
//   2. El llindar on es deixa de guanyar i es comença a perdre són 6 errors,
//      que és on l'escala passa de «Bé!» a «Progressant!». Les dues coses han
//      de dir el mateix, o l'app es contradiu a la mateixa pantalla.
//
//   3. Es baixa de rang, però amb un marge. Sense marge, el primer dictat
//      fluix després d'ascendir et torna a baixar i el rang fa io-io; amb un
//      marge petit hi ha tensió sense que sigui erràtic.
//
// Res es desa acumulat: el total es recalcula recorrent l'historial. Costa una
// mica més, però vol dir que el dia que afinem la fórmula tothom queda
// recol·locat sol, sense migracions ni comptadors desincronitzats.

// ── Els rangs ────────────────────────────────────────────────
// L'anatomia d'un castell, de baix a dalt. La metàfora és literal: es puja.
const RANGS = [
  { id: 'pinya',     nom: 'Pinya',     punts: 0,    que: 'La base que sosté tot el pes.' },
  { id: 'folre',     nom: 'Folre',     punts: 200,  que: 'El segon pis de la base, quan el castell puja més amunt.' },
  { id: 'manilles',  nom: 'Manilles',  punts: 500,  que: 'El tercer reforç, el dels castells més alts.' },
  { id: 'tronc',     nom: 'Tronc',     punts: 1000, que: 'El cos del castell, on comença a agafar alçada.' },
  { id: 'tercos',    nom: 'Terços',    punts: 2000, que: 'El tercer pis del tronc: des d\'aquí ja es veu lluny.' },
  { id: 'dosos',     nom: 'Dosos',     punts: 3500, que: 'Els dos castellers que aguanten tota la part alta.' },
  { id: 'aixecador', nom: 'Aixecador', punts: 5500, que: 'Qui obre pas perquè l\'enxaneta pugui coronar.' },
  { id: 'enxaneta',  nom: 'Enxaneta',  punts: 8000, que: 'Qui corona el castell i aixeca la mà.' },
];

// Quant val cada nivell. Un text avançat fa treballar molt més que un de bàsic
// i ho ha de notar.
const DIFICULTAT = { basic: 1, intermedi: 1.5, avancat: 2.2, personal: 1.2 };

// Els textos del banc, de mitjana, per poder puntuar els dictats antics que es
// van desar abans que es guardés el nombre de paraules.
const PARAULES_TIPIQUES = { basic: 34, intermedi: 57, avancat: 84, personal: 50 };

// Com de bé ha anat, en els mateixos trams que l'escala motivadora.
// A partir de 6 errors es perd: és on l'escala passa de «Bé!» a «Progressant!».
const QUALITAT = [
  { finsA: 0, valor: 1 },
  { finsA: 2, valor: 0.6 },
  { finsA: 5, valor: 0.25 },
  { finsA: 9, valor: -0.25 },
  { finsA: Infinity, valor: -0.6 },
];

// Quants punts per sota del llindar cal caure per baixar de rang.
const MARGE_DE_BAIXADA = 40;

function qualitat(errors) {
  for (const tram of QUALITAT) if (errors <= tram.finsA) return tram.valor;
  return -0.6;
}

/**
 * Punts d'un dictat. Positius si ha anat bé, negatius si ha anat malament.
 * `paraules` pot venir buit als dictats antics: s'estima pel nivell.
 */
function puntsDelDictat({ level, totalWords, errors }) {
  const nivell = DIFICULTAT[level] ? level : 'personal';
  const paraules = totalWords > 0 ? totalWords : PARAULES_TIPIQUES[nivell];
  const q = qualitat(Math.max(0, errors || 0));

  // Guanyar escala amb la dificultat; perdre, no. Veure la nota 1 de dalt.
  const base = q >= 0 ? paraules * DIFICULTAT[nivell] : paraules;
  return Math.round(base * q);
}

function rangDe(punts) {
  let trobat = RANGS[0];
  for (const r of RANGS) if (punts >= r.punts) trobat = r;
  return trobat;
}

function indexDe(rang) {
  return RANGS.findIndex((r) => r.id === rang.id);
}

/**
 * Recorre l'historial en ordre cronològic i torna l'estat després de cada
 * dictat. Els punts no baixen mai de zero, i el rang no baixa fins que no es
 * cau prou per sota del llindar (veure la nota 3).
 */
function recorregut(dictats) {
  let punts = 0;
  let rang = RANGS[0];
  const passes = [];

  for (const d of dictats) {
    const guanyats = puntsDelDictat(d);
    const abans = rang;
    punts = Math.max(0, punts + guanyats);

    const objectiu = rangDe(punts);
    if (indexDe(objectiu) > indexDe(rang)) {
      rang = objectiu;                                   // pujar és immediat
    } else if (indexDe(objectiu) < indexDe(rang) && punts < rang.punts - MARGE_DE_BAIXADA) {
      rang = objectiu;                                   // baixar, amb marge
    }

    passes.push({ ...d, guanyats, punts, rang, rangAnterior: abans });
  }

  return passes;
}

/** Estat actual d'algú, a partir de tot el seu historial. */
function estat(dictats) {
  const passes = recorregut(dictats);
  const ultima = passes[passes.length - 1];
  const punts = ultima ? ultima.punts : 0;
  const rang = ultima ? ultima.rang : RANGS[0];
  const seguent = RANGS[indexDe(rang) + 1] || null;

  return {
    punts,
    rang: { id: rang.id, nom: rang.nom, que: rang.que, nivell: indexDe(rang) + 1, de: RANGS.length },
    seguent: seguent
      ? {
        nom: seguent.nom,
        punts: seguent.punts,
        falten: Math.max(0, seguent.punts - punts),
        // Quant s'ha avançat dins del tram actual, per a la barra de progrés.
        progres: Math.round(((punts - rang.punts) / (seguent.punts - rang.punts)) * 100),
      }
      : null,
    // L'últim dictat: què ha donat i si ha mogut el rang.
    ultim: ultima
      ? {
        guanyats: ultima.guanyats,
        haPujat: indexDe(ultima.rang) > indexDe(ultima.rangAnterior),
        haBaixat: indexDe(ultima.rang) < indexDe(ultima.rangAnterior),
        rangAnterior: ultima.rangAnterior.nom,
      }
      : null,
  };
}

module.exports = { RANGS, DIFICULTAT, puntsDelDictat, rangDe, recorregut, estat, MARGE_DE_BAIXADA };

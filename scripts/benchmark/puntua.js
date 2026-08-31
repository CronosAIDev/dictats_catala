// Puntua el corrector contra els errors injectats (#22, F55).
//
//   node scripts/benchmark/puntua.js [--llavors 5] [--quants 6]
//
// Important: des de F31 la comparació de paraules la fa el servidor, no el
// model. Per tant el recall i els falsos positius del camí de TEXT es poden
// mesurar SENSE clau d'API i sense gastar ni un cèntim — i el resultat és
// determinista, no una mostra. El que queda per al model és escriure les
// explicacions, que és una altra pregunta i es mesura a part.

const { compara } = require('../../src/lib/diff');
const { injecta, REGLES } = require('./injecta');
const texts = require('../../data/texts');

const args = process.argv.slice(2);
const opcio = (nom, defecte) => {
  const i = args.indexOf('--' + nom);
  return i >= 0 ? Number(args[i + 1]) : defecte;
};
const LLAVORS = opcio('llavors', 5);
const QUANTS = opcio('quants', 6);

const tots = [
  ...texts.basic.map((t) => ({ ...t, nivell: 'basic' })),
  ...texts.intermedi.map((t) => ({ ...t, nivell: 'intermedi' })),
  ...texts.avancat.map((t) => ({ ...t, nivell: 'avancat' })),
];

// Comptadors per classe injectada.
const perClasse = {};
for (const r of REGLES) {
  perClasse[r.classe] = { injectats: 0, trobats: 0, tipus: {} };
}

let falsosPositius = 0;
let errorsTotals = 0;
let casos = 0;
const falsosDetall = [];

for (let llavor = 1; llavor <= LLAVORS; llavor++) {
  for (const text of tots) {
    const { original, ambErrors, esperats } = injecta(text.text, { llavor, quants: QUANTS });
    if (!esperats.length) continue;
    casos++;

    const resultat = compara(original, ambErrors);
    errorsTotals += resultat.errors.length;

    // Un error injectat es dona per trobat si el corrector reporta alguna cosa
    // dins de l'abast que ocupa. L'apostrofació parteix una paraula en dues, i
    // el corrector la torna a ajuntar: per això es mira l'abast, no la posició.
    const reportadesPerPosicio = new Map();
    for (const e of resultat.errors) {
      const abast = e.span || 1;
      for (let i = 0; i < abast; i++) reportadesPerPosicio.set(e.position + i, e);
    }

    const consumides = new Set();
    for (const esperat of esperats) {
      const c = perClasse[esperat.classe];
      c.injectats++;
      const trobat = reportadesPerPosicio.get(esperat.posicio);
      if (trobat) {
        c.trobats++;
        c.tipus[trobat.type] = (c.tipus[trobat.type] || 0) + 1;
        consumides.add(trobat);
      }
    }

    // Fals positiu: un error reportat que no correspon a cap injectat.
    for (const e of resultat.errors) {
      if (!consumides.has(e)) {
        falsosPositius++;
        if (falsosDetall.length < 8) {
          falsosDetall.push(`${text.id} llavor ${llavor}: pos ${e.position} ${e.type} `
            + `${JSON.stringify(e.original)} -> ${JSON.stringify(e.userWrote)}`);
        }
      }
    }
  }
}

// ── Informe ──────────────────────────────────────────────────
const pct = (a, b) => (b === 0 ? '   n/a' : (100 * a / b).toFixed(1).padStart(5) + '%');

console.log(`\nBANC DE PROVES DEL CORRECTOR — ${casos} casos `
  + `(${tots.length} textos × ${LLAVORS} llavors, fins a ${QUANTS} errors cadascun)\n`);

console.log('Classe               Injectats  Trobats  Recall   Tipus que hi posa el corrector');
console.log('-'.repeat(92));
let totalInj = 0, totalTro = 0;
for (const r of REGLES) {
  const c = perClasse[r.classe];
  totalInj += c.injectats; totalTro += c.trobats;
  const tipus = Object.entries(c.tipus)
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `${t} (${n})`)
    .join(', ') || '—';
  console.log(`${r.classe.padEnd(20)} ${String(c.injectats).padStart(9)} `
    + `${String(c.trobats).padStart(8)}  ${pct(c.trobats, c.injectats)}   ${tipus}`);
}
console.log('-'.repeat(92));
console.log(`${'TOTAL'.padEnd(20)} ${String(totalInj).padStart(9)} ${String(totalTro).padStart(8)}  ${pct(totalTro, totalInj)}`);

console.log(`\nErrors reportats en total : ${errorsTotals}`);
console.log(`Falsos positius           : ${falsosPositius}  (${pct(falsosPositius, errorsTotals)} dels reportats)`);
if (falsosDetall.length) {
  console.log('\nExemples de fals positiu (els primers):');
  for (const d of falsosDetall) console.log('  ' + d);
}

console.log('\nRecordatori: això mesura el CORRECTOR, que des de F31 és determinista i');
console.log('no crida cap model. La tria de model (#22) afecta les explicacions i, sobretot,');
console.log('el camí de la FOTO, on el model transcriu i una transcripció dolenta es');
console.log('converteix en un fals positiu que se li ensenya a l\'usuari com a falta seva.\n');

process.exitCode = falsosPositius > 0 || totalTro < totalInj ? 1 : 0;

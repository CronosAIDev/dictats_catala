// Proves de la llista que sap què has fet (F35).
//
// Les funcions són pures, així que això no toca cap base de dades: l'historial
// s'hi passa tal com el tornaria la consulta agrupada.

const T = require('../src/lib/textos');
// La insígnia es pinta al client: `public/textos.js` és un de sol per a les
// dues vistes, i el que diu forma part de la decisió tant com el que compta.
global.window = global;
require('../public/textos.js');

let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  if (!ok) falles += 1;
  console.log(`  ${ok ? 'OK   ' : 'FALLA'}  ${nom}`);
  if (!ok) console.log(`         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`);
}

const BANC = [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }];
const h = (id, vegades, millor, ultima) => ({ text_id: id, vegades, millor, ultima });

console.log('\nAjuntar cada text amb el seu historial:');
{
  const m = T.marca(BANC, [h('b2', 3, 1, '2026-09-05 10:00:00')]);
  comprova('el que no s\'ha fet no queda marcat', false, m[0].fet);
  comprova('i no s\'inventa cap nombre', null, m[0].millorErrors);
  comprova('el que s\'ha fet, sí', true, m[1].fet);
  comprova('amb quantes vegades', 3, m[1].vegades);
  comprova('i el millor resultat', 1, m[1].millorErrors);
  comprova('l\'ordre del banc es respecta', ['b1', 'b2', 'b3'], m.map(t => t.id));
}
comprova('un historial buit no marca res', [false, false, false],
  T.marca(BANC, []).map(t => t.fet));
comprova('sense historial tampoc peta', [false, false, false],
  T.marca(BANC, null).map(t => t.fet));
comprova('zero errors és un resultat, no un buit', 0,
  T.marca(BANC, [h('b1', 1, 0, '2026-09-01')])[0].millorErrors);
comprova('un id que ja no és al banc no fa cap mal', [false, false, false],
  T.marca(BANC, [h('b99', 1, 0, '2026-09-01')]).map(t => t.fet));

console.log('\nQuin text es proposa:');
comprova('sense cap fet, el primer', { id: 'b1', motiu: 'nou' },
  T.seguent(T.marca(BANC, [])));
comprova('amb el primer fet, el segon', { id: 'b2', motiu: 'nou' },
  T.seguent(T.marca(BANC, [h('b1', 1, 0, '2026-09-01')])));
comprova('salta els fets encara que no vagin seguits', { id: 'b2', motiu: 'nou' },
  T.seguent(T.marca(BANC, [h('b1', 1, 0, '2026-09-01'), h('b3', 1, 2, '2026-09-02')])));
comprova('una llista buida no proposa res', null, T.seguent([]));

console.log('\nQuan ja els has fet tots, el que més et va costar:');
{
  const tots = [h('b1', 1, 0, '2026-09-01'), h('b2', 1, 5, '2026-09-02'), h('b3', 1, 2, '2026-09-03')];
  comprova('el de més errors al millor intent', { id: 'b2', motiu: 'repas' },
    T.seguent(T.marca(BANC, tots)));
}
{
  // Empat a errors: mana el que fa més que no es toca.
  const tots = [h('b1', 1, 2, '2026-09-03'), h('b2', 1, 2, '2026-09-01'), h('b3', 1, 1, '2026-09-02')];
  comprova('a igualtat d\'errors, el més antic', { id: 'b2', motiu: 'repas' },
    T.seguent(T.marca(BANC, tots)));
}
{
  // Tot perfecte: no hi ha res a millorar, així que toca el més antic.
  const tots = [h('b1', 1, 0, '2026-09-03'), h('b2', 1, 0, '2026-09-01'), h('b3', 1, 0, '2026-09-02')];
  comprova('si tot ha anat perfecte, el més antic', { id: 'b2', motiu: 'repas' },
    T.seguent(T.marca(BANC, tots)));
}

console.log('\nEl recompte:');
comprova('cap fet', { fets: 0, total: 3 }, T.compte(T.marca(BANC, [])));
comprova('dos de tres', { fets: 2, total: 3 },
  T.compte(T.marca(BANC, [h('b1', 1, 0, '2026-09-01'), h('b3', 2, 1, '2026-09-02')])));


// ── Un dictat que vas deixar a mitges no és un intent (F74) ───
//
// La llista deia «Fet 2 cops, el millor amb 23 errors» d'un text de 26
// paraules. No vas fer 23 faltes: vas parar.
//
// El primer intent d'arreglar-ho —comptar només els errors de regla, com fa el
// perfil— sortia PITJOR: un dictat abandonat gairebé no en té, o sigui que
// passava a ser «el millor» i la llista deia «sense cap error» del text que
// havies deixat. El que el distingeix no és de què són els seus errors, sinó
// que no el vas intentar.
console.log('\nUn dictat deixat a mitges no es compara amb els que sí que vas fer:');
{
  const h = (t) => window.Textos.historia(t);
  comprova('un sol intent de veritat, encara que l\'obrissis dues vegades',
    'Fet, 3 errors', h({ fet: true, vegades: 2, intents: 1, millorErrors: 3 }));
  comprova('dos intents, sí que es comparen',
    'Fet 2 cops, el millor amb 1 error', h({ fet: true, vegades: 2, intents: 2, millorErrors: 1 }));
  comprova('cap acabat: es diu, i sense cap nombre',
    'Començat 2 cops', h({ fet: true, vegades: 2, intents: 0, millorErrors: null }));
  comprova('obert una sola vegada i deixat',
    'Començat', h({ fet: true, vegades: 1, intents: 0, millorErrors: null }));
  comprova('sense fer, cap marca: un text no fet no és cap deute',
    '', h({ fet: false, vegades: 0, intents: 0, millorErrors: null }));
  // El tic diu «acabat». A «Començat» seria dir el contrari del que hi posa.
  comprova('el que has acabat porta tic', true,
    window.Textos.marques({ fet: true, vegades: 1, intents: 1, millorErrors: 2 }).includes('✓'));
  comprova('el que vas començar i deixar, no', false,
    window.Textos.marques({ fet: true, vegades: 1, intents: 0, millorErrors: null }).includes('✓'));
}

console.log('\nL\'historial vell, que no sap què era un intent:');
{
  // Les files d'abans de F74 no porten `intents`. Val més comptar-les com a
  // intents que no pas dir «Començat» de tot l'historial de la gent.
  const marcats = T.marca([{ id: 'b1' }], [{ text_id: 'b1', vegades: 3, millor: 2 }]);
  comprova('sense `intents`, val el mateix que `vegades`', 3, marcats[0].intents);
  comprova('i per tant es llegeix com sempre',
    'Fet 3 cops, el millor amb 2 errors', window.Textos.historia(marcats[0]));
}

console.log(falles === 0
  ? '\nLa llista de textos sap què has fet\n'
  : `\n${falles} comprovacions fallen\n`);
process.exit(falles === 0 ? 0 : 1);

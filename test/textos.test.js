// Proves de la llista que sap què has fet (F35).
//
// Les funcions són pures, així que això no toca cap base de dades: l'historial
// s'hi passa tal com el tornaria la consulta agrupada.

const T = require('../src/lib/textos');

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

console.log(falles === 0
  ? '\nLa llista de textos sap què has fet\n'
  : `\n${falles} comprovacions fallen\n`);
process.exit(falles === 0 ? 0 : 1);

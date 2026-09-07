// Proves de l'agrupació de paraules no escrites (`public/errors.js`).
//
// El cas que ho va destapar: un dictat de 26 paraules amb 8 escrites donava
// 18 fitxes seguides de «Aquesta paraula no s'ha escrit» i els cinc errors que
// ensenyen alguna cosa quedaven enterrats al mig.

global.window = global;
require('../public/errors.js');
const E = global.Errors;

let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  if (!ok) falles += 1;
  console.log(`  ${ok ? 'OK   ' : 'FALLA'}  ${nom}`);
  if (!ok) console.log(`         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`);
}
const omesa = (pos, paraula) => ({ position: pos, span: 1, original: paraula, userWrote: null });
const canvi = (pos, o, e) => ({ position: pos, span: 1, original: o, userWrote: e });
const afegida = (e) => ({ position: null, span: 1, original: null, userWrote: e });

console.log('\nUna tirallonga s\'ajunta:');
{
  const g = E.agrupa([omesa(0, 'Avui'), omesa(1, 'fa'), omesa(2, 'un'), canvi(6, 'El', 'el')]);
  comprova('queden dos trossos, no quatre', 2, g.length);
  comprova('el primer és el resum', { omesa: true, quants: 3, primera: 'Avui', ultima: 'un' }, g[0]);
  comprova('i l\'error de veritat es conserva', 'el', g[1].err.userWrote);
}

console.log('\nUna o dues paraules soltes NO s\'ajunten:');
comprova('una', [false], E.agrupa([omesa(3, 'sol')]).map(t => t.omesa));
comprova('dues', [false, false], E.agrupa([omesa(3, 'el'), omesa(4, 'sol')]).map(t => t.omesa));

console.log('\nHan d\'anar seguides al text, no només a la llista:');
{
  // Dues omissions al principi i una al final no són una tirallonga.
  const g = E.agrupa([omesa(0, 'a'), omesa(1, 'b'), omesa(20, 'z')]);
  comprova('un salt de posició trenca el grup', [false, false, false], g.map(t => t.omesa));
}
{
  const g = E.agrupa([omesa(0, 'a'), omesa(1, 'b'), omesa(2, 'c'), omesa(9, 'x'), omesa(10, 'y'), omesa(11, 'z')]);
  comprova('dues tirallonges separades són dos resums', [true, true], g.map(t => t.omesa));
  comprova('cadascuna amb les seves paraules', [['a', 'c'], ['x', 'z']],
    g.map(t => [t.primera, t.ultima]));
}

console.log('\nEl que no és una omissió no es toca:');
comprova('les paraules de més es queden com estaven', [false, false],
  E.agrupa([afegida('molt'), afegida('molt')]).map(t => t.omesa));
comprova('una llista buida no peta', [], E.agrupa([]));
comprova('i sense arguments tampoc', [], E.agrupa(null));

console.log('\nEl text de la fitxa:');
{
  const t = E.textOmeses({ quants: 18, primera: 'M\'agrada', ultima: 'meravellosa.' });
  comprova('diu quantes són', '18 paraules seguides', t.paraules);
  comprova('i des d\'on fins on', 'Del dictat, des de «M\'agrada» fins a «meravellosa.».', t.explicacio);
  comprova('sense dir que estigui malament escrita res', false, /falta|error/i.test(t.tipus));
}

console.log(falles === 0
  ? '\nLes paraules no escrites ja no tapen els errors\n'
  : `\n${falles} comprovacions fallen\n`);
process.exit(falles === 0 ? 0 : 1);

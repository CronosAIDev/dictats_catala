// Proves de la repesca espaiada (F27). Funcions pures: ni base de dades ni
// rellotge de veritat — la data «d'avui» s'hi passa.

const R = require('../src/lib/repesca');

let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  if (!ok) falles += 1;
  console.log(`  ${ok ? 'OK   ' : 'FALLA'}  ${nom}`);
  if (!ok) console.log(`         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`);
}
const AVUI = new Date('2026-09-07T12:00:00Z');
const TEXT = 'Una frase de cinc paraules. || I una altra de sis paraules més. || Curta.';

console.log('\nOn comença i acaba cada frase:');
{
  const l = R.talls(TEXT);
  comprova('tres frases', 3, l.length);
  comprova('amb els seus límits en paraules', [[0, 5], [5, 12], [12, 13]],
    l.map(t => [t.desDe, t.finsA]));
  comprova('i el seu text', 'Curta.', l[2].text);
}
comprova('un text sense separadors és una sola frase', 1, R.talls('Tot seguit sense res.').length);
comprova('un text buit no dona cap frase', [], R.talls(''));

console.log('\nDe quina frase és cada paraula:');
{
  const l = R.talls(TEXT);
  comprova('la primera paraula', 0, R.fraseDe(l, 0));
  comprova('l\'última de la primera frase', 0, R.fraseDe(l, 4));
  comprova('la primera de la segona', 1, R.fraseDe(l, 5));
  comprova('l\'última de totes', 2, R.fraseDe(l, 12));
  comprova('una posició que no hi és', null, R.fraseDe(l, 99));
  comprova('i una paraula afegida, que no en té', null, R.fraseDe(l, null));
}

console.log('\nQuan torna: 1, 3 i 7 dies:');
comprova('acabada de fallar, demà', '2026-09-08', R.properaData(0, AVUI));
comprova('un encert, tres dies', '2026-09-10', R.properaData(1, AVUI));
comprova('dos encerts, una setmana', '2026-09-14', R.properaData(2, AVUI));
comprova('tres encerts: ja no torna', null, R.properaData(3, AVUI));

console.log('\nQuè li passa després d\'un repàs:');
comprova('encertada, puja un esglaó',
  { passada: 1, tocaEl: '2026-09-10', apresa: false }, R.avanca(0, true, AVUI));
comprova('encertada tres vegades, apresa',
  { passada: 3, tocaEl: null, apresa: true }, R.avanca(2, true, AVUI));
// Fallar-la la torna al principi encara que anés pel tercer intent: si avui
// l'has fallat, no la saps.
comprova('fallada, torna a baix de tot',
  { passada: 0, tocaEl: '2026-09-08', apresa: false }, R.avanca(2, false, AVUI));

console.log('\nLa sessió barreja les que toquen amb altres:');
const f = (id, n) => ({ text_id: id, frase: n, text: 'frase ' + id + n });
{
  const s = R.sessio([f('b1', 0)], [f('b1', 1), f('b1', 2), f('b1', 3), f('b1', 4)], 1);
  comprova('amb una de pendent, la sessió arriba al mínim', R.MINIM, s.length);
  comprova('i només una és de repàs', 1, s.filter(x => x.repas).length);
}
{
  const toquen = [f('b1', 0), f('b1', 1), f('b1', 2), f('b1', 3)];
  const s = R.sessio(toquen, [f('b2', 0), f('b2', 1), f('b2', 2)], 1);
  comprova('amb quatre pendents, dues de farciment', 6, s.length);
  comprova('les quatre de repàs hi són', 4, s.filter(x => x.repas).length);
}
comprova('sense res pendent no hi ha sessió', [], R.sessio([], [f('b1', 0)], 1));
comprova('sense farciment, la sessió són les pendents', 2,
  R.sessio([f('b1', 0), f('b1', 1)], [], 1).length);
comprova('mai passa del màxim', R.MAXIM,
  R.sessio(Array.from({ length: 12 }, (_, i) => f('b1', i)), [], 1).length);

console.log('\nL\'ordre és imprevisible però reproduïble:');
{
  const toquen = [f('b1', 0), f('b1', 1)];
  const altres = [f('b1', 2), f('b1', 3), f('b1', 4)];
  const a = R.sessio(toquen, altres, 42).map(x => x.text);
  const b = R.sessio(toquen, altres, 42).map(x => x.text);
  const c = R.sessio(toquen, altres, 7).map(x => x.text);
  comprova('la mateixa llavor dona el mateix ordre', a, b);
  comprova('una altra llavor, un altre ordre', true, JSON.stringify(a) !== JSON.stringify(c));
  comprova('i no es perd ni s\'inventa cap frase', 4, new Set(a).size);
}

console.log(falles === 0
  ? '\nLes frases fallades tornen quan toca\n'
  : `\n${falles} comprovacions fallen\n`);
process.exit(falles === 0 ? 0 : 1);

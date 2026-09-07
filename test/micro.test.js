// Proves dels micro-exercicis de 60 segons (F28). Funcions pures.

const M = require('../src/lib/micro');

let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  if (!ok) falles += 1;
  console.log(`  ${ok ? 'OK   ' : 'FALLA'}  ${nom}`);
  if (!ok) console.log(`         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`);
}
const f = (id, type, original, user_wrote) => ({ id, type, original, user_wrote });

console.log('\nQuins errors poden ser targeta:');
comprova('una substitució, sí', true, M.potSerTargeta(f(1, 'diacrítics', 'és', 'es')));
comprova('una paraula omesa, no', false, M.potSerTargeta(f(2, 'paraula omesa', 'gos', null)));
comprova('una paraula de més, tampoc', false, M.potSerTargeta(f(3, 'paraula afegida', null, 'molt')));
// Tretes les comes, les dues formes són la mateixa paraula: la targeta no
// tindria resposta.
comprova('un error de puntuació, no', false, M.potSerTargeta(f(4, 'puntuació', 'nord,', 'nord')));
comprova('una fila buida, no', false, M.potSerTargeta(null));

console.log('\nLes targetes:');
{
  const t = M.targetes([
    f(9, 'diacrítics', 'és', 'es'),
    f(8, 'diacrítics', 'és', 'es'),
    f(7, 'diacrítics', 'és', 'es'),
    f(6, 'ela geminada', 'col·legi', 'colegi'),
    f(5, 'paraula omesa', 'gos', null),
  ], 1);
  comprova('les repetides no fan targetes repetides', 2, t.length);
  comprova('la que més has fallat va primera', 'diacrítics', t[0].tipus);
  comprova('i diu quantes vegades', 3, t[0].vegades);
  comprova('cada targeta porta les dues formes', 2, t[0].opcions.length);
  comprova('amb la bona i la teva', ['es', 'és'], t[0].opcions.slice().sort());
  comprova('i el nom llegible de la regla', 'Accents diacrítics', t[0].nom);
  // La resposta NO pot viatjar: si hi fos, es veuria abans de contestar.
  comprova('cap targeta diu quina és la bona', false,
    JSON.stringify(t).includes('correcta') || JSON.stringify(t).includes('erronia'));
}
comprova('sense errors no hi ha targetes', [], M.targetes([], 1));
comprova('ni amb res', [], M.targetes(null, 1));
comprova('mai més de les que caben', M.PER_SESSIO,
  M.targetes(Array.from({ length: 20 }, (_, i) => f(i, 'h', 'hora' + i, 'ora' + i)), 1).length);
comprova('la puntuació es treu de les opcions', ['Pirineos', 'Pirineus'],
  M.targetes([f(1, 'ortografia', 'Pirineus,', 'Pirineos,')], 1)[0].opcions.slice().sort());

console.log('\nQuina va primera no és sempre la mateixa:');
{
  const files = Array.from({ length: 8 }, (_, i) => f(i, 'h', 'hora' + i, 'ora' + i));
  const a = M.targetes(files, 1).map(t => t.opcions[0]);
  const b = M.targetes(files, 1).map(t => t.opcions[0]);
  const c = M.targetes(files, 99).map(t => t.opcions[0]);
  comprova('la mateixa llavor dona el mateix ordre', a, b);
  comprova('una altra llavor el canvia', true, JSON.stringify(a) !== JSON.stringify(c));
  // Si la bona sortís sempre a dalt, s'aprendria la posició i no la paraula.
  // La bona és la que NO comença per «ora».
  const bonaADalt = M.targetes(files, 1).filter(t => !t.opcions[0].startsWith('ora')).length;
  comprova('la bona no va sempre a dalt', true, bonaADalt > 0 && bonaADalt < 8);
}

console.log('\nEncertar:');
comprova('la forma bona', true, M.encerta('és', 'és'));
comprova('la teva, no', false, M.encerta('és', 'es'));
comprova('la puntuació no compta', true, M.encerta('Pirineus,', 'Pirineus'));
comprova('res, tampoc', false, M.encerta('és', null));

console.log('\nCom es diu el resultat, sense renyar mai:');
comprova('totes', 'Totes. Aquestes ja te les saps.', M.resultat(8, 8).text);
comprova('cap: es diu què has guanyat, no què has fallat',
  'Ja saps quines has de mirar.', M.resultat(0, 8).text);
comprova('algunes', '6 de 8. Les altres tornaran.', M.resultat(6, 8).text);
comprova('sense targetes, res', '', M.resultat(0, 0).text);
comprova('cap missatge diu que ho hagis fet malament', false,
  [M.resultat(0, 8), M.resultat(3, 8), M.resultat(8, 8)]
    .some(r => /malament|error|falla/i.test(r.text)));

console.log(falles === 0
  ? '\nLes targetes surten dels teus errors\n'
  : `\n${falles} comprovacions fallen\n`);
process.exit(falles === 0 ? 0 : 1);

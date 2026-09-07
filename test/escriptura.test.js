// Proves de l'escriptura lliure (F29). Funcions pures: no es crida cap model.

const E = require('../src/lib/escriptura');

let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  if (!ok) falles += 1;
  console.log(`  ${ok ? 'OK   ' : 'FALLA'}  ${nom}`);
  if (!ok) console.log(`         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`);
}
const paraules = n => Array.from({ length: n }, (_, i) => 'mot' + i).join(' ');

console.log('\nQuè es pot corregir:');
comprova('massa curt, no', false, E.valida('quatre paraules i prou').ok);
comprova('i es diu quantes en porta', true,
  E.valida('quatre paraules i prou').error.includes('4'));
comprova('la mida bona, sí', true, E.valida(paraules(60)).ok);
comprova('amb el compte fet', 60, E.valida(paraules(60)).paraules);
comprova('massa llarg, no', false, E.valida(paraules(500)).ok);
comprova('un text buit tampoc', false, E.valida('').ok);
comprova('ni res', false, E.valida(null).ok);

console.log('\nEl prompt porta el text i el tema:');
{
  const p = E.PROMPT('Descriu un lloc', 'Vaig anar al mar.');
  comprova('hi és el tema', true, p.includes('Descriu un lloc'));
  comprova('i el text', true, p.includes('Vaig anar al mar.'));
  comprova('diu que no reescrigui el text sencer', true, /NO reescriguis/.test(p));
  comprova('i que no corregeixi el contingut', true, /NO corregeixis el contingut/.test(p));
}

console.log('\nEl filtre del que torna el model:');
const TEXT = 'Vaig veure les cases blanca del poble. Em va agradar molt per a mirar.';
{
  // La por de la #22 aplicada aquí: si el model cita un tros que no hi és,
  // subratllaríem una cosa que la persona no ha escrit.
  const n = E.neteja({
    observacions: [
      { fragment: 'les cases blanca', proposta: 'les cases blanques', regla: 'concordança', perque: 'x' },
      { fragment: 'això no hi és', proposta: 'y', regla: 'z', perque: 'w' },
      { fragment: 'per a mirar', proposta: 'per mirar', regla: 'per/per a', perque: 'v' },
    ],
    comentari: 'Es llegeix bé.',
  }, TEXT);
  comprova('les que citen bé passen', 2, n.observacions.length);
  comprova('la inventada es llença', false,
    n.observacions.some(o => o.fragment === 'això no hi és'));
  comprova('i es compta quantes se n\'han llençat', 1, n.descartades);
  comprova('el comentari es conserva', 'Es llegeix bé.', n.comentari);
}
comprova('una proposta igual al fragment no és cap correcció', 0,
  E.neteja({ observacions: [{ fragment: 'poble', proposta: 'poble', regla: 'x' }] }, TEXT).observacions.length);
comprova('el mateix tros dues vegades només compta un cop', 1,
  E.neteja({ observacions: [
    { fragment: 'poble', proposta: 'pobles', regla: 'x' },
    { fragment: 'poble', proposta: 'poblet', regla: 'y' },
  ] }, TEXT).observacions.length);
comprova('sense regla, se n\'hi posa una de genèrica', 'llengua',
  E.neteja({ observacions: [{ fragment: 'poble', proposta: 'pobles' }] }, TEXT).observacions[0].regla);
comprova('una resposta que no és res no peta',
  { observacions: [], descartades: 0, comentari: '' }, E.neteja(null, TEXT));
comprova('mai més observacions de les que caben', E.MAX_OBSERVACIONS,
  E.neteja({ observacions: Array.from({ length: 30 }, (_, i) => ({
    fragment: 'mot' + i, proposta: 'MOT' + i, regla: 'x',
  })) }, paraules(40)).observacions.length);

console.log('\nCom es diu el resultat, sense retreure res:');
comprova('res a corregir', 'No hi ha res a corregir. Aquest text està bé.', E.resum([], 80));
comprova('una cosa', '80 paraules i una sola cosa per mirar.', E.resum([1], 80));
comprova('unes quantes', '80 paraules i 4 coses per mirar.', E.resum([1, 2, 3, 4], 80));
comprova('cap missatge parla d\'errors ni de faltes', false,
  [E.resum([], 80), E.resum([1], 80), E.resum([1, 2], 80)]
    .some(t => /error|falta|malament/i.test(t)));

console.log(falles === 0
  ? '\nL\'escriptura lliure no ensenya res que no hagis escrit\n'
  : `\n${falles} comprovacions fallen\n`);
process.exit(falles === 0 ? 0 : 1);

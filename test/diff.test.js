// Proves de la comparació determinista (src/lib/diff.js).
//
// El que es comprova aquí no és que "hi hagi errors", sinó que la POSICIÓ de
// cada error dins l'original sigui exacta: és tota la raó de ser del fitxer.
//
//   node test/diff.test.js

const { compara, tokenitza } = require('../src/lib/diff');

let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  console.log((ok ? '  OK   ' : '  FALLA') + '  ' + nom
    + (ok ? '' : `\n         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`));
  if (!ok) falles++;
}

// Resum compacte: [posició, span, tipus] per error.
function resum(original, escrit) {
  return compara(original, escrit).errors.map(e => [e.position, e.span, e.type]);
}

const AP = String.fromCharCode(39);   // apòstrof recte, el que dona el teclat

console.log('Classificació i posicions:');
comprova('text idèntic, cap error', [], resum('El sol brilla i el cel és blau.', 'El sol brilla i el cel és blau.'));
comprova('accent', [[3, 1, 'accentuació']], resum('Vaig fer un camí llarg', 'Vaig fer un cami llarg'));
comprova('diacrític', [[1, 1, 'accentuació']], resum('El món és bonic', 'El mon és bonic'));
comprova('majúscula', [[2, 1, 'majúscules']], resum('Vivim a Catalunya avui', 'Vivim a catalunya avui'));
comprova('puntuació', [[1, 1, 'puntuació']], resum('Al nord, hi ha neu', 'Al nord hi ha neu'));
comprova('paraula omesa', [[3, 1, 'paraula omesa']], resum('El gos és un animal fidel', 'El gos és animal fidel'));
comprova('paraula afegida (sense posició a l\'original)', [[null, 1, 'paraula afegida']],
  resum('El gos és fidel', 'El gos és molt fidel'));

console.log('\nLa ce trencada no és un accent:');
comprova('caça contra caca', [[1, 1, 'ortografia']], resum('La caça és antiga', 'La caca és antiga'));

console.log('\nApostrofació — l\'error més freqüent, i compta com un de sol:');
comprova('contracció desfeta', [[2, 1, 'apostrofació']],
  resum('Vaig a l' + AP + 'aigua clara', 'Vaig a la aigua clara'));
comprova('pronom feble', [[2, 1, 'apostrofació']],
  resum('Els castells s' + AP + 'aixequen avui', 'Els castells se aixequen avui'));
comprova('a l\'inrevés, i abasta dues paraules de l\'original', [[2, 2, 'apostrofació']],
  resum('Vaig a la escola nova', 'Vaig a l' + AP + 'escola nova'));
comprova('dues paraules afegides de debò no es fusionen',
  [[null, 1, 'paraula afegida'], [null, 1, 'paraula afegida']],
  resum('La casa és gran', 'La casa és molt molt gran'));

console.log('\nFrase real del banc, amb sis errors:');
comprova('posicions exactes',
  [[1, 1, 'ortografia'], [2, 1, 'accentuació'], [4, 1, 'ortografia'],
   [6, 1, 'apostrofació'], [9, 1, 'ortografia']],
  resum('Els castells són torres humanes que s' + AP + 'aixequen a les places dels pobles.',
        'Els castels son torres umanes que se aixequen a les plases dels pobles.'));

console.log('\nEl separador de pauses compta com un espai:');
comprova('|| enganxat a la paraula no ajunta res',
  ['Primera', 'frase.', 'Segona', 'frase.'],
  tokenitza('Primera frase.||Segona frase.'));
comprova('|| amb espais al voltant dona el mateix',
  ['Primera', 'frase.', 'Segona', 'frase.'],
  tokenitza('Primera frase. || Segona frase.'));

console.log('\nLes paraules afegides han de comptar a la puntuació:');
{
  const r = compara('Un dos tres', 'Un dos tres quatre cinc sis');
  const afegides = r.errors.filter(e => e.position === null).length;
  comprova('tres paraules de més', 3, afegides);
  comprova('el denominador les inclou (si no, sortiria 100)', 50,
    Math.round(r.paraules.length / (r.paraules.length + afegides) * 100));
}

console.log(falles ? `\n${falles} FALLES` : '\nTotes les proves del diff passen');
process.exitCode = falles ? 1 : 0;

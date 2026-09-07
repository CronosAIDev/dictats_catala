// Proves de la taxonomia d'errors del català (F25).
//
// Funció pura de (original, escrit): ni base de dades ni model. És el que
// permet que la migració de `db.js` torni a classificar l'historial que ja hi
// havia sense demanar res a ningú.

const T = require('../src/lib/taxonomia');

let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  if (!ok) falles += 1;
  console.log(`  ${ok ? 'OK   ' : 'FALLA'}  ${nom}`);
  if (!ok) console.log(`         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`);
}
const AP = String.fromCharCode(39);
const c = (o, e, ctx) => T.classifica(o, e, ctx || {});
const cas = (o, e, esperat) => comprova(`${o} → ${e}`, esperat, c(o, e));

console.log('\nAccents, que abans eren tots «accentuació»:');
cas('món', 'mon', 'diacrítics');
cas('és', 'es', 'diacrítics');
cas('sí', 'si', 'diacrítics');
comprova('i el diacrític va en els dos sentits', 'diacrítics', c('es', 'és'));
// La norma de 2016 els va treure l'accent: posar-los a la llista seria
// ensenyar una ortografia que ja no existeix.
cas('dóna', 'dona', 'accentuació');
cas('sóc', 'soc', 'accentuació');
cas('camí', 'cami', 'accentuació');
cas('raïm', 'raim', 'dièresi');
cas('qüestió', 'questió', 'dièresi');
cas('cafè', 'café', 'obert/tancat');
cas('això', 'aixó', 'obert/tancat');

console.log('\nLes tres que queien totes dins d\'«ortografia»:');
cas('col·legi', 'collegi', 'ela geminada');
cas('col·legi', 'colegi', 'ela geminada');
cas('intel·ligent', 'intelligent', 'ela geminada');
cas('haver', 'haber', 'b/v');
cas('trobar', 'trovar', 'b/v');
cas('escriure', 'escribure', 'b/v');
cas('força', 'forsa', 'ç');
cas('caça', 'caca', 'ç');
cas('passa', 'pasa', 's/ss');
cas('casa', 'caza', 's/z');

// ── Els tres sons de essa són tres regles ──────────────────────
//
// Abans una sola categoria se les emportava totes tres i ensenyava la regla de
// la doble essa a qui havia escrit «sentre» per «centre», que no hi té res a
// veure. Es va veure fent un dictat sencer, no llegint el codi.
console.log('\nEls tres sons de essa, cadascun amb la seva regla:');
cas('passa', 'pasa', 's/ss');       // doble essa entre vocals
cas('casa', 'cassa', 's/ss');       // i en l'altre sentit
cas('centre', 'sentre', 's/c');     // c davant de e — cap doble essa pel mig
cas('cinema', 'sinema', 's/c');
cas('servei', 'cervei', 's/c');     // i en l'altre sentit
cas('places', 'plases', 's/c');
cas('dotze', 'dotse', 's/z');       // z darrere de consonant
cas('zero', 'sero', 's/z');
cas('onze', 'onse', 's/z');
comprova('la ce trencada mana per damunt de totes tres', 'ç', c('plaça', 'plasa'));
comprova('dues distincions alhora no són cap regla: no se n\'inventa una',
  'ortografia', c('dotze', 'dotsse'));
comprova('i cada categoria té la seva regla escrita, no la d\'una altra',
  true, [T.regla('s/ss'), T.regla('s/c'), T.regla('s/z')]
    .every((r, i, tot) => r && tot.indexOf(r) === i));

console.log('\nLa hac i els guionets:');
cas('haver', 'aver', 'h');
cas('ahir', 'air', 'h');
cas('vint-i-un', 'vintiun', 'guionets');

console.log('\nApostrofació i pronoms febles, que no són el mateix:');
// L'article i la preposició: apostrofació.
cas('l' + AP + 'aigua', 'la aigua', 'apostrofació');
cas('d' + AP + 'hivern', 'de hivern', 'apostrofació');
// El pronom feble enganxat al verb: la regla que s'ha vulnerat és una altra.
cas('m' + AP + 'agrada', 'magrada', 'pronoms febles');
cas('s' + AP + 'aixequen', 'se aixequen', 'pronoms febles');
cas('n' + AP + 'hi', 'ni', 'pronoms febles');
cas('dona' + AP + 'm', 'donam', 'pronoms febles');
cas('portar-lo', 'portarlo', 'pronoms febles');
cas('hi', 'li', 'pronoms febles');

console.log('\nConcordança, només quan és inequívoca:');
cas('les', 'els', 'concordança');
cas('aquesta', 'aquest', 'concordança');
cas('totes', 'tots', 'concordança');
// Determinants de famílies diferents no és concordança: és triar-ne un altre.
comprova('el → un no és concordança', true, c('el', 'un') !== 'concordança');
// I un adjectiu no es pot distingir d'una errada de conjugació sense gramàtica.
comprova('blanca → blanc no es diu concordança', true, c('blanca', 'blanc') !== 'concordança');

console.log('\nPer i per a, que necessita la paraula del costat:');
comprova('«per a» escrit «per»', 'per/per a',
  c('a', null, { paraules: ['Ho', 'faig', 'per', 'a', 'tu'], pos: 3 }));
comprova('sense el «per» al davant és una paraula omesa', 'paraula omesa',
  c('a', null, { paraules: ['Vaig', 'a', 'casa'], pos: 1 }));
comprova('un «a» de més quan l\'alumne n\'ha escrit un «per a» que no hi era', 'per/per a',
  c(null, 'a', { mesPerA: true }));
comprova('i si no, és una paraula afegida', 'paraula afegida', c(null, 'a', { mesPerA: false }));

console.log('\nEl que ja funcionava segueix igual:');
cas('Catalunya', 'catalunya', 'majúscules');
comprova('nord, → nord', 'puntuació', c('nord,', 'nord'));
comprova('paraula omesa', 'paraula omesa', c('gos', null));
comprova('paraula afegida', 'paraula afegida', c(null, 'molt'));
cas('castells', 'castels', 'ortografia');
cas('ortografia', 'bicicleta', 'paraula incorrecta');

console.log('\nEl catàleg:');
comprova('cap categoria sense regla escrita', [],
  T.CATEGORIES.filter(x => !x.regla || x.regla.length < 10).map(x => x.id));
comprova('cap id repetit', T.CATEGORIES.length, new Set(T.CATEGORIES.map(x => x.id)).size);
comprova('la regla es pot demanar per id', true, T.regla('ela geminada').includes('punt volat'));
comprova('i el nom també', 'Ce trencada', T.nom('ç'));
comprova('un id desconegut no peta', '', T.regla('inventat'));
comprova('els quinze diacrítics hi són', true, T.DIACRITICS.length >= 15);

console.log('\nComptar «per a»:');
comprova('cap', 0, T.comptaPerA(['Ho', 'faig', 'per', 'tu']));
comprova('un', 1, T.comptaPerA(['Ho', 'faig', 'per', 'a', 'tu']));
comprova('la puntuació no l\'amaga', 1, T.comptaPerA(['per', 'a,', 'tu']));

console.log(falles === 0
  ? '\nCada error sap de quina regla és\n'
  : `\n${falles} comprovacions fallen\n`);
process.exit(falles === 0 ? 0 : 1);

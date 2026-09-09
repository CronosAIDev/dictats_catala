// Quan una foto no serveix per corregir (F82).
//
// Es prova la DECISIÓ, no com es mesura: mesurar necessita un canvas i un
// navegador, però equivocar-se en el llindar és el que faria mal. Barrar una
// foto bona és pitjor que deixar-ne passar una de dolenta — la dolenta costa
// una crida al model; la bona, que algú no pugui corregir el que ha escrit.

global.window = global;
require('../public/foto.js');
const F = window.Foto;

let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  console.log((ok ? '  OK   ' : '  FALLA') + '  ' + nom
    + (ok ? '' : `\n         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`));
  if (!ok) falles++;
}

console.log('\nUna imatge buida no serveix:');
comprova('negra sencera', false, F.serveix(0, 0));
comprova('gairebé negra i plana, com la càmera sense permís', false, F.serveix(6, 2));

console.log('\nPerò una foto fosca DE VERITAT sí:');
// Un paper fotografiat amb poca llum és fosc, però la lletra hi fa contrast.
comprova('fosca amb lletra', true, F.serveix(20, 30));
comprova('molt fosca però amb contrast', true, F.serveix(10, 40));

console.log('\nI la resta, també:');
comprova('un paper ben il·luminat', true, F.serveix(200, 60));
comprova('blanca sencera —sobreexposada, però hi ha alguna cosa', true, F.serveix(255, 0));

console.log('\nEls llindars són els que es diuen:');
comprova('just al límit de fosca, passa', true, F.serveix(F.FOSCA, 0));
comprova('just al límit de variació, passa', true, F.serveix(0, F.PLANA));
comprova('per sota de tots dos, no', false, F.serveix(F.FOSCA - 1, F.PLANA - 1));

console.log('\nQuan no serveix, es diu què fer:');
comprova('el missatge parla del permís', true, /perm[ií]s/i.test(F.QUE_FER));
comprova('i diu on tocar-lo a l\'iPhone', true, /iPhone/.test(F.QUE_FER));
comprova('i que es pot triar de la galeria', true, /galeria/.test(F.QUE_FER));

console.log(falles === 0
  ? '\nUna foto negra no arriba a costar una crida al model\n'
  : `\n${falles} comprovacions fallen\n`);
process.exit(falles === 0 ? 0 : 1);

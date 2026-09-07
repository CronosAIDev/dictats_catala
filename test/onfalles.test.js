// Proves de «de què són els teus errors» (F26).
//
// Funció pura: rep els comptes ja agrupats i no toca la base.

const O = require('../src/lib/onfalles');

let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  if (!ok) falles += 1;
  console.log(`  ${ok ? 'OK   ' : 'FALLA'}  ${nom}`);
  if (!ok) console.log(`         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`);
}
const c = (type, quants) => ({ type, quants });

console.log('\nQuines regles et surten més:');
{
  const p = O.perfil([c('diacrítics', 9), c('apostrofació', 14), c('ela geminada', 3)], 20);
  comprova('ordenades de més a menys', ['apostrofació', 'diacrítics', 'ela geminada'],
    p.regles.map(r => r.id));
  comprova('amb el nom llegible del catàleg', 'Accents diacrítics', p.regles[1].nom);
  comprova('i la regla, que és el que serveix per estudiar', true,
    p.regles[0].regla.includes('apostrofen'));
  comprova('el total és la suma', 26, p.errors);
  comprova('i el percentatge, sencer', [54, 35, 12], p.regles.map(r => r.part));
  comprova('recorda quants dictats s\'han mirat', 20, p.dictats);
}
comprova('a igualtat, per nom, perquè l\'ordre no balli', ['Apostrofació', 'Dièresi'],
  O.perfil([c('dièresi', 5), c('apostrofació', 5)], 10).regles.map(r => r.nom));
comprova('sense errors no hi ha res a dir',
  { dictats: 3, errors: 0, regles: [], resta: { regles: 0, errors: 0 } },
  O.perfil([], 3));
comprova('els comptes a zero no compten', 0, O.perfil([c('h', 0)], 3).errors);
comprova('sense arguments tampoc peta', 0, O.perfil(null).errors);

console.log('\nEl titular, que només parla quan hi ha què dir:');
{
  const molts = O.perfil([c('apostrofació', 14), c('diacrítics', 9)], 20);
  // Quins dictats s'han mirat ho diu la capçalera de la targeta, no el titular.
  comprova('diu la regla i els dos nombres',
    'El que més t\'ha sortit és apostrofació: 14 de 23 errors.',
    O.titular(molts));
}
comprova('amb pocs errors calla, que un 50 % de dos no vol dir res', '',
  O.titular(O.perfil([c('apostrofació', 2), c('h', 1)], 2)));
comprova('si les dues primeres empaten, no hi ha res a destacar', '',
  O.titular(O.perfil([c('apostrofació', 5), c('h', 5)], 8)));
comprova('sense errors, res', '', O.titular(O.perfil([], 5)));
comprova('i no repeteix la finestra, que ja la diu la capçalera', false,
  O.titular(O.perfil([c('h', 6), c('b/v', 1)], 1)).includes('dictat'));

console.log('\nLa cua de regles amb un sol error es resumeix:');
{
  const moltes = O.perfil(
    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((x, i) => c(['apostrofació', 'diacrítics',
      'ela geminada', 'b/v', 'ç', 'h', 'dièresi', 'guionets'][i], i === 0 ? 9 : 1)), 20);
  comprova('només se n\'ensenyen sis', 6, moltes.regles.length);
  comprova('i les altres es diuen en una línia', { regles: 2, errors: 2 }, moltes.resta);
  comprova('el total segueix sent de totes', 16, moltes.errors);
}
comprova('quan hi caben totes, no hi ha resta', { regles: 0, errors: 0 },
  O.perfil([c('h', 3), c('b/v', 1)], 5).resta);

console.log('\nLa finestra:');
comprova('són els últims 20 dictats', 20, O.DICTATS_A_MIRAR);
comprova('i sis regles a la pantalla', 6, O.REGLES_A_ENSENYAR);

console.log(falles === 0
  ? '\nL\'app ja pot dir de què són els teus errors\n'
  : `\n${falles} comprovacions fallen\n`);
process.exit(falles === 0 ? 0 : 1);

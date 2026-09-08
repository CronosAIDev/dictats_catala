// El que ha de ser cert per servir a producció.
//
// Els dos casos tenen la mateixa forma i és la que fa mal: sense la comprovació
// **l'app arrencaria i semblaria que va bé**. Un servidor caigut es veu; un
// servidor trencat es descobreix quan algú no pot entrar, o no es descobreix.

const C = require('../src/lib/comprovacions');

let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  if (!ok) falles += 1;
  console.log(`  ${ok ? 'OK   ' : 'FALLA'}  ${nom}`);
  if (!ok) console.log(`         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`);
}
const quants = (env) => C.problemes(env).length;

console.log('\nEn local no es demana res, que és per a què hi ha el bypass:');
comprova('sense cap variable, cap problema', 0, quants({}));
comprova('ni amb la clau del codi', 0, quants({ SESSION_SECRET: C.CLAU_PER_DEFECTE }));

console.log('\nA producció, les dues que trenquen en silenci:');
comprova('sense res, dos problemes', 2, quants({ NODE_ENV: 'production' }));
comprova('sense SESSION_SECRET', 1,
  quants({ NODE_ENV: 'production', FIREBASE_API_KEY: 'AIza-x' }));
comprova('sense FIREBASE_API_KEY, ningú podria entrar', 1,
  quants({ NODE_ENV: 'production', SESSION_SECRET: 'una-de-bona' }));

// El cas dolent de debò: hi ha valor, però és el que està escrit al repo.
comprova('la clau del codi compta com a no posada', 1,
  quants({ NODE_ENV: 'production', SESSION_SECRET: C.CLAU_PER_DEFECTE, FIREBASE_API_KEY: 'AIza-x' }));
comprova('amb les dues ben posades, calla', 0,
  quants({ NODE_ENV: 'production', SESSION_SECRET: 'una-de-bona-i-llarga', FIREBASE_API_KEY: 'AIza-x' }));

console.log('\nEl que es diu quan falta alguna cosa:');
const dits = C.problemes({ NODE_ENV: 'production' });
comprova('diu la conseqüència, no només el nom de la variable', true,
  dits.some((p) => p.includes('falsificar')) && dits.some((p) => p.includes('entrar')));

console.log(falles === 0
  ? '\nUn desplegament sense configurar no arrenca\n'
  : `\n${falles} comprovacions fallen\n`);
process.exit(falles === 0 ? 0 : 1);

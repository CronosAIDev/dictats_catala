// Proves del límit de correccions (src/middleware/limitaCorreccions.js).
//
//   node test/limits.test.js

const limita = require('../src/middleware/limitaCorreccions');

let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  console.log((ok ? '  OK   ' : '  FALLA') + '  ' + nom
    + (ok ? '' : `\n         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`));
  if (!ok) falles++;
}

// req/res falsos: prou per veure si el middleware deixa passar o talla.
function crida(email) {
  const resultat = { passa: false, status: null, cos: null };
  const req = { session: { profile: { email } } };
  const res = {
    status(c) { resultat.status = c; return this; },
    json(c) { resultat.cos = c; return this; },
  };
  limita(req, res, () => { resultat.passa = true; });
  return resultat;
}

const MAX = parseInt(process.env.DICTATS_MAX_CORRECCIONS_HORA || '30', 10);

console.log('El límit per hora:');
limita._buida();
{
  let passades = 0;
  for (let i = 0; i < MAX; i++) if (crida('a@a.cat').passa) passades++;
  comprova(`les primeres ${MAX} correccions passen`, MAX, passades);

  const deMes = crida('a@a.cat');
  comprova('la següent es talla', false, deMes.passa);
  comprova('amb un 429', 429, deMes.status);
  comprova('i un missatge que diu quant falta', true,
    /minut/.test(deMes.cos && deMes.cos.error || ''));
}

console.log('\nEl límit és per usuari, no global:');
{
  const altre = crida('b@b.cat');
  comprova('un altre usuari segueix podent corregir', true, altre.passa);
}

console.log('\nLa finestra es buida:');
limita._buida();
comprova('després de buidar, torna a passar', true, crida('a@a.cat').passa);

if (falles) { console.log(`\n${falles} proves fallen`); process.exit(1); }
console.log('\nTotes les proves del límit passen');

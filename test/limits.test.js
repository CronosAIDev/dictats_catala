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
function crida(uid) {
  const resultat = { passa: false, status: null, cos: null };
  const req = { session: { profile: { uid } } };
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
  // No es mira la unitat: just al llindar la finestra és d'una hora clavada i
  // «1 hora» es llegeix millor que «60 minuts». El que ha de dir és **quant**.
  comprova('i un missatge que diu quant falta', true,
    /(minut|hor)/.test(deMes.cos && deMes.cos.error || ''));
}

console.log('\nEl límit és per usuari, no global:');
{
  const altre = crida('b@b.cat');
  comprova('un altre usuari segueix podent corregir', true, altre.passa);
}

console.log('\nLa finestra es buida:');
limita._buida();
comprova('després de buidar, torna a passar', true, crida('a@a.cat').passa);

// ── El tope diari ────────────────────────────────────────────
//
// Amb només el de l'hora, el sostre real d'una persona són 30 x 24 = 720 crides
// al dia. Qui fa servir l'app de veritat no s'hi acosta —són dotzenes de
// dictats—, així que un tope diari no molesta ningú i acota molt el pitjor cas.
//
// Es fa servir el rellotge injectable: sense ell no es pot arribar mai al cas,
// perquè 120 crides seguides toquen abans el límit de l'hora. Una prova que no
// pot arribar al cas que diu provar no prova res.
console.log('\nEl tope diari, que qui fa servir l\'app no toca:');
{
  let t = Date.now();
  limita._rellotge(() => t);
  limita._buida();

  let passades = 0;
  let tall = null;
  // 30 crides per hora durant vuit hores: mai es toca el límit horari.
  for (let h = 0; h < 8 && !tall; h++) {
    for (let i = 0; i < 30; i++) {
      const r = crida('algu-uid');
      if (r.passa) { passades++; } else { tall = r; break; }
    }
    t += 61 * 60 * 1000;
  }
  comprova('passen 120 crides sense tocar el límit de l\'hora', 120, passades);
  comprova('la 121 es talla', 429, tall && tall.status);
  comprova('i diu que és el del dia, no el de l\'hora', true,
    /avui/.test(tall && tall.cos && tall.cos.error || ''));

  // L'endemà torna a haver-hi lloc: és una finestra lliscant, no un calendari.
  t += 24 * 60 * 60 * 1000;
  comprova('vint-i-quatre hores després torna a passar', true, crida('algu-uid').passa);
  limita._rellotge();
}

console.log('\nEs compta pel uid, i no pel correu:');
{
  limita._buida();
  // Si es comptés pel correu, canviar-lo reiniciaria el comptador. El uid de
  // Firebase no canvia mai; el correu sí que pot.
  const fes = (email) => {
    let tallat = false;
    limita({ session: { profile: { uid: 'mateix-uid', email } } },
      { status() { tallat = true; return this; }, json() { return this; } }, () => {});
    return tallat;
  };
  for (let i = 0; i < 30; i++) fes('abans@exemple.cat');
  comprova('canviar de correu no reinicia res', true, fes('despres@exemple.cat'));
}

if (falles) { console.log(`\n${falles} proves fallen`); process.exit(1); }
console.log('\nTotes les proves del límit passen');

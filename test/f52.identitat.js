// La identitat, contra Firebase de veritat (F52).
//
// Viu fora de `npm test` a posta: parla amb Firebase i crea i esborra comptes
// reals. `npm test` ha de poder córrer sense xarxa i sense tocar res de ningú.
//
//   FIREBASE_API_KEY=... node test/f52.identitat.js
//
// El que es comprova aquí no és que la llibreria funcioni —això ja ho fa
// ella— sinó que **les tres condicions estan ben declarades**: qui ha emès el
// token, per a qui és i amb quin algorisme. Equivocar-se en qualsevol de les
// tres vol dir acceptar sessions que no són nostres, i cap prova sense xarxa
// ho detectaria.

const firebase = require('../src/lib/firebase');

const KEY = process.env.FIREBASE_API_KEY;
const API = 'https://identitytoolkit.googleapis.com/v1/accounts:';

let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  if (!ok) falles += 1;
  console.log(`  ${ok ? 'OK   ' : 'FALLA'}  ${nom}`);
  if (!ok) console.log(`         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`);
}

const crida = async (quin, cos) => (await fetch(API + quin + '?key=' + KEY, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cos),
})).json();

(async () => {
  if (!KEY) {
    console.log('\nSense FIREBASE_API_KEY no es pot provar. Surto sense fallar.\n');
    process.exit(0);
  }

  const correu = 'prova-f52-' + Date.now() + '@example.com';
  const CLAU = 'unaClauLlarga2026';
  const alta = await crida('signUp', { email: correu, password: CLAU, returnSecureToken: true });
  if (alta.error) { console.error('No s\'ha pogut crear el compte de prova:', alta.error.message); process.exit(1); }

  try {
    console.log('\nUn token de veritat s\'accepta:');
    const jo = await firebase.qui(alta.idToken);
    comprova('torna el uid de qui ha entrat', alta.localId, jo && jo.uid);
    comprova('i el correu', correu, jo && jo.email);
    comprova('un compte nou encara no té el correu verificat', false, jo && jo.emailVerificat);

    console.log('\nEl que NO és un token seu, es rebutja:');
    const parts = alta.idToken.split('.');
    const dolents = [
      ['res', ''],
      ['una cadena qualsevol', 'aixo-no-es-un-token'],
      ['un objecte en comptes d\'un text', { idToken: 'x' }],
      ['la signatura canviada', parts[0] + '.' + parts[1] + '.' + 'x'.repeat(parts[2].length)],
      // El cas que importa: canviar el `sub` per ser una altra persona.
      ['la càrrega útil manipulada',
        parts[0] + '.' + Buffer.from(JSON.stringify({ sub: 'algu-altre', aud: 'kairos-family-app' })).toString('base64url') + '.' + parts[2]],
      // L'atac clàssic contra qui verifica JWT a mà: dir que no van signats.
      ['algorisme «none»',
        Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url') + '.' + parts[1] + '.'],
      ['només dues parts', parts[0] + '.' + parts[1]],
    ];
    for (const [nom, t] of dolents) comprova(nom, null, await firebase.qui(t));

    console.log('\nEntrar-hi una segona vegada dona el mateix uid:');
    const segon = await crida('signInWithPassword', { email: correu, password: CLAU, returnSecureToken: true });
    const altre = await firebase.qui(segon.idToken);
    comprova('el uid no canvia entre sessions', alta.localId, altre && altre.uid);

    console.log('\nAmb la contrasenya equivocada no s\'emet cap token:');
    const fallida = await crida('signInWithPassword', { email: correu, password: 'laQueNoEs', returnSecureToken: true });
    comprova('Firebase no dona idToken', undefined, fallida.idToken);
    // Que no es pugui saber qui té compte provant adreces.
    const inexistent = await crida('signInWithPassword', { email: 'no-hi-es-' + Date.now() + '@example.com', password: 'x', returnSecureToken: true });
    comprova('i diu el mateix que amb un correu que no existeix',
      fallida.error && fallida.error.message, inexistent.error && inexistent.error.message);
  } finally {
    const viu = await crida('signInWithPassword', { email: correu, password: CLAU, returnSecureToken: true });
    if (viu.idToken) await crida('delete', { idToken: viu.idToken });
    console.log('\n(compte de prova esborrat)');
  }

  console.log(falles === 0
    ? '\nLa identitat només accepta els tokens del nostre projecte\n'
    : `\n${falles} comprovacions fallen\n`);
  process.exit(falles === 0 ? 0 : 1);
})().catch((e) => { console.error('FALLA: ' + e.message); process.exit(1); });

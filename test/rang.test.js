// Proves dels rangs i els punts (src/lib/rang.js).
//
//   node test/rang.test.js

const R = require('../src/lib/rang');

let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  console.log((ok ? '  OK   ' : '  FALLA') + '  ' + nom
    + (ok ? '' : `\n         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`));
  if (!ok) falles++;
}
const punts = (level, totalWords, errors) => R.puntsDelDictat({ level, totalWords, errors });
const repeteix = (n, d) => Array.from({ length: n }, () => d);

console.log('La dificultat dona més punts:');
comprova('un dictat perfecte val més com més difícil és el nivell', true,
  punts('avancat', 84, 0) > punts('intermedi', 57, 0)
  && punts('intermedi', 57, 0) > punts('basic', 34, 0));
comprova('a igualtat de nivell, un text més llarg val més', true,
  punts('basic', 60, 0) > punts('basic', 30, 0));

console.log('\nEquivocar-se resta, i el llindar és el mateix que el de l\'escala:');
comprova('sense errors, es guanya', true, punts('basic', 34, 0) > 0);
comprova('amb 5 errors («Bé!») encara es guanya', true, punts('basic', 34, 5) > 0);
comprova('amb 6 errors («Progressant!») ja es perd', true, punts('basic', 34, 6) < 0);
comprova('com més errors, més es perd', true, punts('basic', 34, 15) < punts('basic', 34, 6));

console.log('\nProvar coses difícils no ha de sortir car:');
comprova('perdre amb un avançat no penalitza més que la seva llargada', true,
  Math.abs(punts('avancat', 84, 12)) < Math.abs(punts('basic', 84, 0)));
comprova('dos textos igual de llargs perden el mateix, sigui quin sigui el nivell',
  punts('basic', 84, 12), punts('avancat', 84, 12));

console.log('\nEls punts no baixen de zero:');
{
  const e = R.estat(repeteix(5, { level: 'avancat', totalWords: 84, errors: 20 }));
  comprova('cinc desastres seguits deixen zero, no negatiu', 0, e.punts);
  comprova('i el rang es queda a Pinya', 'Pinya', e.rang.nom);
}

console.log('\nEs puja de rang:');
{
  const e = R.estat(repeteix(2, { level: 'avancat', totalWords: 84, errors: 0 }));   // 370
  comprova('dos avançats perfectes pugen a Folre', 'Folre', e.rang.nom);
  comprova('l\'últim dictat avisa que s\'ha pujat', true, e.ultim.haPujat);
  comprova('i diu d\'on es venia', 'Pinya', e.ultim.rangAnterior);

  const tres = R.estat(repeteix(3, { level: 'avancat', totalWords: 84, errors: 0 })); // 555
  comprova('el tercer puja a Manilles, des de Folre',
    ['Manilles', 'Folre'], [tres.rang.nom, tres.ultim.rangAnterior]);
}

console.log('\nI es baixa, però amb marge:');
{
  // Just per sobre del llindar de Folre (200) i després una caiguda petita.
  const historial = repeteix(6, { level: 'basic', totalWords: 34, errors: 0 });  // 204
  const abans = R.estat(historial);
  comprova('s\'ha arribat a Folre', 'Folre', abans.rang.nom);

  historial.push({ level: 'basic', totalWords: 34, errors: 7 });                 // -8 -> 196
  const petita = R.estat(historial);
  comprova('una caiguda petita per sota del llindar NO fa baixar', 'Folre', petita.rang.nom);
  comprova('i no diu que s\'hagi baixat', false, petita.ultim.haBaixat);

  // El marge són 40 punts: des de 196 cal caure per sota de 160.
  historial.push({ level: 'basic', totalWords: 34, errors: 15 });                 // 176
  comprova('encara dins del marge, no baixa', 'Folre', R.estat(historial).rang.nom);

  historial.push({ level: 'basic', totalWords: 34, errors: 15 });                 // 156
  const caiguda = R.estat(historial);
  comprova('passat el marge, baixa', 'Pinya', caiguda.rang.nom);
  comprova('i el dictat que ho provoca ho diu', true, caiguda.ultim.haBaixat);

  historial.push({ level: 'basic', totalWords: 34, errors: 15 });                 // 136
  comprova('el dictat següent ja no torna a anunciar la baixada',
    false, R.estat(historial).ultim.haBaixat);
}

console.log('\nEl que necessita la pantalla:');
{
  const e = R.estat(repeteix(4, { level: 'basic', totalWords: 34, errors: 0 }));  // 136
  comprova('sap quants punts falten per al següent rang', 200 - 136, e.seguent.falten);
  comprova('i quant s\'ha avançat dins del tram', 68, e.seguent.progres);
  comprova('el rang porta la seva posició a l\'escala', 8, e.rang.de);
}
{
  const e = R.estat([]);
  comprova('sense cap dictat, Pinya i zero punts', ['Pinya', 0], [e.rang.nom, e.punts]);
  comprova('i cap últim dictat', null, e.ultim);
}
{
  const e = R.estat(repeteix(300, { level: 'avancat', totalWords: 84, errors: 0 }));
  comprova('a dalt de tot no hi ha «següent rang»', null, e.seguent);
  comprova('i el rang és Enxaneta', 'Enxaneta', e.rang.nom);
}

console.log('\nEls dictats antics, sense nombre de paraules desat:');
comprova('s\'estimen pel nivell en comptes de valdre zero', true,
  R.puntsDelDictat({ level: 'intermedi', errors: 0 }) > 0);
comprova('i l\'estimació és la del seu nivell',
  punts('intermedi', 57, 0), R.puntsDelDictat({ level: 'intermedi', totalWords: null, errors: 0 }));

console.log(falles ? `\n${falles} FALLES` : '\nTotes les proves dels rangs passen');
process.exitCode = falles ? 1 : 0;

// Proves del motor del dictat (public/dictat.js). Sense dependències: el
// sintetitzador de veu se simula aquí mateix.
//
// El detall que fa que aquestes proves serveixin de res: aquí `cancel()` NO
// desmarca el flag de pausa i una locució llançada amb el sintetitzador pausat
// no arriba mai a `onend`. És el que fa Chromium de debò, i és el que va deixar
// el dictat mut per sempre fins que es va arreglar.
//
//   node test/dictat.test.js

const dit = [];
let acabaAra = null;

class UtteranceFalsa {
  constructor(text) { this.text = text; this.onend = null; this.onerror = null; }
}

const veu = {
  pausada: false,
  cancel() { acabaAra = null; },          // deliberadament NO toca `pausada`
  pause() { this.pausada = true; },
  resume() { this.pausada = false; },
  getVoices() { return [{ lang: 'ca-ES', name: 'Catalana' }]; },
  speak(u) {
    dit.push({ text: u.text, sonaDeVeritat: !this.pausada });
    acabaAra = this.pausada ? null : () => u.onend && u.onend();
  },
};

global.window = global;
global.speechSynthesis = veu;
global.SpeechSynthesisUtterance = UtteranceFalsa;
require('../public/dictat.js');

let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  console.log((ok ? '  OK   ' : '  FALLA') + '  ' + nom
    + (ok ? '' : `\n         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`));
  if (!ok) falles++;
}
const ultim = () => dit[dit.length - 1];
const FRASES = ['Primera frase.', 'Segona frase, amb coma.', 'Tercera i última.'];

function motorNou(frases) {
  const caixa = { info: null };
  caixa.motor = new Dictat.MotorDictat((i) => { caixa.info = i; });
  caixa.motor.carrega(frases || FRASES);
  return caixa;
}

// ── F17 ────────────────────────────────────────────────────────────────────
console.log('F17 — «Repetir frase» ha de repetir la que sona ARA:');
{
  const { motor } = motorNou();
  motor.inicia();
  comprova('sona la frase 1', 'Primera frase.', ultim().text);
  motor.repeteix();
  comprova('repetir mentre sona la 1 torna la 1', 'Primera frase.', ultim().text);
  acabaAra();
  motor.seguent();
  comprova('sona la frase 2', 'Segona frase, amb coma.', ultim().text);
  motor.repeteix();
  comprova('repetir mentre sona la 2 torna la 2 (abans tornava la 1)',
    'Segona frase, amb coma.', ultim().text);
}

// ── F16 ────────────────────────────────────────────────────────────────────
console.log('\nF16 — la pausa surt de la frase, no és fixa:');
comprova('1 paraula, s\'aplica el mínim de 4 s', 4000, Dictat.pausaDeFrase('Hola'));
comprova('2 paraules, 4,4 s', 4400, Dictat.pausaDeFrase('Hola món'));
comprova('17 paraules, 37,4 s', 37400, Dictat.pausaDeFrase('a b c d e f g h i j k l m n o p q'));
comprova('26 paraules, 57,2 s', 57200, Dictat.pausaDeFrase(Array(26).fill('x').join(' ')));

// ── F20 ────────────────────────────────────────────────────────────────────
console.log('\nF20 — dictar la puntuació:');
comprova('coma i punt', 'Al nord coma hi ha neu punt', Dictat.ambPuntuacio('Al nord, hi ha neu.'));
comprova('cometes i dos punts', 'Va dir dos punts cometes obertes hola cometes tancades',
  Dictat.ambPuntuacio('Va dir: «hola»'));

// ── F18 i el flag de pausa global ──────────────────────────────────────────
console.log('\nF18 — pausar i reprendre:');
{
  const caixa = motorNou();
  caixa.motor.inicia();
  caixa.motor.pausa();
  comprova('estat pausat', 'pausat', caixa.info.estat);
  comprova('el sintetitzador queda pausat', true, veu.pausada);
  caixa.motor.repren();
  comprova('estat llegint', 'llegint', caixa.info.estat);
  comprova('el sintetitzador s\'ha repres', false, veu.pausada);
}

console.log('\nRegressió — pausar, tornar enrere, triar text i tornar a començar:');
{
  const caixa = motorNou();
  caixa.motor.inicia();
  caixa.motor.pausa();
  caixa.motor.carrega(FRASES);          // «← Tornar» i triar un text
  comprova('carregar un text desmarca la pausa global', false, veu.pausada);
  caixa.motor.inicia();
  comprova('la veu torna a sonar de veritat', true, ultim().sonaDeVeritat);
  acabaAra();
  comprova('i el compte enrere arrenca', 'pausa', caixa.info.estat);
  caixa.motor.atura();
}

console.log('\nRegressió — «Següent» i «Repetir» estant pausat:');
{
  const caixa = motorNou();
  caixa.motor.inicia();
  caixa.motor.pausa();
  caixa.motor.seguent();
  comprova('«Següent» sona de veritat', true, ultim().sonaDeVeritat);
  comprova('i diu la frase 2', 'Segona frase, amb coma.', ultim().text);
  caixa.motor.pausa();
  caixa.motor.repeteix();
  comprova('«Repetir» sona de veritat', true, ultim().sonaDeVeritat);
  caixa.motor.atura();
}

console.log('\nRegressió — la frase s\'acaba just quan es prem «Pausar»:');
{
  const caixa = motorNou();
  caixa.motor.inicia();
  const acabar = acabaAra;
  caixa.motor.pausa();
  acabar();                              // l'onend arriba amb el dictat pausat
  comprova('queda pausat, sense encallar-se', 'pausat', caixa.info.estat);
  caixa.motor.repren();
  comprova('en reprendre arrenca el temps per escriure', 'pausa', caixa.info.estat);
  comprova('amb segons de debò, no a zero', true, caixa.info.segons > 0);
  comprova('i el sintetitzador ja no està pausat', false, veu.pausada);
  caixa.motor.atura();
}

console.log('\nRegressió — l\'última frase acaba mentre està pausat:');
{
  const caixa = motorNou(['Única frase.']);
  caixa.motor.inicia();
  const acabar = acabaAra;
  caixa.motor.pausa();
  acabar();
  caixa.motor.repren();
  comprova('el dictat es dona per acabat', 'fet', caixa.info.estat);
  comprova('progrés al 100 %', 100, caixa.info.progres);
}

console.log(falles ? `\n${falles} FALLES` : '\nTotes les proves del motor passen');
process.exitCode = falles ? 1 : 0;

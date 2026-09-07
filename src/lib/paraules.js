// Les operacions sobre una paraula solta que fan servir tant la comparació
// (`diff.js`) com la classificació (`taxonomia.js`).
//
// Viuen aquí i no dins de `diff.js` per una raó de dependències: `diff.js`
// necessita la taxonomia per posar tipus a cada error, i la taxonomia necessita
// aquestes funcions. Si es quedessin a `diff.js` hi hauria un cicle.

const VORA = '«»“”‘’()[]{}¡!¿?.,;:…—–\'"';
const escapa = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RE_VORA = new RegExp(`^[${escapa(VORA)}]+|[${escapa(VORA)}]+$`, 'g');

function treuPuntuacio(paraula) {
  return String(paraula ?? '').replace(RE_VORA, '');
}

// Treu els diacrítics combinats, però NO la cedilla (U+0327): `caça` contra
// `caca` no és un error d'accentuació, és un altre error, i barrejar-los
// enganya justament a qui està practicant.
const CEDILLA = 0x327;
function treuAccents(paraula) {
  let net = '';
  for (const car of String(paraula ?? '').normalize('NFD')) {
    const codi = car.codePointAt(0);
    if (codi >= 0x300 && codi <= 0x36f && codi !== CEDILLA) continue;
    net += car;
  }
  return net.normalize('NFC');
}

/** Clau d'aparellament: prou laxa perquè `camí` i `cami` s'ancorin igual. */
function clau(paraula) {
  return treuAccents(treuPuntuacio(paraula)).toLowerCase();
}

/** Distància d'edició. Serveix per ancorar i per decidir si dues paraules
 *  s'assemblen prou per ser la mateixa mal escrita. */
function distancia(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let anterior = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const actual = [i];
    for (let j = 1; j <= n; j++) {
      actual[j] = Math.min(
        anterior[j] + 1,
        actual[j - 1] + 1,
        anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    anterior = actual;
  }
  return anterior[n];
}

module.exports = { VORA, treuPuntuacio, treuAccents, clau, distancia };

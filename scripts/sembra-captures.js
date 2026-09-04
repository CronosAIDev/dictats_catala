// Sembra historial per a les captures fent correccions REALS per l'API.
// No insereix cap fila a mà i no toca cap data: el que es veurà a la captura
// és el que l'app produeix de veritat amb aquestes entrades.
const texts = require('../data/texts.js');

const BASE = 'http://localhost:3999';
const galeta = process.argv[2];

// Espatlla unes quantes paraules del text, com faria algú escrivint de pressa.
function ambErrors(text, quants) {
  const canvis = [['à', 'a'], ['è', 'e'], ['é', 'e'], ['í', 'i'], ['ó', 'o'], ['ú', 'u'], ['ç', 's']];
  let fets = 0;
  return text.split(' ').map((p) => {
    if (fets >= quants) return p;
    for (const [de, a] of canvis) {
      if (p.includes(de)) { fets++; return p.replace(de, a); }
    }
    return p;
  }).join(' ');
}

const tanda = [
  ...texts.intermedi.slice(0, 5).map((t, i) => ({ t, nivell: 'intermedi', errors: [1, 0, 2, 1, 0][i] })),
  ...texts.avancat.slice(0, 6).map((t, i) => ({ t, nivell: 'avancat', errors: [3, 1, 2, 0, 1, 0][i] })),
];

(async () => {
  for (const { t, nivell, errors } of tanda) {
    const r = await fetch(BASE + '/api/correct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: galeta },
      body: JSON.stringify({
        originalText: t.text,
        userText: ambErrors(t.text, errors),
        level: nivell,
        textId: t.id,
        textTitle: t.title,
      }),
    });
    const d = await r.json();
    console.log(`  ${t.title.padEnd(28)} ${d.errors?.length ?? '?'} errors · ${d.rank?.rang?.nom} ${d.rank?.punts}`);
  }
})();

// Barreja reproduïble.
//
// Viu aquí i no dins de `repesca.js` i `micro.js` perquè les dues la
// necessiten, i escrita dues vegades ja va divergir el primer dia.
//
// **Per què no `Math.random()`**: perquè cal poder provar-ho. La mateixa
// llavor ha de donar sempre el mateix ordre; si no, una prova d'ordenació no
// es pot escriure.
//
// **Per què els bits alts**: un generador congruencial lineal té els bits
// baixos molt febles — en una llista de dos elements, `estat % 2` només depèn
// de la PARITAT de la llavor, així que dues llavors senars donaven exactament
// la mateixa barreja. Es va veure provant que canviar la llavor canviés
// l'ordre: no el canviava. Prenent els bits alts, sí.

/**
 * Barreja una llista de manera imprevisible però reproduïble.
 * @param {Array} llista
 * @param {number} llavor
 */
function barrejaAmb(llista, llavor) {
  const fora = (llista || []).slice();
  let estat = ((llavor || 1) >>> 0) || 1;
  // Una volta en va: la primera sortida d'un LCG s'assembla massa a la llavor.
  estat = (estat * 1664525 + 1013904223) >>> 0;
  for (let i = fora.length - 1; i > 0; i--) {
    estat = (estat * 1664525 + 1013904223) >>> 0;
    const j = (estat >>> 16) % (i + 1);
    const tmp = fora[i]; fora[i] = fora[j]; fora[j] = tmp;
  }
  return fora;
}

module.exports = { barrejaAmb };

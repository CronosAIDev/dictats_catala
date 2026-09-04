// Les explicacions, que arriben després que la correcció (F33).
//
// Fins ara `/api/correct` esperava Claude abans de respondre, i entre prémer
// «Corregir» i veure res hi havia un spinner mut de segons. Però des de F31 la
// correcció sencera —les marques, l'escala, els punts i el rang— es calcula al
// servidor sense xarxa: l'única part que encara depèn del model és el text que
// explica cada falta. Ara la correcció es pinta de seguida i això va a buscar
// les explicacions a part.
//
// Viu aquí i no dins de cada vista pel motiu de sempre en aquest projecte: la
// mateixa lectura escrita tres vegades és com F17 va acabar sent el mateix bug
// per duplicat. `app.js`, `mobile.html` i qui vingui criden aquesta funció i
// tornen a pintar amb el que ja tenen.
//
// Mentre no arriben, cada error ja ensenya l'explicació per defecte que escriu
// el servidor («Revisa l'accent d'aquesta paraula»). O sigui que **no hi ha cap
// moment en blanc**: hi ha un text útil des del primer instant i es refina quan
// arriba el del model. És a posta: val més un text genèric ara que un de bo
// d'aquí a quatre segons.
(function () {
  /**
   * Demana les explicacions d'una correcció ja pintada i les hi penja.
   *
   * @param {object} correccio  El que ha tornat /api/correct. Es MUTA.
   * @param {function} alRebre  Es crida quan han arribat, per tornar a pintar.
   */
  async function demana(correccio, alRebre) {
    // Sense id no hi ha res a demanar: o no hi ha errors, o la BD ha fallat i
    // el resultat es queda amb el text per defecte, que ja és correcte.
    if (!correccio || !correccio.progressId) return;

    try {
      const res = await fetch('/api/explicacions/' + correccio.progressId, { method: 'POST' });
      if (!res.ok) return;                       // el text per defecte es queda
      const dades = await res.json();
      if (!dades || !Array.isArray(dades.explicacions)) return;

      // El servidor les torna en el mateix ordre que `errors` i després
      // `warnings`, que és l'ordre en què es van desar.
      const llista = (correccio.errors || []).concat(correccio.warnings || []);
      dades.explicacions.forEach((e, i) => {
        if (!llista[i] || !e.explanation) return;
        llista[i].explanation = e.explanation;
        // `generada` diu si ho ha escrit el model. Ho necessita el botó de
        // report (F64): Play demana poder denunciar contingut d'IA, i oferir-ho
        // sobre un text nostre embrutaria els avisos.
        llista[i].generada = !!e.generada;
      });

      if (dades.feedback) {
        correccio.feedback = dades.feedback;
        correccio.feedbackGenerat = !!dades.feedbackGenerat;
      }

      if (typeof alRebre === 'function') alRebre(correccio);
    } catch (err) {
      // Que fallin les explicacions no ha de tocar una correcció que ja es veu.
      console.warn('No s\'han pogut carregar les explicacions:', err.message);
    }
  }

  window.Explicacions = { demana };
})();

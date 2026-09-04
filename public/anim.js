// Les tres línies d'ànim de la pantalla de resultats (#23), en un sol lloc
// perquè `app.js` i `mobile.html` diguin exactament el mateix.
//
// Surten de dades que ja hi eren: la ratxa de `completed_at`, la mitjana de
// `user_progress` i el compte total. Res de taules noves ni pantalles noves.
//
// La regla de `CLAUDE.md` mana per damunt de tot: **mai renyar**. Si has anat
// pitjor que de costum, no es diu; només es diu quina és la teva mitjana. La
// felicitació és per quan toca, i el silenci no és un càstig.

(function (global) {
  'use strict';

  function nombre(n) {
    return String(n).replace('.', ',');
  }

  /**
   * Les línies a pintar sota el resultat, en ordre. Pot ser buit.
   * @param {object} c  La correcció que torna el servidor.
   * @returns {Array<{text: string, to: 'fita'|'be'|'neutre'}>}
   */
  function linies(c) {
    const out = [];
    if (!c) return out;

    // «1 dia seguit» no és una ratxa: es diu a partir de dos.
    if (c.ratxa && c.ratxa.dies > 1) {
      out.push({ text: c.ratxa.dies + ' dies seguits fent dictats.', to: 'be' });
    }

    if (c.comparativa) {
      out.push(c.comparativa.millor
        ? { text: 'Millor que la teva mitjana, que és ' + nombre(c.comparativa.mitjana) + '.', to: 'be' }
        : { text: 'La teva mitjana és ' + nombre(c.comparativa.mitjana) + '.', to: 'neutre' });
    }

    if (c.fita) out.push({ text: c.fita.text, to: 'fita' });

    return out;
  }

  /** Pinta les línies dins d'un element. Si no n'hi ha cap, l'amaga. */
  function pinta(element, correccio) {
    if (!element) return;
    const files = linies(correccio);
    if (files.length === 0) { element.style.display = 'none'; element.textContent = ''; return; }
    element.style.display = '';
    element.textContent = '';
    for (const f of files) {
      const linia = global.document.createElement('div');
      linia.className = 'anim-linia anim-' + f.to;
      linia.textContent = f.text;                       // textContent: mai innerHTML
      element.appendChild(linia);
    }
  }

  global.Anim = { linies, pinta };
})(window);

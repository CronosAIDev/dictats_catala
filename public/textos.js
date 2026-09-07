// Com es veu, a la llista, el que ja has fet (F35).
//
// Viu en un sol fitxer i no dins de cada vista pel mateix motiu que `rang.js`,
// `explicacions.js` i `a11y.js`: la llista de textos es pinta a `app.js` i a
// `mobile.html`, i el dia que es canviï una frase aquí s'ha de canviar en un
// lloc. Escrit dues vegades és com F17 va acabar sent el mateix bug per
// duplicat, i F50 la mateixa lectura del rang escrita tres cops.
//
// El servidor ja diu QUIN text es proposa (`seguent`, `motiu`); aquí només es
// decideix com es diu.
//
// La regla de `CLAUDE.md` que mana: **mai renyar**. Un text sense fer no porta
// cap marca —no és un deute pendent, és una cosa que encara no toca— i el que
// es proposa per repassar no diu enlloc que et vagi malament.
(function () {
  function progres(llista) {
    const tots = llista || [];
    return { fets: tots.filter(t => t.fet).length, total: tots.length };
  }

  function errors(n) {
    if (n === 0) return 'sense cap error';
    return n === 1 ? '1 error' : n + ' errors';
  }

  /** El que se sap d'aquest text. Cadena buida si encara no s'ha fet. */
  function historia(t) {
    if (!t || !t.fet) return '';
    const millor = t.millorErrors;
    if (millor === null || millor === undefined) return 'Fet';
    // Amb una sola passada no hi ha «millor» que valgui: és l'única.
    if (t.vegades <= 1) return 'Fet, ' + errors(millor);
    return 'Fet ' + t.vegades + ' cops, el millor ' +
      (millor === 0 ? 'sense cap error' : 'amb ' + errors(millor));
  }

  /**
   * La marca del text que es proposa.
   * @param {object} t     el text
   * @param {object} ctx   `{ capFet }` — si encara no n'has fet cap, convida a
   *                       començar; si ja n'has fet, a continuar.
   */
  function insignia(t, ctx) {
    if (!t || !t.seguent) return '';
    const text = t.motiu === 'repas'
      ? 'Per repassar'
      : ((ctx && ctx.capFet) ? 'Comença per aquí' : 'Continua per aquí');
    return '<span class="text-seguent">' + text + '</span>';
  }

  /** El que va sota el títol: «Fet, 2 errors» i, si toca, la marca. */
  function marques(t, ctx) {
    const parts = [];
    const h = historia(t);
    if (h) parts.push('<span class="text-fet"><span aria-hidden="true">✓</span> ' + h + '</span>');
    const i = insignia(t, ctx);
    if (i) parts.push(i);
    return parts.length ? '<div class="text-marques">' + parts.join('') + '</div>' : '';
  }

  /** «7 de 10 fets», o cadena buida si no n'hi ha cap. */
  function resum(llista) {
    const p = progres(llista);
    if (!p.total || !p.fets) return '';
    return p.fets + ' de ' + p.total + ' fets';
  }

  window.Textos = { progres, historia, insignia, marques, resum };
})();

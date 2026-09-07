// El repàs de les frases fallades, vist des del client (F27).
//
// Un sol fitxer per a les dues vistes, com `rang.js`, `textos.js`, `errors.js`
// i `a11y.js`: la targeta i el text que hi va no es poden escriure dues
// vegades sense que un dia diguin coses diferents.
//
// El client **no sap** quines frases de la sessió són les que vas fallar: el
// servidor no li ho diu. Si ho sabés, prou gent ho miraria — i tot el sentit
// de barrejar-les és que no ho sàpigues.
(function () {
  /** Què hi ha pendent. Torna `{pendents, frases, text}`. */
  async function consulta() {
    try {
      const res = await fetch('/api/repesca');
      if (!res.ok) return { pendents: 0, frases: [], text: '' };
      return await res.json();
    } catch {
      // Sense connexió el repàs no és el problema més gros: es calla.
      return { pendents: 0, frases: [], text: '' };
    }
  }

  /** «Tens 3 frases per repassar». */
  function etiqueta(pendents) {
    if (!pendents) return '';
    return pendents === 1
      ? 'Tens 1 frase per repassar'
      : 'Tens ' + pendents + ' frases per repassar';
  }

  /** El perquè, dit sense renyar: es diu què és, no què has fet malament. */
  const EXPLICACIO = 'Frases de dictats anteriors, barrejades amb altres. '
    + 'Tornen fins que te les saps.';

  /**
   * La sessió, convertida en un «text» que la resta de l'app ja sap fer servir.
   * L'id `repas` és el que fa que la correcció vagi a la seva ruta.
   */
  function comText(sessio) {
    return {
      id: 'repas',
      title: 'Repàs',
      text: sessio.text,
      frases: sessio.frases,
      wordCount: String(sessio.text || '').replace(/\|\|/g, ' ').split(/\s+/).filter(Boolean).length,
    };
  }

  window.Repas = { consulta, etiqueta, comText, EXPLICACIO };
}());

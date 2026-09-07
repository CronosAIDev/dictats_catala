// La corba de progrés per setmanes (F36).
//
// SVG escrit a mà i no cap llibreria de gràfics: aquesta app no té pas de
// compilació i el gràfic són barres i quatre línies. Una dependència de
// 300 kB per això seria pitjor que el problema.
//
// **Menys és millor**: l'eix són errors per 100 paraules, així que la barra
// baixa quan vas millorant. No s'inverteix l'eix per fer-lo semblar una gràfica
// de creixement: seria maquillar un nombre que la persona ha d'entendre.
//
// Accessibilitat (F39): l'SVG va amb `aria-hidden` i al costat hi ha la
// **mateixa informació en una taula** que només llegeix el lector de pantalla.
// Un `aria-label` amb un resum no serveix: qui no hi veu té dret als nombres,
// no a un resum que hem triat nosaltres.
//
// I els colors d'aquí estan MESURATS, no triats a ull. Una barra d'un gràfic
// és contingut no textual que transmet informació, i la WCAG 1.4.11 li demana
// 3:1 contra el fons. El primer intent les va pintar a `--primary-hover` amb
// opacitat 0,45: **2,16:1**, per sota. A 0,7 fan 3,57:1. El guionet de setmana
// buida anava a `--border`, que és 1,23:1 —pràcticament invisible— i ara va a
// `--text-muted`, 5,83:1.
(function () {
  const MESOS = ['gen', 'feb', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'des'];
  const coma = (n) => String(n).replace('.', ',');

  function etiqueta(clau) {
    const [a, m, d] = String(clau).split('-').map(Number);
    return `${d} ${MESOS[(m || 1) - 1]}`;
  }

  // Mides lògiques: l'SVG s'escala amb CSS, així que això són proporcions.
  const AMPLE = 320, ALT = 140;
  const ESQ = 26, DRETA = 6, DALT = 10, BAIX = 20;

  /**
   * @param {Array} llista  `[{setmana, dictats, comptats, taxa}]`, de la més
   *                        antiga a la més recent.
   * @returns {string} HTML: l'SVG més la taula per al lector.
   */
  function setmanes(llista) {
    const dades = llista || [];
    if (dades.length === 0) return '';

    const taxes = dades.map(s => s.taxa).filter(t => t !== null && t !== undefined);
    if (taxes.length === 0) return '';

    // El sostre de l'eix, arrodonit amunt perquè la barra més alta no toqui
    // el marc. Mínim 1 per no dividir per zero quan tot ha anat perfecte.
    const sostre = Math.max(1, Math.ceil(Math.max(...taxes) * 1.15));
    const ampleUtil = AMPLE - ESQ - DRETA;
    const altUtil = ALT - DALT - BAIX;
    const pas = ampleUtil / dades.length;
    const ampleBarra = Math.max(3, Math.min(26, pas * 0.6));

    const y = (valor) => DALT + altUtil * (1 - valor / sostre);

    const barres = dades.map((s, i) => {
      const cx = ESQ + pas * (i + 0.5);
      if (s.taxa === null || s.taxa === undefined) {
        // Setmana sense cap dictat comptable: un guionet a la base, que és
        // diferent de una barra de zero errors.
        return `<line x1="${(cx - ampleBarra / 2).toFixed(1)}" x2="${(cx + ampleBarra / 2).toFixed(1)}"
                 y1="${DALT + altUtil}" y2="${DALT + altUtil}"
                 stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round"/>`;
      }
      const alt = Math.max(1.5, DALT + altUtil - y(s.taxa));
      const darrera = i === dades.length - 1;
      return `<rect x="${(cx - ampleBarra / 2).toFixed(1)}" y="${y(s.taxa).toFixed(1)}"
               width="${ampleBarra.toFixed(1)}" height="${alt.toFixed(1)}" rx="2"
               fill="${darrera ? 'var(--primary)' : 'var(--primary-hover)'}"
               opacity="${darrera ? '1' : '.7'}"/>`;
    }).join('');

    // Només s'etiqueta la primera i l'última: amb vuit setmanes, totes les
    // dates no hi caben i queden il·legibles en un mòbil.
    const etiquetes = dades.map((s, i) => {
      if (i !== 0 && i !== dades.length - 1) return '';
      const cx = ESQ + pas * (i + 0.5);
      return `<text x="${cx.toFixed(1)}" y="${ALT - 6}" text-anchor="${i === 0 ? 'start' : 'end'}"
               font-size="9" fill="var(--text-muted)">${etiqueta(s.setmana)}</text>`;
    }).join('');

    const svg = `
      <svg viewBox="0 0 ${AMPLE} ${ALT}" width="100%" height="auto"
           aria-hidden="true" focusable="false" style="display:block">
        <line x1="${ESQ}" x2="${AMPLE - DRETA}" y1="${DALT}" y2="${DALT}"
              stroke="var(--border)" stroke-width="1" stroke-dasharray="2 3"/>
        <line x1="${ESQ}" x2="${AMPLE - DRETA}" y1="${DALT + altUtil}" y2="${DALT + altUtil}"
              stroke="var(--border)" stroke-width="1"/>
        <text x="${ESQ - 4}" y="${DALT + 3}" text-anchor="end" font-size="9"
              fill="var(--text-muted)">${coma(sostre)}</text>
        <text x="${ESQ - 4}" y="${DALT + altUtil + 3}" text-anchor="end" font-size="9"
              fill="var(--text-muted)">0</text>
        ${barres}${etiquetes}
      </svg>`;

    const files = dades.map(s => `
      <tr>
        <th scope="row">Setmana del ${etiqueta(s.setmana)}</th>
        <td>${s.dictats} dictat${s.dictats === 1 ? '' : 's'}</td>
        <td>${s.taxa === null || s.taxa === undefined
          ? 'sense dades comparables'
          : coma(s.taxa) + ' errors per 100 paraules'}</td>
      </tr>`).join('');

    const taula = `
      <table class="nomes-lector">
        <caption>Errors per 100 paraules, setmana a setmana</caption>
        <tbody>${files}</tbody>
      </table>`;

    return svg + taula;
  }

  window.Grafic = { setmanes, etiqueta };
})();

// Avisar sobre el contingut que escriu el model (F64).
//
// Google Play tracta les apps que generen contingut amb IA com una àrea
// regulada i exigeix poder denunciar contingut ofensiu **sense sortir de
// l'app**. A Dictats el model escriu l'explicació de cada error i el missatge
// final d'ànim; aquest fitxer posa la via.
//
// Viu en un fitxer compartit i no dins de cada vista a posta: el bug de F17 va
// existir dues vegades perquè el motor del dictat estava duplicat a `app.js` i
// a `mobile.html`. Aquí es fa una vegada i les dues vistes hi criden.
//
// El botó NOMÉS es pinta sobre text que ha escrit el model. Quan l'API falla,
// les explicacions són genèriques i les hem escrit nosaltres: oferir-ne el
// report embrutaria els avisos amb coses que no són d'IA.

(function (global) {
  'use strict';

  function escapa(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  /**
   * El marcatge del botó. Torna cadena buida si el text no l'ha generat el
   * model, que és el cas en què no s'ha d'oferir.
   *
   * @param {object} dades
   *   @param {boolean} dades.generada  Ho ha escrit el model?
   *   @param {string}  dades.kind      'explicacio' | 'feedback'
   *   @param {string}  dades.content   El text, tal com el veu la persona
   *   @param {string}  [dades.context] La paraula i el tipus, per situar-ho
   */
  function boto(dades) {
    if (!dades || !dades.generada || !dades.content) return '';
    return '<button type="button" class="btn-avis" title="Avisar sobre aquesta explicació"'
      + ' aria-label="Avisar sobre aquesta explicació"'
      + ' data-avis-kind="' + escapa(dades.kind) + '"'
      + ' data-avis-content="' + escapa(dades.content) + '"'
      + ' data-avis-context="' + escapa(dades.context || '') + '">⚑</button>';
  }

  async function envia(boto) {
    const motiu = global.prompt(
      'Què hi ha malament? (opcional)\n\n'
      + 'Aquesta explicació l\'ha escrit un model d\'intel·ligència artificial. '
      + 'Si és ofensiva, incorrecta o no hi té res a veure, digue\'ns-ho i la revisarem.'
    );
    // `prompt` torna null si es cancel·la, i '' si s'envia buit: cancel·lar no
    // ha d'enviar res, deixar-ho en blanc sí.
    if (motiu === null) return;

    boto.disabled = true;
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: boto.dataset.avisKind,
          content: boto.dataset.avisContent,
          context: boto.dataset.avisContext || null,
          reason: motiu || null,
        }),
      });
      if (res.ok) {
        boto.textContent = '✓';
        boto.classList.add('enviat');
        boto.title = 'Avís enviat. Gràcies.';
        boto.setAttribute('aria-label', 'Avís enviat');
      } else {
        const d = await res.json().catch(() => ({}));
        global.alert(d.error || 'No s\'ha pogut enviar l\'avís.');
        boto.disabled = false;
      }
    } catch (e) {
      global.alert('No s\'ha pogut connectar. Torna-ho a provar.');
      boto.disabled = false;
    }
  }

  /**
   * Un sol listener delegat a l'arrel: els resultats es repinten sencers a cada
   * correcció, i enganxar-ne un a cada botó els aniria acumulant.
   */
  function escolta(arrel) {
    (arrel || global.document).addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('.btn-avis');
      if (!b || b.classList.contains('enviat')) return;
      e.preventDefault();
      e.stopPropagation();
      envia(b);
    });
  }

  global.Avisos = { boto, escolta };

  // S'enganxa sol. Si cada vista hagués de recordar-se'n de cridar `escolta()`,
  // tornaríem a tenir la mateixa cosa escrita a dos llocs — que és com F17 va
  // acabar sent un bug per duplicat.
  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', () => escolta());
  } else {
    escolta();
  }
})(window);

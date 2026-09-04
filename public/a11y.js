// Les quatre coses que fan que l'app es pugui fer servir sense mirar-la (F39).
//
// Aquesta és una app que es fa servir amb les orelles. Qui la faci servir amb
// un lector de pantalla n'és usuari de ple dret, i fins ara no hi havia ni un
// atribut `aria-` a tot el frontend: l'estat del dictat només canviava de
// color i de text, que per a un lector és no canviar gens.
//
// Viu en un sol fitxer i no dins de cada vista pel mateix motiu que `rang.js` i
// `explicacions.js`: escrit tres vegades és com F17 va acabar sent el mateix
// bug per duplicat.
//
// ── La decisió que condiciona la resta ───────────────────────
// Tot s'anuncia amb `polite` i **mai amb `assertive`**. Mentre es dicta hi ha
// una veu sintètica llegint el text: un anunci que interromp a cada frase no
// faria la pantalla accessible, la faria inservible. `polite` espera que la
// veu calli.
(function () {
  /**
   * Posa el percentatge a la barra i l'hi diu al lector.
   * El `role="progressbar"` viu al contenidor, no a la peça que s'estira.
   */
  function progres(barra, percentatge) {
    if (!barra) return;
    const valor = Math.max(0, Math.min(100, Math.round(percentatge || 0)));
    barra.style.width = valor + '%';
    const caixa = barra.closest('[role="progressbar"]');
    if (caixa) caixa.setAttribute('aria-valuenow', String(valor));
  }

  /** Un interruptor de dos estats, no dos botons solts. */
  function premut(boto, si) {
    if (boto) boto.setAttribute('aria-pressed', si ? 'true' : 'false');
  }

  /**
   * Porta el focus a on ha passat la cosa —el resultat d'una correcció— perquè
   * qui va amb teclat o lector no s'hagi de buscar la vida per trobar-lo.
   *
   * `tabindex="-1"` el fa enfocable per codi sense afegir-lo al recorregut del
   * tabulador, i el CSS li treu el requadre: qui hi ha arribat amb el ratolí no
   * entendria d'on surt, i el lector el llegeix igual.
   */
  function focusA(element) {
    if (!element) return;
    if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');
    element.focus({ preventScroll: false });
  }

  /**
   * Diu una cosa puntual que no té cap regió viva pròpia. S'escriu a un forat
   * que es crea sol i que no es veu.
   *
   * El text s'esborra abans d'escriure'l: si es torna a posar el MATEIX text,
   * el navegador no ho considera un canvi i el lector no diu res. És el motiu
   * pel qual «Corregint…» dues vegades seguides es quedava mut.
   */
  let forat = null;
  function anuncia(text) {
    if (!text) return;
    if (!forat) {
      forat = document.createElement('div');
      forat.className = 'nomes-lector';
      forat.setAttribute('role', 'status');
      forat.setAttribute('aria-live', 'polite');
      document.body.appendChild(forat);
    }
    forat.textContent = '';
    setTimeout(() => { forat.textContent = text; }, 50);
  }

  /**
   * Executa una cosa que torna a pintar la pantalla i deixa el focus on era.
   *
   * Fa falta per F33: quan arriben les explicacions es torna a pintar el
   * resultat sencer, i això destrueix l'element que tenia el focus. Sense
   * això, qui va amb lector de pantalla està llegint la correcció i de cop el
   * focus li salta al `body` — sense que hagi passat res que ho justifiqui.
   *
   * Es recupera per `id` perquè després de repintar l'element ANTIC ja no
   * existeix, encara que en guardéssim la referència.
   */
  function preservantFocus(fn) {
    const actiu = document.activeElement;
    const id = actiu && actiu.id;
    const dinsDelBody = actiu && actiu !== document.body;
    fn();
    if (!id || !dinsDelBody) return;
    const tornat = document.getElementById(id);
    if (tornat && document.activeElement !== tornat) focusA(tornat);
  }

  window.A11y = { progres, premut, focusA, anuncia, preservantFocus };
})();

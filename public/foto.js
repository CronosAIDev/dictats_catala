// Mirar la foto abans de gastar-hi una crida al model.
//
// ── Per què existeix ─────────────────────────────────────────
// Si la càmera no té permís, el sistema torna una imatge **negra sencera** en
// comptes de fallar. Sense mirar-la, aquella foto viatja a la visió del model,
// costa diners i torna una transcripció inventada — i el que en surti se li
// ensenya a la persona **com si fossin faltes seves**. És el pitjor error que
// pot cometre aquesta app: ensenyar ortografia equivocada.
//
// ── Com es distingeix d'una foto fosca de veritat ────────────
// No serveix mirar només si és fosca: un paper fotografiat amb poca llum també
// ho és, i aquella foto és bona. El que distingeix una imatge **buida** és que
// és **uniforme**: tots els píxels valen gairebé el mateix. Un paper amb lletra,
// per fosc que estigui, té contrast.
//
// Per això es miren les dues coses: la mitjana i la variació. Amb variació,
// passa encara que sigui molt fosca.
(function (global) {
  'use strict';

  // Prou petit perquè sigui instantani i prou gran per veure-hi contrast.
  var COSTAT = 64;
  var FOSCA = 24;        // mitjana, de 0 a 255
  var PLANA = 8;         // desviació típica per sota de la qual no hi ha res

  /**
   * La decisió, a part de com es mesura.
   *
   * Es pot provar sense navegador, que és el que fa que es pugui provar. Una
   * imatge **fosca** pot ser bona —un paper amb poca llum ho és— i el que la
   * distingeix d'una de buida és que la buida és **plana**: tots els píxels
   * valen el mateix. Amb contrast, passa per fosca que sigui.
   */
  function serveix(mitjana, variacio) {
    return !(mitjana < FOSCA && variacio < PLANA);
  }

  /**
   * @param {File|Blob} fitxer
   * @returns {Promise<{ok: boolean, motiu: string, mitjana: number, variacio: number}>}
   *   `ok: false` només quan la imatge és fosca **i** uniforme.
   *   Si res es pot mesurar —navegador antic, fitxer estrany— torna `ok: true`:
   *   val més deixar passar una foto dubtosa que barrar-ne una de bona.
   */
  function mira(fitxer) {
    return new Promise(function (resol) {
      var passa = function (motiu, m, v) { resol({ ok: true, motiu: motiu || '', mitjana: m || 0, variacio: v || 0 }); };
      if (!fitxer || !global.FileReader || !global.document) return passa('no-es-pot-mirar');

      if (!global.Image) return passa('no-es-pot-mirar');
      var img = new global.Image();
      var url = global.URL && global.URL.createObjectURL ? global.URL.createObjectURL(fitxer) : null;
      if (!url) return passa('no-es-pot-mirar');

      img.onerror = function () { global.URL.revokeObjectURL(url); passa('no-es-pot-llegir'); };
      img.onload = function () {
        global.URL.revokeObjectURL(url);
        try {
          var c = global.document.createElement('canvas');
          c.width = COSTAT; c.height = COSTAT;
          var ctx = c.getContext('2d');
          if (!ctx) return passa('no-es-pot-mirar');
          ctx.drawImage(img, 0, 0, COSTAT, COSTAT);
          var d = ctx.getImageData(0, 0, COSTAT, COSTAT).data;

          var n = 0, suma = 0, sumaQ = 0;
          for (var i = 0; i < d.length; i += 4) {
            // Luminància aproximada: l'ull no pesa igual els tres canals.
            var l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
            suma += l; sumaQ += l * l; n++;
          }
          var mitjana = suma / n;
          var variacio = Math.sqrt(Math.max(0, sumaQ / n - mitjana * mitjana));

          var ok = serveix(mitjana, variacio);
          return resol({ ok: ok, motiu: ok ? '' : 'buida', mitjana: mitjana, variacio: variacio });
        } catch (e) {
          // Un canvas «tacat» o qualsevol altra cosa: es deixa passar.
          return passa('no-es-pot-mirar');
        }
      };
      img.src = url;
    });
  }

  /** El que se li diu a qui ha fet una foto que no té res a dins. */
  var QUE_FER = 'Aquesta foto ha sortit negra. Sol passar quan el navegador no té '
    + 'permís per fer servir la càmera: a l\'iPhone es dona a Ajustos → Safari → Càmera, '
    + 'i a Android mantenint premuda l\'adreça → Permisos. També pots triar una foto '
    + 'de la galeria.';

  global.Foto = { mira: mira, serveix: serveix, QUE_FER: QUE_FER, FOSCA: FOSCA, PLANA: PLANA };
})(window);

// Com es llegeix l'estat del rang, en un sol lloc (F50).
//
// La barra i la frase de sota es pintaven a `app.js`, a `mobile.html` i a
// `profile.html`, cadascuna amb la seva còpia. És exactament la forma que va
// fer que el bug de F17 existís dues vegades, i el cas de sota —el marge que
// et protegeix— s'hauria hagut d'arreglar a tres llocs.
//
// El cas que amaga la trampa: el marge anti-io-io manté el rang encara que els
// punts hagin caigut per sota del seu llindar. Llavors el progrés dins del tram
// és negatiu, la barra sortia buida i es llegia com si l'app estigués trencada.
// I a més es desaprofitava la tensió: dir «estàs 27 punts per sota de Manilles»
// aprieta molt més que una barra muda.

(function (global) {
  'use strict';

  /**
   * Què ha de mostrar la barra de rang i què ha de dir la frase de sota.
   *
   * @param {object} rank  L'objecte `rank` que torna el servidor.
   * @returns {{amplada: number, text: string, avis: boolean}}
   *   `amplada` en tant per cent, `text` la frase, i `avis` si el marge
   *   t'està protegint (per si la vista ho vol destacar).
   */
  function seguentPas(rank) {
    if (!rank || !rank.rang) return { amplada: 0, text: '', avis: false };

    if (rank.sotaLlindar) {
      const s = rank.sotaLlindar;
      return {
        amplada: 0,
        avis: true,
        text: s.anterior
          ? 'Estàs ' + s.perSota + ' punts per sota de ' + rank.rang.nom
            + '. Si en perds ' + s.perPerdre + ' més, baixes a ' + s.anterior + '.'
          : 'Estàs ' + s.perSota + ' punts per sota de ' + rank.rang.nom + '.',
      };
    }

    if (rank.seguent) {
      return {
        amplada: Math.max(0, Math.min(100, rank.seguent.progres)),
        avis: false,
        text: 'Et falten ' + rank.seguent.falten + ' punts per a ' + rank.seguent.nom + '.',
      };
    }

    return { amplada: 100, avis: false, text: 'Has coronat el castell. No hi ha res més amunt.' };
  }

  global.Rang = { seguentPas };
})(window);

// Que una tirallonga de paraules no escrites no tapi els errors que ensenyen
// alguna cosa.
//
// El cas que ho va destapar: un dictat de 26 paraules del qual només se'n van
// escriure 8. El resultat eren **18 fitxes seguides** dient «Aquesta paraula no
// s'ha escrit», i enmig hi quedaven enterrats els cinc errors de veritat —una
// majúscula, dues d'ortografia, un diacrític i una b/v—, que són els únics que
// es poden estudiar.
//
// Deixar de dictar a mitges no són divuit errors independents: és una sola
// cosa que ha passat. Aquí s'ajunten per ensenyar-les, **sense tocar el
// compte**: els errors segueixen sent els que són i l'escala i els punts no es
// mouen. Si algun dia es decideix que abandonar un dictat no ha de puntuar com
// vint faltes, això és una altra decisió i es pren a part.
//
// Una o dues paraules soltes NO s'ajunten: deixar-se una paraula sí que és un
// error concret i val la pena veure quina.
(function () {
  var MINIM = 3;

  function esOmesa(e) {
    return e && e.userWrote === null && e.original !== null;
  }

  /**
   * @param {Array} llista  Els errors, en l'ordre del text.
   * @returns {Array} Trossos: `{ omesa: false, err }` o
   *   `{ omesa: true, quants, primera, ultima }`.
   */
  function agrupa(llista, minim) {
    var cap = minim || MINIM;
    var errors = llista || [];
    var fora = [];
    var i = 0;
    while (i < errors.length) {
      if (!esOmesa(errors[i])) { fora.push({ omesa: false, err: errors[i] }); i++; continue; }
      // Fins on arriba la tirallonga: han de ser omissions i han d'anar
      // seguides al text, no només a la llista.
      var j = i;
      while (j + 1 < errors.length && esOmesa(errors[j + 1])
        && errors[j + 1].position === errors[j].position + (errors[j].span || 1)) j++;

      var quants = j - i + 1;
      if (quants < cap) {
        for (var k = i; k <= j; k++) fora.push({ omesa: false, err: errors[k] });
      } else {
        fora.push({
          omesa: true,
          quants: quants,
          primera: errors[i].original,
          ultima: errors[j].original,
        });
      }
      i = j + 1;
    }
    return fora;
  }

  /** El text de la fitxa ajuntada. */
  function textOmeses(tros) {
    return {
      tipus: 'Paraules no escrites',
      paraules: tros.quants + ' paraules seguides',
      explicacio: 'Del dictat, des de «' + tros.primera + '» fins a «' + tros.ultima + '».',
    };
  }

  window.Errors = { agrupa: agrupa, textOmeses: textOmeses, MINIM: MINIM };
}());

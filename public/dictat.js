/* ─────────────────────────────────────────────────────────
   Motor del dictat — compartit per la vista d'escriptori i la de mòbil.

   Per què és un fitxer a part: fins ara aquesta lògica estava copiada a
   `app.js` i a dins de `mobile.html`, i per això el mateix error de l'índex
   de la frase (F17) hi era dues vegades i s'havia d'arreglar dos cops. Aquí
   hi ha una sola còpia; les vistes només hi connecten botons.

   No toca el DOM: rep frases i avisa dels canvis d'estat per callback.
   ───────────────────────────────────────────────────────── */

(function (global) {
  'use strict';

  // Quant es triga a escriure una frase. La pausa fixa de 5 s d'abans donava
  // el mateix temps a una frase de 6 paraules que a una de 26: al nivell
  // avançat, on la mitjana és de 16,8 paraules, calien uns 40 s i se'n donaven
  // 5. Ara la pausa surt de la frase, i a sobre es pot escurçar o allargar.
  var MS_PER_PARAULA = 2200;      // ~27 paraules per minut, ritme d'aprenent
  var PAUSA_MINIMA_MS = 4000;
  var PAUSA_MAXIMA_MS = 60000;
  var ALLARGA_S = 10;
  var VELOCITAT_PER_DEFECTE = 0.75;

  // El banc té 69 signes interns que la veu no diu mai i que, tot i així,
  // puntuaven. O es dicten, o no compten.
  var NOMS_PUNTUACIO = [
    [/«/g, ' cometes obertes '],
    [/»/g, ' cometes tancades '],
    [/…/g, ' punts suspensius '],
    [/\.\.\./g, ' punts suspensius '],
    [/;/g, ' punt i coma '],
    [/:/g, ' dos punts '],
    [/,/g, ' coma '],
    [/\?/g, ' interrogant '],
    [/!/g, ' exclamació '],
    [/\./g, ' punt '],
  ];

  function ambPuntuacio(frase) {
    var dit = frase;
    for (var i = 0; i < NOMS_PUNTUACIO.length; i++) {
      dit = dit.replace(NOMS_PUNTUACIO[i][0], NOMS_PUNTUACIO[i][1]);
    }
    return dit.replace(/\s+/g, ' ').trim();
  }

  function veusCatalanes() {
    if (!global.speechSynthesis) return [];
    return global.speechSynthesis.getVoices().filter(function (v) {
      return v.lang && v.lang.toLowerCase().indexOf('ca') === 0;
    });
  }

  // Si no n'hi ha cap de catalana es cau a una castellana, com abans — però
  // ara la vista ho ha avisat primer (F21): un dictat en català llegit amb
  // fonètica castellana ensenya una pronúncia equivocada del que s'està
  // aprenent a escriure, i qui el fa no té manera d'assabentar-se'n.
  function triaVeu() {
    var catalanes = veusCatalanes();
    if (catalanes.length) return catalanes[0];
    var totes = global.speechSynthesis ? global.speechSynthesis.getVoices() : [];
    return totes.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf('es') === 0; })[0] || null;
  }

  function pausaDeFrase(frase) {
    var paraules = frase.replace(/\s+/g, ' ').trim().split(' ').length;
    return Math.min(PAUSA_MAXIMA_MS, Math.max(PAUSA_MINIMA_MS, paraules * MS_PER_PARAULA));
  }

  function MotorDictat(onCanvi) {
    this.onCanvi = onCanvi || function () {};
    this.frases = [];
    this.sonant = 0;        // la frase que sona ARA
    this.estat = 'aturat';  // aturat | llegint | pausa | pausat | fet
    this.segons = 0;
    this.tic = null;
    this.torn = 0;          // per ignorar l'onend d'una veu ja cancel·lada
    this.reprenDes = 'llegint';
    this.pendent = null;      // què tocava fer si la frase s'acaba mentre està en pausa
    this.velocitat = VELOCITAT_PER_DEFECTE;
    this.dictaPuntuacio = false;
  }

  MotorDictat.prototype._avisa = function () {
    this.onCanvi({
      estat: this.estat,
      frase: this.sonant,
      total: this.frases.length,
      segons: this.segons,
      progres: this.frases.length ? Math.round((this.estat === 'fet' ? 1 : this.sonant / this.frases.length) * 100) : 0,
    });
  };

  MotorDictat.prototype._aturaTic = function () {
    if (this.tic) { clearInterval(this.tic); this.tic = null; }
  };

  MotorDictat.prototype._parla = function (text, quanAcabi) {
    var motor = this;
    var torn = ++this.torn;
    if (!global.speechSynthesis) { quanAcabi(); return; }
    // `pause()` marca el sintetitzador sencer, no una locució, i `cancel()` NO
    // el desmarca. Sense aquest `resume()`, qualsevol dictat que s'hagi pausat
    // un cop es queda mut per sempre: la veu no sona, `onend` no arriba mai i
    // la pantalla es queda clavada a «Llegint frase 1 de N».
    global.speechSynthesis.cancel();
    global.speechSynthesis.resume();
    var utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ca-ES';
    utter.rate = this.velocitat;
    var veu = triaVeu();
    if (veu) utter.voice = veu;
    // Si mentrestant s'ha saltat o aturat, aquest onend ja no mana.
    var fi = function () { if (torn === motor.torn) quanAcabi(); };
    utter.onend = fi;
    utter.onerror = fi;
    global.speechSynthesis.speak(utter);
  };

  MotorDictat.prototype.carrega = function (frases) {
    this.atura();
    this.frases = frases || [];
    this.sonant = 0;
    this.estat = 'aturat';
    this.segons = 0;
    this._avisa();
  };

  MotorDictat.prototype.atura = function () {
    this._aturaTic();
    this.torn++;
    this.pendent = null;
    if (global.speechSynthesis) {
      global.speechSynthesis.cancel();
      global.speechSynthesis.resume();
    }
    if (this.estat !== 'fet') this.estat = 'aturat';
  };

  MotorDictat.prototype.inicia = function () {
    if (!this.frases.length) return;
    this.sonant = 0;
    this._llegeix();
  };

  MotorDictat.prototype._llegeix = function () {
    var motor = this;
    if (this.sonant >= this.frases.length) return this._acaba();

    this.estat = 'llegint';
    this._avisa();

    var frase = this.frases[this.sonant];
    var idx = this.sonant;
    this._parla(this.dictaPuntuacio ? ambPuntuacio(frase) : frase, function () {
      // Si s'ha premut «Pausar» als últims instants de la frase, aquest
      // `onend` arriba amb el dictat ja pausat. Sense apuntar-ho, en reprendre
      // no hi hauria ni locució ni compte enrere i el dictat quedaria encallat.
      if (motor.estat === 'pausat') {
        motor.pendent = idx + 1 >= motor.frases.length
          ? { tipus: 'acabar' }
          : { tipus: 'pausa', ms: pausaDeFrase(frase) };
        return;
      }
      if (motor.estat !== 'llegint') return;
      if (idx + 1 >= motor.frases.length) return motor._acaba();
      motor._pausa(pausaDeFrase(frase));
    });
  };

  MotorDictat.prototype._pausa = function (ms) {
    var motor = this;
    this.estat = 'pausa';
    this.segons = Math.round(ms / 1000);
    this._avisa();
    this._aturaTic();
    this.tic = setInterval(function () {
      motor.segons -= 1;
      if (motor.segons <= 0) { motor._aturaTic(); motor.seguent(); return; }
      motor._avisa();
    }, 1000);
  };

  MotorDictat.prototype._acaba = function () {
    this._aturaTic();
    this.estat = 'fet';
    this.sonant = this.frases.length;
    this._avisa();
  };

  MotorDictat.prototype.seguent = function () {
    if (this.estat === 'fet' || this.estat === 'aturat') return;
    this.pendent = null;
    this._aturaTic();
    this.torn++;
    if (global.speechSynthesis) global.speechSynthesis.cancel();
    this.sonant += 1;
    this._llegeix();
  };

  // Repeteix la frase que sona ARA. Abans es feia servir l'índex menys u, que
  // és la d'abans, perquè l'índex no avançava fins després de la pausa: qui
  // es perdia i premia "Repetir frase" sentia la frase equivocada.
  MotorDictat.prototype.repeteix = function () {
    var motor = this;
    if (!this.frases.length) return;
    var idx = Math.min(this.sonant, this.frases.length - 1);
    var tornaAPausa = this.estat === 'pausa' || this.estat === 'pausat';
    var segonsQueQuedaven = this.segons;
    this.pendent = null;
    this._aturaTic();
    this.sonant = idx;
    this.estat = 'llegint';
    this._avisa();
    var frase = this.frases[idx];
    this._parla(this.dictaPuntuacio ? ambPuntuacio(frase) : frase, function () {
      if (motor.estat !== 'llegint') return;
      if (tornaAPausa) motor._pausa(Math.max(segonsQueQuedaven, 5) * 1000);
      else if (idx + 1 >= motor.frases.length) motor._acaba();
      else motor._pausa(pausaDeFrase(frase));
    });
  };

  MotorDictat.prototype.alternaPausa = function () {
    if (this.estat === 'pausat') return this.repren();
    return this.pausa();
  };

  MotorDictat.prototype.pausa = function () {
    if (this.estat !== 'llegint' && this.estat !== 'pausa') return;
    this.reprenDes = this.estat;
    this._aturaTic();
    if (this.estat === 'llegint' && global.speechSynthesis) global.speechSynthesis.pause();
    this.estat = 'pausat';
    this._avisa();
  };

  MotorDictat.prototype.repren = function () {
    if (this.estat !== 'pausat') return;
    // La frase va acabar mentre estava pausat: no hi ha res a reprendre, el
    // que toca és el temps per escriure (o donar el dictat per acabat).
    if (this.pendent) {
      var feina = this.pendent;
      this.pendent = null;
      if (global.speechSynthesis) global.speechSynthesis.resume();
      if (feina.tipus === 'acabar') return this._acaba();
      return this._pausa(feina.ms);
    }
    if (this.reprenDes === 'llegint') {
      this.estat = 'llegint';
      this._avisa();
      if (global.speechSynthesis) global.speechSynthesis.resume();
    } else {
      this._pausa(Math.max(this.segons, 3) * 1000);
    }
  };

  MotorDictat.prototype.allarga = function () {
    if (this.estat !== 'pausa') return;
    this.segons += ALLARGA_S;
    this._avisa();
  };

  global.Dictat = {
    MotorDictat: MotorDictat,
    veusCatalanes: veusCatalanes,
    ambPuntuacio: ambPuntuacio,
    pausaDeFrase: pausaDeFrase,
    VELOCITAT_PER_DEFECTE: VELOCITAT_PER_DEFECTE,
    ALLARGA_S: ALLARGA_S,
  };
}(window));

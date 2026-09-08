// Entrar, donar-se d'alta i recuperar la contrasenya, contra Firebase.
//
// ── Per què no hi ha el SDK de Firebase ──────────────────────
// Perquè no fa falta. L'ID token es fa servir **una sola vegada**: es canvia
// per la sessió del servidor i no torna a viatjar mai. El que el SDK aporta
// —refrescar tokens, mantenir l'estat entre pestanyes— aquí no serveix de res,
// i costaria 300 kB i obrir la CSP a un CDN.
//
// El que sí que fa falta és la llista de dominis autoritzats de Firebase, que
// és el que protegeix la clau pública. Sense el domini a la llista, aquestes
// crides es rebutgen.
(function (global) {
  'use strict';

  var API = 'https://identitytoolkit.googleapis.com/v1/accounts:';
  var config = null;

  async function conf() {
    if (config) return config;
    var res = await fetch('/api/auth-config');
    config = await res.json();
    return config;
  }

  /**
   * El que es diu quan Firebase respon amb un codi.
   *
   * **A l'entrada no es diu mai si el correu existeix.** Firebase ja ho ajunta
   * tot en un sol codi a posta: dir «aquest correu no existeix» deixa que algú
   * provi adreces per saber qui té compte. La regla de no renyar val igual —
   * qui s'equivoca de contrasenya no ha fet res mal fet.
   */
  var DIU = {
    EMAIL_EXISTS: 'Aquest correu ja té compte. Prova d\'entrar-hi.',
    INVALID_LOGIN_CREDENTIALS: 'El correu o la contrasenya no són correctes.',
    EMAIL_NOT_FOUND: 'El correu o la contrasenya no són correctes.',
    INVALID_PASSWORD: 'El correu o la contrasenya no són correctes.',
    INVALID_EMAIL: 'Aquest correu no té bona pinta. Revisa\'l.',
    USER_DISABLED: 'Aquest compte està desactivat.',
    TOO_MANY_ATTEMPTS_TRY_LATER: 'Hi ha hagut molts intents. Espera una estona i torna-ho a provar.',
    OPERATION_NOT_ALLOWED: 'Aquesta manera d\'entrar no està activada.',
  };

  function elQueDiu(codi) {
    if (!codi) return 'No s\'ha pogut completar. Torna a provar.';
    if (codi.indexOf('WEAK_PASSWORD') === 0) return 'La contrasenya ha de tenir 6 caràcters com a mínim.';
    return DIU[codi] || 'No s\'ha pogut completar. Torna a provar.';
  }

  async function crida(quin, cos) {
    var c = await conf();
    if (!c.apiKey) throw new Error('sense-configuracio');
    var res = await fetch(API + quin + '?key=' + encodeURIComponent(c.apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cos),
    });
    var dades = await res.json();
    if (!res.ok) {
      var e = new Error(elQueDiu(dades && dades.error && dades.error.message));
      e.codi = dades && dades.error && dades.error.message;
      throw e;
    }
    return dades;
  }

  var alta = (email, clau) => crida('signUp', { email: email, password: clau, returnSecureToken: true });
  var entra = (email, clau) => crida('signInWithPassword', { email: email, password: clau, returnSecureToken: true });
  var recupera = (email) => crida('sendOobCode', { requestType: 'PASSWORD_RESET', email: email });

  /**
   * Esborrar el compte de Firebase.
   *
   * Demana un ID token **fresc**, i per això qui ho crida ha de tornar a entrar
   * amb la contrasenya. No és una molèstia gratuïta: és l'única acció de l'app
   * que no es pot desfer, i tornar a demanar la clau evita que se l'endugui per
   * davant qui hagi trobat una sessió oberta.
   */
  var esborraDeFirebase = (idToken) => crida('delete', { idToken: idToken });

  /** Canvia l'ID token per la sessió del servidor. A partir d'aquí, cookie. */
  async function obreSessio(idToken) {
    var res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: idToken }),
    });
    var dades = await res.json();
    if (!res.ok) throw new Error(dades.error || 'La sessió no s\'ha pogut obrir.');
    return dades;
  }

  global.Identitat = { alta, entra, recupera, obreSessio, esborraDeFirebase, elQueDiu, conf };
})(window);

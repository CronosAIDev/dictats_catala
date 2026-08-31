// OAuth 2.0 de Google, a mà i sense dependències.
//
// Calcat de `aicamper_app/src/lib/google_oauth.js` per decisió d'Óscar (#16).
// Només implementa el flux d'"authorization code" per fer login: es porta
// l'usuari a Google, Google torna un `code`, es canvia per un `id_token` i
// d'allà surt qui és. Cap SDK: dues peticions HTTP i descodificar un JWT.
//
// Per què no es verifica la signatura de l'id_token: arriba per una connexió
// TLS que obrim NOSALTRES contra l'endpoint de tokens de Google, autenticada
// amb el nostre `client_secret`. Aquesta connexió és l'àncora de confiança, i
// és la recomanació del mateix Google per al flux de servidor. El que sí que es
// comprova és que el token és per a aquesta app (`aud`) i que el correu està
// verificat.
//
// Per què importa aquí: amb Google, els 20 testers docents que Play demana
// entren amb el seu compte i prou. No cal crear-los comptes ni administrar
// contrasenyes de ningú — el bloqueig de la fase de proves no es gestiona,
// desapareix.

const crypto = require('crypto');

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

// L'intercanvi de codi no es pot quedar penjat: un login que no respon en 10
// segons és un login fallit.
const TIMEOUT_MS = 10000;

function config() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  };
}

// Google és opcional. Sense les tres variables, el login per contrasenya
// funciona igual i el botó no s'ensenya: no trenca el desplegament de qui no
// les tingui.
function estaConfigurat() {
  const c = config();
  return !!(c.clientId && c.clientSecret && c.redirectUri);
}

// L'`state` és l'anti-CSRF: es desa a la sessió abans d'anar a Google i es
// compara en tornar. Sense ell, un tercer podria injectar el seu propi `code` a
// la tornada i fer-nos iniciar sessió amb un compte que no és el de l'usuari.
function nouEstat() {
  return crypto.randomBytes(16).toString('hex');
}

function urlAutoritzacio(estat) {
  const c = config();
  const q = new URLSearchParams({
    client_id: c.clientId,
    redirect_uri: c.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: estat,
    // `select_account`: en un mòbil compartit —i Dictats és una app de mòbil—
    // entrar directament amb l'últim compte de Google fet servir és entrar com
    // una altra persona sense adonar-se'n.
    prompt: 'select_account',
  });
  return `${AUTH_URL}?${q.toString()}`;
}

// Canvia el `code` per la identitat de l'usuari.
// Torna { googleId, email, nom } o llança un Error.
async function intercanviaCodi(code) {
  const c = config();
  const cos = new URLSearchParams({
    code,
    client_id: c.clientId,
    client_secret: c.clientSecret,
    redirect_uri: c.redirectUri,
    grant_type: 'authorization_code',
  });

  const ctrl = new AbortController();
  const rellotge = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: cos.toString(),
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new Error(`No s'ha pogut contactar amb Google: ${e.message}`);
  } finally {
    clearTimeout(rellotge);
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Google ha rebutjat l'intercanvi de codi (${res.status}): ${txt.slice(0, 200)}`);
  }

  const dades = await res.json();
  if (!dades.id_token) throw new Error('Google no ha tornat cap id_token');

  const claims = descodificaIdToken(dades.id_token);
  if (claims.aud !== c.clientId) throw new Error("L'id_token no és per a aquesta aplicació");
  if (!claims.email) throw new Error('Google no ha tornat cap correu');
  // `email_verified` ve com a booleà o com la cadena "true" segons el flux.
  if (claims.email_verified === false || claims.email_verified === 'false') {
    throw new Error('El correu de Google no està verificat');
  }

  return {
    googleId: claims.sub,
    email: String(claims.email).trim().toLowerCase(),
    nom: claims.given_name || claims.name || null,
  };
}

// Un JWT són tres parts separades per punts. Només interessa el payload (la del
// mig), en base64url. La signatura no es verifica a posta (veure capçalera).
function descodificaIdToken(jwt) {
  const parts = String(jwt).split('.');
  if (parts.length !== 3) throw new Error("id_token amb un format inesperat");
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch (e) {
    throw new Error(`no s'ha pogut llegir l'id_token: ${e.message}`);
  }
}

module.exports = { estaConfigurat, nouEstat, urlAutoritzacio, intercanviaCodi, descodificaIdToken };

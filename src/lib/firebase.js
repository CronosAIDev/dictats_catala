// Verificació de la identitat contra Firebase (Identity Platform).
//
// ── Què fa Firebase i què fem nosaltres ──────────────────────
// Firebase contesta **qui ets** i emet un ID token signat. Nosaltres el
// comprovem **al servidor** i, si val, obrim la sessió de sempre. A partir
// d'aquí l'app funciona com abans: cookie de sessió i prou.
//
// L'ID token es fa servir **una sola vegada**, en entrar. No es desa, no es
// refresca i no torna a viatjar. És la raó per la qual el client tampoc
// necessita el SDK de Firebase: amb dues crides REST n'hi ha prou.
//
// ── Per què `jose` i no `firebase-admin` ─────────────────────
// D'aquest camí només se n'usa una funció: comprovar un JWT. `firebase-admin`
// porta 255 paquets —entre ells `@google-cloud/storage`, que aquí no s'obre
// mai— i **hi entraven 6 vulnerabilitats moderades transitives** en codi que
// aquesta app no executa. Aquest projecte ja va portar `npm audit` a zero una
// vegada (F13) i val la pena mantenir-ho.
//
// `jose` té **zero dependències** i la criptografia segueix sense ser nostra,
// que és l'únic que importava: verificar un JWT RS256 a mà —signatura, `kid`,
// rotació de claus— és de les poques coses que no s'escriuen a casa. Aquí
// només es DECLAREN les tres condicions (emissor, destinatari i algorisme);
// comprovar-les és feina de la llibreria.
//
// Comprovat abans de fer el canvi: amb tokens reals, aquesta funció i
// `firebase-admin` donen el mateix `uid`, i rebutgen els mateixos casos.
//
// ── Cap credencial ──────────────────────────────────────────
// Les claus amb què es comprova la signatura són **públiques**. En aquest camí
// no hi ha cap fitxer de servei ni cap secret.

const { createRemoteJWKSet, jwtVerify } = require('jose');

const PROJECTE = process.env.FIREBASE_PROJECT_ID || 'kairos-family-app';

// Les claus públiques de Google, en format JWKS. `jose` se les guarda i les
// torna a demanar sola quan apareix un `kid` que no coneix, que és el que passa
// cada vegada que Google les rota.
const CLAUS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

/**
 * Comprova un ID token i torna qui és.
 *
 * No llança mai: un token dolent no és un error del servidor, és algú que no
 * entra. Qui crida això només ha de mirar si torna `null`.
 *
 * @param {string} idToken
 * @returns {Promise<{uid: string, email: string|null, emailVerificat: boolean}|null>}
 */
async function qui(idToken) {
  if (!idToken || typeof idToken !== 'string') return null;
  try {
    const { payload } = await jwtVerify(idToken, CLAUS, {
      // Les tres condicions que fan que un token sigui NOSTRE i no d'una altra
      // app: qui l'ha emès, per a qui és, i amb quin algorisme. Sense `audience`
      // valdria un token de qualsevol altre projecte de Firebase del món.
      issuer: 'https://securetoken.google.com/' + PROJECTE,
      audience: PROJECTE,
      algorithms: ['RS256'],
    });
    // `exp` i `iat` els mira `jwtVerify`. `sub` no: és el `uid` i ha de ser-hi.
    if (!payload.sub || typeof payload.sub !== 'string') return null;
    return {
      uid: payload.sub,
      email: payload.email || null,
      emailVerificat: !!payload.email_verified,
    };
  } catch (err) {
    // A nivell d'`info`: un token caducat és el cas normal de qui torna demà.
    console.log('Token rebutjat:', err.code || err.message);
    return null;
  }
}

/** El projecte contra el qual es verifica, per poder-ho dir a `/api/auth-config`. */
const projecte = () => PROJECTE;

module.exports = { qui, projecte };

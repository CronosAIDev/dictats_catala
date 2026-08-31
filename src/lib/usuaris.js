// Identitat pròpia de Dictats (Fase 0 del gameplan de Play, Issue #16, F52).
//
// Fins ara, per entrar calia existir a `BrandWaiUserProfile` —la taula de
// clients de FeedScale/Trawlingweb— i les contrasenyes hi vivien EN TEXT PLA.
// Mentre l'app era una web darrere d'un login intern això es podia defensar;
// publicar-la a Play, no: qui se la descarregui no té compte ni manera de
// fer-se'n un, i declarar text pla al formulari de Data Safety és motiu de
// retirada.
//
// Óscar va decidir el 30-08 l'opció A: taula pròpia, bcrypt i Google OAuth,
// calcant `aicamper_app`. Aquest fitxer és la traducció d'aquell patró.
//
// El perfil que es desa a la sessió manté la forma `{ email, first_name }` que
// ja feia servir tota l'app, perquè el progrés de SQLite està indexat per correu
// i no s'ha de tocar res més.

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const RONDES = 12;
const MINIM_CONTRASENYA = 8;

function normalitza(email) {
  return (email || '').trim().toLowerCase();
}

// El perfil que veu la resta de l'app. `nombre` és el nom de columna que ve del
// patró d'aicamper; `first_name` és el que la interfície de Dictats ja llegia.
function perfil(fila) {
  if (!fila) return null;
  return { id: fila.id, email: fila.email, first_name: fila.nombre || null };
}

/**
 * Construeix el mòdul d'usuaris sobre uns helpers de base de dades.
 * Es passa per fora perquè les proves puguin donar-ne uns de falsos i comprovar
 * la lògica —que és on hi ha les decisions— sense necessitar cap MySQL.
 */
function crea(db) {
  const { get, run, P } = db;
  const T = `${P}usuarios`;

  async function perEmailIContrasenya(email, contrasenya) {
    const u = await get(
      `SELECT id, email, password_hash, nombre FROM ${T} WHERE email = ? LIMIT 1`,
      [normalitza(email)]
    );
    if (!u) {
      // Es compara igualment contra un hash fals, existeixi l'usuari o no: si no,
      // el temps de resposta delata quins correus estan donats d'alta.
      await bcrypt.compare(contrasenya || '', '$2a$12$' + 'x'.repeat(53));
      return null;
    }
    const ok = await bcrypt.compare(contrasenya || '', u.password_hash);
    return ok ? perfil(u) : null;
  }

  async function perEmail(email) {
    return perfil(await get(`SELECT id, email, nombre FROM ${T} WHERE email = ? LIMIT 1`, [normalitza(email)]));
  }

  async function crear({ email, contrasenya, nom }) {
    const correu = normalitza(email);
    if (!correu || !contrasenya) throw new Error('Cal un correu i una contrasenya');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correu)) throw new Error('El correu no té bona pinta');
    if (contrasenya.length < MINIM_CONTRASENYA) {
      throw new Error(`La contrasenya ha de tenir com a mínim ${MINIM_CONTRASENYA} caràcters`);
    }
    if (await perEmail(correu)) throw new Error('Ja hi ha un compte amb aquest correu');

    const hash = await bcrypt.hash(contrasenya, RONDES);
    const r = await run(
      `INSERT INTO ${T} (email, password_hash, nombre) VALUES (?, ?, ?)`,
      [correu, hash, nom || null]
    );
    return { id: r.insertId, email: correu, first_name: nom || null };
  }

  async function perGoogleId(googleId) {
    return perfil(await get(`SELECT id, email, nombre FROM ${T} WHERE google_id = ? LIMIT 1`, [googleId]));
  }

  // Qui entra per Google. La regla de vinculació evita el fallo que més fa mal:
  // duplicar una persona en dos comptes i que cadascun vegi la meitat dels seus
  // dictats.
  //
  //   1. Ja hi ha un compte amb aquest google_id? És ell, endavant.
  //   2. N'hi ha un amb aquest correu (el de contrasenya)? És la MATEIXA
  //      persona: se li enganxa el google_id a aquella fila.
  //   3. Si no, és algú nou.
  async function resolGoogle({ googleId, email, nom }) {
    if (!googleId || !email) throw new Error('Falten dades de Google');
    const correu = normalitza(email);

    const jaVinculat = await perGoogleId(googleId);
    if (jaVinculat) return { perfil: jaVinculat, nou: false };

    const perCorreu = await get(`SELECT id, email, nombre FROM ${T} WHERE email = ? LIMIT 1`, [correu]);
    if (perCorreu) {
      await run(`UPDATE ${T} SET google_id = ? WHERE id = ?`, [googleId, perCorreu.id]);
      return { perfil: perfil(perCorreu), nou: false };
    }

    // Alta per Google: `password_hash` és NOT NULL i no es toca aquest
    // invariant, així que s'hi desa el hash d'un secret aleatori que ningú té.
    // El login per contrasenya no hi casarà mai; si algun dia en vol una, la
    // posa i deixa de ser aleatòria.
    const hashInutil = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), RONDES);
    const r = await run(
      `INSERT INTO ${T} (email, password_hash, nombre, google_id) VALUES (?, ?, ?, ?)`,
      [correu, hashInutil, nom || null, googleId]
    );
    return { perfil: { id: r.insertId, email: correu, first_name: nom || null }, nou: true };
  }

  async function canviaContrasenya(email, contrasenya) {
    if (!contrasenya || contrasenya.length < MINIM_CONTRASENYA) {
      throw new Error(`La contrasenya ha de tenir com a mínim ${MINIM_CONTRASENYA} caràcters`);
    }
    const hash = await bcrypt.hash(contrasenya, RONDES);
    const r = await run(`UPDATE ${T} SET password_hash = ? WHERE email = ?`, [hash, normalitza(email)]);
    if (!r.affectedRows) throw new Error(`No existeix cap usuari ${normalitza(email)}`);
    return true;
  }

  // Esborrar el compte NO és opcional: Google Play exigeix que tota app que
  // deixi crear compte des de dins en deixi demanar l'esborrat, per dues vies
  // —una dins de l'app i una URL web— des de l'abril de 2024. Avui Dictats en
  // quedava fora perquè els comptes es creaven a `BrandWaiUserProfile`, fora de
  // l'app; amb identitat pròpia hi entra de ple.
  //
  // El progrés viu a SQLite, en una altra base, així que no el pot arrossegar
  // cap `ON DELETE CASCADE`: l'esborra qui crida aquesta funció.
  async function esborraCompte(email) {
    const r = await run(`DELETE FROM ${T} WHERE email = ?`, [normalitza(email)]);
    return r.affectedRows > 0;
  }

  return {
    perEmailIContrasenya, perEmail, crear, perGoogleId, resolGoogle,
    canviaContrasenya, esborraCompte, normalitza, MINIM_CONTRASENYA,
  };
}

module.exports = { crea, normalitza, perfil, MINIM_CONTRASENYA };

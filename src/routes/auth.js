const express = require('express');
const rateLimit = require('express-rate-limit');
const dbMysql = require('../lib/db-mysql');
const dbLocal = require('../lib/db');
const { crea } = require('../lib/usuaris');
const google = require('../lib/googleOAuth');

const router = express.Router();
const usuaris = crea(dbMysql);

const limitLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Massa intents. Torna a provar en 15 minuts.' },
});

// L'alta és més cara que el login (un hash de bcrypt amb 12 rondes) i és la
// porta per on entraria qui volgués omplir la taula, així que va més justa.
const limitAlta = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Massa comptes creats des d\'aquí. Torna a provar d\'aquí una hora.' },
});

function entra(req, perfil) {
  req.session.profile = { email: perfil.email, first_name: perfil.first_name };
}

// ── Login i alta ─────────────────────────────────────────────

router.post('/login', limitLogin, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Cal un correu i una contrasenya' });
  try {
    const perfil = await usuaris.perEmailIContrasenya(email, password);
    if (!perfil) return res.status(401).json({ error: 'Correu o contrasenya incorrectes' });
    entra(req, perfil);
    res.json({ ok: true, email: perfil.email, first_name: perfil.first_name });
  } catch (err) {
    console.error('login error:', err.message);
    res.status(500).json({ error: 'Error intern. Torna a provar.' });
  }
});

router.post('/register', limitAlta, async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const perfil = await usuaris.crear({ email, contrasenya: password, nom: name });
    entra(req, perfil);
    res.json({ ok: true, email: perfil.email, first_name: perfil.first_name });
  } catch (err) {
    // Els missatges de `crear()` estan escrits per llegir-los l'usuari (correu
    // repetit, contrasenya curta); qualsevol altra cosa no s'ensenya.
    const esperat = /correu|contrasenya|compte/i.test(err.message);
    if (!esperat) console.error('register error:', err.message);
    res.status(esperat ? 400 : 500).json({ error: esperat ? err.message : 'Error intern. Torna a provar.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', (req, res) => {
  const p = req.session?.profile;
  if (!p) return res.status(401).json({ error: 'No autenticat' });
  res.json({ email: p.email, first_name: p.first_name, googleDisponible: google.estaConfigurat() });
});

// El login pregunta si ha d'ensenyar el botó de Google abans que ningú hagi
// entrat, així que això no pot anar darrere de `/me`.
router.get('/auth-options', (req, res) => {
  res.json({ google: google.estaConfigurat() });
});

// ── Esborrar el compte ───────────────────────────────────────
// Google Play ho exigeix des de l'abril de 2024 a tota app que deixi crear
// compte des de dins, i demana DUES vies: aquesta, dins de l'app, i una URL
// web (`/esborrar-compte`, servida des de public/).
//
// El progrés viu a SQLite i la identitat a MySQL: són dues bases, així que cap
// `ON DELETE CASCADE` no pot lligar-les i l'esborrat va en dos passos.
//
// L'ORDRE importa, i la primera versió el tenia al revés. Si s'esborra primer
// el progrés i després falla la identitat, l'usuari es queda sense els seus
// dictats, amb el compte viu i amb un missatge que li diu que no s'ha esborrat
// res: dades destruïdes, res complert i una mentida a sobre. Comprovat
// executant-ho, no raonant-ho.
//
// Primer la identitat, doncs. Si això falla, no s'ha tocat res i el missatge és
// veritat. Si passa i falla el progrés, el compte ja no existeix —que és el que
// Play exigeix— i queden unes files orfes lligades a un correu pel qual ja no
// pot entrar ningú: recuperable, i molt menys greu.
router.delete('/account', async (req, res) => {
  const perfil = req.session?.profile;
  if (!perfil) return res.status(401).json({ error: 'No autenticat' });

  try {
    await usuaris.esborraCompte(perfil.email);
  } catch (err) {
    console.error('esborrar compte (identitat):', err.message);
    return res.status(500).json({ error: 'No s\'ha pogut esborrar el compte. Escriu-nos i ho fem a mà.' });
  }

  try {
    const esborraLocal = dbLocal.transaction((email) => {
      dbLocal.prepare(
        'DELETE FROM user_errors WHERE progress_id IN (SELECT id FROM user_progress WHERE email = ?)'
      ).run(email);
      dbLocal.prepare('DELETE FROM user_progress WHERE email = ?').run(email);
      dbLocal.prepare('DELETE FROM user_texts WHERE email = ?').run(email);
    });
    esborraLocal(perfil.email);
  } catch (err) {
    // El compte ja no hi és, així que per a l'usuari l'esborrat s'ha fet. Queda
    // constància perquè algú pugui netejar les files que hagin quedat.
    console.error(`esborrar compte (progrés de ${perfil.email}): ${err.message}`);
  }

  req.session.destroy(() => res.json({ ok: true }));
});

// ── Google ───────────────────────────────────────────────────
// Van en un router propi muntat a `/auth`, i no a `/api`, perquè el
// `redirect_uri` que es registra a la credencial de GCP ha de ser una URL de
// navegació estable: `/auth/google/callback`.

const googleRouter = express.Router();

googleRouter.get('/google', (req, res) => {
  if (!google.estaConfigurat()) return res.redirect('/login?error=google-no-configurat');
  const estat = google.nouEstat();
  req.session.googleEstat = estat;
  res.redirect(google.urlAutoritzacio(estat));
});

googleRouter.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const esperat = req.session?.googleEstat;
  delete req.session?.googleEstat;

  if (error) return res.redirect('/login?error=google-cancellat');
  if (!code) return res.redirect('/login?error=google-sense-codi');
  // Sense aquesta comparació, un tercer podria injectar el seu propi `code` i
  // fer-nos iniciar sessió amb un compte que no és el de l'usuari.
  if (!esperat || state !== esperat) return res.redirect('/login?error=google-estat');

  try {
    const identitat = await google.intercanviaCodi(code);
    const { perfil } = await usuaris.resolGoogle(identitat);
    entra(req, perfil);
    res.redirect('/');
  } catch (err) {
    console.error('google callback:', err.message);
    res.redirect('/login?error=google-fallada');
  }
});

module.exports = { api: router, auth: googleRouter };

const express = require('express');
const rateLimit = require('express-rate-limit');
const firebase = require('../lib/firebase');
const db = require('../lib/db');

const router = express.Router();

// El límit es manté encara que ara la contrasenya la comprovi Firebase: aquí el
// que es frena és picar contra la verificació de tokens, no endevinar claus.
const limitEntrada = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Massa intents. Torna a provar en 15 minuts.' },
});

/**
 * La configuració pública del client.
 *
 * **No és cap secret i no cal amagar-la**: va al frontend per disseny i Firebase
 * no la protegeix amb cap clau, la protegeix amb la llista de dominis
 * autoritzats. Se serveix des d'aquí en comptes d'escriure-la a l'HTML perquè
 * així el mateix codi val en local i a producció canviant una variable.
 */
router.get('/auth-config', (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY || '',
    projectId: firebase.projecte(),
  });
});

/**
 * Canviar un ID token de Firebase per la sessió de sempre.
 *
 * El token es fa servir **una sola vegada, aquí**. No es desa ni torna a
 * viatjar: a partir d'aquest punt l'app funciona com sempre, amb la cookie.
 */
router.post('/session', limitEntrada, async (req, res) => {
  const { idToken } = req.body || {};
  const persona = await firebase.qui(idToken);
  if (!persona) return res.status(401).json({ error: 'La sessió no s\'ha pogut obrir. Torna a entrar.' });

  const ara = new Date().toISOString().slice(0, 19).replace('T', ' ');
  try {
    db.prepare(`
      INSERT INTO users (uid, email, last_seen_at) VALUES (?, ?, ?)
      ON CONFLICT (uid) DO UPDATE SET email = excluded.email, last_seen_at = excluded.last_seen_at
    `).run(persona.uid, persona.email, ara);
    // Qui ja tenia historial d'abans de Firebase el recupera aquí: les seves
    // files duien un `uid` provisional fet del correu i passen al de veritat.
    // És la promesa de la Fase 0, i es compleix la primera vegada que entra.
    db.adopta(persona.uid, persona.email);
  } catch (dbErr) {
    // Que no poder apuntar l'última visita no impedeixi entrar.
    console.error('DB error desant l\'usuari:', dbErr.message);
  }

  // `email` hi segueix sent perquè les consultes de progrés encara hi van; el
  // canvi a `uid` és el pas següent i es fa a part, per no barrejar canviar
  // com entres amb canviar com es guarda el teu historial.
  req.session.profile = {
    uid: persona.uid,
    email: persona.email,
    first_name: (persona.email || '').split('@')[0],
  };
  res.json({ ok: true, uid: persona.uid, email: persona.email });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', (req, res) => {
  const p = req.session && req.session.profile;
  if (!p) return res.status(401).json({ error: 'No autenticat' });
  res.json({ uid: p.uid, email: p.email, first_name: p.first_name });
});

/**
 * Esborrar el compte. **Google Play ho exigeix** per a qualsevol app amb comptes.
 *
 * S'esborra primer el que és nostre i després el compte de Firebase, que el fa
 * el client amb el seu propi token. L'ordre no és casual: si es fes al revés i
 * fallés el segon pas, quedarien dades sense ningú que les pugui reclamar. Així
 * el pitjor cas és un compte de Firebase sense dades, que es pot tornar a
 * intentar i no reté res de ningú.
 */
router.delete('/account', (req, res) => {
  const p = req.session && req.session.profile;
  if (!p) return res.status(401).json({ error: 'No autenticat' });

  // Amb les claus alienes activades, esborrar la persona s'endú tot el que hi
  // penja: el motor ho garanteix, no una llista que algú ha de recordar
  // actualitzar cada cop que neix una taula. `content_reports` no hi té clau
  // aliena a posta —una denúncia ha de sobreviure a qui la fa— i per això és
  // l'única que s'esborra a mà.
  try {
    db.transaction(() => {
      db.prepare('DELETE FROM content_reports WHERE uid = ?').run(p.uid);
      db.prepare('DELETE FROM users WHERE uid = ?').run(p.uid);
    })();
  } catch (dbErr) {
    console.error('DB error esborrant el compte:', dbErr.message);
    return res.status(500).json({ error: 'No s\'ha pogut esborrar. Torna a provar.' });
  }

  req.session.destroy(() => res.json({ ok: true }));
});

module.exports = router;

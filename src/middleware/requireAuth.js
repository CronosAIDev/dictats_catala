const { bypassActiu, PERFIL_DE_PROVES } = require('../lib/authBypass');

function requireAuth(req, res, next) {
  // Vàlvula de desenvolupament: deixa veure l'app sense passar pel login.
  // Només s'activa amb DICTATS_AUTH_BYPASS=1 i mai amb NODE_ENV=production
  // (src/lib/authBypass.js no deixa ni arrencar el servidor en aquest cas).
  // És temporal: quan hi hagi credencials de MySQL en local, fora.
  if (bypassActiu()) {
    if (!req.session.profile) req.session.profile = { ...PERFIL_DE_PROVES };
    return next();
  }

  if (!req.session || !req.session.profile) {
    // `req.path` perd el prefix del router on està muntat (dins de `/api` val
    // `/texts/basic`), així que les crides d'API rebien el redirect de navegació
    // i el `fetch` del frontend petava en fer `res.json()` de l'HTML del login.
    // `req.originalUrl` conserva la ruta sencera.
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(401).json({ error: 'No autenticat' });
    }
    return res.redirect('/login');
  }
  next();
}

module.exports = requireAuth;

function requireAuth(req, res, next) {
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

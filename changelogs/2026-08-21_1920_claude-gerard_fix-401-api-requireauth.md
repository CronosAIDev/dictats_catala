## [1.1.2] — 2026-08-21 — Les rutes d'API tornaven un redirect en lloc d'un 401

### Contexto
`requireAuth` distingeix les crides d'API (han de rebre `401` + JSON) de la navegació
(ha de rebre un `redirect` a `/login`). La comprovació es feia amb
`req.path.startsWith('/api/')`, però **`req.path` no conté el prefix del router on el
middleware està muntat**: dins de `app.use('/api', dictatsRoutes)` una petició a
`/api/texts/basic` té `req.path === '/texts/basic'`. La condició no s'ha complert mai i
totes les rutes d'API sense sessió responien amb el `302` de navegació.

Efecte real per a l'usuari: quan la sessió caduca (8 h de `maxAge`), el `fetch` del
frontend segueix el redirect, rep l'HTML de `login.html` i peta en cridar `res.json()`
amb un error de parseig. En comptes de tornar al login, la interfície mostrava un error
incomprensible.

El `docs/shell/SECURITY_PROTOCOL.md` ja descrivia el comportament correcte
("Diferencia API (`401` JSON) de navegació (redirect `/login`)"): la documentació deia
la veritat i el codi no la complia. No cal tocar-la.

### Corregido
- `src/middleware/requireAuth.js`: la comprovació passa a `req.originalUrl`, que conserva
  la ruta sencera amb el prefix del router. Les rutes sota `/api` tornen `401` amb
  `{"error":"No autenticat"}` i la navegació manté el redirect a `/login`.

### Verificación
Per execució real contra el servidor local (`node src/index.js`, port 3003):

- **Sense sessió**, tornen `401` + JSON: `GET /api/me`, `/api/texts/basic`,
  `/api/texts/basic/b1`, `/api/user-texts`, `/api/progress`, `/api/profile`, i els
  `POST /api/correct` i `POST /api/correct-image`.
- **Sense sessió**, mantenen el `302` cap a `/login`: `/`, `/mobile`, `/profile`.
  `/login` segueix responent `200`.
- **Amb sessió** (injectada en un banc de proves sobre el router real, sense passar pel
  login perquè no hi havia credencials de MySQL a mà): `/api/texts/basic`,
  `/api/texts/basic/b1`, `/api/user-texts` i `/api/profile` tornen `200` amb les seves
  dades, un nivell inexistent segueix donant `400 Nivell no vàlid`, i la ruta de
  navegació `/` passa el middleware correctament.

**Sense verificar**: el login real contra `BrandWaiUserProfile` (calen les credencials
de `db1.bwai.cc`) i el comportament del frontend en caducar la sessió dins del navegador.

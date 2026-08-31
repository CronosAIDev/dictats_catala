require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const path = require('path');

const MySQLStore = require('express-mysql-session')(session);

const authRoutes = require('./routes/auth');
const dictatsRoutes = require('./routes/dictats');
const requireAuth = require('./middleware/requireAuth');
const { comprovaAArrencada } = require('./lib/authBypass');
const dbMysql = require('./lib/db-mysql');

const app = express();
const PORT = process.env.PORT || 3003;

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
    },
  },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '../public')));

// Les sessions viuen a MySQL quan hi ha base configurada. Amb el MemoryStore
// d'abans morien a cada reinici —cada desplegament feia fora tothom— i el
// procés escopia l'avís corresponent a cada arrencada. En local sense base,
// s'hi queda i s'avisa, que és el que deixa treballar sense credencials.
const magatzemDeSessions = dbMysql.estaConfigurada()
  ? new MySQLStore({
      ...dbMysql.configDeSessions(),
      schema: { tableName: dbMysql.P + 'sessions' },
      createDatabaseTable: true,
      // Cada 15 minuts es netegen les caducades; sense això la taula creix
      // sense sostre.
      clearExpired: true,
      checkExpirationInterval: 15 * 60 * 1000,
    })
  : undefined;

if (!magatzemDeSessions && process.env.NODE_ENV === 'production') {
  console.warn('AVÍS: sense DB_USER/DB_NAME les sessions van a memòria i es perden a cada reinici.');
}

app.use(session({
  store: magatzemDeSessions,
  secret: process.env.SESSION_SECRET || 'dictats-catala-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 8 * 60 * 60 * 1000, secure: process.env.NODE_ENV === 'production' },
}));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} session=${!!req.session?.profile}`);
  next();
});

app.use('/api', authRoutes.api);
app.use('/auth', authRoutes.auth);
app.use('/api', dictatsRoutes);

// URL pública per demanar l'esborrat del compte. Google Play l'exigeix a part
// del botó de dins de l'app, i ha de ser accessible SENSE iniciar sessió: qui
// ja no pot entrar també ha de poder demanar-ho. Per això va abans de
// `requireAuth` i no en depèn.
// La política de privacitat va servida per la mateixa app i **sense sessió**: Play
// l'exigeix en una URL i qui encara no té compte l'ha de poder llegir abans de
// fer-se'n un. És també la URL que va al formulari de Data Safety.
app.get('/privacitat', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/privacitat.html'));
});

app.get('/esborrar-compte', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/esborrar-compte.html'));
});

app.get('/login', (req, res) => {
  if (req.session?.profile) return res.redirect('/');
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/app.html'));
});

app.get('/mobile', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/mobile.html'));
});

app.get('/profile', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/profile.html'));
});

app.use((req, res) => res.status(404).json({ error: 'No trobat' }));

// Es comprova abans d'escoltar: si el bypass d'auth està actiu amb
// NODE_ENV=production, aquí es mor en lloc de servir l'app oberta.
comprovaAArrencada();

app.listen(PORT, () => {
  console.log(`Dictats en català escoltant a http://localhost:${PORT}`);
});

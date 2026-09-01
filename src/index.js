require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const path = require('path');

const authRoutes = require('./routes/auth');
const dictatsRoutes = require('./routes/dictats');
const requireAuth = require('./middleware/requireAuth');
const { comprovaAArrencada } = require('./lib/authBypass');

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

app.use(session({
  secret: process.env.SESSION_SECRET || 'dictats-catala-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 8 * 60 * 60 * 1000, secure: process.env.NODE_ENV === 'production' },
}));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} session=${!!req.session?.profile}`);
  next();
});

app.use('/api', authRoutes);
app.use('/api', dictatsRoutes);

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

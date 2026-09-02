// Vàlvula temporal per veure l'app en local sense credencials de MySQL.
//
// Per què existeix: l'autenticació va contra `BrandWaiUserProfile` (MySQL
// compartida amb FeedScale). Sense `MYSQL_USER`/`MYSQL_PASSWORD` al `.env`, en
// local no es pot entrar de cap manera i l'app queda invisible.
//
// AIXÒ S'HA DE TREURE quan hi hagi credencials en local. No és una funcionalitat.
//
// Els dos panys, i el segon és el que importa:
//   1. Cal `DICTATS_AUTH_BYPASS=1` explícit. Per defecte, apagat.
//   2. Amb `NODE_ENV=production` el servidor **no arrenca**. Es prefereix una
//      caiguda sorollosa a l'arrencada que no pas servir l'app oberta sense que
//      ningú se n'assabenti — que és exactament com passen aquestes coses.

const PERFIL_DE_PROVES = {
  email: 'proves@localhost',
  first_name: 'Proves',
};

function demanat() {
  return process.env.DICTATS_AUTH_BYPASS === '1';
}

function esProduccio() {
  return process.env.NODE_ENV === 'production';
}

function bypassActiu() {
  return demanat() && !esProduccio();
}

// Es crida una sola vegada a l'arrencada, abans d'escoltar el port.
function comprovaAArrencada() {
  if (!demanat()) return;

  if (esProduccio()) {
    console.error('');
    console.error('  ATURAT: DICTATS_AUTH_BYPASS=1 amb NODE_ENV=production.');
    console.error('  Això deixaria l\'app oberta a qualsevol. Treu la variable del');
    console.error('  .env del servidor i torna a arrencar.');
    console.error('');
    process.exit(1);
  }

  console.warn('');
  console.warn('  ┌───────────────────────────────────────────────────────────┐');
  console.warn('  │  AUTENTICACIÓ DESACTIVADA (DICTATS_AUTH_BYPASS=1)         │');
  console.warn('  │  Qualsevol que arribi a aquest port entra sense login,    │');
  console.warn('  │  com a proves@localhost. Només per mirar l\'app en local.  │');
  console.warn('  └───────────────────────────────────────────────────────────┘');
  console.warn('');
}

module.exports = { bypassActiu, comprovaAArrencada, PERFIL_DE_PROVES };

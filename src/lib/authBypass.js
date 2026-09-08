// Vàlvula per mirar l'app en local sense passar pel login.
//
// Per què existeix: l'entrada va contra Firebase, i per veure una pantalla en
// local caldria donar-se d'alta de veritat i crear un compte al projecte
// compartit de Cronos cada vegada. Amb això es pot obrir l'app i prou.
//
// (Fins al 08-09 la raó era una altra: l'autenticació anava contra la MySQL de
// Trawlingweb i en local no hi havia credencials. Aquella dependència ja no hi
// és — la identitat és Firebase i el progrés, SQLite.)
//
// No és una funcionalitat, i el dia que molesti es treu.
//
// Els dos panys, i el segon és el que importa:
//   1. Cal `DICTATS_AUTH_BYPASS=1` explícit. Per defecte, apagat.
//   2. Amb `NODE_ENV=production` el servidor **no arrenca**. Es prefereix una
//      caiguda sorollosa a l'arrencada que no pas servir l'app oberta sense que
//      ningú se n'assabenti — que és exactament com passen aquestes coses.

const PERFIL_DE_PROVES = {
  // El mateix `uid` sempre, perquè les proves en local siguin repetibles. La
  // forma ha de ser la de producció: si aquí faltés el `uid`, el camí de
  // desenvolupament provaria una cosa diferent de la que s'acaba desplegant.
  uid: 'proves-locals-uid',
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

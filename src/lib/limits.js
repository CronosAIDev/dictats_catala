// Límits de crides a les rutes que costen diners (F56).
//
// `/api/correct` i `/api/correct-image` criden l'API d'Anthropic, i cada crida
// la paga qui sigui titular de la clau. Fins ara només les protegia
// `requireAuth`: qualsevol persona amb sessió podia fer-ne les que volgués.
//
// Amb l'app tancada això era teòric —dos usos en tota la seva vida—. Amb l'app
// a Google Play deixa de ser-ho: cada persona que se la descarrega i dicta és
// una crida, i les correccions **per foto** envien la imatge sencera, que costa
// força més que el text sol.
//
// Això NO és una mesura de seguretat de dades: és un sostre de despesa.

const { rateLimit, ipKeyGenerator, MINUTE, HOUR } = require('express-rate-limit');

/**
 * La clau és **la persona, no la IP**.
 *
 * Importa aquí més que a la majoria d'apps: el públic són docents, i una sala
 * de professors o una escola sencera surt a internet per una sola IP. Limitar
 * per IP faria que el tercer professor que provés l'app en tot el matí es
 * mengés el bloqueig d'un company. El mòbil, amb CGNAT, encara pitjor.
 *
 * Sense sessió no s'hi arriba mai —aquestes rutes van darrere de `requireAuth`—
 * però es deixa la IP com a xarxa de seguretat per si algun dia es mou l'ordre
 * dels middlewares. `ipKeyGenerator` és el que toca: normalitza les IPv6, que
 * si no comptarien cada adreça d'un mateix prefix com una de diferent.
 *
 * ⚠️ `ipKeyGenerator` rep **la IP**, no `(req, res)`. Passar-li la petició no
 * peta: torna el mateix objecte `req`, i com que cada petició en porta un de
 * nou, cadascuna estrenaria cubell i el límit no saltaria mai. Un fallo mut
 * dels que només es veuen el dia que fan falta.
 */
function perPersona(req) {
  const email = req.session && req.session.profile && req.session.profile.email;
  return email ? 'u:' + email : ipKeyGenerator(req.ip);
}

function limit({ finestra, max, missatge }) {
  return rateLimit({
    windowMs: finestra,
    limit: max,
    keyGenerator: perPersona,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: missatge },
  });
}

// Dues capes, perquè resolen coses diferents: la de l'hora atura que algú
// dispari en ràfega, i la del dia posa el sostre real de despesa. Un dictat són
// entre cinc i deu minuts de feina de veritat, així que aquests números no els
// toca ningú practicant; només els toca alguna cosa que no és practicar.
const correccioPerHora = limit({
  finestra: HOUR,
  max: 20,
  missatge: 'Has fet moltes correccions seguides. Descansa una estona i torna-hi.',
});

const correccioPerDia = limit({
  finestra: 24 * HOUR,
  max: 60,
  missatge: 'Has arribat al màxim de correccions per avui. Demà en tornaràs a tenir.',
});

// La foto va més justa: hi viatja la imatge sencera i costa força més que el
// text sol.
const fotoPerHora = limit({
  finestra: HOUR,
  max: 10,
  missatge: 'Has enviat moltes fotos seguides. Descansa una estona i torna-hi.',
});

const fotoPerDia = limit({
  finestra: 24 * HOUR,
  max: 25,
  missatge: 'Has arribat al màxim de correccions per foto per avui.',
});

module.exports = {
  correccio: [correccioPerHora, correccioPerDia],
  foto: [fotoPerHora, fotoPerDia],
  perPersona,
  MINUTE,
  HOUR,
};

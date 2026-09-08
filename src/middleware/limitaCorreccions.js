// F14 — límit de crides al model per persona. Cada correcció que passa per aquí
// costa diners: sense límit, un bucle —o algú amb massa entusiasme— crema la
// quota. **És control de cost, no de seguretat.**
//
// ── Per què n'hi ha dos, i no un ─────────────────────────────
// Amb només el límit per hora, el sostre real d'una persona són 30 × 24 = 720
// crides al dia. Ningú que faci servir l'app de veritat s'hi acosta: són
// dotzenes de dictats. Un tope diari no molesta ningú i acota molt el pitjor cas.
//
// Importa des que **l'alta és oberta** (#37): el sostre per compte existia, però
// el nombre de comptes ja no en té. Això no tapa aquell forat —el tapa la
// decisió de la #37—, però fa que cada compte valgui molt menys la pena.
//
// Finestra lliscant en memòria, indexada pel `uid`: prou per a una app d'un sol
// procés darrere de `requireAuth`. Es reinicia amb el procés, i està bé que ho
// faci.

const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;

const MAX_HORA = parseInt(process.env.DICTATS_MAX_CORRECCIONS_HORA || '30', 10);
const MAX_DIA = parseInt(process.env.DICTATS_MAX_CORRECCIONS_DIA || '120', 10);

const registres = new Map(); // uid -> [timestamps dins de les últimes 24 h]

// El rellotge, injectable. Sense això el tope diari no es pot provar: caldrien
// 24 hores o 120 crides seguides, i aquestes últimes topen abans amb el límit
// de l'hora. Una prova que no pot arribar al cas que diu provar no prova res.
let ara = () => Date.now();

/** Quant falta perquè torni a haver-hi lloc, en text llegible. */
function espera(ms) {
  const min = Math.ceil(ms / 60000);
  if (min < 60) return `${min} minut${min !== 1 ? 's' : ''}`;
  const h = Math.ceil(min / 60);
  return `${h} hor${h !== 1 ? 'es' : 'a'}`;
}

function limitaCorreccions(req, res, next) {
  // Pel `uid` i no pel correu: és el que no canvia mai. Un correu sí que pot
  // canviar, i llavors el comptador es reiniciaria sol.
  const qui = req.session.profile.uid || req.session.profile.email;
  const t = ara();

  const vius = (registres.get(qui) || []).filter((x) => t - x < DIA_MS);
  const dinsDeLHora = vius.filter((x) => t - x < HORA_MS);

  // Es mira primer el de l'hora perquè és el que es toca de veritat, i el
  // missatge que en surt és el que la gent llegirà gairebé sempre.
  if (dinsDeLHora.length >= MAX_HORA) {
    registres.set(qui, vius);
    return res.status(429).json({
      error: `Has fet ${MAX_HORA} correccions en una hora. Descansa una mica: `
        + `en ${espera(HORA_MS - (t - dinsDeLHora[0]))} en tindràs més.`,
    });
  }
  if (vius.length >= MAX_DIA) {
    registres.set(qui, vius);
    return res.status(429).json({
      error: `Has fet ${MAX_DIA} correccions avui, que ja són moltes. `
        + `Torna d'aquí a ${espera(DIA_MS - (t - vius[0]))}.`,
    });
  }

  vius.push(t);
  registres.set(qui, vius);

  // Que el mapa no creixi amb qui ja no torna.
  if (registres.size > 1000) {
    for (const [clau, temps] of registres) {
      if (!temps.some((x) => t - x < DIA_MS)) registres.delete(clau);
    }
  }

  next();
}

limitaCorreccions._buida = () => registres.clear();       // per a les proves
limitaCorreccions._rellotge = (f) => { ara = f || (() => Date.now()); };

module.exports = limitaCorreccions;

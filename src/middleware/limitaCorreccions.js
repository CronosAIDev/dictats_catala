// F14 — límit de correccions per usuari. Cada correcció crida l'API
// d'Anthropic i costa diners: sense límit, un bucle (o un usuari amb massa
// entusiasme) pot cremar la quota. És control de cost, no de seguretat.
//
// Finestra lliscant en memòria per email: prou per a una app d'un sol procés
// darrere de requireAuth. Es reinicia amb el procés, i està bé que ho faci.

const FINESTRA_MS = 60 * 60 * 1000; // una hora
const MAX_PER_FINESTRA = parseInt(process.env.DICTATS_MAX_CORRECCIONS_HORA || '30', 10);

const registres = new Map(); // email -> [timestamps dins la finestra]

function limitaCorreccions(req, res, next) {
  const email = req.session.profile.email;
  const ara = Date.now();

  const vius = (registres.get(email) || []).filter(t => ara - t < FINESTRA_MS);
  if (vius.length >= MAX_PER_FINESTRA) {
    const esperaMin = Math.ceil((FINESTRA_MS - (ara - vius[0])) / 60000);
    return res.status(429).json({
      error: `Has fet ${MAX_PER_FINESTRA} correccions en una hora. Descansa una mica: en ${esperaMin} minut${esperaMin !== 1 ? 's' : ''} en tindràs més.`,
    });
  }

  vius.push(ara);
  registres.set(email, vius);

  // Que el mapa no creixi amb emails que ja no tornen
  if (registres.size > 1000) {
    for (const [clau, temps] of registres) {
      if (!temps.some(t => ara - t < FINESTRA_MS)) registres.delete(clau);
    }
  }

  next();
}

limitaCorreccions._buida = () => registres.clear(); // per a les proves

module.exports = limitaCorreccions;

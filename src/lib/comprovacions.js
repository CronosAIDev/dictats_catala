// El que ha de ser cert per poder servir l'app a producció.
//
// Els dos casos d'aquí tenen la mateixa forma i és la que fa mal: **l'app
// arrencaria igual i semblaria que va bé**. Un servidor que es nega a arrencar
// es veu de seguida; un que arrenca trencat es descobreix quan algú no pot
// entrar, o no es descobreix mai.
//
// Es comprova només a producció: en local es vol poder engegar l'app sense
// tenir res configurat, que és per a què hi ha `DICTATS_AUTH_BYPASS`.

const CLAU_PER_DEFECTE = 'dictats-catala-dev-secret-change-me';

/**
 * @param {object} env  normalment `process.env`
 * @returns {string[]}  els problemes trobats; buit si tot va bé
 */
function problemes(env) {
  const fora = [];
  if (env.NODE_ENV !== 'production') return fora;

  // Sense això, la sessió es signa amb un secret que és **públic al repo**:
  // qualsevol podria falsificar una cookie i entrar com qui volgués.
  if (!env.SESSION_SECRET || env.SESSION_SECRET === CLAU_PER_DEFECTE) {
    fora.push('SESSION_SECRET no està posada (o és la del codi). Les sessions es podrien falsificar.');
  }

  // Sense això, `/api/auth-config` torna una clau buida i **ningú pot entrar
  // ni donar-se d'alta**. L'app es veuria perfecta i el login no faria res.
  if (!env.FIREBASE_API_KEY) {
    fora.push('FIREBASE_API_KEY no està posada. Ningú podria entrar ni donar-se d\'alta.');
  }

  return fora;
}

/** Ho mira i, si hi ha res, para el servidor abans de servir res a ningú. */
function comprovaAArrencada(env = process.env) {
  const trobats = problemes(env);
  if (!trobats.length) return;
  console.error('\n  No s\'arrenca. Falta configuració a producció:\n');
  for (const p of trobats) console.error('   · ' + p);
  console.error('\n  Es prefereix una caiguda sorollosa a servir l\'app trencada.\n');
  process.exit(1);
}

module.exports = { problemes, comprovaAArrencada, CLAU_PER_DEFECTE };

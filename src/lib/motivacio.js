// El que anima sense inventar-se res: tot surt de dades que l'app JA desa.
//
// Ve de la llista curta de la Issue #23 —«guanys barats sobre el que ja hi ha»—
// i de la seva regla, que val la pena repetir: la gamificació de debò (insígnies,
// reptes, treball dirigit pel tipus d'error) **no es fa fins que hi hagi gent a
// qui retenir**. Això d'aquí no és allò: són tres coses que surten de
// `user_progress` sense taules noves, sense esquema nou i sense pantalla nova.
//
// Les funcions són pures a posta —reben dades, no toquen la base— perquè es
// puguin provar sense BD i perquè les consultes visquin en un sol lloc.
//
// La regla de fons de tot el fitxer, que és la de `CLAUDE.md`: **mai renyar**.
// Es diu on ets i què has fet, no el que hauries d'haver fet.

// SQLite desa `datetime('now')`, que és UTC, però la ratxa la viu una persona
// a Catalunya: un dictat fet a les 23:30 ha de comptar com el dia que era per a
// qui l'ha fet, no com el dia següent. Per això el dia es calcula sempre a la
// zona i mai retallant la cadena.
const ZONA = 'Europe/Madrid';
const FORMAT = new Intl.DateTimeFormat('sv-SE', {
  timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit',
});

/** Un `Date` o una data d'SQLite ('YYYY-MM-DD HH:MM:SS', UTC) en clau local 'YYYY-MM-DD'. */
function dia(valor) {
  const d = valor instanceof Date ? valor : new Date(String(valor).replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return String(valor).slice(0, 10);
  return FORMAT.format(d);
}

function menysUnDia(clau) {
  const d = new Date(clau + 'T12:00:00Z');       // migdia: cap sorpresa d'horari d'estiu
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Dies seguits fent dictats. És el mecanisme de retenció amb millor relació
 * esforç/efecte que existeix, i aquí surt només de `completed_at`.
 *
 * La ratxa **no es trenca fins que passa un dia sencer sense fer-ne cap**: si
 * ahir en vas fer i avui encara no, segueix viva. Trencar-la a mitjanit
 * castigaria per no haver-hi arribat encara, que és justament renyar.
 *
 * @param {string[]} dies  Dates dels dictats, en qualsevol ordre i amb repetits.
 * @param {string|Date} [avui]
 * @returns {{dies: number, avuiFet: boolean, enPerill: boolean}}
 *   `enPerill`: la ratxa viu però avui encara no s'ha fet cap dictat.
 */
function ratxa(dies, avui = new Date()) {
  const claus = new Set((dies || []).map(dia));
  const avuiClau = dia(avui);
  const ahir = menysUnDia(avuiClau);

  const avuiFet = claus.has(avuiClau);
  // Si avui no n'hi ha cap, la ratxa encara pot venir d'ahir.
  let cursor = avuiFet ? avuiClau : (claus.has(ahir) ? ahir : null);
  if (!cursor) return { dies: 0, avuiFet: false, enPerill: false };

  let compte = 0;
  while (claus.has(cursor)) {
    compte += 1;
    cursor = menysUnDia(cursor);
  }

  return { dies: compte, avuiFet, enPerill: !avuiFet };
}

// Les fites de volum. Prou separades perquè no siguin soroll, i sense sostre:
// a partir de 100 van de cent en cent i no s'acaben mai.
const FITES = [10, 25, 50, 100];

/**
 * Si aquest dictat cau just en una fita, el text que ho celebra. Si no, `null`.
 * @param {number} total  Dictats fets EN TOTAL, comptant el que s'acaba de fer.
 */
function fita(total) {
  const n = Number(total) || 0;
  const toca = FITES.includes(n) || (n > 100 && n % 100 === 0);
  if (!toca) return null;
  return { numero: n, text: `Aquest és el teu dictat número ${n}.` };
}

/**
 * «3 errors · la teva mitjana és 5». La comparació és amb un mateix, mai amb
 * ningú altre: la taula d'usuaris és compartida amb els clients de FeedScale i
 * ensenyar resultats d'uns a altres seria un problema de privacitat, no una
 * funcionalitat (avís de la #23).
 *
 * Torna `null` fins que hi ha prou historial perquè la mitjana vulgui dir res.
 *
 * @param {number} errors        Errors del dictat que s'acaba de corregir.
 * @param {number} mitjanaAbans  Mitjana d'errors dels dictats ANTERIORS.
 * @param {number} totalAbans    Quants dictats hi havia abans d'aquest.
 */
function comparativa(errors, mitjanaAbans, totalAbans) {
  if (!totalAbans || totalAbans < 3 || mitjanaAbans == null) return null;

  const mitjana = Math.round(mitjanaAbans * 10) / 10;
  const diferencia = Math.round((mitjana - errors) * 10) / 10;
  const text = `La teva mitjana és ${String(mitjana).replace('.', ',')}.`;

  return {
    mitjana,
    text,
    // `millor` només és cert quan de debò ha anat millor que de costum.
    millor: diferencia > 0,
    igual: diferencia === 0,
  };
}

module.exports = { ratxa, fita, comparativa, FITES };

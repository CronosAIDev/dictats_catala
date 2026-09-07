// El progrés, mesurat de manera que es pugui comparar amb un mateix (F36).
//
// Dues coses estaven malament, i totes dues fan que la xifra que es veu al
// perfil no vulgui dir res:
//
//   1. **La mitjana anava arrodonida a enter.** 2,4 i 2,6 es veien igual, que
//      és tant com dir que millorar no es nota. Justament el nombre que hauria
//      d'ensenyar la millora era el que la esborrava.
//   2. **Es comparaven dictats de 34 paraules amb altres de 84.** Tres errors
//      en un text bàsic i tres en un d'avançat sortien com el mateix resultat,
//      i no ho són ni de bon tros.
//
// La unitat aquí és **errors per 100 paraules**, que sí que es pot comparar
// entre textos i entre setmanes.
//
// El que NO toca, i és una decisió de producte de `CLAUDE.md`: **l'escala
// motivadora segueix anant per nombre d'errors**. «Molt bé!» vol dir «dos
// errors», no «dos i mig per cada cent paraules». Són dues coses diferents i
// es llegeixen en llocs diferents, igual que el rang i l'escala.
//
// Les funcions són pures, com les de `motivacio.js` i `textos.js`: reben files
// i no toquen la base.

const { dia } = require('./motivacio');

const unDecimal = (n) => Math.round(n * 10) / 10;

/**
 * Errors per 100 paraules.
 *
 * Torna `null` si no se sap quantes paraules tenia el dictat. **No s'estima**:
 * `rang.js` sí que ho fa per no deixar sense punts l'historial vell, però allà
 * el preu d'equivocar-se és uns punts i aquí és ensenyar una millora que no ha
 * passat. Val més no dir res que dir-ho malament.
 */
function taxa(errors, paraules) {
  if (!paraules || paraules <= 0) return null;
  return unDecimal(((errors || 0) * 100) / paraules);
}

/** El dilluns de la setmana d'una data local 'YYYY-MM-DD'. */
function dilluns(clau) {
  const d = new Date(clau + 'T12:00:00Z');   // migdia: cap sorpresa d'horari d'estiu
  const desDeDilluns = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - desDeDilluns);
  return d.toISOString().slice(0, 10);
}

function sumaSetmana(files) {
  const per = new Map();
  for (const f of files || []) {
    const clau = dilluns(dia(f.completed_at));
    if (!per.has(clau)) per.set(clau, { dictats: 0, comptats: 0, errors: 0, paraules: 0, errorsTotals: 0 });
    const s = per.get(clau);
    s.dictats += 1;
    s.errorsTotals += Number(f.errors_count) || 0;
    // Només compten per a la taxa els dictats que saben quantes paraules
    // tenien. La resta segueixen comptant com a dictats fets.
    if (f.total_words > 0) {
      s.comptats += 1;
      s.errors += Number(f.errors_count) || 0;
      s.paraules += Number(f.total_words) || 0;
    }
  }
  return per;
}

/**
 * La corba: una entrada per setmana, de la més antiga a la més recent.
 *
 * Les setmanes **sense cap dictat es mantenen** dins del recorregut: un forat
 * és informació, i amagar-lo faria semblar seguit el que no ho va ser. El que
 * no s'inventa és passat: es comença a la primera setmana amb activitat, no
 * `quantes` setmanes enrere d'un historial que potser encara no existia.
 */
function setmanes(files, { ara = new Date(), quantes = 8 } = {}) {
  const per = sumaSetmana(files);
  if (per.size === 0) return [];

  const actual = dilluns(dia(ara));
  const primera = [...per.keys()].sort()[0];

  // Es retrocedeix `quantes - 1` setmanes des de l'actual, però mai més enllà
  // de la primera amb activitat.
  const inici = new Date(actual + 'T12:00:00Z');
  inici.setUTCDate(inici.getUTCDate() - 7 * (quantes - 1));
  let cursor = inici.toISOString().slice(0, 10);
  if (cursor < primera) cursor = primera;

  const fora = [];
  while (cursor <= actual) {
    const s = per.get(cursor);
    fora.push({
      setmana: cursor,
      dictats: s ? s.dictats : 0,
      comptats: s ? s.comptats : 0,
      taxa: s && s.comptats ? taxa(s.errors, s.paraules) : null,
      mitjanaErrors: s && s.dictats ? unDecimal(s.errorsTotals / s.dictats) : null,
    });
    const d = new Date(cursor + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + 7);
    cursor = d.toISOString().slice(0, 10);
  }
  return fora;
}

/**
 * Les xifres de tot l'historial.
 *
 * `mitjanaErrors` va amb **un decimal**, que és tot el problema d'aquesta
 * feature: arrodonida a enter, millorar de 2,6 a 2,4 no es veia.
 */
function resum(files) {
  const tots = files || [];
  if (tots.length === 0) {
    return { dictats: 0, comptats: 0, mitjanaErrors: null, taxa: null };
  }
  let errorsTotals = 0, errors = 0, paraules = 0, comptats = 0;
  for (const f of tots) {
    errorsTotals += Number(f.errors_count) || 0;
    if (f.total_words > 0) {
      comptats += 1;
      errors += Number(f.errors_count) || 0;
      paraules += Number(f.total_words) || 0;
    }
  }
  return {
    dictats: tots.length,
    comptats,
    mitjanaErrors: unDecimal(errorsTotals / tots.length),
    taxa: comptats ? taxa(errors, paraules) : null,
  };
}

/**
 * Si es pot dir alguna cosa de com va la corba.
 *
 * **Només es parla quan ha anat a millor**, que és la mateixa regla que F66 i
 * ve de «mai renyar» de `CLAUDE.md`. Si ha anat a pitjor la corba ho ensenya
 * igual —no s'amaga cap dada—, però l'app no hi posa paraules a sobre.
 *
 * Fan falta dues setmanes amb taxa; amb una de sola no hi ha res a comparar.
 */
function tendencia(llista) {
  const amb = (llista || []).filter((s) => s.taxa !== null);
  if (amb.length < 2) return { millora: false, text: null };

  const ultima = amb[amb.length - 1];
  const anteriors = amb.slice(0, -1);
  const mitjanaAbans = unDecimal(
    anteriors.reduce((a, s) => a + s.taxa, 0) / anteriors.length
  );
  if (ultima.taxa >= mitjanaAbans) return { millora: false, text: null };

  const coma = (n) => String(n).replace('.', ',');
  return {
    millora: true,
    text: `Aquesta setmana vas a ${coma(ultima.taxa)} errors per 100 paraules; `
      + `de mitjana anaves a ${coma(mitjanaAbans)}.`,
  };
}

module.exports = { taxa, setmanes, resum, tendencia, dilluns };

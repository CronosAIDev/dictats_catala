// Escriptura lliure (F29).
//
// ── Per què fa falta ─────────────────────────────────────────
// Un dictat entrena **l'oïda i l'ortografia**: sents una frase i l'escrius bé
// o malament. La gramàtica —la concordança, els pronoms febles, l'ordre, els
// connectors, el `per`/`per a`— només apareix quan **has de decidir tu** com
// dir-ho. Copiant no es decideix res.
//
// ── La diferència que ho canvia tot ──────────────────────────
// Aquí **no hi ha text original**. Tota l'app funciona des de F31 sobre una
// comparació determinista contra l'original: per això la correcció és exacta,
// no depèn de l'API i les categories de F25 es poden calcular. Res d'això
// serveix aquí, perquè no hi ha res amb què comparar.
//
// Conseqüència, dita clara: **això és l'única part de l'app que no funciona
// sense clau d'API.** No es dissimula; si no n'hi ha, es diu.
//
// ── I la conseqüència que no és tècnica ──────────────────────
// La política de privacitat prometia que el text que escrius **no surt mai del
// servidor**: del camí de text només en surten les paraules fallades. Aquí sí
// que surt sencer, perquè no hi ha manera de corregir gramàtica d'un text sense
// el text. Això obliga a canviar `/privacitat` i el `DATA_SAFETY.md`, i és part
// d'aquesta feature, no un tràmit posterior.
//
// I per això **el que escrius no es desa**: se'n desa que l'has fet, quantes
// paraules i de quin tema. El text no. Com la foto, que tampoc es guarda.

const MIN_PARAULES = 40;
const MAX_PARAULES = 400;
const MAX_OBSERVACIONS = 12;

/** El text serveix per corregir-lo? */
function valida(text) {
  const net = String(text || '').replace(/\s+/g, ' ').trim();
  const paraules = net ? net.split(' ').length : 0;
  if (paraules < MIN_PARAULES) {
    return { ok: false, paraules, error: `Escriu una mica més: fan falta ${MIN_PARAULES} paraules com a mínim i en portes ${paraules}.` };
  }
  if (paraules > MAX_PARAULES) {
    return { ok: false, paraules, error: `Això és massa llarg per corregir-ho bé. El màxim són ${MAX_PARAULES} paraules.` };
  }
  return { ok: true, paraules };
}

const PROMPT = (tema, text) => `Ets un professor de català que corregeix un text escrit per un alumne.

TEMA PROPOSAT: ${tema}

TEXT DE L'ALUMNE:
"""
${text}
"""

Corregeix-lo. Per a cada cosa que estigui malament o millorable, dona:
- "fragment": el tros EXACTE del text de l'alumne, copiat lletra per lletra. Ha de ser curt (una paraula o poques) i ha d'aparèixer TAL QUAL al text. Si no el pots copiar exacte, no incloguis l'observació.
- "proposta": com hauria d'anar.
- "regla": el nom curt de la regla en català (per exemple "concordança", "pronoms febles", "per/per a", "apostrofació", "connectors", "ordre de la frase").
- "perque": per què, en una frase de com a molt 20 paraules.

Regles de la feina:
- Màxim ${MAX_OBSERVACIONS} observacions. Si n'hi ha més, tria les que més ajuden a millorar.
- NO reescriguis el text sencer ni proposis un altre text.
- NO corregeixis el contingut ni les opinions: només la llengua.
- Si una cosa és correcta però hi ha una manera més natural de dir-la, pots dir-ho, però marca-ho amb regla "naturalitat".
- Si el text està bé, torna la llista buida.

Escriu també "comentari": dues frases com a molt, dient què fa bé aquest text. Mai retreure res.

Retorna NOMÉS aquest JSON, sense cap altre text:
{"observacions": [{"fragment": "...", "proposta": "...", "regla": "...", "perque": "..."}], "comentari": "..."}`;

/**
 * Neteja el que ha tornat el model.
 *
 * **Es llencen les observacions que citen un fragment que no és al text.** És
 * la mateixa por que la #22 apunta al camí de la foto: un fals positiu no és
 * un error innocu, és ensenyar-li a algú que ha escrit malament una cosa que
 * ha escrit bé —o que ni tan sols ha escrit. Si el model no pot copiar el
 * fragment, l'observació no es mostra.
 */
function neteja(resposta, text) {
  const original = String(text || '');
  const dades = resposta && typeof resposta === 'object' ? resposta : {};
  const brutes = Array.isArray(dades.observacions) ? dades.observacions : [];

  const bones = [];
  const vistos = new Set();
  for (const o of brutes) {
    if (bones.length >= MAX_OBSERVACIONS) break;
    const fragment = String((o && o.fragment) || '').trim();
    const proposta = String((o && o.proposta) || '').trim();
    if (!fragment || !proposta) continue;
    if (!original.includes(fragment)) continue;      // el model se l'ha inventat
    if (fragment === proposta) continue;             // no proposa cap canvi
    if (vistos.has(fragment)) continue;              // el mateix tros dues vegades
    vistos.add(fragment);
    bones.push({
      fragment,
      proposta,
      regla: String((o && o.regla) || '').trim() || 'llengua',
      perque: String((o && o.perque) || '').trim(),
    });
  }

  return {
    observacions: bones,
    // Quantes n'ha dit el model i quantes n'han passat el filtre: si un dia
    // se n'inventa moltes, es veurà aquí i no caldrà endevinar-ho.
    descartades: Math.max(0, brutes.length - bones.length),
    comentari: String(dades.comentari || '').trim(),
  };
}

/** Com es diu el resultat. Mai retreure res (`CLAUDE.md`). */
function resum(observacions, paraules) {
  const n = (observacions || []).length;
  if (n === 0) return 'No hi ha res a corregir. Aquest text està bé.';
  if (n === 1) return `${paraules} paraules i una sola cosa per mirar.`;
  return `${paraules} paraules i ${n} coses per mirar.`;
}

module.exports = { MIN_PARAULES, MAX_PARAULES, MAX_OBSERVACIONS, valida, PROMPT, neteja, resum };

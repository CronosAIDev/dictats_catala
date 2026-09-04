// Quin model llegeix la lletra manuscrita prou bé, i quant costa (#22, F55).
//
//   node scripts/benchmark/visio.js
//   node scripts/benchmark/visio.js --fotos ~/dictats-bench/fotos --passades 3
//   node scripts/benchmark/visio.js --models claude-haiku-4-5,claude-sonnet-5
//
// A diferència de `puntua.js`, aquest SÍ gasta diners: fa crides reals a
// l'API. Per això diu quant ha gastat al final i té `--assaig` per veure què
// faria sense fer-ho.
//
// ── Per què només la foto ────────────────────────────────────
// Des de F31 la comparació de paraules la fa `src/lib/diff.js` al servidor, i
// és determinista: canviar de model no mou ni un punt el camí de TEXT. L'únic
// lloc on la tria de model importa de veritat és aquí, transcrivint un
// manuscrit. I importa molt: si la visió llegeix malament una paraula que
// l'usuari havia escrit BÉ, el corrector compara contra una transcripció falsa
// i li ensenya una falta que no ha comès. És el fals positiu que fa mal.
//
// ── Què es mesura, i què NO ──────────────────────────────────
// La pregunta d'aquest benchmark no és «quin model és millor». És **quin és el
// més barat que és prou bo**. Són preguntes diferents i confondre-les porta a
// pagar de més per res.
//
// Es mesura, per model:
//   · Errors de transcripció  → la qualitat, i l'única cosa eliminatòria
//   · Cost real per correcció → del camp `usage` de la resposta, no estimat
//   · Latència p50 / p95      → la mediana i el mal dia
//   · JSON vàlid              → si trenca el parseig, no serveix encara que llegeixi bé
//
// El prompt és EL MATEIX per a tots i es llegeix de `src/routes/dictats.js`,
// no es copia aquí: si algú l'afina i el benchmark en té una còpia vella,
// deixa de comparar models i passa a comparar prompts.

const fs = require('fs');
const path = require('path');
const os = require('os');
const Anthropic = require('@anthropic-ai/sdk');
const { compara } = require('../../src/lib/diff');

// ── Els candidats ────────────────────────────────────────────
// Preus oficials per milió de tokens (docs d'Anthropic, 09-2026). Fable i
// Mythos no hi són a posta: són el tram més car i escriure una transcripció no
// necessita el màxim de raonament que existeix.
//
// ⚠️ La taula de la Issue #22 diu que Sonnet 5 val $3/$15. Aquell és el preu de
// Sonnet **4.6**. Sonnet 5 val $2/$10, o sigui que és més barat del que la
// Issue suposa — cosa que pot canviar la conclusió.
const PREUS = {
  'claude-opus-4-6': { entrada: 5.00, sortida: 25.00 },   // el de producció avui
  'claude-sonnet-5': { entrada: 2.00, sortida: 10.00 },
  'claude-haiku-4-5': { entrada: 1.00, sortida: 5.00 },
};
const PER_DEFECTE = ['claude-opus-4-6', 'claude-sonnet-5', 'claude-haiku-4-5'];

// ── Arguments ────────────────────────────────────────────────
const args = process.argv.slice(2);
const opcio = (nom, defecte) => {
  const i = args.indexOf('--' + nom);
  return i >= 0 && args[i + 1] ? args[i + 1] : defecte;
};
const ASSAIG = args.includes('--assaig');
const CARPETA = path.resolve(
  opcio('fotos', path.join(os.homedir(), 'dictats-bench', 'fotos')).replace(/^~/, os.homedir()),
);
const PASSADES = Number(opcio('passades', 3));
const MODELS = opcio('models', PER_DEFECTE.join(',')).split(',').map(s => s.trim()).filter(Boolean);

for (const m of MODELS) {
  if (!PREUS[m]) {
    console.error(`El model «${m}» no té preu a la taula. Afegeix-l'hi abans de mesurar-lo:`
      + ` sense preu, el cost per correcció seria una invenció.`);
    process.exit(1);
  }
}

// ── El prompt, tal com el fa servir producció ────────────────
// S'extreu del fitxer de la ruta perquè no en quedi mai una còpia divergent.
function promptDeProduccio() {
  const font = fs.readFileSync(path.join(__dirname, '../../src/routes/dictats.js'), 'utf8');
  const m = font.match(/const PROMPT_TRANSCRIPCIO = `([\s\S]*?)`;/);
  if (!m) {
    throw new Error('No s\'ha trobat PROMPT_TRANSCRIPCIO a src/routes/dictats.js.'
      + ' Si l\'han reanomenat, actualitza aquesta funció: el benchmark ha de fer'
      + ' servir el prompt de producció, no una còpia.');
  }
  return m[1];
}

// ── El material de prova ─────────────────────────────────────
// Cada foto va amb un `.txt` del mateix nom que diu QUÈ HI HA ESCRIT DE VERITAT
// —incloses les faltes que s'hi van posar a posta—. Aquest és el ground truth i
// surt gratis perquè qui va escriure el paper ja sap què hi va escriure.
const MIMES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

function carregaFotos() {
  if (!fs.existsSync(CARPETA)) {
    console.error(`No hi ha la carpeta ${CARPETA}.\n`);
    console.error('El material de prova el fas tu, i no va al repo (el text dels dictats');
    console.error('oficials és de la Generalitat). Per a cada foto, un .txt amb el mateix nom:\n');
    console.error('  a11-clara.jpg    +  a11-clara.txt     ← lletra clara');
    console.error('  a11-rapida.jpg   +  a11-rapida.txt    ← lletra ràpida');
    console.error('  a12-clara.jpg    +  a12-clara.txt');
    console.error('  a12-faltes.jpg   +  a12-faltes.txt    ← amb faltes posades a posta\n');
    console.error('El .txt ha de dir el que hi ha escrit AL PAPER, faltes incloses:');
    console.error('el que es mesura és si el model transcriu, no si corregeix.');
    process.exit(1);
  }

  const fotos = fs.readdirSync(CARPETA)
    .filter(f => MIMES[path.extname(f).toLowerCase()])
    .sort()
    .map((f) => {
      const base = path.join(CARPETA, path.basename(f, path.extname(f)));
      if (!fs.existsSync(base + '.txt')) {
        console.error(`${f} no té ${path.basename(base)}.txt al costat: sense ground truth`
          + ' no es pot dir si la transcripció és bona. La deixo fora.');
        return null;
      }
      return {
        nom: path.basename(f),
        mime: MIMES[path.extname(f).toLowerCase()],
        base64: fs.readFileSync(path.join(CARPETA, f)).toString('base64'),
        escrit: fs.readFileSync(base + '.txt', 'utf8').trim(),
      };
    })
    .filter(Boolean);

  if (!fotos.length) {
    console.error(`No hi ha cap foto amb el seu .txt a ${CARPETA}.`);
    process.exit(1);
  }
  return fotos;
}

// ── Una crida ────────────────────────────────────────────────
function jsonDeLaResposta(text) {
  const net = String(text).replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(net);
}

async function transcriu(client, model, foto, prompt) {
  const inici = Date.now();
  const message = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: foto.mime, data: foto.base64 } },
        { type: 'text', text: prompt },
      ],
    }],
  });
  const ms = Date.now() - inici;

  const u = message.usage;
  const p = PREUS[model];
  const cost = (u.input_tokens * p.entrada + u.output_tokens * p.sortida) / 1e6;

  let transcripcio = null;
  let jsonValid = true;
  try {
    transcripcio = jsonDeLaResposta(message.content[0].text).transcription;
  } catch {
    jsonValid = false;                       // llegir bé i no saber tornar-ho és inservible igual
  }

  return { ms, cost, jsonValid, transcripcio, tokens: { e: u.input_tokens, s: u.output_tokens } };
}

// Els errors de transcripció es compten amb el MATEIX corrector que fa servir
// l'app: si `compara` troba diferències entre el paper i el que el model diu
// que hi ha, són faltes que l'usuari veuria sense haver-les comès.
function errorsDeTranscripcio(escrit, transcripcio) {
  if (!transcripcio || !transcripcio.trim()) return null;
  return compara(escrit, transcripcio).errors.length;
}

const percentil = (llista, p) => {
  if (!llista.length) return 0;
  const ordenada = [...llista].sort((a, b) => a - b);
  return ordenada[Math.min(ordenada.length - 1, Math.floor((p / 100) * ordenada.length))];
};

// ── El recorregut ────────────────────────────────────────────
async function main() {
  const fotos = carregaFotos();
  const prompt = promptDeProduccio();
  const crides = MODELS.length * fotos.length * PASSADES;

  console.log(`${fotos.length} fotos × ${MODELS.length} models × ${PASSADES} passades = ${crides} crides`);
  console.log(`Fotos: ${CARPETA}`);
  console.log(`Prompt: el de producció (${prompt.length} caràcters)\n`);

  if (ASSAIG) {
    console.log('--assaig: no es crida l\'API i no es gasta res. Traurien:');
    for (const f of fotos) console.log(`  ${f.nom.padEnd(24)} ${f.escrit.split(/\s+/).length} paraules de referència`);
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'PENDIENTE') {
    console.error('Falta ANTHROPIC_API_KEY (o val «PENDIENTE», que és el marcador del .env local).');
    console.error('Aquest script fa crides reals i sense clau no pot mesurar res.');
    process.exit(1);
  }

  const client = new Anthropic();
  const resultats = [];

  for (const model of MODELS) {
    const r = { model, latencies: [], cost: 0, errors: 0, jsonTrencats: 0, buides: 0, crides: 0, perFoto: {} };

    for (const foto of fotos) {
      r.perFoto[foto.nom] = [];
      for (let i = 0; i < PASSADES; i++) {
        process.stdout.write(`\r${model} · ${foto.nom} · passada ${i + 1}/${PASSADES}          `);
        try {
          const res = await transcriu(client, model, foto, prompt);
          r.crides++;
          r.cost += res.cost;
          r.latencies.push(res.ms);
          if (!res.jsonValid) { r.jsonTrencats++; continue; }

          const errs = errorsDeTranscripcio(foto.escrit, res.transcripcio);
          if (errs === null) { r.buides++; continue; }
          r.errors += errs;
          r.perFoto[foto.nom].push(errs);
        } catch (err) {
          console.log(`\n  ${model} · ${foto.nom}: ${err.status || ''} ${err.message}`);
        }
      }
    }
    resultats.push(r);
  }

  // ── La taula ───────────────────────────────────────────────
  console.log('\r' + ' '.repeat(60));
  const bones = r => r.crides - r.jsonTrencats - r.buides;

  console.log('| Model | Errors de transcripció | Cost/correcció | p50 | p95 | JSON vàlid |');
  console.log('|---|---|---|---|---|---|');
  for (const r of resultats) {
    const n = bones(r);
    console.log(`| \`${r.model}\` | ${n ? (r.errors / n).toFixed(1) : '—'} de mitjana`
      + ` | $${n ? (r.cost / r.crides).toFixed(5) : '—'}`
      + ` | ${percentil(r.latencies, 50)} ms | ${percentil(r.latencies, 95)} ms`
      + ` | ${r.crides ? Math.round((r.crides - r.jsonTrencats) / r.crides * 100) : 0} % |`);
  }

  console.log('\nPer foto (errors de mitjana):');
  for (const r of resultats) {
    const detall = Object.entries(r.perFoto)
      .map(([nom, e]) => `${nom} ${e.length ? (e.reduce((a, b) => a + b, 0) / e.length).toFixed(1) : '—'}`)
      .join(' · ');
    console.log(`  ${r.model.padEnd(18)} ${detall}`);
  }

  const gastat = resultats.reduce((a, r) => a + r.cost, 0);
  console.log(`\nGastat en aquesta execució: $${gastat.toFixed(4)}`);

  // La conclusió és el més BARAT que transcriu prou bé, no el que menys falla.
  const aptes = resultats.filter(r => bones(r) && r.errors / bones(r) <= 1 && r.jsonTrencats === 0);
  if (aptes.length) {
    const barat = aptes.sort((a, b) => a.cost / a.crides - b.cost / b.crides)[0];
    console.log(`\nEl més barat que transcriu prou bé (≤1 error de mitjana): ${barat.model}`);
  } else {
    console.log('\nCap model baixa d\'1 error de transcripció de mitjana. Amb la lletra d\'aquestes'
      + ' fotos, el camí de la foto ensenyaria faltes no comeses amb qualsevol d\'ells:'
      + ' val més dir-ho que triar-ne un.');
  }
  console.log('\nLa tria final és de l\'Óscar (#22). Això li dona els números.');
}

main().catch((err) => { console.error(err); process.exit(1); });

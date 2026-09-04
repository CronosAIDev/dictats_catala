# Banc de proves del corrector

Fase R del gameplan de publicació a Play · Issue
[#22](https://github.com/CronosAIDev/wiki-cronos/issues/22) · F55 al roadmap.

```bash
node scripts/benchmark/puntua.js                    # 30 textos × 5 llavors
node scripts/benchmark/puntua.js --llavors 20 --quants 8
```

No necessita clau d'API ni xarxa, i no gasta res.

## El ground truth surt gratis

Tal com apunta la Issue: l'app **ja té el text correcte**, així que no cal etiquetar res a
mà. `injecta.js` agafa un text del banc, hi espatlla paraules d'una classe concreta i
retorna exactament quins errors hi ha i a quina posició. Amb la mateixa llavor surt sempre
el mateix joc de proves, que és el que permet comparar dues coses de veritat.

Les vuit classes són les de la taula de la Issue, les que discriminen en català:

| Classe | Exemple d'error injectat |
|---|---|
| `diacritic` | `és` → `es`, `sòl` → `sol`, `què` → `que` |
| `accent-general` | `país` → `pais`, `bàsic` → `basic` |
| `apostrofacio` | `l'estiu` → `el estiu`, `d'oliva` → `de oliva` |
| `pronoms-febles` | `m'agrada` → `magrada` |
| `ela-geminada` | `excel·lència` → `excellència` |
| `dieresi` | `aigües` → `aigues` |
| `ce-trencada` | `lliçó` → `llisó` |
| `b-v` | `haver` → `haber` |

## ⚠️ La Issue #22 es va escriure per a l'arquitectura d'abans

Això és el més important d'aquest directori i convé llegir-ho abans de treure conclusions.

La Issue proposa mesurar **recall, falsos positius i encert de classificació** per model.
Tenia tot el sentit quan **Claude buscava els errors**. Des de F31 no els busca: la
comparació de paraules es fa a `src/lib/diff.js`, al servidor, i al model només li queda
**escriure les explicacions**.

Conseqüència pràctica:

| Què es mesura | De qui depèn avui |
|---|---|
| Recall, falsos positius, classificació (camí de **text**) | **Del corrector, no del model.** És determinista: canviar de model no ho mou ni un punt |
| Qualitat de les explicacions, latència, cost | Del model |
| Recall i falsos positius del camí de **FOTO** | **Del model, i molt.** Ell transcriu |

**On la tria de model importa de debò és a la foto.** Si la visió transcriu malament una
paraula que l'usuari havia escrit bé, el corrector compara contra una transcripció falsa i
li ensenya una falta que no ha comès. És exactament el «fals positiu que fa mal» que
adverteix la Issue — i ara ve de la transcripció, no de la classificació.

Aquest script cobreix el primer bloc de la taula, que és el que es pot mesurar sense clau.
Els altres dos queden pendents.

## Resultat d'avui

150 casos, 790 errors injectats (`node scripts/benchmark/puntua.js`):

```
diacritic         156/156  100.0%   accentuació
ela-geminada       11/11   100.0%   ortografia
apostrofacio      152/152  100.0%   apostrofació
pronoms-febles     34/34   100.0%   apostrofació
dieresi            14/14   100.0%   accentuació
ce-trencada        34/34   100.0%   ortografia
b-v                27/27   100.0%   ortografia
accent-general    362/362  100.0%   accentuació
TOTAL             790/790  100.0%
falsos positius     4/794    0.5%
```

**Recall del 100 % a les vuit classes.** El corrector no se'n deixa cap.

Els tipus que hi posa són els sis de sempre: `ela-geminada`, `ce-trencada` i `b-v` cauen
totes tres dins d'`ortografia`, i `dieresi` dins d'`accentuació`. No és un error —
la taxonomia fina és F25— però vol dir que **avui l'app no pot dir «se t'escapa la ela
geminada»**, que és el que voldria un docent.

### Dues coses que el banc ha destapat

**Un bug real, ja arreglat.** `A l'estiu el sol` escrit `A el estiu el sol` es comptava com
**tres** errors (una omissió i dues paraules de més) en comptes d'un de sol d'apòstrof:
l'`el` de l'alumne s'ancorava amb l'`el` que ja hi havia a l'original. Arreglat a
`ajuntaApostrofs()`, amb regressió a `test/diff.test.js`. Els falsos positius van baixar de
14 a 4.

**Un que queda (F57).** Dos apòstrofs seguits — `L'oli d'oliva` escrit `El oli de oliva` —
encara es desmunten: els sis errors es troben, però se'n reporten dos de més i el text que
s'ensenya a l'usuari surt desplaçat. Arreglar-ho de debò demana refer la fusió perquè
tracti seqüències i no parells, i això sí que és un canvi de pes.

### La cobertura del banc és fina en dues classes

Paraules tocables als 30 textos: `accent-general` 140, `diacritic` 56, `apostrofacio` 55,
`ce-trencada` 12, `pronoms-febles` 9, `dieresi` 7, `ela-geminada` 5.

**Ela geminada i dièresi són justament de les que més discriminen** i gairebé no hi són. Si
el banc ha de servir per comparar models al camí de la foto, convindria un text escrit a
posta que les carregui.

## El camí de la foto: `visio.js`

```bash
node scripts/benchmark/visio.js --assaig          # veure què faria, sense gastar
node scripts/benchmark/visio.js                   # 3 models x N fotos x 3 passades
node scripts/benchmark/visio.js --models claude-haiku-4-5 --passades 5
```

Aquest **sí que gasta diners**: fa crides reals. Per això diu quant ha gastat al final i
té `--assaig`.

### El material de prova, que no va al repo

Per defecte a `~/dictats-bench/fotos/`. Cada foto va amb un `.txt` del mateix nom que diu
**què hi ha escrit al paper de veritat, faltes incloses** — el que es mesura és si el model
transcriu, no si corregeix:

```
a11-clara.jpg   + a11-clara.txt      lletra clara
a11-rapida.jpg  + a11-rapida.txt     lletra rapida i pitjor
a12-clara.jpg   + a12-clara.txt
a12-faltes.jpg  + a12-faltes.txt     amb faltes posades a posta
```

El ground truth surt gratis perquè qui escriu el paper ja sap què hi ha escrit, igual que
`injecta.js` amb el text. **Les fotos no es pugen** — si el text ve dels
[310 dictats oficials de la Generalitat](https://llengua.gencat.cat/ca/serveis/aprendre_catala/recursos-per-al-professorat/dictats-en-linia/),
és contingut amb drets d'ells (avís de l'Óscar a la #22). Els números sí que es publiquen.

### El prompt no es copia, s'extreu

`visio.js` llegeix `PROMPT_TRANSCRIPCIO` de `src/routes/dictats.js` en temps d'execució. Si
en tingués una còpia i algú afinés el de producció, el benchmark deixaria de comparar
models i passaria a comparar prompts sense que ningú se n'adonés.

### Els preus, i una correcció a la taula de la Issue

| Model | Entrada $/1M | Sortida $/1M |
|---|---|---|
| `claude-opus-4-6` (el de producció) | $5,00 | $25,00 |
| `claude-sonnet-5` | **$2,00** | **$10,00** |
| `claude-haiku-4-5` | $1,00 | $5,00 |

⚠️ La taula de la #22 diu que Sonnet 5 val $3/$15. Aquell és el preu de **Sonnet 4.6**.
Sonnet 5 és **més barat** del que la Issue suposa, cosa que pot canviar la conclusió.
Verificat a la documentació oficial d'Anthropic (09-2026).

Fable i Mythos no hi són a posta: són el tram més car i escriure una transcripció no
necessita el màxim de raonament que existeix. L'objectiu no és «quin model és millor» sinó
**quin és el més barat que és prou bo**.

### Què treu

Una taula amb errors de transcripció de mitjana, cost real per correcció (del camp `usage`,
no estimat), latència p50/p95 i % de JSON vàlid — i, al final, **el més barat que baixa d'1
error de transcripció de mitjana**. Si cap ho aconsegueix ho diu en comptes de triar-ne un:
amb aquella lletra, el camí de la foto ensenyaria faltes no comeses amb qualsevol d'ells.

## Què falta per tancar la #22

- [x] `visio.js` escrit i provat en els camins que no gasten (`--assaig`, model sense preu,
      clau absent, carpeta absent, extracció del prompt)
- [ ] **Les fotos**: 4 manuscrits fotografiats. És feina de paper i mòbil, no de codi
- [ ] Una clau d'API vàlida a `.env` (la local val `PENDIENTE`; la bona és a la VM)
- [ ] Executar-lo i enganxar la taula aquí
- [ ] Passada del camí de **text**: qualitat de l'explicació i cost. Menys urgent — el
      model ja no busca els errors, només els redacta
- [ ] Taula de resultats i recomanació. La tria és de l'Óscar.

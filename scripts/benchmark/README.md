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

## Què falta per tancar la #22

- [ ] Passada del camí de **text** amb diversos models: qualitat de l'explicació, latència
      p50/p95 i **cost real del camp `usage`**. Cal clau d'API.
- [ ] Passada del camí de **foto**: cal clau i manuscrit real fotografiat. **És la que
      decideix**, per tot el que hi ha explicat més amunt.
- [ ] Taula de resultats i recomanació. La tria és de l'Óscar.

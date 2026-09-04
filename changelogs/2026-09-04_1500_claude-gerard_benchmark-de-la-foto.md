# El benchmark de la foto, llest perquè només hi faltin les fotos

**Data**: 2026-09-04 · **Branca**: `v14` · Issue
[#22](https://github.com/CronosAIDev/wiki-cronos/issues/22) · F55 al roadmap

## Per què ara

L'Óscar va deixar a la #22 la guia sencera del benchmark. Llegint-la, la feina es parteix
en dues meitats molt diferents: **la que és codi** —cridar tres models amb la mateixa prova
i mesurar-los igual— i **la que és paper i mòbil**: escriure un dictat a mà i fotografiar-lo.
La segona no la pot fer una sessió de codi. La primera sí, i no depèn de cap decisió
pendent.

Així que està escrita i provada. Quan hi hagi les fotos, això és una ordre, no una feina.

## Què mesura, i què no

La pregunta de la Issue no és «quin model és millor» sinó **quin és el més barat que és
prou bo**. `visio.js` respon exactament aquesta: al final no diu el que menys falla, diu
**el més barat que baixa d'1 error de transcripció de mitjana**. I si cap ho aconsegueix ho
diu, en comptes de triar-ne un igualment.

| Es mesura | D'on surt |
|---|---|
| Errors de transcripció | El mateix `compara()` de `src/lib/diff.js` que fa servir l'app |
| Cost per correcció | El camp `usage` de la resposta × el preu real. No estimat |
| Latència p50 / p95 | La mediana i el mal dia |
| JSON vàlid | Llegir bé i no saber tornar-ho és inservible igual |

L'error de transcripció és l'única mesura eliminatòria, i pel motiu que ja diu el README
del directori: si la visió llegeix malament una paraula que l'usuari havia escrit **bé**, el
corrector compara contra una transcripció falsa i li ensenya una falta que no ha comès.

## Tres decisions que val la pena que constin

**El prompt s'extreu de `src/routes/dictats.js`, no es copia.** Amb una còpia, el dia que
algú afinés el de producció el benchmark deixaria de comparar models i passaria a comparar
prompts sense que ningú se n'adonés.

**Un model sense preu a la taula atura l'execució.** Sense preu, el cost per correcció
seria una invenció — i el cost és justament el que es mesura.

**Les fotos i el seu ground truth viuen fora del repo** (`~/dictats-bench/fotos/` per
defecte). Si el text ve dels dictats oficials, és contingut amb drets de la Generalitat:
avís de l'Óscar a la mateixa Issue. Els números sí que es publiquen.

## Una correcció als preus de la Issue

La taula de la #22 dona **Sonnet 5 a $3/$15**. Aquell és el preu de Sonnet **4.6**. Sonnet 5
val **$2/$10** — o sigui més barat del que la Issue suposa, cosa que pot canviar la
conclusió. Verificat contra la documentació oficial d'Anthropic (09-2026).

## Verificat per execució real

- `--assaig` llista el material de prova i no gasta res.
- L'extracció del prompt retorna els **370 caràcters** de producció.
- Els tres camins de fallada diuen què falta i per què: model sense preu, clau absent
  (o amb el marcador `PENDIENTE` del `.env` local), carpeta de fotos absent.
- Suite sencera en verd.

## NO verificat

- **Cap model s'ha arribat a cridar.** Falten les dues coses que no són codi: les fotos i
  una clau d'API vàlida. La taula de resultats de la #22 segueix buida.

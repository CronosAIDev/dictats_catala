# F57 — dos apòstrofs seguits ja no desmunten la correcció

**Data**: 2026-09-01 · **Autor**: claude-gerard · **Branch**: v10

Sortit del banc de proves (F55) i apuntat al roadmap com a F57.

## El mal

«L'oli d'oliva» escrit «El oli de oliva»: els errors es trobaven tots dos, però es
reportaven **dues «paraula afegida» de més** i el text ensenyat sortia desplaçat. Amb tres
apòstrofs seguits, tres de més.

La causa: `buida()` aparella per ordre, i cada paraula apostrofada de l'original consumeix
**una** paraula escrita quan n'hauria de consumir **dues** — tot el que ve després queda
corregut una posició per apòstrof. `ajuntaApostrofs()` només sabia cosir parelles
d'elements veïns (el cas d'un apòstrof solt), i cap parella local pot recompondre un
desplaçament acumulat.

## L'arreglo

`ajuntaApostrofs()` ara treballa per **tandes**: reagafa totes les paraules d'un tram de
diferències veïnes al text i les torna a aparellar, deixant que cada paraula amb apòstrof
consumeixi les dues que li toquen (en els dos sentits, i provant l'ordre invers quan
l'àncora s'ha endut una paraula pel mig, com al cas «A l'estiu el sol»). Un salt de
posició de més de 2 tanca la tanda, perquè trams allunyats del text no es fusionin entre
ells.

## Verificat

- 4 proves noves a `test/diff.test.js` (dos i tres apòstrofs seguits, cap paraula
  inventada, un apòstrof bo enmig de dos de dolents no es toca). Fallaven abans, passen ara.
- Les proves velles d'apostrofació (contracció desfeta, pronom feble, inrevés amb
  `span: 2`, àncora que xoca) segueixen passant.
- Suite completa: exit 0. Benchmark: 790/790 injectats trobats, **0 falsos positius**.

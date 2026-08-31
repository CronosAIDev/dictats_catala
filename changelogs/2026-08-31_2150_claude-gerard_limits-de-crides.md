# F56 — Sostre a les crides que costen diners

**Data**: 2026-08-31 · **Autor**: claude-gerard · **Branch**: v10

`/api/correct` i `/api/correct-image` criden l'API d'Anthropic, i cada crida la paga qui
sigui titular de la clau. Fins avui només les protegia `requireAuth`: qualsevol persona amb
sessió en podia fer les que volgués.

Amb l'app tancada era teòric —dos usos en tota la seva vida—. Amb l'app a Play deixa de
ser-ho, i el gameplan ho posa com a prerequisit, no com a millora.

**No és una mesura de seguretat de dades. És un sostre de despesa.**

## Es compta per persona, no per IP

És la decisió del canvi, i no és la de per defecte.

El públic són docents. **Una sala de professors, o una escola sencera, surt a internet per
una sola IP**, i al mòbil amb CGNAT encara pitjor. Comptant per IP, el tercer professor que
provés l'app en tot un matí es menjaria el bloqueig d'un company. La clau és el correu de
la sessió, i la IP es queda de xarxa de seguretat per si algun dia es mou l'ordre dels
middlewares.

## Dues capes, perquè resolen coses diferents

| Ruta | Ràfega | Sostre diari |
|---|---|---|
| `/api/correct` | 20/h | 60/dia |
| `/api/correct-image` | 10/h | 25/dia |

La de l'hora atura que algú dispari en ràfega; la del dia posa el sostre real de despesa. Un
dictat són entre cinc i deu minuts de feina, així que aquests números no els toca ningú
practicant.

La foto va més justa perquè hi viatja la imatge sencera i costa força més que el text sol.
I el límit va **abans** de `multer`, a posta.

## Un fallo meu, i el silenci amb què fallava

`ipKeyGenerator` d'`express-rate-limit` v8 rep **la IP**, no `(req, res)`. Jo li passava la
petició. No peta: **torna el mateix objecte `req`**, i com que cada petició en porta un de
nou, cadascuna hauria estrenat cubell i **el límit de la via de la IP no hauria saltat mai**.

Ho vaig veure comprovant la signatura de la funció, no provant la ruta: amb sessió aquell
camí no s'executa, així que la prova d'extrem a extrem passava igual. La prova nova de
`test/limits.test.js` sí que ho detecta —comprova que la clau és una **cadena**— i falla
quatre vegades contra la versió amb el fallo.

## Verificat per execució real

- **22 correccions seguides**: les 20 primeres donen 200, la 21 i la 22 donen **429** amb el
  missatge llegible i les capçaleres estàndard (`RateLimit-Policy: 20;w=3600`,
  `Retry-After: 3600`).
- **12 fotos seguides**: 10 passen, la 11 dona 429.
- **El límit talla abans de llegir la imatge**: un enviament de 9 MB rep el 429 en **2 ms**
  havent pujat 1,7 MB, en comptes de pujar-los tots i descartar-los.
- Les 12 comprovacions noves de `test/limits.test.js`, i que **fallen contra la versió
  d'abans de l'arreglo**.
- `npm test`: 123 comprovacions, cap falla. Dades de prova esborrades.

## NO verificat

- **No s'ha provat amb dues persones de veritat alhora.** Que dos correus donin cubells
  diferents està provat per unitat, no amb dues sessions simultànies: en local el bypass fa
  entrar tothom com la mateixa persona.
- **Els números són un tanteig raonat, no una mesura.** 20/h i 60/dia surten de què triga un
  dictat, no de dades d'ús —que no n'hi ha—. Quan hi hagi usuaris caldrà mirar-los.
- **Encara no hi ha sostre de despesa global.** Els límits són per persona, així que qui
  obri molts comptes els multiplica. Decidir un límit total i què passa quan s'assoleix és
  part de la Issue #22, i és decisió d'Óscar.
- **Els límits viuen a memòria del procés**: un reinici de PM2 els reinicia i, si algun dia
  hi ha més d'una instància, cadascuna portarà el seu compte. Amb una sola instància, com
  ara, no és un problema.

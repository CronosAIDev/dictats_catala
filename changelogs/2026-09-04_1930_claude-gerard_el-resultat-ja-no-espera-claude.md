# El resultat ja no espera Claude

**Data**: 2026-09-04 · **Branca**: `v16` · F33 al roadmap

## El mal

Entre prémer «Corregir» i veure res hi havia una crida a `claude-opus-4-6` amb
`max_tokens: 4096` i un spinner mut. Uns quants segons mirant «Corregint el dictat…», i
més en un mòbil amb mala cobertura.

**El resultat ja estava calculat abans d'aquella espera.** És el que va canviar F31: el
recompte, les paraules marcades, la posició i el tipus de cada error, l'escala, els punts i
el rang els fa `corregeix()` al servidor i sense xarxa. Al model només li queda **redactar
l'explicació de cada falta**.

O sigui que l'app et feia esperar pel 10 % del resultat tenint el 90 % a la mà.

## L'arreglo

`/api/correct` respon de seguida amb la correcció sencera. Les explicacions es demanen a
part, a `/api/explicacions/:id`, i quan arriben es torna a pintar.

**No hi ha cap moment en blanc**: cada error surt ja amb l'explicació per defecte que
escriu el servidor («Revisa l'accent d'aquesta paraula») i es refina quan arriba la del
model. És a posta — val més un text genèric ara que un de bo d'aquí a quatre segons.

### Tres decisions que val la pena que constin

**Les explicacions es desen** (`user_errors.explanation`, `user_progress.feedback`). Amb
això la segona crida al mateix id **no torna a demanar res a l'API**: és idempotent i
gratis. Tanca de passada la porta a fer-la servir per gastar diners en bucle, que si no
hauria obligat a comptar-la al límit de F14. I és el primer graó de F30, que vol un catàleg
de fitxes de regla en comptes de text redactat de nou cada vegada.

**Si l'API falla, no es reintenta.** Es desa el text per defecte i s'acaba. És exactament el
que passava abans de separar-ho: el pitjor cas d'aquest canvi és el cas d'avui amb l'API
caiguda, no un de nou.

**L'ordre de les files ÉS el contracte.** `desa()` insereix primer els errors i després els
avisos, i `user_errors.id` és autoincremental: per això `ORDER BY id` el recupera exacte i
el client pot casar cada explicació amb el seu error per posició, **sense haver-los-hi de
tornar a enviar**. El servidor no es fia de res que vingui del client.

I la lectura viu una sola vegada, a `public/explicacions.js`, com `rang.js`: escrita tres
cops és com F17 va acabar sent el mateix bug per duplicat.

## Verificat executant

`node test/f33.integracio.js` — **14 comprovacions**, servidor de veritat i BD temporal:

- La correcció respon **en 0,02 s** (abans, el temps d'una crida a Opus)
- Porta el `progressId`, el rang i la ratxa, i **cap error surt mut**
- La segona crida a `/api/explicacions/:id` torna el mateix **sense tocar l'API** i en 0,01 s
- El progrés d'un altre usuari dona **404**; un id que no és un número, **400**

I el camí sencer al navegador, amb Chrome de debò: al registre del servidor hi surt
`POST /api/correct` i **12 mil·lisegons després** `POST /api/explicacions/3`, disparada
sola pel client.

No entra a `npm test` a posta: la suite d'allà no obre cap port ni escriu enlloc, i
barrejar-ho faria que deixés de poder-se executar en qualsevol lloc. Les 116 comprovacions
d'aquella segueixen en verd.

## Sense verificar

- **Amb una clau d'API de debò no s'ha provat**, perquè no n'hi ha cap a la màquina. El que
  està provat és que quan l'API falla el camí es comporta com abans. Que el text del model
  arribi i substitueixi el per defecte es veurà al primer dictat a producció.

# F14 — límit de correccions per usuari

**Data**: 2026-09-02 · **Autor**: claude-gerard · **Branch**: v11

## El mal

`/api/correct` i `/api/correct-image` només estaven protegides per `requireAuth`. Cada
crida costa diners (API d'Anthropic): un bucle o un usuari desbocat podia cremar la
quota sense fre. És control de **cost**, no de seguretat de dades.

## L'arreglo

Middleware `limitaCorreccions` (nou, `src/middleware/limitaCorreccions.js`): finestra
lliscant en memòria per email, **30 correccions per hora** (configurable amb
`DICTATS_MAX_CORRECCIONS_HORA`). En passar-se: **429** amb un missatge que diu quants
minuts falten. El frontend ja ensenyava l'`error` de les respostes no-ok, així que el
missatge arriba a l'usuari sense tocar res més.

En memòria i prou: l'app és un sol procés PM2, i que el comptador es reiniciï amb el
procés és acceptable per a un límit de cost. El mapa es poda quan passa de 1.000 emails.

## Verificat

- `test/limits.test.js` (nou, afegit a `npm test`): les 30 primeres passen, la 31 talla
  amb 429 i missatge, el límit és per usuari i no global, i la finestra es buida.
- Suite completa: exit 0.

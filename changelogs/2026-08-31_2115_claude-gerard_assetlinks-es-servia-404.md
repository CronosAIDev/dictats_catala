# F53 — `/.well-known/assetlinks.json` donava 404, i no per on ho buscàvem

**Data**: 2026-08-31 · **Autor**: claude-gerard · **Branch**: v10

Trobat provant la Fase 2 abans de començar-la (#18), i arreglat abans que costés el dia
que costen aquestes coses.

## La causa no era la que deia la llista

La Issue #18 avisa que `assetlinks.json` s'ha de servir sense galeta ni sessió i apunta que
`requireAuth` ho impedirà. **Falla, sí, però `requireAuth` no hi té res a veure**: està a
`src/index.js` després de `express.static`, i els altres estàtics —icones, manifest, el
service worker— es serveixen bé sense cap sessió.

El que passa és que **Express ignora per defecte tot el que comença per punt**
(`dotfiles: 'ignore'`), i `.well-known` n'és un. Amb el fitxer al seu lloc:

```
GET /.well-known/assetlinks.json  ->  404   {"error":"No trobat"}
GET /icons/icon-192.png           ->  200
```

Si haguéssim buscat la causa a `requireAuth`, no hi hauríem trobat res, perquè allà no hi
ha cap problema.

Importa perquè és un fallo silenciós dels cars: sense aquest fitxer **el TWA s'instal·la i
s'obre igualment, però amb la barra de Chrome a sobre i sense donar cap error**. És la
trampa 2 que `aicamper_app` va deixar documentada.

## Com s'ha arreglat

Un muntatge propi per a `/.well-known`, i **no** `dotfiles: 'allow'` a tot `public/`.
Aquella opció obriria qualsevol fitxer ocult que hi caigués mai; així, un cop tret el prefix
del muntatge, el que queda és `/assetlinks.json`, que no és cap dotfile i se serveix sol.

Comprovat que no s'ha obert cap altra porta: `/.env` segueix donant 404.

## `scripts/assetlinks.js`

El fitxer es genera, no s'escriu a mà:

```bash
node scripts/assetlinks.js <empremta-de-pujada> <empremta-de-Play>
```

**Es nega a escriure res amb una sola empremta**, a posta. Són dues —la del keystore de
pujada i la que genera Google amb Play App Signing, que només existeix després de pujar el
primer AAB— i posar-ne una sola és exactament el fallo que deixa la barra de Chrome a sobre
sense dir res. Val més que l'script t'ho negui ara que descobrir-ho amb l'app publicada.

També rebutja el que no tingui forma de SHA-256 i les dues empremtes iguals.

## Verificat per execució real

- `/.well-known/assetlinks.json` torna **200 sense sessió**, amb
  `content-type: application/json`.
- `/.env` segueix donant **404**: el muntatge no ha obert la porta a res més.
- La resta segueix igual: `/` redirigeix, `/privacitat` i els estàtics tornen 200.
- L'script rebutja **una sola empremta**, una empremta amb forma incorrecta i dues
  d'iguals; i amb dues de bones escriu el JSON amb l'estructura de Digital Asset Links.
- Tot això amb `DICTATS_AUTH_BYPASS=0`, perquè el `.env` d'aquesta màquina el porta activat
  i la primera passada donava 200 per això i no per cap forat.
- `npm test`: 111 comprovacions.

## NO verificat

- **Cap Android ha llegit mai aquest fitxer.** El que està provat és que se serveix; que
  Google el validi contra un TWA de veritat és la Fase 2, i depèn del desplegament (#15).
- **El fitxer conté una llista buida** (`[]`), que és la veritat d'avui: encara no hi ha cap
  app associada perquè no hi ha keystore ni AAB. El camí està muntat i comprovable; el
  contingut arriba quan hi hagi les empremtes.
- **L'`applicationId` per defecte de l'script és `io.generaive.dictats`**, que és la meva
  recomanació a la Fase 4 (#20) i **no una decisió presa**. Es pot canviar amb
  `TWA_PACKAGE`, i s'ha de decidir abans del primer AAB perquè després es congela.

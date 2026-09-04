# `assetlinks.json` — lligar l'app d'Android amb el domini

> El fitxer viu a `public/.well-known/assetlinks.json`. Aquesta nota viu **fora** de
> `public/`, perquè tot el que hi ha allà dins es publica i això són notes internes.

És el fitxer que lliga l'app d'Android amb aquest domini (**Digital Asset Links**). Sense
ell —o amb ell malament— el TWA **s'instal·la i s'obre igualment, però amb la barra de
Chrome a sobre i sense donar cap error**. És la trampa 2 del gameplan de publicació.

**Avui hi ha una llista buida** (`[]`), que és la veritat: encara no hi ha cap app
associada. Es genera amb:

```bash
node scripts/assetlinks.js <empremta-de-pujada> <empremta-de-Play>
```

### ⚠️ Són DUES empremtes, no una

1. La del **keystore de pujada**, la que generes tu.
2. La que genera **Google amb Play App Signing**, que **només existeix després de pujar el
   primer AAB** (Play Console → Configuració → Integritat de l'aplicació).

Amb només la primera, l'app surt amb la barra de Chrome i **sense cap missatge d'error**.
Per això `scripts/assetlinks.js` es nega a escriure el fitxer amb una sola empremta.

### Que s'ha de servir sense sessió

Android el llegeix sense cap galeta. A `src/index.js` es munta **abans** de qualsevol
autenticació. I va en un muntatge propi, perquè Express ignora per defecte tot el que
comença per punt i el fitxer donava 404 encara que hi fos (F53).

Comprovació, un cop desplegat:

```bash
curl -s https://dictation.generaive.io/.well-known/assetlinks.json
```

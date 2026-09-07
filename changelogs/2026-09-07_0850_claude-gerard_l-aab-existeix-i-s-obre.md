# L'AAB existeix, està signat i s'obre en un Android

**Data**: 2026-09-07 · **Branca**: `v19` · F67 al roadmap · Fase 2 del gameplan

## La Fase 2 no estava bloquejada

El `KEYSTORE.md` ja ho deia des del 04-09, escrit en lletra petita al final: **l'`applicationId`
es congela al PUJAR el primer AAB, no al construir-lo.** I aun així la Fase 2 constava com que
«espera l'`applicationId`» de l'Óscar, que porta tres dies sense contestar.

Es podia fer tot menys l'últim pas. S'ha fet.

## Què hi ha ara

| | |
|---|---|
| `~/dictats-twa/app-release-bundle.aab` | 1,2 MB, signat |
| `~/dictats-twa/app-release-signed.apk` | 1,1 MB, per instal·lar i provar |
| `applicationId` | `io.generaive.dictats`, **provisional** — canviar-lo és una línia |
| Empremta del certificat | `79ce5082…54f828bc`, **idèntica** a la del `KEYSTORE.md` |

Al repo hi va el [`twa-manifest.json`](../docs/sections/publicacio/twa-manifest.json), que és
la definició del build. El projecte sencer viu fora, com el keystore.

## Provat en un Android, no llegit

L'AVD `dictats` ja hi era a la màquina des de l'agost. L'app **s'obre, connecta amb producció i
pinta el login** — `start_url` és `/mobile` i el servidor redirigeix perquè no hi ha sessió.

**I la trampa 2 del gameplan s'ha vist en comptes de suposar-la**: surt amb la barra de Chrome
a sobre i **sense cap error enlloc**, perquè `assetlinks.json` encara té la llista buida.
Desactivant la verificació només en aquest emulador, la barra desapareix i queda pantalla
sencera. Això demostra que **el fitxer és l'única cosa que falta**, i no un problema d'`scope`,
de host o del manifest.

Les dues captures són a `docs/sections/publicacio/assets/twa/`.

## Quatre pedres del camí, documentades a `TWA.md`

1. `bubblewrap update` **es penja sense imprimir res** si `appVersion` no coincideix amb
   `appVersionCode`: demana per teclat. `--skipVersionUpgrade`.
2. «The provided androidSdk isn't correct» — vol el repartiment vell del SDK. L'enllaç ha de
   ser `<sdk>/tools`, **no** `<sdk>/bin`: amb `bin` la validació passa però el `sdkmanager`
   peta amb `ClassNotFoundException`.
3. Vol **build-tools 36.1.0** exactament.
4. ⚠️ **`apksigner` escriu la contrasenya sencera al missatge d'error** quan és dolenta. No la
   tapa.

## Sense verificar

- **Un dictat sencer dins del TWA**: fa falta un compte de producció.
- **La veu de síntesi**: l'emulador no en porta cap de catalana, així que el que sortiria és
  l'avís de F21.
- **La càmera** del mode paper dins del TWA.

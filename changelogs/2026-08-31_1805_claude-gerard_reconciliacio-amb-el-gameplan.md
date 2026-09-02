# Reconciliació amb el gameplan de publicació a Play

**Data**: 2026-08-31 · **Autor**: claude-gerard · **Branch**: v10

No hi ha cap canvi de comportament de l'app. És feina de posar en fila dues línies de
treball que van néixer alhora sense saber l'una de l'altra.

## Què havia passat

El 29-08 l'Óscar va escriure el gameplan **Dictats a Google Play** i el va publicar a
`main`. Per redactar-lo va mirar l'estat del repo i va anotar, correctament pel que podia
veure: *«PWA ❌ no hi ha manifest, ni service worker, ni icones»*.

El que no podia veure és que la PWA estava feta des del 26-08. És F10, i viu a la branca
local `v5`, que **mai s'ha pogut pujar**: aquesta màquina no té permís d'escriptura sobre
`CronosAIDev/dictats_catala`. El mateix per a tot el bloc de v6.

El propi gameplan preveia aquest cas: *«Si en fer el primer commit resulta que sí que en
tenia un —en local sense pushejar— no es descarta ni el seu ni aquest»*.

## Dues col·lisions de nom, que és el que calia arreglar primer

**Les branques.** Entre el 29 i el 30 d'agost `origin` va rebre `v5`…`v9` amb els
documents del gameplan. Les meves `v5` i `v6` locals són una altra cosa amb el mateix
nom, i divergeixen des de `a44f60d`. Pujar-les hauria estat un embolic.

- Les locals passen a dir-se `v5-gerard-pre-reconciliacio` i `v6-gerard-pre-reconciliacio`,
  i queden intactes com a punt de rollback (§9.6: no s'esborren mai).
- Tags `reconciliacio-backup-v5` i `reconciliacio-backup-v6` sobre els mateixos commits.
- Els 8 commits de producte es rebasen sobre el `main` nou, que anava 10 endavant, a la
  branca **`v10`**. Sense cap conflicte: l'única coincidència de fitxer és el `ROADMAP.md`
  i cadascú tocava una zona diferent.

**Els identificadors del roadmap.** El gameplan va entrar com a **F16**, i F16 ja era
«Pausa proporcional a la frase» del bloc de v6. Com que el bloc F16–F50 està referenciat
des de sis fragments de changelog i vuit missatges de commit, i el gameplan era una sola
fila, es renumera la fila: el gameplan és **F51**. És una decisió meva sobre numeració
interna, no sobre el pla; queda dita a la Issue #15 per si l'Óscar la vol al revés.

## El roadmap incorpora el gameplan

Bloc G nou, F52–F56, amb el que és feina de codi de les fases:

| | |
|---|---|
| F52 | Identitat pròpia (Fase 0), ja decidida i per tant ja no bloqueja |
| F53 | `/.well-known/assetlinks.json` no se serveix — veure a sota |
| F54 | Els set camins de la Fase R, per verificar executant |
| F55 | Banc de proves de models i cost per correcció |
| F56 | Rate limit a les rutes de correcció |

I dues notes al pla de versions: que publicar va abans de v7, i que els números de versió
del producte ja no coincideixen amb els noms de les branques.

## Una troballa de la Fase 2, verificada executant

La Issue #18 avisa que `assetlinks.json` s'ha de servir sense sessió i apunta que
`requireAuth` ho impedirà. **Es va provar, i sí que falla, però per un altre motiu.**

Amb el fitxer a `public/.well-known/` i el servidor local aixecat:

```
GET /.well-known/assetlinks.json  ->  404   {"error":"No trobat"}
GET /icons/icon-192.png           ->  200
GET /manifest.webmanifest         ->  200
```

`requireAuth` no hi té res a veure: `express.static` és a `src/index.js:32`, abans de
qualsevol autenticació, i els altres estàtics es serveixen bé sense sessió. El que passa
és que **Express ignora per defecte els directoris que comencen per punt**
(`dotfiles: 'ignore'`). Es resol amb `{ dotfiles: 'allow' }` o una ruta explícita.

Importa perquè és un fallo silenciós dels que descriu el gameplan: sense aquest fitxer
l'app del TWA s'instal·la i s'obre igualment, però **amb la barra de Chrome a sobre i
sense donar cap error**. Queda com a F53; no s'arregla aquí perquè aquest commit no toca
codi.

## Verificat per execució real

- El rebase dels 8 commits sobre `origin/main`, sense conflictes.
- `npm test` — les tres suites en verd després del rebase.
- El 404 de `/.well-known/` i el 200 dels altres estàtics, amb el servidor local.
- L'arbre queda net i el fitxer de prova de `.well-known/` esborrat.

## NO verificat

- **Res d'això s'ha pujat.** El permís d'escriptura sobre el repo segueix sense resoldre's,
  així que `v10` és local igual que ho eren `v5` i `v6`.
- **La Fase 1 es dona per feta llegint el codi i provant en local.** El criteri que la
  tanca és que Chrome a Android ofereixi «Instal·lar aplicació» a `dictation.generaive.io`,
  i producció encara no té aquest codi.

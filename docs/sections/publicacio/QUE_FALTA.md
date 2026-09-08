# Què falta per publicar Dictats a Google Play

> Estat al **08-09-2026**, amb `main` = `332c225` desplegat i verificat.
> Aquesta llista es fa mirant el que hi ha, no el que hauria d'haver-hi: cada línia
> marcada com a feta s'ha comprovat **executant-la**.

L'ordre no és el de les fases del gameplan. És el de **qui bloqueja qui**.

---

## 1. Decisions que no són meves

Sense aquestes no es pot pujar res. Són l'únic que fixa la data.

| # | Què | De qui | Des de quan |
|---|---|---|---|
| [#20](https://github.com/CronosAIDev/wiki-cronos/issues/20) | **El domini `generaive.io` és estable a cinc anys vista?** D'això surt l'`applicationId`, que **es congela per sempre** en pujar el primer AAB | Óscar | Preguntat el **31-08**, repetit el 04-09 |
| [#19](https://github.com/CronosAIDev/wiki-cronos/issues/19) | **El D-U-N-S de Priority Gate.** Si ja n'hi ha, l'alta del compte d'organització va de seguida; si s'ha de demanar, torna a ser calendari | Óscar (ho comprova ell) | 07-09 |
| [#16](https://github.com/CronosAIDev/wiki-cronos/issues/16) | **El permís `resourcemanager.projects.update`** per canviar el nom del projecte a `CronosApps`. Comprovat: avui no puc ni llegir la política d'IAM | Óscar (es va oferir a passar-lo) | 07-09 |
| — | **Escriure (F29) es queda?** La decisió del 29-08 diu «no es promet sintaxi, gramàtica ni avaluació de redaccions», i això és exactament el que fa | Óscar | **Encara no preguntat** |

### El que ja NO bloqueja

- **Els 20 testers × 14 dies.** Decidit el 07-09: compte d'**organització** amb
  `devs@prioritygate.com`. Si Google el confirma com a tal, aquell rellotge no aplica.
  Era el camí crític i ha deixat de ser-ho.
- **Firebase.** La norma de costos del 07-09 ([#32](https://github.com/CronosAIDev/wiki-cronos/issues/32))
  aparta la migració fins que hi hagi ingressos. Per a Dictats, la [#16](https://github.com/CronosAIDev/wiki-cronos/issues/16)
  diu que el Firebase compartit viu al projecte que ja tenim.

---

## 2. Feina meva, encadenada — arrenca quan hi hagi la #19 i la #20

Aproximadament **una hora**, però va tota seguida i cada pas necessita l'anterior:

1. **Pujar l'AAB.** Ja està construït, signat i provat a l'emulador; el que falta és el
   compte i l'`applicationId`.
2. **Recollir la segona empremta SHA-256**, la que genera Play App Signing. **No existeix
   fins després de pujar el primer AAB** — és la trampa 2 del gameplan.
3. **Escriure l'`assetlinks.json` de veritat.** Avui producció serveix `[]`
   (verificat: 200 amb la llista buida). Amb la llista buida l'app s'obre **amb la barra
   de Chrome a sobre i sense donar cap error**.
4. **Provar un dictat sencer en un Android físic** — escoltar, escriure i rebre la
   correcció. Això no s'ha fet mai: l'emulador només arriba fins al login.

---

## 3. Feina d'en Gerard

| Què | Per què bloqueja |
|---|---|
| **Les 4 fotos manuscrites** | Sense elles no es pot mesurar quin model transcriu bé. La foto és **l'únic lloc on el model pot ensenyar una falta que no has comès** |
| **Rotar la contrasenya del keystore** | Es va filtrar el 07-09 en un error d'`apksigner`. Cal un terminal de veritat |
| **Un professor de català** | Les 22 regles i el prompt d'Escriure els he escrit jo. Es fan servir a tres pantalles i **són literalment la promesa del producte** |

---

## 4. El que ja està fet i verificat

No cal tornar-hi. Cada línia s'ha comprovat executant-la.

| | Comprovat |
|---|---|
| **PWA** | `manifest.webmanifest` 200, icones 192 i 512, `display: standalone` |
| **AAB** | 1,2 MB, signat, empremta verificada amb `apksigner`, obre a l'emulador |
| **`assetlinks.json`** | Servit a `/.well-known/` amb **200** (Express l'ignorava per `dotfiles`) |
| **Política de privacitat** | `/privacitat` **sense sessió**: 200. Inclou el camí d'Escriure |
| **Data Safety** | Escrit i coherent amb el codi |
| **Classificació de contingut** | Adults professionals, no menors |
| **Captures, icona 512, gràfic 1024×500** | Fets |
| **Botó de denúncia de contingut d'IA** | `POST /api/report`, 20/hora, taula pròpia |
| **Límit de peticions** | 30/hora per correu, amb 429 |
| **Autenticació** | Les 5 pàgines privades fan 302; les 9 rutes d'API, 401 |
| **Capçaleres** | CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` |
| **Cookie de sessió** | `httpOnly`, i `secure` perquè `NODE_ENV=production` |
| **XSS al títol de textos propis** | Injectat `<img src=x onerror=…>`: surt escapat a escriptori i a mòbil, cap node injectat |
| **Escriure (F29)** | **Executat contra el model per primera vegada el 08-09**: 11 s, 7 observacions bones i **1 descartada pel filtre** |

---

## 5. El que no bloqueja però convé saber

Detall a [`../../project/ROADMAP.md`](../../project/ROADMAP.md) i a la Issue corresponent.

- **La insígnia d'un dictat abandonat diu «el millor amb 23 errors».** Deixar-lo a mitges
  no són 23 faltes. És el mateix problema que ja es va arreglar al resultat (F69) i al
  perfil (F72); aquest és el tercer lloc.
- **Files de repesca que apunten a un text que ja no existeix** no es netegen mai. Es
  salten bé —la sessió no peta— però queden per sempre.
- **`SESSION_SECRET` té un valor per defecte escrit al codi.** A producció està definida
  i comprovada, però qualsevol desplegament que se n'oblidi signaria les sessions amb un
  secret que és públic al repo. Hauria de negar-se a arrencar.
- **Escriure triga 11 segons.** No és un error, però és molta estona mirant una pantalla.
- **`scripts/deploy/deploy-dictats.sh` no funciona tal com està**: li falta el
  `sudo -u oscar` i git talla amb `dubious ownership`.

---

## En una frase

**El codi no frena res.** Falten dues respostes d'Óscar —el domini i el D-U-N-S—, una
hora meva encadenada després de la primera pujada, i quatre fotos.

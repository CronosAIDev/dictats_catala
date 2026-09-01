# GP · Dictats a Google Play

> Data inici: 2026-08-29 · Dev: Gerard · Repo: `CronosAIDev/dictats_catala`
> Project: [#4](https://github.com/orgs/CronosAIDev/projects/4) · Issues: `CronosAIDev/wiki-cronos`

## ⚠️ Si en Gerard ja tenia un gameplan o un Project propi

Això es va escriure el **29-08-2026** després de comprovar que **no hi havia res publicat**:
ni en aquest repo, ni a `wiki-cronos`, ni als repos personals d'en Gerard, que no té cap
commit a l'organització des d'octubre de 2025.

Si en fer el primer commit resulta que **sí que en tenia un** —en local sense pushejar, o en
algun lloc on no vaig arribar— **no es descarta ni el seu ni aquest**. Es repassen tots dos i
es quadren en un de sol.

**L'orquestrador és l'Óscar i aquest gameplan.** El que en Gerard tingués fet s'hi incorpora
—el detall que jo no sabia, les decisions que ja hagués pres, el que aporti de nou— però
**la font de veritat i l'ordre de les fases surten d'aquí**. No es bifurca en dos plans
paral·lels: és així com es perd la feina de tothom.

## Missió

Que **Dictats** es pugui instal·lar des de Google Play.

## Públic objectiu (decisió de l'Óscar, 29-08)

**Docents**, no alumnes. La primera fase va dirigida a **professors que practiquen per no
cometre faltes ells mateixos** — un docent de català ha de tenir una ortografia impecable, i
aquesta app és on s'hi entrena. Que després algun professor faci servir els dictats amb els
seus alumnes és possible, però no és el cas d'ús pel qual es dissenya ni es posiciona.

Condiciona la fitxa de Play (#19), l'ASO (#20) i el to de tota la interfície (#23):
el públic és **adult i professional**, així que el to correcte és precís, no infantil.

### La promesa del producte (decidit per l'Óscar, 29-08)

Es va detectar que l'objectiu declarat parlava de *"millorar redaccions"* i *"sintaxi"*, però
**un dictat no entrena la sintaxi**: en un dictat la sintaxi ja ve donada i l'usuari la
copia. El que entrena de veritat és **ortografia, accentuació i puntuació**.

**Decisió: opció A — ajustar el posicionament.** Es ven pel que fa i fa bé:

> **Detecta i elimina les faltes d'ortografia i accentuació que encara se t'escapen.**

**No es promet** avaluació de sintaxi, de gramàtica ni de redaccions. Conseqüències:

- La fitxa de Play (#19) i l'ASO (#20) es redacten amb aquesta promesa i **cap altra**.
- **No es toca `CORRECTION_PROMPT`** per afegir categoria de gramàtica/concordança — i per
  tant el benchmark de models (#22) **no s'ha de refer**.
- Un mode de **redacció lliure** (l'usuari escriu i Claude n'avalua la sintaxi) queda com a
  possible fase 2, **només si els docents ho demanen** un cop publicada.

## D'on partim (actualitzat 01-09 amb el que ha verificat en Gerard)

> ⚠️ **Aquesta taula té dues columnes a propòsit.** El gameplan original només mirava `main`,
> i en Gerard tenia feina feta en local que no podia pujar per falta de permís d'escriptura.
> Fins que no es desplegui, **producció i el codi són coses diferents** — i les fases 1 i 2
> es tanquen a producció, no al portàtil de ningú.

| | A producció (`main`) | A la feina d'en Gerard (`v10`) |
|---|---|---|
| Web amunt | ✅ `dictation.generaive.io`, PM2 `dictats-catala` `online` | — |
| Certificat | ✅ vàlid fins al 27-10-2026 (certbot renova sol) | — |
| **Ús real** | ⚠️ **2 correccions en tota la vida**, les dues el 23-24 de març | — |
| **PWA** | ❌ `/manifest.webmanifest`, `/sw.js` i `/icons/` donen **404** | ✅ **Feta el 26-08** (F10): manifest, `sw.js`, `pwa.js` i 4 icones PNG, cap SVG |
| Login | email + contrasenya contra `BrandWaiUserProfile` | Fase 0 sense començar |
| Registre d'usuaris nous | ❌ no existeix: els comptes es creen fora de l'app | — |
| Vista mòbil | ✅ `/mobile` ja existeix | — |
| Correcció si l'API falla | ❌ **500, l'usuari es queda sense res** | ✅ Degrada: la comparació es fa al servidor (F31) i surt la correcció igualment |
| Política de privacitat | ❌ `/privacitat` → **404** | ✅ escrita, pendent de desplegar |

**Correcció al que deia aquest fitxer**: no és cert que `public/` només tingui sis fitxers ni
que no hi hagi PWA. Ho era a `main`, i a `main` encara ho és — però la feina existia des del
26-08. Verificat l'01-09 contra producció: els quatre camins de la PWA donen 404.

### El dato que condiciona tot el gameplan

L'app s'ha fet servir **dos cops**, i el darrer va ser el **24 de març**. La conseqüència
pràctica: **la crida a Claude fa cinc mesos que no s'executa**. Que el servei estigui amunt
no vol dir que l'app funcioni — són coses diferents, i només una està verificada.

Per això la **Fase R** va abans d'empaquetar res: no té sentit convertir en PWA i empaquetar
com a TWA una app el nucli de la qual no sabem si respon.

---

## Fase R — Revisió abans d'empaquetar

Dues comprovacions, totes dues prèvies a la Fase 1:

- **L'app funciona de veritat avui?** Provar per execució real el flux sencer: login, dictat
  per veu, correcció per text, correcció per foto, textos personals, perfil i vista mòbil.
  Si alguna cosa falla, s'arregla abans de continuar.
- **Model d'IA i cost per correcció.** Avui `src/routes/dictats.js` crida `claude-opus-4-6`
  (tier Opus: $5/$25 per milió de tokens). Amb 2 usos el cost és zero; amb l'app a Play,
  cada usuari que dicta és una crida que algú paga — i les correccions per foto envien la
  imatge sencera. **Decisió de l'Óscar**: mesurar el cost real i decidir si un dictat bàsic
  necessita Opus. Relacionat: avui no hi ha rate limit a cap de les dues rutes de correcció.

## El camí ja està resolt a la casa

`aicamper_app` va fer aquest mateix recorregut a l'agost (GP-06) i en va deixar les trampes
escrites. **No cal redescobrir-les.** Les tres que costen diners o dies:

1. **Android ignora les icones SVG.** Calen PNG en les mides d'Android o l'app no instal·la bé.
2. **`assetlinks.json` són DUES empremtes SHA-256**, no una: la del keystore de pujada i la
   que genera Google amb Play App Signing, que només existeix *després* de pujar el primer
   AAB. Amb només la primera, l'app surt amb la barra de Chrome a sobre i sense cap error.
3. **L'`applicationId` es congela per sempre** en pujar el primer AAB. El nom públic es
   decideix ABANS, no després.

---

## Fase 0 — Identitat pròpia ✅ DECIDIDA el 30-08 · ja no bloqueja

**Era** una decisió de l'Óscar i bloquejava la resta. **Ja està presa: opció A, identitat
pròpia, calcant `aicamper_app`.** Ara és feina d'en Gerard (#16), no una decisió pendent.

Per què calia: per entrar a Dictats cal existir a `BrandWaiUserProfile`, la taula de clients
de **Trawlingweb**, amb les contrasenyes **en text pla**. Darrere d'un login intern és
defensable; a Play no — qui es baixa l'app no té compte ni manera de fer-se'n un. I declarar
text pla al Data Safety és motiu de retirada.

**El que es fa** (detall complet a #16): taula `dictats_usuarios` a la base `cronosai` amb
prefix `dictats_`, **bcrypt**, sessions a MySQL i **Google OAuth** sobre el projecte GCP
`kairos-family-app` — el mateix que `aicamper_app`. Es descarten quedar-se en proves
tancades (B) i obrir registre sobre la taula de Trawlingweb (C).

**Efecte lateral que desbloqueja les proves**: amb Google OAuth els 20 testers docents entren
amb el seu compte de Google. Sense crear comptes ni administrar ningú.

> ⚠️ **La decisió activa un requisit de Play que aquest gameplan no llistava enlloc.** Ho va
> trobar en Gerard verificant-ho a la documentació: tota app que permeti **crear compte des
> de dins** ha d'oferir esborrar-lo per **dues vies** —una dins de l'app i una **URL web**—,
> en vigor des de l'abril de 2024, amb pregunta pròpia al Data Safety.
>
> Avui Dictats en queda **fora**, precisament perquè els comptes es creen fora de l'app.
> L'opció A hi entra de ple. Són dues coses noves per a #16: la ruta i la pàgina.
> [Referència](https://support.google.com/googleplay/android-developer/answer/13327111)

---

## Fase 1 — Convertir Dictats en PWA

Sense això no hi ha res a empaquetar.

- [ ] `public/manifest.webmanifest`: `name`, `short_name`, `start_url`, `display: standalone`,
      `theme_color`, `background_color`, `lang: ca`
- [ ] **Icones PNG** (192, 512 i maskable). Android ignora els SVG — trampa 1
- [ ] `public/sw.js` — service worker. Decidir què es cacheja: el dictat necessita xarxa per
      corregir (Claude API), però el cascarón i els textos ja carregats poden viure offline
- [ ] Enllaçar manifest i registrar el SW des de `app.html` i `mobile.html`
- [ ] Servir-ho des d'Express (avui `express.static` sobre `public/` ja ho cobriria)
- [ ] **Comprovar la CSP**: `src/index.js` té `helmet` amb `connectSrc: ["'self'"]`. Un SW
      i el manifest hi encaixen, però cal verificar-ho a producció, no suposar-ho

**Fet quan**: Chrome a Android ofereix "Instal·lar aplicació" a `dictation.generaive.io` i
l'app instal·lada obre a pantalla completa.

---

## Fase 2 — Empaquetar com a TWA

- [ ] Bubblewrap sobre `dictation.generaive.io`
- [ ] `assetlinks.json` a `/.well-known/` del domini, servit sense cookie ni sessió
- [ ] Keystore generat i guardat **fora del repo**
- [ ] Les **dues** empremtes SHA-256 — trampa 2
- [ ] AAB signat

**Fet quan**: l'AAB instal·lat en un mòbil real obre a pantalla completa (sense barra de
Chrome) i s'hi completa un dictat sencer **pels dos camins, text i foto**. La foto no és un
extra: és el diferencial del producte (#20), i `<input capture="environment">` dins d'un TWA
és justament un flux que dona sorpreses.

> ✅ **Correcció al que deia aquest fitxer.** Deia que `assetlinks.json` falla perquè
> `requireAuth` protegeix gairebé tot i cal excloure la ruta. **És fals**, i en Gerard ho va
> comprovar executant: `express.static` va a `src/index.js:32`, **abans** de la sessió, i per
> això la resta d'estàtics es serveixen sense login. La causa real és que **Express ignora
> per defecte els directoris que comencen per punt** (`dotfiles: 'ignore'`), i `.well-known`
> n'és un. Es resol amb `dotfiles: 'allow'` o una ruta explícita.
>
> Importa perquè és el mateix mode de fallada silenciós que les empremtes: el TWA
> s'instal·la i s'obre igualment, amb la barra de Chrome i sense cap error. Qui hagués buscat
> la causa a `requireAuth` no hi hauria trobat res.

---

## El camí crític que aquest gameplan no deia

Aquest fitxer va arribar a la seva primera versió **sense esmentar el desplegament ni una
sola vegada**, i en canvi:

- El "fet quan" de la **Fase 1** és que **Chrome a Android** ofereixi instal·lar a
  `dictation.generaive.io`.
- El "fet quan" de la **Fase 2** és un **AAB instal·lat** contra aquell mateix domini.

**Les dues fases es tanquen a producció**, i producció s'alimenta de `main` amb
`scripts/deploy/deploy-dictats.sh`. Cap feina local tanca cap fase.

Va estar **tallat fins a l'01-09** perquè en Gerard tenia `read` sobre el repo i 9 commits
que no podia pujar. Resolt: té `write` des de l'01-09.

**Regla que se'n deriva**: quan una fase digui "fet quan… a producció", el desplegament
forma part de la fase, no és un pas administratiu posterior.

---

## Fase 3 — Fitxa de Play

Res d'això és codi, i tot bloqueja la publicació.

- [ ] **Política de privacitat publicada** en una URL i enllaçada des de la fitxa
- [ ] **Formulari de Data Safety** coherent amb el que el codi fa de veritat. Depèn de la Fase 0
- [ ] Classificació de contingut
- [ ] Captures, icona 512, gràfic de capçalera, descripció curta i llarga
- [ ] **20 testers durant 14 dies** si el compte de desenvolupador és personal.
      ⏱️ **No són diners: són dues setmanes de calendari.** Es pot començar a reclutar-los
      ja, en paral·lel a les Fases 1 i 2
- [ ] **25 $** d'alta, un sol cop — decisió explícita de l'Óscar

## Fase 4 — Nom públic i ASO

- [ ] **Decidir el nom públic.** Avui conviuen "Dictats", "dictats_catala" i el domini
      `dictation.generaive.io`. Es decideix **abans** del primer AAB — trampa 3
- [ ] **`applicationId`** — es congela per sempre amb el primer AAB. Proposta d'en Gerard:
      `io.generaive.dictats`. **Pendent de l'Óscar**: ¿`generaive.io` és estable a 5 anys?
- [ ] Descripció amb el diferencial a la primera línia: **corregeix el dictat fet a mà, per foto**
- [ ] Captures que ensenyin la correcció amb els errors classificats, no la pantalla buida

### ❌ Paraules clau retirades — apunten al públic equivocat

Aquest fitxer va llistar *"dictats en català"*, *"dictat català"* i *"practicar català"*.
**No es fan servir**: es van invalidar el 29-08 en fixar que el públic són **docents**, no
estudiants. Atraurien gent que no torna, i la retenció és justament el que Play mesura.

La direcció correcta i les dades reals de mercat són a **#20** i a
`docs/sections/publicacio/FITXA_PLAY.md`, on en Gerard separa les paraules **comprovades**
de les que són **hipòtesi**.

### El context que ho canvia tot, i la seva trampa

En Gerard va verificar per què un docent buscaria això **ara**: des del curs **2025-26** el
**C2 és requisit** per entrar a la borsa docent, i **només el 25% del professorat el té** —
unes **70.000 persones** a Catalunya amb una necessitat obligatòria i amb data.

Però: **l'app no prepara l'examen de C2** (l'Àrea 2 és d'opció múltiple, no un dictat).
Prometre-ho seria el mateix error que la sintaxi, i pitjor, perquè qui s'hi juga la plaça no
perdona una ressenya.

**Pendent de l'Óscar** (#20): esmentar el C2 com a **context** (*"ara que el C2 és requisit
docent…"*) sense prometre preparació d'examen, o no esmentar-lo. En Gerard recomana com a
context.

---

## Ordre real

```
Fase R (revisió) ──> Fase 1 ──> Fase 2 ───────┐
                                              ├──> Fase 3 (fitxa) ──> PUBLICAR
Fase 0 · DECISIÓ (Óscar) ─────────────────────┘
Fase 4 ───────────> abans del primer AAB
Reclutar testers ─> en paral·lel des del dia 1
```

- **La Fase R va primer.** No s'empaqueta una app que no sabem si funciona.
- **Les Fases 1, 2 i 4 no depenen de la Fase 0** — es poden fer mentre l'Óscar decideix.
- **Els 20 testers × 14 dies són calendari, no feina**: comencen a comptar quan algú els
  recluta, i corren en paral·lel a tota la resta.

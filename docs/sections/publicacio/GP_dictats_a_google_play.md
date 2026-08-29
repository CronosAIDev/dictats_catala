# GP · Dictats a Google Play

> Data inici: 2026-08-29 · Dev: Gerard · Repo: `CronosAIDev/dictats_catala`
> Project: CronosAIDev · Issues: `CronosAIDev/wiki-cronos`

## Missió

Que **Dictats** es pugui instal·lar des de Google Play.

## D'on partim (verificat, no suposat)

| | Estat avui |
|---|---|
| Web en producció | ✅ `https://dictation.generaive.io`, PM2 `dictats-catala` a `kairos-vm` |
| PWA | ❌ **no hi ha `manifest.webmanifest`, ni `sw.js`, ni icones** |
| Login | email + contrasenya contra `BrandWaiUserProfile` (MySQL `brandwaiapp`) |
| Registre d'usuaris nous | ❌ no existeix: els comptes es creen fora de l'app |
| Vista mòbil | ✅ `/mobile` ja existeix |

`public/` només conté: `app.html`, `app.js`, `login.html`, `mobile.html`, `profile.html`,
`style.css`.

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

## Fase 0 — DECISIÓ: qui pot fer servir Dictats (BLOQUEJANT)

**És una decisió de l'Óscar, no feina d'en Gerard.** Bloqueja tota la resta.

Avui, per entrar a Dictats cal existir a `BrandWaiUserProfile`, que és la taula de clients
de **FeedScale/Trawlingweb**, i les contrasenyes hi viuen **en text pla**. Mentre l'app
estigui darrere d'un login intern això és defensable. **Publicar a Play, no.** Qui es
descarregui l'app des de la botiga no té compte, i no hi ha manera de fer-se'n un.

A més: declarar a **Data Safety** que les contrasenyes viatgen i es desen en text pla és un
motiu de retirada, i mentir-hi també.

| Sortida | Què implica |
|---|---|
| **A. Identitat pròpia de Dictats** | Taula d'usuaris pròpia + Google OAuth. Desacobla Dictats de la base de clients de Trawlingweb. És el que va fer `aicamper_app` a la seva Fase 1 |
| **B. No publicar obertament** | Quedar-se al canal de proves tancades de Play (testers convidats). L'app s'instal·la, però no és pública |
| **C. Obrir registre sobre la taula actual** | ❌ **Descartada**: posaria comptes de clients de Trawlingweb i contrasenyes en text pla darrere d'una app pública |

**Fins que això no es decideixi, la Fase 3 no es pot omplir** — el formulari de Data Safety
depèn literalment d'aquesta resposta.

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
- [ ] `assetlinks.json` a `/.well-known/` del domini, servit **sense cookie ni sessió**
      (avui `requireAuth` protegeix gairebé tot: cal excloure aquesta ruta explícitament)
- [ ] Keystore generat i guardat **fora del repo**
- [ ] Les **dues** empremtes SHA-256 — trampa 2
- [ ] AAB signat

**Fet quan**: l'AAB instal·lat en un mòbil real obre a pantalla completa (sense barra de
Chrome) i es completa un dictat sencer des d'allà.

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
- [ ] Paraules clau que la gent escriu de veritat: "dictats en català", "dictat català",
      "ortografia catalana", "practicar català"
- [ ] Descripció amb el diferencial a la primera línia: **corregeix el dictat fet a mà, per foto**
- [ ] Captures que ensenyin la correcció amb els errors classificats, no la pantalla buida

---

## Ordre real

```
Fase 0 (Óscar)  ─────────────┐
                             ├──> Fase 3 (fitxa)  ──> PUBLICAR
Fase 1 ──> Fase 2 ───────────┘
Fase 4 ──────────> abans del primer AAB
Reclutar testers ─> en paral·lel des del dia 1
```

**Les Fases 1, 2 i 4 no depenen de la decisió de la Fase 0.** Es poden fer ja.

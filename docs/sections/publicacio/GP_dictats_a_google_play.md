# GP · Dictats a Google Play

> Data inici: 2026-08-29 · Dev: Gerard · Repo: `CronosAIDev/dictats_catala`
> Project: CronosAIDev · Issues: `CronosAIDev/wiki-cronos`

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

## D'on partim (verificat, no suposat)

| | Estat avui |
|---|---|
| Web en producció | ✅ `https://dictation.generaive.io` (HTTP 302 → `/login`), PM2 `dictats-catala` `online`, 8 dies d'uptime, 0 reinicis inestables |
| Certificat | ✅ vàlid fins al 27-10-2026 (certbot renova sol) |
| **Ús real** | ⚠️ **2 correccions en tota la vida de l'app**, les dues el 23-24 de març. Cinc mesos sense cap |
| PWA | ❌ **no hi ha `manifest.webmanifest`, ni `sw.js`, ni icones** |
| Login | email + contrasenya contra `BrandWaiUserProfile` (MySQL `brandwaiapp`) |
| Registre d'usuaris nous | ❌ no existeix: els comptes es creen fora de l'app |
| Vista mòbil | ✅ `/mobile` ja existeix |

`public/` només conté: `app.html`, `app.js`, `login.html`, `mobile.html`, `profile.html`,
`style.css`.

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

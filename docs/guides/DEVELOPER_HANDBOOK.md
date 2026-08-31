# Developer Handbook — dictats_catala

## Descripció del Projecte

App web per practicar dictats en català amb correcció automàtica via Claude API. Els usuaris escolten el text per síntesi de veu, l'escriuen (o el fan en paper i pugen una foto), i Claude retorna la correcció amb errors classificats i una escala motivadora.

Té **identitat pròpia** des del 31-08-2026 (Fase 0 del gameplan de publicació a Play): taula `dictats_usuarios` a la base compartida `cronosai`, contrasenyes amb bcrypt i entrada opcional amb Google. Ja **no** depèn de `BrandWaiUserProfile`, que és la taula de clients de Trawlingweb i tenia les contrasenyes en text pla.

## Stack Tecnològic

- **Runtime**: Node.js 22+
- **Framework**: Express 5
- **Auth**: MySQL `cronosai` → `dictats_usuarios` (bcrypt, prefix `dictats_`) + Google OAuth 2.0
- **Progrés local**: SQLite via `better-sqlite3` (addon natiu — veure nota manteniment)
- **IA**: `@anthropic-ai/sdk` — model `claude-opus-4-6`
- **Sessions**: `express-session` amb `express-mysql-session` (taula `dictats_sessions`) + cookie httpOnly
- **Seguretat**: `helmet`, `express-rate-limit` (trust proxy activat per Caddy)
- **Pujada fotos**: `multer` (memory storage, max 10MB)
- **Frontend**: Vanilla JS, HTML/CSS, Web Speech API

## Setup Local

### Requisits
- Node.js 22+
- Accés a MySQL `db1.bwai.cc` (base `cronosai`), amb un usuari dedicat
- API key d'Anthropic

### Instal·lació
```bash
git clone https://github.com/CronosAIDev/dictats_catala.git
cd dictats_catala
npm install
cp .env.example .env
# Editar .env
npm start
# → http://localhost:3003
```

### Variables d'Entorn

| Variable | Descripció | Exemple |
|----------|-----------|---------|
| `PORT` | Port del servidor | `3003` |
| `ANTHROPIC_API_KEY` | Clau API Anthropic | `sk-ant-api03-...` |
| `SESSION_SECRET` | Secret sessions | cadena llarga aleatòria |
| `DB_HOST` | Host MySQL dels usuaris | `db1.bwai.cc` |
| `DB_PORT` | Port MySQL | `3306` |
| `DB_USER` | Usuari MySQL | (un de dedicat, mai root) |
| `DB_PASSWORD` | Contrasenya MySQL | (credentials) |
| `DB_NAME` | Base de dades | `cronosai` |
| `GOOGLE_CLIENT_ID` | Entrar amb Google (opcional) | del GCP `kairos-family-app` |
| `GOOGLE_CLIENT_SECRET` | Entrar amb Google (opcional) | |
| `GOOGLE_REDIRECT_URI` | Ha de coincidir amb el de la credencial | `https://dictation.generaive.io/auth/google/callback` |
| `NODE_ENV` | Entorn | `production` |

## Arquitectura

```
Browser → Caddy (dictation.generaive.io:443) → Express (localhost:3003)
                                                    ↓
                                        MySQL cronosai (usuaris i sessions)
                                        SQLite data/dictats.db (progrés)
                                        Anthropic API (correcció)
```

### Flux d'autenticació
- Alta i login amb email + contrasenya, amb **bcrypt** (12 rondes)
- O entrant amb Google: `/auth/google` -> `/auth/google/callback`. Si el correu ja
  tenia compte, s'hi vincula el `google_id` en comptes de duplicar la persona
- Esborrar el compte: `DELETE /api/account` i la pàgina pública `/esborrar-compte`.
  Ho exigeix Play, i toca les dues bases: primer la identitat, després el progrés
- Sessió guardada en `req.session.profile`
- `requireAuth` middleware protegeix totes les rutes

### Correccions
- **Text**: `POST /api/correct` → Claude text comparison
- **Foto**: `POST /api/correct-image` → Claude Vision (base64 image)
- Resultats guardats a SQLite `user_progress`

### Textos predefinits
- Fitxer: `data/texts.js` — 15 textos (5 per nivell: basic, intermedi, avancat)
- Format: frases separades per `||` per a les pauses del TTS

## Arquitectura SPA

L'app té 3 HTML separats (no monolítica):
- `public/app.html` — app principal (desktop)
- `public/mobile.html` — vista mòbil
- `public/profile.html` — historial i perfil

Cada HTML té les seves vistes inline (`div.view` o `div.mobile-view`) perquè l'app és petita (3 vistes per pàgina com a màxim). Si creix a >5 vistes per pàgina, migrar a partials seguint la norma de la wiki.

Documentació per secció (dictat/mobile/perfil): `docs/sections/`.

## Convencions

- Tots els missatges d'error al frontend en **català**
- Escala motivadora per nº d'errors (no per percentatge):
  - 0 errors → Excel·lent!
  - 1-2 → Molt bé!
  - 3-5 → Bé!
  - 6-9 → Progressant!
  - 10+ → Segueix!

## Despliegue

### Rama activa
- Rama de desarrollo: `vN` (branch de versió incremental — mirar `git branch -r` per saber el següent número)
- Rama de producción: `main`

Flux obligatori (`wiki-cronos/AI_CODE_INSTRUCTIONS.md` §9.6): branch `vN` des de `main` →
commits → push de la branch → merge `--no-ff` a `main` → push → deploy des de `main`.
**Mai es despleguen branches de versió, i mai s'esborren** (són el punt de rollback).

### VM de deploy
- **VM**: `kairos-vm` (34.156.75.104, GCP e2-small, europe-west1-b)
- **Projecte GCP**: `kairos-family-app` (compte `oscar@prioritygate.com`)
- **Usuari SSH**: `oscar`
- **Ruta a la VM**: `/var/dictats/app`
- **Procés PM2**: `dictats-catala`
- **Port**: `3003`
- **Proxy**: nginx + certbot — `dictation.generaive.io` → `127.0.0.1:3003`

Compartida amb `kairos_app` (3010) i `heart_monitor`/`trabaler` (3020). Node 20 a
tota la VM. Abans del 2026-07-29 vivia a `mochi-vm` amb Caddy; veure el
changelog del trasllat.

### Credencial d'accés (llegir abans de desplegar)

El deploy s'autentica amb una **service account nominal**, no amb el compte personal:

```bash
GCLOUD="$HOME/AppData/Local/Google/Cloud SDK/google-cloud-sdk/bin/gcloud"

# Una sola vegada per màquina — persisteix entre sessions
"$GCLOUD" auth activate-service-account --key-file="$HOME/.ssh/otc-dev.json"

# Accés
"$GCLOUD" compute ssh kairos-vm --zone=europe-west1-b --project=kairos-family-app \
  --account=otc-dev@kairos-family-app.iam.gserviceaccount.com --command hostname
```

Dues coses que costen hores si no es saben:

- **Compte personal ≠ credencial de deploy.** `oscar@prioritygate.com` funciona en
  interactiu, però caduca per la política de sessió de Workspace i en mode no
  interactiu (Claude Code, scripts, CI) mor amb
  `Reauthentication failed. cannot prompt during non-interactive execution`.
  Les service accounts estan **exemptes** d'aquesta política: no reautentiquen mai.
  Per això el deploy passa `--account` explícit i no es refia del compte actiu.
- **`kairos-vm` NO necessita `--tunnel-through-iap`.** Té IP pública i el port 22
  obert, i gcloud només activa IAP sol quan la VM no té IP externa. El flag és
  obligatori a `mochi-vm` i `crawlers-vm` (projecte `dataagencies`), que sí el tenen
  tancat — no el copiïs aquí ni el treguis allà.

> 🔐 La clau `~/.ssh/otc-dev.json` és un secret de llarga durada: viu fora del repo,
> no es passa per Telegram ni email, i **no es comparteix**. Si un altre dev no pot
> desplegar, se li crea la **seva** SA nominal (`<nom>-dev@kairos-family-app`) amb els
> rols `roles/compute.osLogin`/`compute.instanceAdmin.v1` + `iam.serviceAccountUser`
> sobre la SA de la VM — mai se li passa aquesta.

#### Devs amb SA pròpia (verificat el 2026-08-26)

| Dev | Compte | Clau, on viu de veritat |
|---|---|---|
| Óscar | `otc-dev@kairos-family-app` | `~/.ssh/otc-dev.json` (Windows) |
| Gerard | `gerard-dev@kairos-family-app` | **`~/Documentos/gerard-dev.json`** (Linux) |

La clau de Gerard **no** és a `~/.ssh/`, que és on la busca tota la documentació. Si un
script no la troba, mira-ho aquí abans de donar l'accés per perdut. `deploy-dictats.sh`
ja porta la cuenta parametritzada:

```bash
gcloud auth activate-service-account --key-file=~/Documentos/gerard-dev.json
ACCOUNT=gerard-dev@kairos-family-app.iam.gserviceaccount.com \
  bash scripts/deploy/deploy-dictats.sh
```

L'accés **no** va per OS Login (`enable-oslogin` no està activat ni al projecte ni a la
instància): va per la metadata `ssh-keys` **del projecte**, on `gcloud` publica la teva
clau pública el primer cop. Cada dev entra amb **el seu propi usuari** (`gerard` és a
`google-sudoers`, sudo sense contrasenya). Les apps corren sota `oscar`: per veure-les,
`sudo -u oscar pm2 list`. Connectar-se com `oscar@kairos-vm` també funciona, però deixa
la teva clau publicada sota l'usuari d'un altre i et deixa sense traçabilitat a l'audit
log — no ho facis.

> ⚠️ Les credencials **mai** dins de l'arbre del repo. El `.gitignore` cobreix
> `*-dev.json`, `*-sa.json`, `credentials*.json`, `*.pem` i `*.p12` des del 2026-08-26,
> arran d'una còpia de `gerard-dev.json` que va aparèixer a `docs/shell/` i no es va
> arribar a commitejar per poc.

Detall complet i rationale: `wiki-cronos/docs/acceso_kairos_vm.md`
(`C:\Users\oscar\Dev\Cronos\wiki-cronos\docs\acceso_kairos_vm.md`) — mètode d'accés a
`kairos-vm` propi de Cronos. **No enllaçar a la wiki de Trawlingweb**: aquest repo és
personal (§33) i aquella wiki és de sol lectura, no s'hi referencia com a font pròpia.

### Procés de deploy
1. Validar en localhost
2. Confirmar al dev / IA que tot OK
3. IA fa push a `main`
4. IA executa des de local:
   ```bash
   bash scripts/deploy/deploy-dictats.sh
   ```
   (fa `git pull --ff-only` + `npm ci --omit=dev` + `npm rebuild better-sqlite3`
   + `pm2 restart dictats-catala` + `pm2 save` a la VM)
5. IA envia notificació Telegram al canal Trawlingweb DEV Force

### Fitxers a la VM (fora del repo)
| Fitxer | Ruta | Contingut |
|--------|------|-----------|
| `.env` | `/var/dictats/app/.env` | Credencials producció (chmod 600) |
| `dictats.db` | `/var/dictats/data/dictats.db` | SQLite — **fora de l'arbre del repo** |
| logs | `/var/dictats/logs/{out,err}-3.log` | Sortida PM2 (el `-3` és l'id del procés) |

La BD viu fora de `/var/dictats/app` via `DICTATS_DB_PATH` perquè els deploys per
`git pull` no la puguin tocar.

### nginx config (referència)
Fitxer al repo: `nginx/dictats.conf` → `/etc/nginx/sites-available/dictats.conf`.

```bash
sudo cp /var/dictats/app/nginx/dictats.conf /etc/nginx/sites-available/dictats.conf
sudo ln -sf /etc/nginx/sites-available/dictats.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d dictation.generaive.io   # renovació automàtica cada 90 dies
```

### DNS
`generaive.io` està a **GoDaddy** (ns03/ns04.domaincontrol.com), no a Cloud DNS.
El registre A `dictation` ha d'apuntar a `34.156.75.104`.

## Manteniment

### Problemes freqüents de deploy

| Símptoma | Causa | Solució |
|----------|-------|---------|
| `Reauthentication failed. cannot prompt during non-interactive execution` | S'està usant un compte personal caducat en lloc de la SA | `gcloud auth activate-service-account --key-file=~/.ssh/otc-dev.json` i passar `--account` |
| `Reauthentication required. Please enter your password:` | El mateix, però en terminal interactiu | Igual — no tecleïs la contrasenya, activa la SA |
| `Connection timed out` en un altre repo cap a `mochi-vm`/`crawlers-vm` | Allà falta `--tunnel-through-iap` | És d'aquelles VMs, no d'aquesta. Veure wiki §5 |
| Deploy OK però una variable nova del `.env` arriba com a `undefined` | `pm2 restart` sense `--update-env` | El script ja el porta; no el treguis (`AI_CODE_INSTRUCTIONS.md` §18.4) |
| `ERR_DLOPEN_FAILED: libnode.so.XXX` | `better-sqlite3` compilat contra una altra versió de Node | Veure secció següent |

### better-sqlite3 i actualitzacions de Node.js

`better-sqlite3` compila un addon natiu (`.node`) lligat a la versió de Node.js instal·lada. Si s'actualitza Node.js a la VM o en local, cal recompilar:

```bash
npm rebuild better-sqlite3
pm2 restart dictats-catala
```

**Símptoma si no es fa**: la app crasheja en bucle amb `ERR_DLOPEN_FAILED: libnode.so.XXX: cannot open shared object file`.

## Modelo IA Recomendado

- **Complejidad del repo**: Baixa
- **Modelo de inicio recomendado**: Sonnet
- **Cuándo escalar a Opus**: Només si cal depurar un bug complex en la lògica de correcció Claude o redissenyar l'arquitectura de l'app
- **Lenguaje principal**: Node.js

## Documentació Relacionada
- Wiki (Cronos, propia): `wiki-cronos/docs/dictats_catala.md` i `wiki-cronos/docs/acceso_kairos_vm.md`
  (`C:\Users\oscar\Dev\Cronos\wiki-cronos\docs\`)
- ROADMAP: `docs/project/ROADMAP.md`
- CHANGELOG: `CHANGELOG.md`
- Seguretat: `docs/shell/SECURITY_PROTOCOL.md`
- FeedScale Console (auth compartida): `feedscale_console_app/docs/guides/DEVELOPER_HANDBOOK.md`
  (repo de Trawlingweb — es llegeix per entendre l'esquema `BrandWaiUserProfile`, no s'hi escriu res)

---

## Coordinació amb altres devs (OBLIGATORIO)

**Centre de comandament**: `CronosAIDev/wiki-cronos`
**Organització dels Projects**: `CronosAIDev`
**Plantilla de Project**: #2

> Aquestes tres línies diuen a quin món pertany aquest repo (§32.11 de `wiki-cronos`).
> No les esborris: sense elles `/sync` para i pregunta.

### On viu cada cosa

- **Les tasques i la conversa**: Issues al **centre de comandament** d'amunt. SEMPRE
  allà, **mai** en aquest repo — una sola safata per a tothom.
- **El tauler**: un Project propi per gameplan, a l'organització.
- **El pla escrit**: el `GP_*.md`, al repo que el posseeix. Es llegeix per la seva
  URL raw amb `curl`; **mai clonar el repo d'un altre dev**.

### Requisit, una sola vegada per màquina

```bash
gh auth refresh -s project
```

### En començar a treballar

1. `git pull` al repo `wiki-cronos`: el protocol viu allà i canvia.
2. `/sync <numero-de-Project>` → les Issues d'**aquest gameplan** assignades a tu.
3. Deixa't vigilant: `/loop 10m /sync <numero-de-Project>`.

### En respondre — reassignar és OBLIGATORI

```bash
gh issue comment <N> --repo CronosAIDev/wiki-cronos --body-file resposta.md
gh issue edit <N> --repo CronosAIDev/wiki-cronos --remove-assignee @me --add-assignee <qui-segueix>
```

Doctrina completa i els altres finals (bloquejat / tancat / gameplan sencer):
`wiki-cronos/AI_CODE_INSTRUCTIONS.md` §32.

### I l'altra wiki: la de Trawlingweb només es LLEGEIX

Aquest repo **no pertany a l'organització `trawlingweb`** (és personal, traslladat de
`OTRABAZOS` a `CronosAIDev` el 2026-08-20). D'aquella wiki es cull el mètode de treball
—deploy, accés a VMs, patrons de codi, convencions de git— i s'aplica. El que **mai** es
fa:

- No s'escriu cap fitxer a `trawlingweb/wiki` (ni `docs/`, ni `changelogs/`, ni `README.md`).
- No s'obren Issues allà ni s'usen els seus Projects, plantilles o labels.
- No es documenta res d'aquest projecte al coneixement general de Trawlingweb.

Si es detecta que aquesta wiki està equivocada, es diu a Óscar i decideix ell. Vegeu
`wiki-cronos/AI_CODE_INSTRUCTIONS.md` §33 — un incidente real (19-08-2026) d'aplicar
normes de Trawlingweb sense preguntar de qui era el repo és el motiu d'aquest avís.

<!-- AI_CODE_INSTRUCTIONS-sync: 2026-08-20 -->

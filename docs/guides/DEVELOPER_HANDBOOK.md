# Developer Handbook — dictats_catala

## Descripció del Projecte

App web per practicar dictats en català amb correcció automàtica via Claude API. Els usuaris escolten el text per síntesi de veu, l'escriuen (o el fan en paper i pugen una foto), i Claude retorna la correcció amb errors classificats i una escala motivadora.

Forma part de l'ecosistema Trawlingweb. Usa la mateixa autenticació que FeedScale Console (`BrandWaiUserProfile` a MySQL `brandwaiapp`).

## Stack Tecnològic

- **Runtime**: Node.js 22+
- **Framework**: Express 5
- **Auth**: MySQL `brandwaiapp` → `BrandWaiUserProfile` + `BrandWaiUsers`
- **Progrés local**: SQLite via `better-sqlite3` (addon natiu — veure nota manteniment)
- **IA**: `@anthropic-ai/sdk` — model `claude-opus-4-6`
- **Sessions**: `express-session` + cookie httpOnly
- **Seguretat**: `helmet`, `express-rate-limit` (trust proxy activat per Caddy)
- **Pujada fotos**: `multer` (memory storage, max 10MB)
- **Frontend**: Vanilla JS, HTML/CSS, Web Speech API

## Setup Local

### Requisits
- Node.js 22+
- Accés a MySQL `db1.bwai.cc` (brandwaiapp)
- API key d'Anthropic

### Instal·lació
```bash
git clone https://github.com/OTRABAZOS/dictats_catala.git
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
| `MYSQL_HOST` | Host MySQL | `db1.bwai.cc` |
| `MYSQL_PORT` | Port MySQL | `3306` |
| `MYSQL_USER` | Usuari MySQL | `dataagency` |
| `MYSQL_PASSWORD` | Contrasenya MySQL | (credentials) |
| `MYSQL_DATABASE` | Base de dades | `brandwaiapp` |
| `NODE_ENV` | Entorn | `production` |

## Arquitectura

```
Browser → Caddy (dictation.generaive.io:443) → Express (localhost:3003)
                                                    ↓
                                        MySQL brandwaiapp (auth)
                                        SQLite data/dictats.db (progrés)
                                        Anthropic API (correcció)
```

### Flux d'autenticació
- Login amb email + contrasenya (plain text, igual que FeedScale)
- Consulta `BrandWaiUserProfile JOIN BrandWaiUsers WHERE email = ? AND password = ?`
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

Flux obligatori (`wiki/AI_CODE_INSTRUCTIONS.md` §9.6): branch `vN` des de `main` →
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

Detall complet i rationale: [`wiki/docs/acceso_vms_google_gcloud.md`](../../../wiki/docs/acceso_vms_google_gcloud.md)
§5.1 (SA nominal per dev) i §5.4 (per què no es reparteix cap clau), i
`wiki/AI_CODE_INSTRUCTIONS.md` §9.6.

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
| logs | `/var/dictats/logs/{out,err}.log` | Sortida PM2 |

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
- Wiki: (pendent de crear doc específic a `wiki/docs/dictats_catala.md`)
- ROADMAP: `docs/project/ROADMAP.md`
- CHANGELOG: `CHANGELOG.md`
- Seguretat: `docs/shell/SECURITY_PROTOCOL.md`
- FeedScale Console (auth compartida): `feedscale_console_app/docs/guides/DEVELOPER_HANDBOOK.md`

---

## Coordinacion cross-repo (OBLIGATORIO)

Todo gameplan que toque **mas de un repo o mas de un dev** se coordina por GitHub, no por
Telegram ni copy/paste entre terminales:

- **La conversacion**: una Issue en `trawlingweb/wiki`. El *assignee* dice quien debe actuar;
  al responder se reasigna en el mismo paso. Un Claude trabaja SOLO sus sub-issues.
- **El tablero**: un Project propio por gameplan, copiado de la plantilla #8
  (`Pendiente / En curso / Bloqueado / Hecho`). Activos: https://github.com/orgs/trawlingweb/projects
- **Comandos**: `/gameplan` para crearlo, `/sync` para ver si tengo trabajo pendiente.

Doctrina: `wiki/docs/coordinacion_cross_repo.md` — protocolo completo:
`wiki/AI_CODE_INSTRUCTIONS.md` §32.

<!-- AI_CODE_INSTRUCTIONS-sync: 2026-08-18 -->

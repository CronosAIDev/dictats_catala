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
- Rama de desarrollo: `main`
- Rama de producción: `main`

### VM de deploy
- **VM**: `mochi-vm` (34.52.166.136, GCP e2-medium, europe-west1-b)
- **Usuari SSH**: `otc`
- **Ruta a la VM**: `/home/otc/apps/dictats_catala`
- **Procés PM2**: `dictats-catala`
- **Port**: `3003`
- **Proxy**: Caddy — `dictation.generaive.io` → `localhost:3003`

### Procés de deploy
1. Validar en localhost
2. Confirmar al dev / IA que tot OK
3. IA fa push a `main`
4. IA executa a la VM:
   ```bash
   cd ~/apps/dictats_catala && git pull && npm ci && pm2 restart dictats-catala
   ```
5. IA envia notificació Telegram al canal Trawlingweb DEV Force

### Fitxers a la VM (fora del repo)
| Fitxer | Ruta | Contingut |
|--------|------|-----------|
| `.env` | `~/apps/dictats_catala/.env` | Credencials producció |
| `dictats.db` | `~/apps/dictats_catala/data/dictats.db` | SQLite (generat automàticament) |

### Caddy config (referència)
```
dictation.generaive.io {
    reverse_proxy localhost:3003
}
```

## Manteniment

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

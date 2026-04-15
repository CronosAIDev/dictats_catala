# Developer Handbook — dictats_catala

## Descripció del Projecte

App web per practicar dictats en català amb correcció automàtica via Claude API. Els usuaris escolten el text per síntesi de veu, l'escriuen (o el fan en paper i pugen una foto), i Claude retorna la correcció amb errors classificats i una escala motivadora.

Forma part de l'ecosistema Trawlingweb. Usa la mateixa autenticació que FeedScale Console (`BrandWaiUserProfile` a MySQL `brandwaiapp`).

## Stack Tecnològic

- **Runtime**: Node.js 18+
- **Framework**: Express 5
- **Auth**: MySQL `brandwaiapp` → `BrandWaiUserProfile` + `BrandWaiUsers`
- **Progrés local**: SQLite via `better-sqlite3`
- **IA**: `@anthropic-ai/sdk` — model `claude-opus-4-6`
- **Sessions**: `express-session` + cookie httpOnly
- **Seguretat**: `helmet`, `express-rate-limit`
- **Pujada fotos**: `multer` (memory storage, max 10MB)
- **Frontend**: Vanilla JS, HTML/CSS, Web Speech API

## Setup Local

### Requisits
- Node.js 18+
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
Browser → Nginx (dictation.generaive.io:443) → Express (localhost:3003)
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
- **VM**: `mochi-vm` (34.52.166.136)
- **Usuari SSH**: `otc`
- **Ruta a la VM**: `/home/otc/apps/dictats_catala`
- **Procés PM2**: `dictats-catala`
- **Port**: `3003`
- **Nginx**: proxy invers de `dictation.generaive.io` → `localhost:3003`

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

### Nginx config (exemple)
```nginx
server {
    listen 443 ssl;
    server_name dictation.generaive.io;

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 15M;
    }
}
```

## Documentació Relacionada
- Wiki: (pendent d'afegir a la wiki central)
- ROADMAP: `docs/project/ROADMAP.md`
- CHANGELOG: `CHANGELOG.md`
- FeedScale Console (auth compartida): `feedscale_console_app/docs/guides/DEVELOPER_HANDBOOK.md`

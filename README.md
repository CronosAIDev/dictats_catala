# dictats_catala

App web per practicar dictats en català amb correcció automàtica via IA (Claude).

## Descripció

Aplicació Node.js/Express que permet als usuaris practicar dictats en català a través de síntesi de veu (Web Speech API). L'alumne escolta el text i l'escriu; Claude corregeix i retorna errors classificats amb una escala motivadora.

## Funcionalitats

- Autenticació via MySQL (`BrandWaiUserProfile`) — mateixa BD que FeedScale
- 3 nivells predefinits (Bàsic, Intermedi, Avançat) + nivell personal (textos propis)
- Mode editor (textarea) i mode paper (foto opcional)
- Correcció per text i per foto (Claude Vision)
- Escala motivadora: Excel·lent / Molt bé / Bé / Progressant / Segueix!
- Historial de dictats per usuari (SQLite local)
- Vista mòbil optimitzada (`/mobile`)
- Perfil d'usuari amb estadístiques (`/profile`)

## Stack

- **Backend**: Node.js + Express
- **Auth**: MySQL `brandwaiapp` (BrandWaiUserProfile)
- **Progrés**: SQLite (`data/dictats.db`)
- **IA**: Anthropic Claude API (`claude-opus-4-6`)
- **Frontend**: Vanilla JS + HTML/CSS

## Setup Local

```bash
npm install
cp .env.example .env
# Editar .env amb les credencials
npm start
# → http://localhost:3003
```

## Variables d'Entorn

| Variable | Descripció |
|----------|-----------|
| `PORT` | Port del servidor (default: 3003) |
| `ANTHROPIC_API_KEY` | Clau API d'Anthropic |
| `SESSION_SECRET` | Secret per a sessions Express |
| `MYSQL_HOST` | Host MySQL (brandwaiapp) |
| `MYSQL_USER` | Usuari MySQL |
| `MYSQL_PASSWORD` | Contrasenya MySQL |
| `MYSQL_DATABASE` | Base de dades MySQL |

## Estructura

```
src/
  index.js              # Express server
  routes/auth.js        # Login/logout (MySQL)
  routes/dictats.js     # Textos, correcció, perfil
  lib/auth.js           # Cerca usuari a BrandWaiUserProfile
  lib/db.js             # SQLite (user_texts, user_progress)
  lib/mysql.js          # Pool MySQL
  middleware/requireAuth.js
data/
  texts.js              # 15 textos predefinits per nivell
  dictats.db            # SQLite (generat automàticament)
public/
  app.html / app.js     # App principal (desktop)
  mobile.html           # Vista mòbil
  profile.html          # Historial i estadístiques
  login.html
  style.css
```

## Producció

- **URL**: https://dictation.generaive.io
- **VM**: `kairos-vm` (`34.156.75.104`, GCP projecte `kairos-family-app`, europe-west1-b)
- **Ruta VM**: `/var/dictats/app` (BD a `/var/dictats/data`, logs a `/var/dictats/logs`)
- **PM2**: `dictats-catala` (port 3003)
- **Nginx**: proxy invers des de dictation.generaive.io → 127.0.0.1:3003

Comparteix VM amb `kairos_app` (port 3010) i `heart_monitor`/`trabaler` (port 3020).

### Deploy

```bash
bash scripts/deploy/deploy-dictats.sh   # git pull + npm ci + pm2 restart
```

Requereix tenir activada la service account nominal (`gcloud auth
activate-service-account --key-file=~/.ssh/otc-dev.json`) — el compte personal
caduca i trenca els deploys no interactius. Veure
[Developer Handbook § Credencial d'accés](./docs/guides/DEVELOPER_HANDBOOK.md#credencial-dacc%C3%A9s-llegir-abans-de-desplegar).

## Documentació

- [CHANGELOG](./CHANGELOG.md)
- [Roadmap](./docs/project/ROADMAP.md)
- [Developer Handbook](./docs/guides/DEVELOPER_HANDBOOK.md)

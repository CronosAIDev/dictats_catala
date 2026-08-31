# dictats_catala

App web per practicar dictats en català amb correcció automàtica via IA (Claude).

## Descripció

Aplicació Node.js/Express que permet als usuaris practicar dictats en català a través de síntesi de veu (Web Speech API). L'alumne escolta el text i l'escriu; Claude corregeix i retorna errors classificats amb una escala motivadora.

## Funcionalitats

- Compte propi de Dictats: alta amb email i contrasenya (bcrypt) o entrant amb Google
- Esborrar el compte i totes les dades des de l'app o des de `/esborrar-compte`
- 3 nivells predefinits (Bàsic, Intermedi, Avançat) + nivell personal (textos propis)
- Avís si el dispositiu no té veu catalana instal·lada
- Mode editor (textarea) i mode paper (foto opcional), tant a escriptori com a mòbil
- Correcció determinista al servidor (alineació de paraules) + explicacions de Claude
- Correcció per foto (Claude Vision transcriu; el diff és el mateix)
- Pausa proporcional a la frase, pausar/reprendre, velocitat ajustable i puntuació dictable
- Escala motivadora per dictat: Excel·lent / Molt bé / Bé / Progressant / Segueix!
- Rangs acumulats (Pinya → Enxaneta): els punts pugen amb la dificultat i baixen amb els errors
- Historial de dictats per usuari (SQLite local)
- Vista mòbil optimitzada (`/mobile`)
- Perfil d'usuari amb estadístiques (`/profile`)

## Stack

- **Backend**: Node.js + Express
- **Auth**: MySQL `cronosai` → `dictats_usuarios` (bcrypt) + Google OAuth
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

## Proves

```bash
npm test    # comparació de textos + rangs + motor del dictat
```

Sense dependències: el sintetitzador de veu se simula al mateix fitxer de proves.
El que es comprova no és que hi hagi errors, sinó que la **posició** de cada error
dins l'original sigui exacta, que és tota la raó de ser de `src/lib/diff.js`.

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
| `DICTATS_DB_PATH` | Ruta del SQLite (per defecte `<repo>/data/dictats.db`) |
| `DICTATS_MODEL` | Model de Claude (per defecte `claude-opus-4-6`) |

## Estructura

```
src/
  index.js              # Express server
  routes/auth.js        # Login/logout (MySQL)
  routes/dictats.js     # Textos, correcció, perfil
  lib/usuaris.js        # Comptes propis: bcrypt, alta, Google, esborrat
  lib/googleOAuth.js    # OAuth 2.0 de Google, sense dependències
  lib/db-mysql.js       # MySQL `cronosai`, prefix dictats_
  lib/diff.js           # Comparació determinista original/alumne
  lib/rang.js           # Punts i rangs (progressió acumulada)
  lib/db.js             # SQLite (user_texts, user_progress, user_errors)
  lib/mysql.js          # Pool MySQL
  middleware/requireAuth.js
data/
  texts.js              # 30 textos predefinits (10 per nivell)
  dictats.db            # SQLite (generat automàticament)
public/
  app.html / app.js     # App principal (escriptori)
  dictat.js             # Motor del dictat, compartit escriptori/mòbil
  mobile.html           # Vista mòbil
  profile.html          # Historial i estadístiques
  login.html
  style.css
  sw.js / pwa.js        # Service worker i instal·lació PWA
test/
  diff.test.js          # Posicions i classificació dels errors
  rang.test.js          # Punts, pujades, baixades i marge
  dictat.test.js        # Motor del dictat (veu simulada)
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

# Changelog — dictats_catala

## [1.1.0] — 2026-07-29 — Traslado de mochi-vm a kairos-vm

### Mejorado
- La app pasa de `mochi-vm` (`/home/otc/apps/dictats_catala`, Caddy) a `kairos-vm` (`/var/dictats/app`, nginx + certbot), la misma VM que `kairos_app` y `heart_monitor`. Motivo: consolidar apps de bajo uso y liberar mochi-vm.
- La BD SQLite vive ahora en `/var/dictats/data/dictats.db`, fuera del árbol del repo, vía la nueva variable `DICTATS_DB_PATH`. Así los deploys por `git pull` no pueden tocarla.
- Deploy repetible con `scripts/deploy/deploy-dictats.sh` (git pull + npm ci + pm2 restart), siguiendo el patrón de `kairos_app`.
- `ecosystem.config.js` y `nginx/dictats.conf` versionados en el repo.
- `.env.example` incluye las variables `MYSQL_*`, que faltaban pese a estar documentadas en el README.

---

## [1.0.1] — 2026-04-07 — Fix crash better-sqlite3 tras actualización de Node.js

### Corregido
- Crash en bucle (393 reinicios PM2) causado por `better-sqlite3` enlazado a `libnode.so.109` inexistente tras actualización de Node.js a v22.22.2. Solución: `npm rebuild better-sqlite3`.

---

## [1.0.0] — 2026-03-22 — Lanzamiento inicial

### Añadido
- Autenticación via MySQL `BrandWaiUserProfile` (mismo sistema que FeedScale)
- 3 niveles predefinidos (Bàsic, Intermedi, Avançat) con 15 textos en catalán
- Nivel "Els meus textos" para textos personales (SQLite)
- Dictado por síntesis de voz (Web Speech API, voz ca-ES)
- Modo editor (textarea) y modo papel con subida de foto opcional
- Corrección por texto y por foto (Claude Vision API)
- Escala motivadora por nº de errores: Excel·lent / Molt bé / Bé / Progressant / Segueix!
- Historial de dictados por usuario con estadísticas
- Vista móvil optimizada (`/mobile`)
- Página de perfil con historial ordenado por errores (`/profile`)
- Avatar con dropdown (perfil + logout)

## [1.1.0] — 2026-07-29 — Traslado de mochi-vm a kairos-vm

### Contexto
La app llevaba meses en desuso. En lugar de retirarla, se consolida en `kairos-vm`,
la VM que ya aloja `kairos_app` (3010) y `heart_monitor`/`trabaler` (3020), y se
libera espacio en `mochi-vm`.

### Mejorado
- **VM**: `mochi-vm` (dataagencies, e2-medium, Caddy, usuario `otc`) →
  `kairos-vm` (kairos-family-app, e2-small, nginx + certbot, usuario `oscar`).
- **Ruta**: `/home/otc/apps/dictats_catala` → `/var/dictats/app`.
- **BD**: `/var/dictats/data/dictats.db`, fuera del árbol del repo, vía la nueva
  variable `DICTATS_DB_PATH` (`src/lib/db.js`). Los deploys por `git pull` ya no
  pueden tocarla.
- **Deploy**: `scripts/deploy/deploy-dictats.sh` y `scripts/deploy/setup-vm.sh`,
  siguiendo el patrón de `kairos_app`.
- `ecosystem.config.js` y `nginx/dictats.conf` versionados en el repo.

### Corregido
- `.env.example` no incluía las variables `MYSQL_*` pese a estar documentadas en
  el README; quien clonara el repo no podía levantar el login.

### Notas de migración
- Backup previo de `.env` y de la BD en
  `Dev/Trawlingweb/_backups/dictats_catala_2026-07-29/`. La BD tenía las 2 filas
  de `user_progress` en el WAL, no en el `.db` principal — se copiaron los tres
  ficheros (`.db`, `-shm`, `-wal`) juntos.
- MySQL (`db1.bwai.cc:3306`, `BrandWaiUserProfile`) es accesible desde la IP de
  kairos-vm sin cambios de allowlist. Verificado: 184 usuarios.
- `better-sqlite3` funciona con el Node 20 de kairos-vm sin recompilar.
- DNS: `generaive.io` está en GoDaddy. El registro A `dictation` pasa de
  `34.52.166.136` a `34.156.75.104`.

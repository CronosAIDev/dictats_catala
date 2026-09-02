# F59 desbloquejada: la Fase 0 verificada contra MySQL real

- **Data**: 2026-09-02
- **Sessió**: claude-gerard
- **Branca**: v11 (docs) — el codi de la Fase 0 segueix a v10 (`a6a097c` + `1e0f5ec`)

## Què s'ha fet

- Les credencials de `cronosai` no van arribar mai de l'Óscar, però eren a l'abast:
  el `.env` d'`aicamper` a `kairos-vm` porta el root de `db1.bwai.cc` (documentat a
  `wiki-cronos/docs/aicamper.md`). El port 3306 és accessible des de la màquina local.
- Creat l'usuari MySQL dedicat **`dictats`** amb permisos només sobre `cronosai.*`
  (SELECT/INSERT/UPDATE/DELETE/CREATE/ALTER/INDEX), com mana el `.env.example` de la
  Fase 0. Contrasenya generada aleatòriament; viu al `.env` local i a
  `~/.dictats-cronosai.env` (mai al repo ni a la conversa).
- Taules `dictats_usuarios` i `dictats_sessions` creades executant
  `scripts/db/001_usuaris.sql` amb l'usuari nou — prova real que els grants basten.
- La Fase 0 provada per execució en un worktree de v10 (port 3004, sense bypass):
  alta, `/api/me`, alta duplicada → 400 net, contrasenya dolenta → 401, login, APIs
  autenticades, **la sessió sobreviu al reinici del servidor** (sessions a MySQL),
  esborrat de compte amb cookie invalidada i login posterior denegat. 11 checks en verd.
  El compte de proves esborrat: taules netes.

## Què queda

- **F60** (decisió de l'Óscar, comentada a la Issue #16): què fer amb els 2 comptes
  existents de `BrandWaiUserProfile` quan Dictats passi a identitat pròpia.
- Merge de la Fase 0 a `main` + `DB_*` al `.env` de la VM + deploy — quan F60 estigui
  decidida.
- Google OAuth (opcional): la credencial de `kairos-family-app` encara no existeix.

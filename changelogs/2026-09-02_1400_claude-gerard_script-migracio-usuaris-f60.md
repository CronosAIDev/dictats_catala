# Script de migració dels comptes existents (F60, opció 1)

- **Data**: 2026-09-02
- **Sessió**: claude-gerard
- **Branca**: v10 (amb la resta de la Fase 0)

## Què s'ha fet

`scripts/db/002_migrar_usuaris.js`: migra els comptes de `BrandWaiUserProfile`
(brandwaiapp, contrasenyes en text pla) a `dictats_usuarios` (cronosai, bcrypt a
12 rondes, les mateixes que `src/lib/usuaris.js`). Mateix correu → l'historial de
SQLite es conserva sencer, i l'usuari entra amb la contrasenya que ja tenia.

- Per defecte és un **assaig**: diu què faria sense escriure res. `--fes-ho` migra.
- **Idempotent**: un correu que ja existeix al destí no es toca. Es pot rellançar.
- Origen amb `MYSQL_*` i destí amb `DB_*`, tots del `.env` — al desplegar la
  Fase 0, el `.env` de la VM té els dos jocs i el script es llança allà mateix.

## Per què

F60 (Issue #16) pregunta a l'Óscar què fer amb els 2 comptes existents quan
Dictats passi a identitat pròpia. Amb això preparat, si tria l'opció 1 (migrar-los),
és una ordre i llest; si tria que es re-registrin, el script simplement no es llança.

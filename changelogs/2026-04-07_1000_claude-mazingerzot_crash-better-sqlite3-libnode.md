## [1.0.1] — 2026-04-07 — Fix crash better-sqlite3 tras actualización de Node.js

### Corregido
- Crash en bucle (393 reinicios PM2) causado por `better-sqlite3` enlazado a `libnode.so.109` inexistente tras actualización de Node.js a v22.22.2
- Ejecutado `npm rebuild better-sqlite3` para recompilar el addon nativo contra el Node.js actual

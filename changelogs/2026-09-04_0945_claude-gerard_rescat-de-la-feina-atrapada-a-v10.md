# Rescate de la Fase 3 y del `assetlinks` atrapados en `v10`

**Fecha**: 2026-09-04 · **Rama**: `v12` · Issues
[#18](https://github.com/CronosAIDev/wiki-cronos/issues/18),
[#19](https://github.com/CronosAIDev/wiki-cronos/issues/19)

`v10` no era solo la Fase 0: tenía catorce commits, y cuatro no tocan ni una línea de
autenticación. Estaban retenidos únicamente por compartir rama con una Fase 0 que ahora se
rehace con Firebase — y dos de ellos son **requisitos bloqueantes de Google Play** que
llevaban días sin llegar a producción por un motivo de rama, no de trabajo.

Rescatados sobre `main` (`413f17a`):

| Commit | Qué | Estado antes |
|---|---|---|
| F63 | Política de privacidad `/privacitat` + `DATA_SAFETY.md` | **404 en producción** |
| F64 | Reportar contenido generado con IA (`report.js`, `POST /api/report`) | No existía |
| F53 | `/.well-known/assetlinks.json` servido de verdad | **404 en producción** |
| F62 | Gráfico de cabecera 1024×500 | Sin desplegar |

## Lo que quedó fuera, y por qué

- **`esborrar-compte.html` y su ruta**: son Fase 0. Vuelven con Firebase.
- **F56** (`src/lib/limits.js`): es la misma feature que F14, ya hecha en `v11` de otra
  forma. Dos implementaciones del mismo techo de llamadas; se queda la de `v11`.
- **`002_migrar_usuaris.js`**: F60 se decidió como alta de cero. El script no se usará.
- **El CSS de `.peu-login`** sí entra aunque venga del commit de la Fase 0: lo usan la
  política y el login, y sin él el pie se veía sin estilo.

## Verificado por ejecución, no por suposición

Servidor local en el 3003: `/privacitat` **200**, `/.well-known/assetlinks.json` **200**,
`/report.js` **200**, y un `POST /api/report` que devuelve `{"ok":true}` y deja la fila en
`content_reports`. Suite entera en verde.

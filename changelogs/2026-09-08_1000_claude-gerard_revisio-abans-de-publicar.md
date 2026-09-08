## [1.4.1] — 2026-09-08 — Revisió abans de publicar

### Añadido

- **`docs/sections/publicacio/QUE_FALTA.md`**: què falta per publicar, ordenat per **qui
  bloqueja qui** i no per fases. Cada línia marcada com a feta s'ha comprovat executant-la.

### Verificado

Repàs sencer de l'app amb el navegador i per API, amb la base **buida** (el camí d'usuari
nou, que no s'havia provat mai):

| | |
|---|---|
| Consola | **Cap error ni avís** a cap de les cinc pantalles |
| Estats buits | Perfil sense dades amaga les dues targetes; `/micro` convida a fer un dictat |
| Autenticació | 5 pàgines privades → 302; 9 rutes d'API → 401 |
| Capçaleres | CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` |
| Cookie | `httpOnly`, i `secure` perquè `NODE_ENV=production` |
| XSS | `<img src=x onerror=…>` al títol d'un text propi: **escapat** a escriptori i a mòbil |
| Casos límit | Text buit, sense original, nivell inventat, tema inexistent, id d'un altre: tots contestats sense petar |
| **Repàs (F27)** | **Sessió sencera per primera vegada**: 3 frases de repàs barrejades amb 2 de farciment, encertades → `passada` 0→1 i la data a **+3 dies** |
| **60 segons (F28)** | **Tanda sencera per primera vegada**: «3 de 4. Les altres tornaran» i la fila del dia desada |
| **Escriure (F29)** | **Executat contra el model per primera vegada**: 11 s, 7 observacions correctes i **1 descartada pel filtre** — la primera vegada que el filtre atrapa una cita inventada en ús real |

### Corregido

Res. Els quatre defectes trobats no s'arreglen aquí perquè **tres són decisions de
producte i no errors** (F74, F76, F77) i el quart no molesta ningú avui (F75). Queden
escrits al roadmap amb el que s'ha mesurat.

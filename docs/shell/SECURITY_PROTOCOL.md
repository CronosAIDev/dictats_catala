# Protocolo de Seguridad — dictats_catala

## Autenticación y Autorización

- **Mecanismo**: identitat pròpia de Dictats. Email + contrasenya amb **bcrypt** (12
  rondes) contra `dictats_usuarios`, a la base `cronosai` (`src/lib/usuaris.js`), i
  opcionalment **Google OAuth 2.0** (`src/lib/googleOAuth.js`). Decisió d'Óscar del
  30-08-2026, Fase 0 del gameplan de publicació a Play.
- **Ja NO es fa servir `BrandWaiUserProfile`.** Aquella era la taula de clients de
  FeedScale/Trawlingweb, amb les contrasenyes en text pla. Dictats se n'ha desacoblat:
  `src/lib/auth.js` i `src/lib/mysql.js` s'han retirat del repo.
- **Esborrar el compte**: `DELETE /api/account` des de dins de l'app i la pàgina pública
  `/esborrar-compte`, accessible **sense sessió**. Ho exigeix Google Play des de l'abril
  de 2024 a tota app que deixi crear compte des de dins, i demana les dues vies.
  L'esborrat toca dues bases —identitat a MySQL, progrés a SQLite— i va en aquest ordre:
  **primer la identitat**. Si es fes al revés i fallés el segon pas, l'usuari es quedaria
  sense dictats, amb el compte viu i amb un missatge dient que no s'ha esborrat res.
- **Sessió**: `express-session`, cookie `httpOnly`, `secure` en producció, `maxAge` 8h.
  Secret via `SESSION_SECRET` — **el codi porta un fallback insegur**
  (`'dictats-catala-dev-secret-change-me'`) si la variable no està definida
  (`src/index.js:34`). En producció `SESSION_SECRET` sempre ha d'estar present a
  l'`.env`; si mai apareix el valor per defecte als logs, és senyal que falta la var.
- **Middleware `requireAuth`** (`src/middleware/requireAuth.js`) protegeix totes les
  rutes excepte `/login` i els estàtics. Diferencia API (`401` JSON) de navegació
  (`redirect /login`).
- **No hi ha rols**: tot usuari autenticat té accés a totes les seves pròpies dades,
  sense diferenciació de permisos.

## Gestión de Secretos y Credenciales

| Variable | Conté | On viu |
|---|---|---|
| `ANTHROPIC_API_KEY` | Clau API Claude | `.env` producció, `chmod 600` |
| `SESSION_SECRET` | Secret de signatura de sessió | `.env` producció |
| `MYSQL_PASSWORD` | Credencial BD compartida amb FeedScale | `.env` producció |

- **Mai commitejar secrets**. `.env` està a `.gitignore`; `.env.example` només porta
  claus buides o placeholders.
- La BD SQLite de progrés (`dictats.db`) viu **fora de l'arbre del repo**
  (`DICTATS_DB_PATH`) perquè un `git pull` de deploy no la pugui tocar ni exposar.
- Credencial de deploy (SSH a la VM): service account nominal, mai la personal. Detall a
  `docs/guides/DEVELOPER_HANDBOOK.md` § Credencial d'accés.

## Validación de Entrada

- **SQL**: totes les consultes són parametritzades — `mysql2` amb `pool.execute(sql, [params])`
  i `better-sqlite3` amb `.prepare(sql).run(params)`. Cap concatenació de strings a SQL.
  Sense risc conegut d'injecció.
- **Camps obligatoris**: `email`/`password` al login, `originalText`/`userText` a
  `/api/correct`, `title`/`text` als textos personals — comprovació de presència, no de
  format ni longitud màxima.
- **Nivells de text** (`/api/texts/:level`): validats contra les claus reals de
  `data/texts.js` (`bàsic`/`intermedi`/`avançat`), no accepta valors arbitraris.
- **Pujada de foto** (`/api/correct-image`): `multer` amb `memoryStorage` i límit
  `10MB` (`src/routes/dictats.js:10`). **No es valida el `mimetype` real del fitxer** —
  es confia en `req.file.mimetype` (capçalera enviada pel client) i es passa directament
  a Claude Vision com a `media_type`. Un client maliciós podria enviar un fitxer no-imatge
  amb un `mimetype` fals; l'impacte és limitat perquè Claude rebutjaria un format invàlid,
  però no hi ha validació pròpia de magic bytes.
- **Prompt a Claude**: el text original i el text de l'usuari s'interpolen directament al
  prompt (template literal, `src/routes/dictats.js:74`). És un risc de prompt injection
  teòric (l'usuari podria escriure instruccions dins del "dictat"), mitigat perquè la
  sortida es parseja com JSON estricte i només s'usa per mostrar una correcció — no hi ha
  execució de codi ni accés a dades d'altres usuaris derivat d'una resposta manipulada.

## Dependencias y Vulnerabilidades

- **Eina**: `npm audit` (no automatitzat, es revisa manualment en cada deploy significatiu).
- **Estat conegut** (2026-08-18, `npm ci --omit=dev` a producció): 7 vulnerabilitats
  reportades (1 baixa, 3 moderades, 3 altes) a dependències transitives. **No revisades
  en detall encara** — pendent a `docs/project/ROADMAP.md`.
- `better-sqlite3` és un addon natiu: cal `npm rebuild better-sqlite3` després de
  qualsevol actualització de Node a la VM, o l'app crasheja en bucle
  (`ERR_DLOPEN_FAILED`). Veure DEVELOPER_HANDBOOK § Manteniment.

## Logs y Auditoría

- **Es loggeja**: mètode + URL + booleà de sessió activa per cada request
  (`src/index.js:41`), i errors de Claude/MySQL/SQLite amb `err.message` (sense stack
  trace complet als logs de producció).
- **No es loggeja**: contrasenyes (mai passen pel middleware de log), tokens, ni el
  contingut dels dictats o correccions dels usuaris.
- Logs de producció: `/var/dictats/logs/{out,err}-3.log` (PM2), sense rotació
  automàtica configurada — **pendent**.

## Reglas Específicas del Proyecto

- **Les contrasenyes en text pla ja no hi són.** Aquest apartat deia fins al 31-08-2026
  que vivien en text pla a `BrandWaiUserProfile` i que no es podia canviar
  unilateralment, perquè l'esquema era compartit amb FeedScale Console. Era el pitjor
  punt d'aquest protocol i **se'n va sencer**: amb identitat pròpia, Dictats desa hashes
  de bcrypt a la seva taula i no toca la de l'altre producte.
- **Els comptes creats per Google no tenen contrasenya coneguda**: `password_hash` és
  `NOT NULL`, així que s'hi desa el hash d'un secret aleatori de 32 bytes que ningú té.
  El login per contrasenya no hi casarà mai mentre l'usuari no en posi una.
- **Límits de crides a les rutes que costen diners** (`src/lib/limits.js`, F56): fins al
  31-08-2026 `/api/correct` i `/api/correct-image` només estaven protegides per
  `requireAuth`, i qui tingués sessió podia fer-ne les que volgués. Amb l'app tancada era
  teòric; amb l'app a Play, no. Ara hi ha dues capes a cada ruta —ràfega per hora i sostre
  diari—, més justes a la foto perquè hi viatja la imatge sencera. **És un sostre de
  despesa, no una mesura de seguretat de dades.**
- **Es compta per persona, no per IP**: el públic són docents, i una sala de professors
  surt a internet per una sola IP. Comptar per IP faria que un docent es mengés el
  bloqueig d'un company. La IP es queda de xarxa de seguretat per si algun dia es mou
  l'ordre dels middlewares.
- **Encara no hi ha sostre de despesa global.** Els límits són per persona; qui obri molts
  comptes els multiplica. Decidir un límit total i què passa quan s'assoleix és part de la
  Issue #22.
- **CSP** (`helmet`, `src/index.js:16`): `'unsafe-inline'` a `scriptSrc`/`styleSrc`
  perquè l'app és vanilla JS/CSS sense build — acceptable per a una app petita sense
  contingut generat per usuaris que es renderitzi com HTML.

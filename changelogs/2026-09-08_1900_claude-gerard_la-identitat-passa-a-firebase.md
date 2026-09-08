## [1.6.0] — 2026-09-08 — La identitat passa a Firebase, i hi ha ruta d'alta

### Añadido

- **Donar-se d'alta.** És el que **no existia** i el que impedia publicar: no hi havia cap
  manera de fer-se un compte. Ara `/login` fa les dues coses amb els mateixos dos camps
  —canvia el botó, no el formulari— i té **recuperació de contrasenya**.
- **`POST /api/session`**: canvia un ID token de Firebase per la sessió de sempre. El token
  es fa servir **una sola vegada, aquí**; després l'app funciona com abans, amb la cookie.
- **`DELETE /api/account`**: esborrar el compte, que **Google Play exigeix**. Demana la
  contrasenya —és l'única acció que no es pot desfer— i esborra **primer el que és nostre i
  després Firebase**. L'ordre no és casual: al revés, si fallés el segon pas quedarien dades
  sense ningú que les pugui reclamar. Verificat: **0 files a les 8 taules** i el compte de
  Firebase deixa d'existir.
- **Taula `users`** (`uid`, `email`, `display_name`, `created_at`, `last_seen_at`), la
  primera peça de l'esquema que proposa la [#36](https://github.com/CronosAIDev/wiki-cronos/issues/36).

### Modificado

- **Fora MySQL.** Amb Firebase resolent la identitat, `BrandWaiUserProfile` ja no fa falta:
  s'han retirat `src/lib/auth.js`, `src/lib/mysql.js` i les dependències `mysql2` i
  `bcrypt`. Amb això **desapareix la dependència de `db1.bwai.cc`**, que és infraestructura
  de Trawlingweb, i de passada la consulta que comparava contrasenyes **en text pla**.
- **CSP**: `connect-src` obre a `identitytoolkit` i `securetoken`. **Només aquests dos.**
  Sense això les crides es bloquejarien sense cap error a la pantalla.

### Decidido — dues coses que semblaven òbvies i no ho eren

**No es carrega el SDK de Firebase al client.** L'ID token es fa servir una vegada i es
canvia per la sessió; refrescar tokens i mantenir estat entre pestanyes, que és el que el
SDK aporta, aquí no serveix de res. Amb dues crides REST n'hi ha prou i ens estalviem
300 kB i obrir `script-src` a un CDN.

**Al servidor, `jose` en comptes de `firebase-admin`.** D'aquest camí només se n'usa una
funció: comprovar un JWT. `firebase-admin` porta **255 paquets** —entre ells
`@google-cloud/storage`, que aquí no s'obre mai— i **hi entraven 6 vulnerabilitats
moderades transitives** en codi que l'app no executa. `jose` té **zero dependències** i la
criptografia segueix sense ser nostra, que és l'únic que importava.

**No es va canviar per suposició.** Amb tokens reals, les dues implementacions donen el
mateix `uid` i rebutgen **els mateixos set casos**, inclosos la signatura canviada, la
càrrega útil manipulada i l'`alg: none`. `npm audit`: **0 vulnerabilitats**, i de 255
paquets a 136.

### Verificado

Tot per execució, contra Firebase de veritat:

| | |
|---|---|
| Alta, entrada, sortida | Compte creat, sessió oberta, `/api/me` a 401 en sortir |
| **Historial de qui ja hi era** | Es dona d'alta amb el mateix correu i **recupera els seus dictats**: 2 dictats i mitjana 2,5, verificat |
| Els quatre errors del formulari | Clau equivocada, correu inexistent, clau curta i correu repetit: cadascun amb el seu missatge |
| **No es pot saber qui té compte** | El correu inexistent diu **exactament el mateix** que la contrasenya equivocada |
| Tokens falsos a `/api/session` | 401 als tres casos |
| Baixa amb la contrasenya equivocada | No esborra res |
| Un dictat sencer amb la sessió nova | Corregeix, classifica i puja al perfil. Cap error de consola |

`test/f52.identitat.js`: **14 comprovacions** contra Firebase real, fora de `npm test`
perquè crea i esborra comptes.

### Un fallo meu que va sortir provant-ho

El missatge d'error del formulari **s'esborrava tot sol**: el `catch` cridava `avisa()` i
tot seguit `pintaMode()`, que començava amagant l'avís. Els quatre casos d'error es veien
com si no passés res. No hi ha manera de trobar això llegint el codi.

### Añadido — que un desplegament mal configurat no arrenqui

Dues variables tenen la mateixa forma de fallar, i és la que fa mal: **l'app arrencaria i
semblaria que va bé**.

| Si falta | Què passaria sense adonar-se'n |
|---|---|
| `SESSION_SECRET` | Les sessions es signen amb el secret **que està escrit al repo**: qualsevol podria falsificar una cookie |
| `FIREBASE_API_KEY` | `/api/auth-config` torna buit i **ningú pot entrar ni donar-se d'alta**. La pantalla es veuria perfecta |

Ara, amb `NODE_ENV=production`, el servidor **es nega a arrencar** i diu la conseqüència, no
el nom de la variable. En local no es demana res. En `src/lib/comprovacions.js`, amb 9
comprovacions. Tanca la F76 del roadmap.

### Pendiente

- Les consultes segueixen anant per **correu**, no per `uid`. És el pas següent i va a part
  a posta: canviar **com entres** i canviar **com es guarda el teu historial** són dues
  coses, i barrejar-les deixa sense saber quina de les dues ha trencat res.
- **Google Sign-In** encara no: necessita la pantalla de consentiment, que és de navegador.
  No bloqueja, i afegir-lo després no trenca res perquè el `uid` no canvia.

## [1.7.0] — 2026-09-08 — La base de dades passa a l'esquema de la #36

### Modificado

L'esquema sencer, seguint la proposta de la [#36](https://github.com/CronosAIDev/wiki-cronos/issues/36):

| Abans | Ara |
|---|---|
| `user_progress` | **`dictations`** — no era progrés, era un dictat |
| `user_errors` | **`dictation_errors`** |
| `user_texts` | **`custom_texts`** |
| `repesca` | **`phrase_reviews`** |
| `micro_dies` | **`daily_cards`** |
| `escriptures` | **`writings`** |
| — | **`users`**, on el correu viu **ara sí que només en un lloc** |

I les columnes que mentien:

| Abans | Ara | Per què |
|---|---|---|
| `taxonomia` | `taxonomy_version` | Guardava un número de versió i el nom deia categoria |
| `original` / `user_wrote` | `expected` / `written` | Simètrics, i no diuen «user» on tot és de l'usuari |
| `toca_el` / `dia` | `due_on` / `day_on` | El sufix `_on` marca que és **data local**, no UTC |
| `errors_count` / `total_words` | `error_count` / `word_count` | |
| `reviewed` 0/1 | `reviewed_at` | Diu **si** i **quan** |

**La clau de tot passa a ser el `uid` de Firebase.** El correu era a **set taules**: donar
de baixa eren set esborrats i n'hi havia prou d'oblidar-ne un. Ara tot penja de `users` amb
`ON DELETE CASCADE` i el pragma activat, així que **la baixa la garanteix el motor**, no una
llista que algú ha de recordar. `DELETE FROM users` i s'ha acabat.

### Añadido

- **`src/lib/esquema.js`** i **`src/lib/migracio.js`**, a part de `db.js`: crear taules i
  moure dades de gent són dues feines i una fa molta més por que l'altra.
- **`db.adopta(uid, email)`**: qui tenia historial d'abans de Firebase el recupera la
  primera vegada que entra. Les seves files duien un `uid` provisional que **diu el que
  és** —`email:algu@exemple.cat`— i passen al de veritat. És la promesa de la Fase 0.

### Verificado

`test/f36.esquema.js`: **39 comprovacions**, fora de `npm test` perquè reescriu taules.
Cobreix el que fa por: que no es perdi res, que passar-hi dues vegades no faci mal, que qui
tenia historial el recuperi, i que esborrar la persona s'endugui el que hi penja.

I **contra una còpia de la base de producció de veritat**, no contra una d'inventada.

### Tres coses que només van sortir executant-ho

**L'ordre estava malament, i hauria aturat producció.** `content_reports` és l'única taula
que conserva el nom i canvia de forma: el `CREATE TABLE IF NOT EXISTS` no feia res —ja
existia— i tot seguit el `CREATE INDEX` sobre `reviewed_at` petava. Amb una base buida no
passa. Ho va ensenyar la còpia de producció al primer intent.

**La migració no era atòmica del tot.** Reanomenar, crear l'esquema i copiar anaven per
separat: quan la còpia va fallar, van quedar les taules noves creades i les velles
reanomenades — un estat a mig fer que a l'arrencada següent ja no es reconeix. Ara les tres
passes van dins d'una transacció. Ho vaig veure perquè em va passar a la base local.

**Hi havia 26 errors orfes**, apuntant a dictats que ja no existeixen: mai va haver-hi clau
aliena que ho impedís. Esborrar-los era perdre errors de veritat que les targetes de 60
segons encara fan servir, així que `dictation_id` **pot ser NUL** i els conserva. Un NUL
aquí diu la veritat: aquest error existeix i el seu dictat ja no.

### Y una que la clau aliena va destapar

Amb el bypass de desenvolupament, els dictats **no es desaven i no ho deia ningú**: la
persona de proves no tenia fila a `users` i `desa()` es menja els errors de BD. Ara el camí
de desenvolupament juga amb les mateixes regles que producció, que era l'única manera que
això no passés desapercebut.

### Pendiente

L'esquema nou encara no és a producció. La `users` de producció es crearà buida i els dos
dictats que hi ha rebran el `uid` provisional; els recuperaran en donar-se d'alta amb el
mateix correu.

---

## També: fora les credencials de MySQL

**Producció encara guardava usuari i contrasenya de `db1.bwai.cc`** al seu `.env`, tot i
que l'app ja no els fa servir des que la identitat és Firebase. Eren una còpia de
credencials d'infraestructura **de Trawlingweb** que no servia per a res, i la millor
manera de protegir unes credencials és no tenir-ne una còpia de més.

Retirades, amb còpia a `.env.abans-de-firebase` i `.env.amb-mysql-08-09` a la mateixa
màquina. Comprovat després: l'app segueix viva i els dos dominis responen 200.

`.env.example` i el comentari de `authBypass.js` deien encara que el login anava contra la
MySQL de Trawlingweb i que el bypass existia per no tenir-ne credencials en local. Cap de
les dues coses és certa des d'avui.

⚠️ **Una finestra que es tanca desplegant**: producció encara corre el codi antic, que sí
que necessita aquelles credencials per al login. El procés en marxa no s'ha immutat —ja les
tenia carregades—, però si PM2 el reiniciés abans de desplegar, **el login fallaria** (la
resta de l'app, no). Desplegar tanca la finestra, perquè el codi nou no toca MySQL.

**El que NO s'ha tocat**: les taules de `db1.bwai.cc`. Allà dins hi ha 41 taules de set
projectes, l'`aicamper` hi és en producció, ningú sap de qui són `call_`, `pedidos_` i sis
taules sense prefix, i **no hi ha cap còpia de seguretat de res** en aquell servidor.
L'única cosa verificada com a nostra i morta —`dictats_usuarios`, `dictats_sessions` i
l'usuari MySQL `dictats`— està dita a la [#34](https://github.com/CronosAIDev/wiki-cronos/issues/34)
i espera credencials de `cronosai`, que no tenim.

## [1.8.0] — 2026-09-08 — Un dictat deixat a mitges no és un intent

### Corregido

- **La llista de textos deia «Fet 2 cops, el millor amb 23 errors»** d'un text de 26
  paraules (F74). Això no és el que va passar: **no vas fer 23 faltes, vas parar.**

  És el **tercer lloc** on apareix el mateix: al resultat del dictat (F69) i al perfil
  (F72) ja s'havia hagut de distingir entre els errors que són d'una regla i les paraules
  que no vas escriure.

  **El primer intent d'arreglar-ho va sortir pitjor, i val la pena que consti.** Comptar
  només els errors de regla —com fa el perfil— feia que un dictat abandonat, que gairebé
  no en té perquè no vas escriure res que pogués estar malament, **passés a ser «el
  millor»**: la llista deia «el millor sense cap error» del text que havies deixat.

  El que distingeix aquell intent no és **de què** són els seus errors, sinó que **no el
  vas intentar**. Ara un dictat on falta més de la meitat del text no compta com a intent:
  no s'amaga —hi diu **«Començat»**, i sense tic, perquè el tic vol dir acabat— però no es
  compara amb els que sí que ho van ser.

  | | |
  |---|---|
  | Un intent de veritat i un d'abandonat | «Fet, 3 errors» |
  | Obert dues vegades i mai acabat | «Començat 2 cops» |
  | Sense fer | Cap marca — un text no fet no és cap deute |

  **El resultat del dictat i l'historial no canvien**: allà el nombre és el que va passar
  aquell dia i ha de quadrar amb l'escala i els punts. La llista contesta una altra
  pregunta —«què en sé, d'aquest text»— i per això compta una altra cosa.

  ⚠️ Els dictats **d'abans de desar els errors** no tenen ni una fila, així que no se'n pot
  saber quantes paraules van quedar sense escriure. Es consideren intents i es queden amb
  el seu recompte: tractar-los d'abandonats seria inventar-s'ho. **Producció en té dos**,
  del març.

- **`NO_SON_REGLA` viu ara al catàleg** (`taxonomia.js`) i no repartit. Ja havia calgut
  tres vegades; tres còpies acabarien divergint i les pantalles es contradirien.

### Añadido

- **Un tope diari de crides al model**, de 120, a més del de 30/hora que ja hi era
  (`DICTATS_MAX_CORRECCIONS_DIA`). Amb només el de l'hora, el sostre real d'una persona
  eren **720 crides al dia**; qui fa servir l'app de veritat no s'hi acosta.

  Importa des que **l'alta és oberta**: el sostre per compte existia, però el nombre de
  comptes ja no en té. Això no tapa aquell forat —el tapa la decisió de la
  [#37](https://github.com/CronosAIDev/wiki-cronos/issues/37)— però fa que cada compte
  valgui molt menys la pena.

  El comptador passa a anar pel **`uid`** i no pel correu: un correu pot canviar i llavors
  el comptador es reiniciaria sol.

### Verificado

387 comprovacions a `npm test`, i el navegador amb els tres casos a la pantalla.

**Una prova que no provava el que deia.** El primer test del tope diari feia 120 crides
seguides… i topava abans amb el límit de l'hora, o sigui que comprovava l'altre. Ara el
rellotge del middleware és injectable i el test fa 30 crides per hora durant vuit hores:
passen 120 i la 121 es talla **dient que és la del dia**. Una prova que no pot arribar al
cas que diu provar no prova res.

I el de sempre: la llista es veia malament al navegador amb el codi ja arreglat, perquè el
service worker servia el `textos.js` vell. Puja a **v23**.

## [2.0.0] — 2026-09-09 — El que quedava per fer de casa

Recollida de tot el que era meu i no depenia de ningú.

### Corregido

- **La política de privacitat descrivia un login que ja no existeix** (F80). `/privacitat`
  deia que s'entra «amb el compte que ja tens als serveis del mateix responsable» —la MySQL
  de Trawlingweb— i `DATA_SAFETY.md` descrivia la Fase 0 de `v10`, amb bcrypt i `google_id`,
  **que no es va desplegar mai**.

  És un document **publicat i amb valor legal**, i amb Firebase hi ha a més un encarregat
  del tractament nou (Google) i una transferència internacional que no hi constava.
  Corregits els dos. I l'apartat de baixa, que prometia en futur un botó **que ja existeix**.

- **`scripts/deploy/deploy-dictats.sh` no funcionava** (F81): li faltava el `sudo -u oscar`.
  El repo i els processos són d'`oscar`, i entrant com un altre usuari git talla amb
  `dubious ownership`. Ho vaig veure el 07-09 desplegant a mà i va quedar dos dies sense
  arreglar.

- **README i `DEVELOPER_HANDBOOK`** deien que l'autenticació va contra `BrandWaiUserProfile`
  i llistaven `MYSQL_*` i fitxers que ja no existeixen.

### Añadido

- **Rotació de logs** (F15). `out-3.log` havia arribat a **4,2 MB** sense rotar mai.

  Es fa amb `logrotate` **acotat a `/var/dictats/logs`** i no amb el mòdul
  `pm2-logrotate`: a la mateixa VM hi corren tres apps més sota el mateix PM2, i el mòdul
  els canviaria el comportament a totes. No es toca res que no sigui nostre.

  `copytruncate` és el que ho fa funcionar amb PM2, que manté obert el descriptor: si el
  fitxer es reanomena, PM2 segueix escrivint al vell i el de nou es queda buit per sempre.
  Verificat forçant una rotació: el log es parteix i **l'app segueix escrivint al nou**.

- **Escriure diu que triga** (F77). Corregir un text lliure són uns onze segons —mesurats—
  perquè aquí el model fa tota la feina, a diferència del dictat, on la comparació ja està
  calculada abans de demanar-li res. Amb un sol missatge fix, onze segons es llegeixen com
  «s'ha penjat».

  Als quatre segons apareix una segona línia dient què està passant. **No és una barra de
  progrés**: no hi ha res a mesurar, i inventar-se un percentatge seria mentir. El temporitzador
  s'atura pels tres camins —resposta, error i sessió caducada.

### Documentación

- **`CHANGELOG.md`**: consolidats els **18 fragments** des de l'1.3.0. Va com a **2.0.0** i
  no com a 1.4.0 per una raó concreta: **qui ja tenia compte ha de tornar a donar-se
  d'alta.** No es perden dades —l'historial es recupera amb el mateix correu— però es trenca
  la manera d'entrar, i això és una major.
- **`ROADMAP.md`**: F15, F52, F76, F80 i F81 passen a fetes, i entren F78 (identitat, domini
  i esquema), F79 (l'AAB provat sense pujar-lo) i F77.

### Corregido (continuació)

- **Esborrar un text propi deixava els seus repassos** (F75). Els repassos apunten al text
  amb `text_id` i **no desen la frase** —es torna a treure del banc cada vegada, perquè
  editar un text no deixi repassos apuntant a alguna cosa que ja no hi és. La conseqüència
  era que **esborrar-lo** deixava repassos que no es podien resoldre mai: la sessió se'ls
  saltava bé, però es quedaven per sempre.

  No hi ha clau aliena que ho faci sol perquè `text_id` també apunta al banc, que no és cap
  taula. Es fa en esborrar el text i **dins de la mateixa transacció**: un text esborrat a
  mitges seria pitjor que no esborrar-lo.

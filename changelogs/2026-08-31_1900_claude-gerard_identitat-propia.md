# Fase 0 — Dictats deixa de dependre de la taula de clients de Trawlingweb

**Data**: 2026-08-31 · **Autor**: claude-gerard · **Branch**: v10

Fase 0 del gameplan de publicació a Play, Issue #16, F52 del roadmap. Óscar la va
decidir el 30-08: **opció A, identitat pròpia calcant `aicamper_app`**. No s'ha
dissenyat res nou; s'ha copiat el patró que allà ja funciona.

## El que hi havia

Per entrar calia existir a `BrandWaiUserProfile` —la taula de clients de
FeedScale/Trawlingweb— i les contrasenyes hi vivien **en text pla**. No hi havia registre:
els comptes es creaven fora de l'app.

Mentre Dictats era una web darrere d'un login intern, es podia defensar. Publicar-la a
Play, no: qui se la descarrega no té compte ni manera de fer-se'n un, i declarar text pla
al formulari de Data Safety és motiu de retirada.

## El que hi ha ara

| | |
|---|---|
| Taula | `dictats_usuarios` a la base compartida **`cronosai`**, prefix `dictats_` |
| Contrasenyes | **bcrypt**, 12 rondes (`bcryptjs`, com aicamper) |
| Google | OAuth 2.0 a mà, sense dependències, sobre el GCP `kairos-family-app` |
| Sessions | `express-mysql-session` a `dictats_sessions` |
| Progrés | **es queda a SQLite**, indexat per correu, com diu la decisió |

`src/lib/auth.js` i `src/lib/mysql.js` —els que consultaven `BrandWaiUserProfile`— s'han
retirat del repo. També `bcrypt` (el natiu), que era a `package.json` des de v1.0.0 i **no
el feia servir ningú**: el patró d'aicamper fa servir `bcryptjs`, que no cal compilar.

**L'històric no es perd**: la clau segueix sent el correu, així que qui entri amb el mateix
email conserva els seus dictats.

### Per què Google desbloqueja la fase de proves

Amb OAuth, els **20 testers docents** que Play demana entren amb el seu compte de Google:
sense crear comptes, sense contrasenyes, sense administrar ningú. El bloqueig no es
gestiona, desapareix. És el que ja deia la decisió d'Óscar i aquí queda implementat.

Google és **opcional**: sense les tres variables d'entorn el login per contrasenya funciona
igual i el botó ni s'ensenya, així que no trenca el desplegament de qui no les tingui.

## Una cosa que no era al gameplan i bloqueja igual

**Esborrar el compte.** Google Play ho exigeix des de l'abril de 2024 a tota app que deixi
crear compte **des de dins**, i demana dues vies: una dins de l'app i una **URL web**.

La finor és que *avui* Dictats en quedava fora, perquè els comptes de `BrandWaiUserProfile`
es creen fora de l'app i Google exclou explícitament aquest cas. **És justament la Fase 0
la que hi fa entrar l'app.** O sigui que la decisió del 30-08 activa un requisit que el
gameplan no llista a cap fase.

Fet: `DELETE /api/account` i la pàgina pública `/esborrar-compte`, accessible **sense
sessió** —qui ja no pot entrar també ho ha de poder demanar—, que és la URL que anirà al
formulari de Data Safety.

## Un fallo meu, trobat executant

La primera versió esborrava **primer el progrés** i després la identitat. Provant-ho amb
MySQL sense configurar va sortir el pitjor cas possible: **els dictats desapareixien, el
compte es quedava viu i l'usuari rebia un missatge dient que no s'havia esborrat res.**
Dades destruïdes, res complert i una mentida a sobre.

Ara va primer la identitat. Si falla, no s'ha tocat res i el missatge és veritat; si passa
i falla el progrés, el compte ja no existeix —que és el que Play exigeix— i queden files
orfes lligades a un correu pel qual no pot entrar ningú. Recuperable, i molt menys greu.

**El raonament que vaig escriure al comentari del codi era el contrari, i era el dolent.**
Va sortir provant-ho, no llegint-ho.

## Verificat per execució real

- **34 comprovacions noves** a `test/usuaris.test.js`, amb una base de dades falsa: alta,
  normalització del correu, que la contrasenya **no** es desa en clar i el que es desa és
  un hash de bcrypt, login bo i dolent, correu repetit, contrasenya curta, canvi de
  contrasenya i esborrat.
- **La regla de vinculació de Google**: qui ja tenia compte per contrasenya i entra amb
  Google **no es duplica** —se li enganxa el `google_id` a la fila que ja hi era—, la
  segona vegada entra pel `google_id`, i algú nou sí que es dona d'alta amb un
  `password_hash` aleatori pel qual no pot entrar mai.
- **L'URL d'autorització**: porta l'`state` anti-CSRF, demana `openid email profile` i
  força `select_account` (a un mòbil compartit, entrar amb l'últim compte de Google és
  entrar com una altra persona).
- **El servidor arrenca** amb la configuració nova, i `/esborrar-compte`,
  `/api/auth-options` i `/login` tornen 200. `/esborrar-compte` **sense sessió**, que és
  com Play ho vol.
- **Les dues pantalles a Chrome de veritat**, sense cap error de consola: el login canvia
  entre «Entrar» i «Crear el compte», ensenya el camp del nom només en l'alta, amaga el
  botó de Google quan no està configurat i porta l'enllaç d'esborrat; i
  `/esborrar-compte` sense sessió demana entrar i **no ensenya el botó destructiu**.
- **L'ordre de l'esborrat**: amb MySQL sense configurar, la crida falla i el progrés local
  **queda intacte**, comprovat comptant les files abans i després.
- `npm test`: 109 comprovacions, cap falla.

## NO verificat

- **Res d'això ha parlat mai amb MySQL.** No tinc credencials de `cronosai`. La taula no
  s'ha creat, no s'ha donat d'alta cap compte real i `scripts/db/001_usuaris.sql` **no
  s'ha executat mai**. Les proves fan servir una base falsa: cobreixen la lògica, no el
  driver ni l'esquema.
- **La volta sencera de Google OAuth no s'ha fet.** Falten les credencials del GCP
  `kairos-family-app` i registrar-hi els URI de redirecció. El que està provat és tot el
  que no surt a la xarxa: la configuració, l'URL d'autorització, l'`state` i la lectura de
  l'`id_token`. L'intercanvi de codi contra Google, no.
- **`express-mysql-session` no s'ha arrencat mai contra una base.** Amb `DB_USER` i
  `DB_NAME` buits no es crea magatzem i s'usa el de memòria, que és el camí que he provat.
- Queda com a **F59** al roadmap: fins que això no es provi de veritat, la Fase 0 no es pot
  donar per tancada.
- **F60**: producció té 2 usuaris a `BrandWaiUserProfile` que amb aquest canvi deixen de
  poder entrar fins que es donin d'alta. El seu progrés no es perd (la clau és el correu),
  però algú ha de decidir si se'ls avisa, se'ls crea el compte o es deixa que es registrin.

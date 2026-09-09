# Changelog — dictats_catala

## [2.0.0] — 2026-09-09 — v15…v41: la app deja de medir dictados y entrena gramática

Dieciocho ramas entre el 07 y el 09-09. Es **2.0.0 y no 1.4.0** por una razón concreta:
**quien ya tenía cuenta tiene que volver a darse de alta.** La identidad dejó de ser la
tabla de usuarios de Trawlingweb y pasó a Firebase; el dominio cambió; y el esquema de la
base se reescribió entero. Nada de eso rompe datos —el historial se recupera con el mismo
correo— pero sí rompe la forma de entrar, y eso es una mayor.

Lo que une estas ramas es el objetivo que ordenaba el roadmap: **que la app dejara de
medir dictados y pasara a entrenar gramática.** Antes cada dictado era un episodio suelto
que se corregía, dejaba un número y no volvía a influir en nada.

### Añadido — el bloque que cambia lo que la app es

- **Taxonomía de 20 categorías de error** (F25, luego 22 con F71). Las seis de antes
  describían **una diferencia, no una regla**: «ortografía» se llevaba la ela geminada, la
  ce trencada y la b/v juntas. Se clasifica **con un algoritmo, no con el modelo**, por la
  misma razón que el diff: reproducible, sin depender de la API y **aplicable al
  histórico**. Recall 100 % (850/850) y 0 falsos positivos.
- **«De qué fallas»** (F26): el perfil agrupa los errores de los últimos 20 dictados por
  regla. Hasta la taxonomía no se podía contestar.
- **Repesca espaciada** (F27): una frase que fallaste vuelve al día siguiente, a los 3 y a
  los 7. **Mezclada entre otras**, y el cliente no sabe cuáles son las de repaso — si lo
  supiera, prestarías una atención que no prestas en un dictado real.
- **60 segundos** (F28): ocho tarjetas de dos formas —la buena y la que escribiste tú—
  hechas con tus propios errores. Sin audio, sin escribir, sin clave de API.
- **Escritura libre** (F29): eliges tema, escribes 40-400 palabras y Claude corrige la
  lengua. **El texto no se guarda en ningún sitio.** Es la única parte de la app que no
  funciona sin clave, y cuando no la hay se dice **antes** de escribir.
- **Textos marcados y propuesta del siguiente** (F35), **progreso en errores por 100
  palabras con curva semanal** (F36), y **comparación contigo mismo** (F66) — que solo
  habla cuando has ido mejor.

### Añadido — identidad, dominio y datos

- **Firebase Authentication** (F52). Alta, entrada, recuperación de contraseña y **baja de
  cuenta**, que Google Play exige. Con esto desaparece la dependencia de `db1.bwai.cc`
  —infraestructura de otra casa— y una consulta que comparaba contraseñas **en texto
  plano**.
- **`dictats.usecronos.com`**, el dominio definitivo, con certificado y renovación.
- **El esquema del convenio de Cronos**: tablas y columnas en inglés, todo indexado por
  `uid`, el correo **solo en `users`** (estaba en siete tablas), claves ajenas con
  `ON DELETE CASCADE` y las fechas UTC guardadas con `Z`.
- **Un tope diario** de llamadas al modelo, además del de 30/hora: con solo aquel, el techo
  real de una persona eran 720 al día.
- **Rotación de logs** (F15), acotada a Dictats para no cambiarle el comportamiento a las
  otras tres apps de la misma máquina.

### Corregido — y casi todo salió usando la app, no leyéndola

- **El dictado se daba por completado sin haber sonado** (F68). Sin voz instalada, las
  cinco frases pasaban en un suspiro y la pantalla decía «Dictat completat» al 100 %.
- **Las palabras no escritas tapaban los errores** (F69): 18 fichas seguidas de «no s'ha
  escrit» enterraban los cinco errores que sí se podían estudiar.
- **El banco dictaba una palabra que no existe** (F70): «marzipà» por **massapà**. Estaba a
  punto de entrar en una captura de Play.
- **Una categoría enseñaba una regla que no era la de su error** (F71): a quien escribía
  «sentre» por *centre* se le enseñaba la regla de la doble ese. **Era enseñar ortografía
  equivocada**, que es justo lo que el producto promete no hacer.
- **El perfil decía que tu problema principal era no haber escrito** (F72), y **la lista
  decía «el millor amb 23 errors»** de un texto de 26 palabras (F74). No hiciste 23 faltas:
  paraste.
- **El gráfico del perfil lanzaba un error en cada carga** (F73): `height="auto"` es CSS, no
  una longitud de SVG.

### Verificado

De **192 comprobaciones a 387** en `npm test`, más ocho suites que no caben ahí porque
tocan datos, red o navegador. La migración del esquema se probó **contra una copia de la
base de producción**, que es donde aparecieron sus tres trampas.

Y el paquete de Android: reconstruido, firmado y **abierto en un Android sin la barra de
Chrome**, con un alta de cuenta hecha desde dentro. La «trampa 2» del gameplan —que decía
que eso no se podía comprobar antes de subir a Play— resultó ser comprobable.

### Lo que sigue sin verificar, y conviene que conste

**Ningún profesor de catalán ha leído las 22 reglas**, que se usan en tres pantallas y son
la promesa del producto. **Ningún lector de pantalla** ha leído la app. Y **ningún móvil
físico** la ha ejecutado: el emulador no dice nada del micrófono, de la voz catalana ni de
la cámara.

## [1.3.0] — 2026-09-04 — v10…v14: la app se despliega, deja de mentir y anima

Cinco ramas de trabajo entre el 31-08 y el 04-09. Lo que las une: la app pasó de estar
escrita a estar **en producción y verificada ejecutando**, y varias cosas que decían algo
distinto de lo que hacían dejaron de hacerlo.

### Añadido
- **Política de privacidad servida por la propia app** (`/privacitat`, F63), sin sesión —
  quien aún no tiene cuenta también tiene que poder leerla, y Google Play exige una URL
  pública. Con `docs/sections/publicacio/DATA_SAFETY.md`, el formulario de Data Safety
  respondido **auditando el código, con fichero y línea al lado de cada respuesta**.
- **Aviso sobre el contenido que escribe la IA** (F64): botón ⚑ sobre cada explicación y
  `POST /api/report`. Es requisito de Play poder reportar contenido generado con IA desde
  dentro de la app. El botón solo sale sobre texto que ha escrito el modelo: cuando la API
  falla las explicaciones son de plantilla y no hay nada que reportar.
- **`/.well-known/assetlinks.json` servido de verdad** (F53) y `scripts/assetlinks.js`,
  que **se niega a escribir el fichero con una sola huella SHA-256**: son dos y olvidar la
  segunda hace que el TWA se abra con la barra de Chrome encima sin dar ningún error.
- **Racha, comparación con uno mismo e hitos de volumen** (`src/lib/motivacio.js`, F34
  parcial). Todo sale de datos que la app ya guardaba: ni una tabla nueva, ni una pantalla
  nueva. **La racha no se rompe a medianoche** sino cuando pasa un día entero sin dictados
  — romperla por no haber llegado todavía sería reñir, y `CLAUDE.md` dice que no se riñe.
  La comparación es siempre **con uno mismo**: la tabla de cuentas se comparte con los
  clientes de FeedScale y enseñar resultados de unos a otros sería un problema de
  privacidad, no una funcionalidad.
- **Banco de pruebas del corrector** (`scripts/benchmark/`, F55): errores inyectados por
  clase sobre los 30 textos, con el ground truth gratis porque el texto correcto ya lo
  tenemos. **100 % de recall en las ocho clases.** No necesita clave de API ni gasta nada.
- **Arnés del benchmark de foto** (`scripts/benchmark/visio.js`, v14): tres modelos con la
  misma prueba, coste real del campo `usage`, latencia p50/p95 y la conclusión por **el más
  barato que transcribe bien**, que es la pregunta de la #22 y no «cuál es mejor». El
  prompt se extrae de `src/routes/dictats.js` en vez de copiarse, para que nadie acabe
  comparando prompts creyendo que compara modelos.
- **Dos textos que cargan las clases que discriminan** (F58): ela geminada y dièresi
  apenas aparecían en el banco y son de las que más separan a un modelo de otro.
- **Screen Wake Lock durante el dictado** (F44): la pantalla se apagaba mientras se
  escuchaba.
- **Tope a las llamadas que cuestan dinero** (F14) y **el texto propio al lado del
  correcto** en el resultado (F32).
- **Ficha de Play, nombre público y ASO** (`FITXA_PLAY.md`, F61), con el dato que lo
  cambia todo: desde el curso 2025-26 el C2 es requisito para entrar en la bolsa docente
  y **solo lo tiene el 25 % del profesorado**. Unas 70.000 personas en Cataluña.

### Corregido
- **La política de privacidad describía un sistema que no existe.** Se redactó auditando
  la Fase 0 (bcrypt, identificador de Google, dos rutas de borrado de cuenta) y **ninguna
  de las tres cosas pasa en producción**: `src/lib/auth.js` comprueba la cuenta contra el
  sistema compartido y no guarda ninguna contraseña. Publicarla habría sido declarar un
  sistema inexistente — el motivo de retirada que el propio gameplan advierte. Reescrita
  para que diga lo que el código hace.
- **La barra de rango se leía como rota** (F50). Con el margen anti-yoyó protegiéndote, los
  puntos pueden caer por debajo del umbral de tu rango: el progreso salía negativo y la
  barra a 0 %. Ahora se limita, y la situación **se dice con palabras** — «estás 27 puntos
  por debajo de Manilles; si pierdes 13 más, bajas a Folre» — que aprieta más que una barra
  muda.
- **Dos apóstrofos seguidos desmontaban la corrección** (F57): `L'oli d'oliva` escrito
  `El oli de oliva` reportaba dos errores de más y desplazaba el texto que se enseña.
  `ajuntaApostrofs()` rehecho por tandas en vez de por parejas.
- **El «Historial» no era cronológico** (F37), **«Sortir» no hacía nada en una cuenta
  nueva** (F49) y **el móvil bloqueaba el zoom** (F38).
- **La lectura de la barra de rango estaba escrita tres veces** (`app.js`, `mobile.html`,
  `profile.html`) — la misma forma en que F17 llegó a ser un bug duplicado. Ahora vive una
  sola vez en `public/rang.js`.

### Mejorado
- **116 comprobaciones** en la suite (`npm test`), sin dependencias.
- Requisitos de Play que estaban **acabados desde el 31-08 y nunca habían llegado a
  producción**: vivían en `v10` junto a una Fase 0 que esperaba una decisión, y una rama
  que espera una decisión se convierte en una nevera de trabajo terminado. Rescatados en
  `v12` y desplegados. **Lo que no depende de esa decisión va a `main` por su cuenta.**
- La Fase 0 (identidad propia con bcrypt y cliente OAuth propio) queda **fuera de esta
  versión a propósito**: se rehace con Firebase Auth, que da recuperación de contraseña,
  verificación de correo y protección contra fuerza bruta sin escribirlos a mano, y es
  gratis sin límite de usuarios activos (#16, #32).


## [1.2.0] — 2026-08-28 — v6: el dictado deja de estorbar y la corrección deja de depender de la API

### Añadido
- **Rangos y puntos** (`src/lib/rang.js`, F45): ocho rangos con la anatomía de un castell — Pinya, Folre, Manilles, Tronc, Terços, Dosos, Aixecador, Enxaneta. Cada dictado suma puntos según la dificultad (nivel × palabras) y **resta a partir de 6 errores**, que es justo donde la escala pasa de «Bé!» a «Progressant!»: las dos cosas tienen que decir lo mismo o la app se contradice en la misma pantalla. Se puede bajar de rango, con un margen de 40 puntos para que no haga yoyó tras un solo mal dictado. **No sustituye la escala motivadora** por número de errores que fija `CLAUDE.md`: la escala dice cómo fue *este* dictado, el rango dice dónde estás en conjunto.
  - Ganar escala con la dificultad, **perder no**: equivocarse en un texto avanzado cuesta lo mismo que en uno básico de la misma longitud. Si el castigo también escalara, intentar cosas difíciles solo compensaría cuando ya te salen bien, que es al revés de lo que interesa.
  - Nada se guarda acumulado: el total se recalcula recorriendo el historial, así que el día que se afine la fórmula todo el mundo queda recolocado solo. Nueva columna `total_words` en `user_progress`; los dictados anteriores se estiman por la media de su nivel en vez de dejar de contar.
- **Motor de comparación determinista** (`src/lib/diff.js`, F31). Hasta ahora el índice de cada palabra fallada (`position`) lo contaba el modelo, y cuando se le desviaba la app subrayaba en rojo una palabra correcta. Ahora se alinean las palabras en el servidor (subsecuencia común más larga sobre una clave laxa) y las posiciones son exactas por construcción; a Claude solo le queda escribir las explicaciones. Consecuencia no buscada: **si la API falla, el dictado se corrige igual** — verificado con un 401 real, donde antes se devolvía un 500 y el alumno no recibía nada.
- **Tabla `user_errors`** (F24): una fila por error, con tipo, palabra correcta, lo escrito, posición y si cuenta para la escala. Hasta ahora de un dictado solo quedaba un número, así que la app no podía responder «de qué fallo». Es la base de todo el bloque B (v7).
- **Motor de dictado compartido** (`public/dictat.js`): la lógica estaba duplicada en `app.js` y en `mobile.html`, y por eso el bug de F17 estaba dos veces. Ahora hay una sola copia.
- **Se puede escribir en el móvil** (F23). `/mobile` no tenía ni un `textarea`: las únicas salidas eran subir foto u «Ometre». También se pueden crear textos propios y hay enlace a `/profile`.
- **Pausar y reanudar el dictado** (F18), **velocidad de lectura 0,5×–1,0×** recordada entre sesiones (F19), **botón «Següent frase» y `Ctrl+Enter`** para saltar la pausa y **«+10 s»** para alargarla (F16).
- **Interruptor «dictar la puntuació»** (F20). El banco tiene 69 signos internos que la síntesis de voz no pronuncia nunca y que, aun así, bajaban la escala. Apagado, los errores de puntuación se muestran y se guardan como aviso pero no cuentan.
- **Aviso cuando no hay voz catalana instalada** (F21), con las instrucciones para Android, iOS y Windows. Antes se caía a una voz castellana en silencio y el dictado enseñaba una pronunciación equivocada.
- **Borrador autoguardado** en `sessionStorage` (F22), borrado al corregir y al cerrar sesión, respetando la regla de `sw.js` sobre dispositivos compartidos.
- Variable `DICTATS_MODEL` para elegir el modelo sin tocar código. **El modelo no ha cambiado** (`claude-opus-4-6`): F31 hace viable uno más pequeño, pero eso es decisión del proyecto.

### Corregido
- **«Repetir frase» reproducía la frase anterior** (F17). `repeatCurrentPhrase()` usaba `currentPhraseIdx - 1`, pero el índice solo avanzaba después de la pausa: mientras sonaba la frase 2, el botón reproducía la 1. Estaba igual en `app.js` y en `mobile.html`.
- **La pausa era de 5 segundos fijos** (F16), los mismos para una frase de 6 palabras que para una de 26. Medido sobre las 150 frases del banco, en nivel avanzado hacen falta unos 40 segundos de media y hasta 62 en la frase más larga. Ahora la pausa sale del número de palabras.
- **`l'aigua` → `la aigua` contaba como dos errores** (una sustitución más una palabra añadida) cuando pedagógicamente es una sola regla, e inflaba la escala. Se vuelven a juntar, con el tipo nuevo `apostrofació`.
- **Salir de la vista dejaba el dictado sonando de fondo** y obligaba a empezar desde la primera frase (F18).
- **El título de los textos personales se inyectaba sin escapar** en `innerHTML` (F41), cuando el resto de la pantalla sí usaba `escapeHtml()`.

### Corregido en la revisión previa al commit
- **El dictado podía quedarse mudo para siempre**: `speechSynthesis.pause()` marca el sintetizador entero y `cancel()` no lo desmarca. Pausar, volver atrás, elegir otro texto y volver a empezar dejaba la voz muda, sin `onend`, con la pantalla clavada en «Llegint frase 1 de N». Mismo flag por dos puertas más («Següent frase» y «Repetir» aceptaban el estado pausado), y pausar justo al acabar una frase encallaba el dictado. Hay pruebas de regresión que fallan contra la versión anterior.
- **Cliente y servidor no partían el texto igual**: `tokenitza()` cambia `||` por un espacio y `textNet()` lo quitaba del todo. En los 30 textos del banco da igual, pero un texto personal escrito `frase.||frase.` desalineaba todas las marcas posteriores — justo lo que F31 venía a eliminar.
- **Sin tope de tamaño en la alineación**: la matriz de la LCS es (n+1)×(m+1) y el body admite 100 kB, así que una sola petición autenticada podía reservar cientos de megas. Máximo de 3.000 palabras, con 413.
- **La puntuación se contradecía**: las palabras añadidas no restaban, así que escribir seis donde había tres daba «3 de 3 correctas» con 3 errores y score 100. Ahora cuentan en el denominador y la línea de resultados dice cuántas sobran.
- **En el móvil se podía corregir dos veces** con un doble toque: dos llamadas a la API y dos filas en el historial para el mismo dictado.
- **Una sesión caducada era un callejón sin salida**: un 401 salía como `alert('No autenticat')`; ahora lleva al login.
- **El error de apóstrofo fusionado solo pintaba una de las dos palabras** que abarca. Las diferencias llevan ahora un `span`.
- **El service worker podía servir ficheros viejos indefinidamente**: la revalidación en segundo plano no estaba dentro de `event.waitUntil()`.
- **F41 estaba a medias**: `profile.html` seguía metiendo `text_title` y `level` crudos en `innerHTML`, y seguía diciendo «dictado».

### Mejorado
- `npm test`: 60 comprobaciones sin dependencias (`test/diff.test.js`, `test/rang.test.js`, `test/dictat.test.js`). El proyecto no tenía pruebas.
- La corrección por foto pide a la visión solo la transcripción, y esa transcripción pasa por el mismo diff: posiciones exactas también ahí, y dos llamadas cortas en lugar de una larga.
- Tipo de error nuevo `majúscules`, que antes caía dentro de `ortografia`. La taxonomía completa del catalán es F25 (v7).
- `ROADMAP.md`: F16–F44 documentadas con su evidencia y agrupadas en bloques, con plan de versiones v6/v7/v8.
- Textos de la interfaz: «dictado» → «dictat». En una app para aprender catalán, la pantalla también enseña.

---

## [1.1.2] — 2026-08-21 — Las rutas de API devolvían un redirect en lugar de un 401

### Corregido
- `requireAuth` comprobaba `req.path.startsWith('/api/')`, pero `req.path` no incluye el prefijo del router donde está montado el middleware: dentro de `app.use('/api', ...)` una petición a `/api/texts/basic` tiene `req.path === '/texts/basic'`. La condición no se cumplía nunca y **todas** las rutas de API sin sesión respondían con el `302` de navegación. Al caducar la sesión, el `fetch` del frontend seguía el redirect, recibía el HTML del login y reventaba en `res.json()` con un error de parseo en vez de volver al login. La comprobación pasa a `req.originalUrl`, que conserva la ruta completa.

---

## [1.1.1] — 2026-08-18 — Credencial de deploy: service account nominal

### Mejorado
- El deploy se autentica con la service account nominal `otc-dev@kairos-family-app.iam.gserviceaccount.com` (clave en `~/.ssh/otc-dev.json`) en lugar de la cuenta personal, que caduca por la política de sesión de Workspace y rompe los deploys no interactivos con `Reauthentication failed. cannot prompt during non-interactive execution`.
- `scripts/deploy/deploy-dictats.sh` pasa `--account` explícito (variable `ACCOUNT`) en vez de confiar en la cuenta gcloud activa.
- `DEVELOPER_HANDBOOK.md`: nuevo apartado "Credencial d'accés", tabla de problemas frecuentes de deploy, y nota de que `kairos-vm` **no** usa `--tunnel-through-iap` (a diferencia de `mochi-vm` y `crawlers-vm`).
- Documentado el flujo de branches `vN` de `AI_CODE_INSTRUCTIONS.md` §9.6, que el handbook contradecía.

---

## [1.1.0] — 2026-07-29 — Traslado de mochi-vm a kairos-vm

### Mejorado
- La app pasa de `mochi-vm` (`/home/otc/apps/dictats_catala`, Caddy) a `kairos-vm` (`/var/dictats/app`, nginx + certbot), la misma VM que `kairos_app` y `heart_monitor`. Motivo: consolidar apps de bajo uso y liberar mochi-vm.
- La BD SQLite vive ahora en `/var/dictats/data/dictats.db`, fuera del árbol del repo, vía la nueva variable `DICTATS_DB_PATH`. Así los deploys por `git pull` no pueden tocarla.
- Deploy repetible con `scripts/deploy/deploy-dictats.sh` (git pull + npm ci + pm2 restart), siguiendo el patrón de `kairos_app`.
- `ecosystem.config.js` y `nginx/dictats.conf` versionados en el repo.
- `.env.example` incluye las variables `MYSQL_*`, que faltaban pese a estar documentadas en el README.

---

## [1.0.1] — 2026-04-07 — Fix crash better-sqlite3 tras actualización de Node.js

### Corregido
- Crash en bucle (393 reinicios PM2) causado por `better-sqlite3` enlazado a `libnode.so.109` inexistente tras actualización de Node.js a v22.22.2. Solución: `npm rebuild better-sqlite3`.

---

## [1.0.0] — 2026-03-22 — Lanzamiento inicial

### Añadido
- Autenticación via MySQL `BrandWaiUserProfile` (mismo sistema que FeedScale)
- 3 niveles predefinidos (Bàsic, Intermedi, Avançat) con 15 textos en catalán
- Nivel "Els meus textos" para textos personales (SQLite)
- Dictado por síntesis de voz (Web Speech API, voz ca-ES)
- Modo editor (textarea) y modo papel con subida de foto opcional
- Corrección por texto y por foto (Claude Vision API)
- Escala motivadora por nº de errores: Excel·lent / Molt bé / Bé / Progressant / Segueix!
- Historial de dictados por usuario con estadísticas
- Vista móvil optimizada (`/mobile`)
- Página de perfil con historial ordenado por errores (`/profile`)
- Avatar con dropdown (perfil + logout)

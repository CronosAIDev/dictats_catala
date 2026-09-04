# Roadmap — dictats_catala

## Completado

| ID | Feature | Versión | Fecha |
|----|---------|---------|-------|
| F1 | Auth MySQL BrandWaiUserProfile | v1.0.0 | 2026-03-22 |
| F2 | Dictado por voz (Web Speech API) | v1.0.0 | 2026-03-22 |
| F3 | Corrección por texto (Claude) | v1.0.0 | 2026-03-22 |
| F4 | Modo papel + corrección por foto (Claude Vision) | v1.0.0 | 2026-03-22 |
| F5 | Nivell "Els meus textos" (textos personales) | v1.0.0 | 2026-03-22 |
| F6 | Escala motivadora por nº errores | v1.0.0 | 2026-03-22 |
| F7 | Vista móvil (/mobile) | v1.0.0 | 2026-03-22 |
| F8 | Perfil + historial (/profile) | v1.0.0 | 2026-03-22 |
| F9 | Deploy en mochi-vm (dictation.generaive.io) | v1.0.0 | 2026-03-22 |
| F13 | Revisar `npm audit` — 7 vulnerabilidades a 0 | v5 | 2026-08-26 |
| F11 | Más textos — banco de 15 a 30 (10 por nivel) | v5 | 2026-08-26 |
| F10 | PWA instalable (manifest + service worker + iconos) | v5 | 2026-08-26 |
| F16 | Pausa proporcional a la frase + control manual | v6 | 2026-08-28 |
| F17 | «Repetir frase» repetía la frase anterior | v6 | 2026-08-28 |
| F18 | Pausar y reanudar el dictado | v6 | 2026-08-28 |
| F19 | Velocidad de lectura ajustable | v6 | 2026-08-28 |
| F20 | O se dicta la puntuación, o no se puntúa | v6 | 2026-08-28 |
| F21 | Aviso cuando no hay voz catalana instalada | v6 | 2026-08-28 |
| F22 | Borrador autoguardado | v6 | 2026-08-28 |
| F23 | Se puede escribir en el móvil | v6 | 2026-08-28 |
| F24 | Se guardan los errores, no solo cuántos (`user_errors`) | v6 | 2026-08-28 |
| F31 | Diff determinista en el servidor | v6 | 2026-08-28 |
| F41 | Escapar el título de los textos personales | v6 | 2026-08-28 |
| F45 | Rangos y puntos: progresión acumulada entre dictados | v6 | 2026-08-28 |

---

## En Curso

| ID | Feature | Descripción | Estado | Asignado a |
|----|---------|-------------|--------|------------|
| F51 | Dictats en Google Play | [Gameplan](../sections/publicacio/GP_dictats_a_google_play.md) — PWA → TWA → ficha de Play. Fase 1 (PWA) ya hecha: es F10, de v5. Fase 0 decidida el 30-08 (identidad propia, calcando `aicamper_app`), así que ya no bloquea. Fase 3 y 4: politica desplegada, ficha escrita y **capturas hechas (v15)**. Fase 2: **JDK y keystore de subida hechos (v15)**, huella SHA-256 sacada; falta el AAB, que espera el `applicationId`. Pendientes: Fase 0 (se rehace con Firebase), cerrar Fase 2, y F55 | En curso | gerard |

## Pendiente

Las features F16–F44 salen de la revisión de experiencia de usuario del 2026-08-28.
El objetivo que ordena la lista: que la app deje de **medir** dictados y pase a
**entrenar** gramática. Hoy cada dictado es un episodio suelto — se corrige, se guarda
un número en `user_progress` y no vuelve a influir en nada.

### Bloque A — Que el dictado deje de estorbar (v6)

Nada de esto añade funcionalidad: quita fricción que hoy impide practicar.

| ID | Feature | Descripción | Estado | Prioridad |
|----|---------|-------------|--------|-----------|
| F16 | Pausa proporcional a la frase | `PAUSE_DURATION_MS = 5000` fijo, igual para una frase de 6 palabras que para una de 26. Medido sobre las 150 frases del banco: en avanzado la media son 16,8 palabras (~40 s de escritura a 25 ppm) y la más larga 26 (~62 s). Pausa calculada por nº de palabras + cuenta atrás visible + botón "Següent frase" y `Ctrl+Enter` para saltarla | **Hecho (v6)** | Alta |
| F17 | «Repetir frase» repite la frase anterior | `repeatCurrentPhrase()` usa `currentPhraseIdx - 1`, pero el índice solo avanza tras la pausa. Verificado simulando la máquina de estados: mientras suena la frase 2 el botón reproduce la 1. Igual en `app.js` y en `mobile.html` | **Hecho (v6)** | Alta |
| F18 | Pausar y reanudar el dictado | Una vez empieza no hay forma de pararlo, y salir de la vista lo deja sonando. `speechSynthesis.pause()`/`.resume()` + conservar la posición al volver | **Hecho (v6)** | Alta |
| F19 | Velocidad de lectura ajustable | `SPEECH_RATE = 0.75` fijo. Control 0,5×–1,0× visible durante el dictado y recordado entre sesiones | **Hecho (v6)** | Media |
| F20 | O se dicta la puntuación, o no se puntúa | El banco tiene 69 signos internos que el TTS no pronuncia nunca, y aun así `puntuació` es una de las 6 categorías que bajan la escala. Interruptor "dictar la puntuació"; apagado, los errores de puntuación se muestran como aviso y no cuentan | **Hecho (v6)** | Alta |
| F21 | Avisar cuando no hay voz catalana | `getVoice()` cae a una voz castellana sin decir nada: el dictado enseña una pronunciación equivocada de lo que se aprende a escribir. Detectarlo, avisarlo y explicar cómo instalar la voz | **Hecho (v6)** | Alta |
| F22 | No perder lo escrito | No hay ni una llamada a almacenamiento local en el frontend. Borrador en `sessionStorage` (no `localStorage`: la regla de `sw.js` sobre móviles compartidos), borrado al corregir y al cerrar sesión | **Hecho (v6)** | Media |
| F23 | Poder escribir en el móvil | `/mobile` no tiene ni un `textarea`: las únicas salidas son foto u "Ometre". Tampoco se pueden crear textos propios ni hay enlace a `/profile`. Y es la versión instalable como PWA | **Hecho (v6)** | Alta |

### Bloque F — Progresión: rangos y puntos (v6)

Un dictado suelto no da sensación de mejora: se corrige, se puntúa y se acaba ahí.
El rango es el **otro eje**, el acumulado, y **no sustituye la escala motivadora** por
número de errores que fija `CLAUDE.md`: la escala dice cómo fue *este* dictado, el rango
dice dónde estás en conjunto. Se leen en sitios distintos.

| ID | Feature | Descripción | Estado | Prioridad |
|----|---------|-------------|--------|-----------|
| F45 | Rangos y puntos | Ocho rangos con la anatomía de un castell (Pinya → Folre → Manilles → Tronc → Terços → Dosos → Aixecador → Enxaneta). Los puntos suben con la dificultad del texto y bajan a partir de 6 errores, el mismo umbral donde la escala pasa de «Bé!» a «Progressant!». Se puede bajar de rango, con un margen de 40 puntos para que no haga yoyó | **Hecho (v6)** | Alta |
| F46 | Afinar la curva de puntos con uso real | Los multiplicadores (bàsic 1, intermedi 1,5, avançat 2,2), los tramos de calidad y los umbrales de rango son un primer tanteo, no una medición. Hay que mirarlos cuando haya historial de verdad | Pendiente | Media |
| F47 | Dificultad medida, no declarada | Un texto personal declara nivel `personal` y cobra ×1,2 sea cual sea. Estimar la dificultad del propio texto (longitud, densidad de apòstrofs, accents, `l·l`, `ç`, dièresi) para que no se pueda subir de rango con textos triviales | Pendiente | Media |
| F48 | Ver el progreso del rango en el tiempo | Hoy solo se ve el estado actual. Una curva de puntos por semana enseñaría la mejora, que es justo lo que el rango quiere transmitir. Se junta con F36 | Pendiente | Baja |

### Bloque B — Cerrar el bucle: de corregir a entrenar (v7)

Aquí está la diferencia entre lo que la app es y lo que dice el objetivo.

| ID | Feature | Descripción | Estado | Prioridad |
|----|---------|-------------|--------|-----------|
| F24 | Guardar los errores, no solo cuántos | `user_progress` guarda `score` y `errors_count`; la lista de errores de Claude se pinta y se tira. Tabla `user_errors` con una fila por error. Sin esto nada del bloque B es posible | **Hecho (v6)** | Alta |
| F25 | Taxonomía de errores de catalán | Las 6 categorías actuales describen una diferencia, no una regla entrenable. Categorías que se correspondan con reglas: apostrofació, accents diacrítics, obert/tancat, ela geminada, b/v, essa sorda i sonora, ç, h, pronoms febles, per/per a, concordança, guionets | Pendiente | Alta |
| F26 | «Dónde fallas»: perfil de errores | Con F24 + F25: "en tus últimos 20 dictados, 14 errores de apostrofació, 9 de diacrítics". Es la pregunta que se hace quien quiere mejorar, y hoy no hay datos para contestarla | Pendiente | Alta |
| F27 | Repesca espaciada | Las frases falladas vuelven a dictarse a 1, 3 y 7 días, mezcladas entre otras. Es lo que convierte "he hecho 30 dictados" en "ya no fallo la apostrofació" | Pendiente | Alta |
| F28 | Micro-ejercicios de 60 s | Hoy la unidad mínima es un dictado entero (5–10 min con auriculares). Tarjetas de dos formas generadas de tus propios errores, sin audio. Es lo que hace que se entre a diario | Pendiente | Alta |
| F29 | Escritura libre | Un dictado entrena oído y ortografía; la gramática se entrena produciendo. Modo con tema propuesto, escribes 8–10 líneas y Claude corrige gramática con regla y alternativa. Reaprovecha la tubería existente | Pendiente | Alta |
| F30 | Fichas de regla reutilizables | `explanation` lo redacta Claude de cero cada vez: el mismo fallo se explica distinto y no se puede enlazar ni repasar. Catálogo de fichas (regla, ejemplo, error típico) al que la corrección apunta por identificador | Pendiente | Media |

### Bloque C — La corrección: más rápida, más barata y más exacta (v6/v8)

| ID | Feature | Descripción | Estado | Prioridad |
|----|---------|-------------|--------|-----------|
| F31 | Diff determinista en el servidor | El prompt le pide a Claude el índice `position` de cada palabra fallada; cuando se desvía, la app subraya en rojo una palabra correcta. Alinear las palabras en el servidor y dejarle a Claude solo clasificar y explicar: posiciones exactas, resultado inmediato, corrección que sobrevive a un fallo de la API y modelo más barato (responde también a F14) | **Hecho (v6)** | Alta |
| F32 | Ver tu texto al lado del correcto | Hecho (v11): dos paneles enfrentados («El text original» / «El que has escrit») en app y móvil. El texto del alumno se reconstruye de `position/span/userWrote`; omisiones como hueco `___`, palabras de más al final, tooltip con la corrección. Verificado headless: sustitución, omisión y panel oculto sin corrección | **Hecho** | Alta |
| F33 | Resultado progresivo | Entre «Corregir» y ver algo había una llamada a Opus con `max_tokens: 4096` y un spinner mudo, cuando el resultado entero —marcas, escala, puntos y rango— ya estaba calculado sin red desde F31. Ahora `/api/correct` responde al instante (**0,02 s**) y las explicaciones llegan por `/api/explicacions/:id`. Se **persisten** (`user_errors.explanation`), así que la segunda vez es idempotente y gratis — primer peldaño de F30. Si la API falla no se reintenta: el peor caso es el de hoy con la API caída. 14 comprobaciones en `test/f33.integracio.js` | **Hecho (v16)** | Media |

### Bloque D — Constancia y sentido de progreso (v8)

| ID | Feature | Descripción | Estado | Prioridad |
|----|---------|-------------|--------|-----------|
| F34 | Racha y objetivo diario | **Racha hecha (v13)**: días seguidos calculados solo con `completed_at`, en `src/lib/motivacio.js`. No se rompe a medianoche sino tras un día entero sin dictados, y cuando viene de ayer invita en vez de avisar de la pérdida — la regla de no reñir de `CLAUDE.md`. Se ve en el resultado y en el perfil. **Falta el objetivo diario**, que cobra sentido con F28 (micro-ejercicios) | **Parcial (v13)** | Media |
| F66 | Comparación contigo mismo y fitas de volumen | De la lista «barata y ahora» de la [#23](https://github.com/CronosAIDev/wiki-cronos/issues/23), con datos que ya se guardaban: «La teva mitjana és 4,3» junto al resultado —y **solo se marca cuando has ido mejor**, nunca cuando has ido peor— y el aviso del dictado 10º, 25º, 50º, 100º y de cien en cien. Nada de comparar con otros usuarios: la tabla de cuentas es compartida con clientes de FeedScale. En `src/lib/motivacio.js` y `public/anim.js`, con 28 comprobaciones | **Hecho (v13)** | Media |
| F35 | Marcar textos hechos y proponer el siguiente | La lista de 30 textos se ve igual el primer día que el trigésimo. Marca de hecho con resultado y un texto destacado como "lo siguiente". Los datos ya están en `user_progress` | Pendiente | Media |
| F36 | Progreso normalizado + gráfico | La media de errores va redondeada a entero (2,4 y 2,6 se ven igual) y compara dictados de 34 palabras con otros de 84. Errores por 100 palabras, con curva por semana. **No toca la escala motivadora**, que va por nº de errores por decisión de producto (`CLAUDE.md`). Concreta F12 | Pendiente | Media |
| F37 | Historial cronológico | Hecho (v11): dos pestañas «Recents» (por fecha) y «Millors» (por errores) en `/profile`; el servidor devuelve las dos listas y las estadísticas salen de TODO el historial, no de los 50 pintados. Verificado headless: cada pestaña ordena distinto | **Hecho** | Media |

### Bloque E — Accesibilidad y remates

| ID | Feature | Descripción | Estado | Prioridad |
|----|---------|-------------|--------|-----------|
| F38 | El móvil bloquea el zoom | Hecho (v11): retirado `maximum-scale=1.0` del viewport de `/mobile`. Verificado headless | **Hecho** | Media |
| F39 | Nada de lo que cambia se anuncia | Había **cero** atributos `aria-` en todo el frontend y el foco era el del navegador, invisible sobre fondo blanco — en una app que se usa con los oídos. Ahora: `aria-live="polite"` (nunca `assertive`: mientras se dicta hay una voz hablando) en una sola región para estado, barra y frase; `role="alert"` en el aviso de voz; `role="progressbar"` con `aria-valuenow` que se mueve; `aria-pressed` en los toggles; `aria-label` en los enlaces de emoji; foco visible de 3 px y movido al resultado, que además se anuncia; `prefers-reduced-motion`. Todo en `public/a11y.js`. **Destapó dos bugs**: el foco se ponía en una vista aún oculta, y el repintado de F33 se lo llevaba por delante. 9 comprobaciones en `test/f39.navegador.js`. **Sin verificar**: ningún lector de pantalla real lo ha leído, y el contraste de color no está medido | **Hecho (v17)** | Media |
| F40 | Modo oscuro | Ninguna regla `prefers-color-scheme` en `style.css`. Las variables de color ya están todas en `:root` | Pendiente | Baja |
| F41 | Escapar el título de los textos personales | `loadTextList()` mete `t.title` crudo en `innerHTML`; el resto de la pantalla sí usa `escapeHtml()`. Solo afecta a la propia cuenta | **Hecho (v6)** | Media |
| F42 | Editar textos personales | Solo se pueden crear y borrar: una errata obliga a rehacer el texto entero. Y crearlos desde el móvil, que hoy no se puede | Pendiente | Baja |
| F43 | Buscar y filtrar en la lista de textos | Son 30 y van a ser más | Pendiente | Baja |
| F44 | La pantalla se apaga a mitad del dictado | Hecho (v11): Screen Wake Lock mientras el dictado corre (`llegint`/`pausa`), soltado al pausar/acabar/salir, recuperado al volver a la pestaña. En `app.js` y `mobile.html`; sin soporte degrada a nada. Verificado headless con `wakeLock` simulado: pedir→soltar→repedir→soltar. Pendiente sin verificar: comportamiento en Android físico | **Hecho** | Media |
| F49 | El botón «Sortir» de `/profile` no hace nada en una cuenta nueva | Hecho (v11): el listener de `btn-logout` va fuera de `init()`. Verificado headless con historial vacío: click → `/api/logout` → redirige a `/login` | **Hecho** | Media |
| F50 | La barra del rango salía vacía cuando el margen te protege | El margen anti-yoyó mantiene el rango aunque los puntos caigan bajo su umbral; entonces `progres` salía negativo y la barra se dibujaba al 0 %, que se lee como si estuviera rota. Ahora el progreso se acota en el servidor y aparece `sotaLlindar`, que dice **«estàs 27 punts per sota de Manilles. Si en perds 13 més, baixes a Folre»** — aprovecha la tensión en vez de callarla. La lectura se unifica en `public/rang.js`: estaba escrita tres veces (`app.js`, `mobile.html`, `profile.html`), que es la forma en que F17 acabó siendo un bug duplicado | **Hecho (v13)** | Media |

### Bloque G — Publicación en Google Play (gameplan F51)

Salen del gameplan `GP_dictats_a_google_play.md` y de sus Issues en `CronosAIDev/wiki-cronos`.
Aquí solo lo que es trabajo de código; las decisiones y la ficha de Play viven en las Issues.

| ID | Feature | Descripción | Estado | Prioridad |
|----|---------|-------------|--------|-----------|
| F52 | Identidad propia de Dictats (Fase 0) | Retira la dependencia de `BrandWaiUserProfile` —compartida con los 212 clientes de FeedScale, y con contraseñas en texto plano— y con ella el que Play no se puede declarar. El progreso se queda en SQLite indexado por email, así que el histórico no se pierde. La versión de `v10` (bcrypt + Google OAuth propio + `express-mysql-session`) está escrita y verificada contra MySQL real (F59), pero **el 04-09 se decidió rehacerla con Firebase Auth**: recuperación de contraseña, verificación de correo y fuerza bruta salen gratis, y desaparece la única pieza que faltaba por escribir (el cliente OAuth). Se conserva la tabla propia reindexada por `uid`, el endpoint de borrado y la suite de verificación. **`v10` no se mergea.** Pendiente de que Xavi confirme en la [#16](https://github.com/CronosAIDev/wiki-cronos/issues/16) | **Se rehace con Firebase (v13)** | Alta |
| F53 | `/.well-known/assetlinks.json` no se servía (Fase 2) | Express ignora por defecto los directorios que empiezan por punto (`dotfiles: 'ignore'`), así que el fichero daba **404** aunque `express.static` vaya antes de cualquier `requireAuth`. Montado aparte en `src/index.js` — quitado el prefijo, lo que queda es `/assetlinks.json`, que ya no es un dotfile — en vez de abrir `dotfiles: 'allow'` a todo `public/`. Con `scripts/assetlinks.js`, que se niega a escribir una sola huella SHA-256. Verificado por ejecución: **200**. [Issue #18](https://github.com/CronosAIDev/wiki-cronos/issues/18) | **Hecho (v12)** | Alta |
| F54 | ¿La app funciona hoy? (Fase R) | Los siete caminos verificados **por ejecución** el 01-09: login, dictado por voz, corrección por texto, corrección por foto, textos personales, perfil y vista móvil. Claude y la visión responden en producción. [Issue #21](https://github.com/CronosAIDev/wiki-cronos/issues/21) cerrada | **Hecho** | Alta |
| F55 | Banco de pruebas de modelos y coste por corrección (Fase R) | Errores inyectados por clase (acento abierto/cerrado, ela geminada, apostrofació, dièresi, pronoms febles, b/v) sobre los textos del banco: el ground truth sale gratis porque el texto correcto ya lo tenemos. Mide recall, falsos positivos, acierto de clasificación, JSON válido, latencia y **coste real** del campo `usage`. Los falsos positivos pesan más: enseñan ortografía equivocada. La elección de modelo es de Óscar. Ya no hace falta tocar código para probar: `DICTATS_MODEL` lo escoge (v6). ⚠️ **La #22 se escribió para la arquitectura de antes**: desde F31 el modelo no busca los errores, así que recall, falsos positivos y clasificación del camino de texto son deterministas y no dependen del modelo. Donde la elección sí decide es en la **foto**, porque el modelo transcribe y una transcripción falsa se le enseña al usuario como falta suya. Arnés hecho y verificado en `scripts/benchmark/` (recall 100% en las 8 clases). **El arnés de la foto también está escrito (`visio.js`, v14)**: 3 modelos x N fotos x N pasadas con el prompt extraído de producción en vez de copiado, coste real del `usage`, p50/p95 y conclusión por el más barato que baja de 1 error de transcripción. Probados los caminos que no gastan. De paso: la tabla de precios de la #22 da Sonnet 5 a $3/$15, que es el precio de Sonnet **4.6** — Sonnet 5 vale $2/$10. Falta lo que no es código: **las 4 fotos manuscritas** y una clave de API válida | **Parcial** | Alta |
| F57 | Dos apóstrofos seguidos se desmontan | `L'oli d'oliva` escrito `El oli de oliva`: los errores se encontraban todos, pero se reportaban dos de más y el texto enseñado salía desplazado. Rehecho `ajuntaApostrofs()` para que trabaje por tandas y no parejas: cada palabra apostrofada consume las dos que le tocan, en los dos sentidos y probando el orden inverso. 4 tests nuevos; benchmark 790/790 con 0 falsos positivos | **Hecho (v10)** | Media |
| F58 | El banco no cubre las clases que más discriminan | Dos textos avanzados escritos a propósito (`a11`, `a12` en `data/texts.js`): ela geminada **5→18**, dièresi **7→20**, b/v **7→17**, ce trencada 12→22. Benchmark tras el cambio: 850/850 encontrados, 0 falsos positivos. Doblan como textos de dictado para usuarios avanzados | **Hecho** | Media |
| F59 | Probar la identidad propia contra MySQL de verdad | Usuario MySQL dedicado `dictats` (solo `cronosai.*`), tablas creadas con `001_usuaris.sql` y la Fase 0 de `v10` verificada por ejecución el 02-09: 11 comprobaciones en verde (alta, login, sesión que sobrevive al reinicio, borrado de cuenta). Credenciales fuera del repo | **Hecho** | Alta |
| F60 | Migrar las cuentas que ya existen | El ensayo destapó que `BrandWaiUserProfile` no tiene «2 usuarios»: tiene **212 cuentas, que son clientes de FeedScale**. **Decidido por Óscar el 03-09: alta de cero, sin migrar a nadie.** El historial de SQLite se queda y quien repita correo lo recupera solo; `scripts/db/002_migrar_usuaris.js` ya no se usará | **Decidido — no se hace** | Media |
| F61 | Nombre público, `applicationId` y ficha de Play (Fase 4) | Material en [`FITXA_PLAY.md`](../sections/publicacio/FITXA_PLAY.md): nombre, `applicationId` con alternativas, keywords separando lo comprobado de la hipótesis, descripción y guion de capturas. **El dato que lo cambia todo**: el C2 es requisito docente desde el curso 25-26 y solo lo tiene el 25% del profesorado — unas 70.000 personas. **Y su trampa**: el examen de C2 no es un dictado (el Área 2 es de opción múltiple), así que prometer preparación sería sobrevender. Falta que Óscar decida nombre, `applicationId` y si la ficha menciona el C2 | **Redactado, pendiente de decisión** | Alta |
| F62 | Gráfico de cabecera 1024×500 para Play | Hecho con fuente HTML y script para regenerarlo en `docs/sections/publicacio/assets/` | **Hecho (v12)** | Media |
| F63 | Política de privacidad, Data Safety y clasificación (Fase 3) | Página `/privacitat` servida por la app **sin sesión** (verificada: 200) y respuestas del formulario en [`DATA_SAFETY.md`](../sections/publicacio/DATA_SAFETY.md). Al camino de texto **solo salen las palabras falladas**, no el texto entero (consecuencia de F31), y la foto no se guarda en ningún sitio (`memoryStorage`). ⚠️ La política se reescribió al rescatarla: la versión de `v10` describía la Fase 0 (bcrypt, `google_id`, dos vías de borrado), que no está en producción. Ahora dice lo que el código hace hoy; las tres filas de identidad de `DATA_SAFETY.md` se rehacen cuando entre Firebase | **Hecho (v12)** | Alta |
| F64 | Botón para reportar contenido generado con IA | Play trata las apps que generan contenido con IA como área regulada y exige poder denunciar desde dentro de la app; las explicaciones las escribe el modelo, así que Dictats entra. `public/report.js` + `POST /api/report` (20/hora) y tabla `content_reports`. No modera ni esconde nada: lo guarda para que alguien lo mire. Verificado por ejecución | **Hecho (v12)** | Alta |
| F65 | Reclutar los 20 testers docentes | Son **14 días de calendario** que no han empezado. Antes hay que decidir si la cuenta de desarrollador es personal (los exige) o de organización (no, pero pide D-U-N-S y también tarda). Decisión de Óscar, preguntada en la [#19](https://github.com/CronosAIDev/wiki-cronos/issues/19) | Pendiente | Alta |
| F56 | Rate limit en las rutas de corrección | **Lo cubre F14** (v11): `limitaCorreccions`, 30/hora por email con 429 y test propio. La versión de `v10` (`src/lib/limits.js`) era la misma feature escrita dos veces y se descarta en el rescate a `v12` | **Hecho (v11, como F14)** | Media |

### Otros (anteriores a la revisión)

| ID | Feature | Descripción | Estado | Prioridad |
|----|---------|-------------|--------|-----------|
| F12 | Estadísticas avanzadas | Gráficos de progreso por nivel y semana. Lo concreta F36 | Pendiente | Baja |
| F14 | Rate limit en `/api/correct` y `/api/correct-image` | Hecho (v11): `limitaCorreccions` — ventana deslizante en memoria por email, 30/hora (`DICTATS_MAX_CORRECCIONS_HORA`), 429 con mensaje de cuánto falta. Test unitario en `test/limits.test.js` | **Hecho** | Baja |
| F15 | Rotación de logs PM2 | `/var/dictats/logs/{out,err}-3.log` sin rotación configurada | Pendiente | Baja |

---

## Plan de versiones

| Versión | Entra | Qué cambia para quien usa la app |
|---------|-------|----------------------------------|
| **v6** | F16–F23, F24, F31, F41, F45 | El dictado deja de pelearse contigo: la pausa dura lo que dura escribir, "Repetir" repite lo que suena, se puede parar, se puede escribir en el móvil. La corrección aparece al instante y marca la palabra correcta. Y se empiezan a guardar los errores. Además hay un rango que sube y baja con lo que haces: la progresión que un dictado suelto no puede dar |
| **v7** | F25–F28, F32 | La app empieza a entrenar: sabe de qué son tus errores, te dice dónde fallas, te devuelve las frases falladas a los pocos días y te deja practicar un minuto |
| **v8** | F29, F30, F33–F37 | Se entrena gramática produciendo texto propio, cada error trae su regla, y el progreso se ve en una curva comparable consigo misma |
| cuando toque | F38–F44 | Modo oscuro, accesibilidad, buscador, la pantalla que no se apaga |

> ⚠️ **Publicar va antes que v7.** El gameplan F51 manda sobre este plan: hasta que Dictats
> esté en Play, entra primero el bloque G (F52–F56). v7 y v8 siguen siendo el rumbo del
> producto, pero esperan.

> ℹ️ **Las versiones de este plan no son los nombres de las ramas.** Desde el 29-08 `origin`
> tiene `v5`…`v9` con los documentos del gameplan de Óscar, que no son las `v5`/`v6` de
> producto de esta tabla. El trabajo de producto reconciliado vive en la rama **`v10`**;
> las ramas locales anteriores se conservan como `v5-gerard-pre-reconciliacio` y
> `v6-gerard-pre-reconciliacio`, más los tags `reconciliacio-backup-v5` y `-v6`.

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
| F16 | Dictats en Google Play | [Gameplan](../sections/publicacio/GP_dictats_a_google_play.md) — PWA → TWA → ficha de Play. Bloqueado en Fase 0: decidir quién puede usar la app (hoy el login va contra la tabla de clientes de Trawlingweb) | En curso | gerard |

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
| F32 | Ver tu texto al lado del correcto | La pantalla de resultados solo pinta el original marcado; lo que escribiste no aparece (salvo en modo foto). Los dos textos enfrentados, palabra contra palabra | Pendiente | Alta |
| F33 | Resultado progresivo | Entre "Corregir" y ver algo hay una llamada a Opus con `max_tokens: 4096` y un spinner mudo. Con F31 el recuento y las marcas salen al instante y las explicaciones llegan después | Pendiente | Media |

### Bloque D — Constancia y sentido de progreso (v8)

| ID | Feature | Descripción | Estado | Prioridad |
|----|---------|-------------|--------|-----------|
| F34 | Racha y objetivo diario | "Llevas 4 días seguidos", con un objetivo pequeño (un dictado o tres micro-ejercicios). Cobra sentido con F28: una racha que exige 10 minutos se rompe el primer día ocupado | Pendiente | Media |
| F35 | Marcar textos hechos y proponer el siguiente | La lista de 30 textos se ve igual el primer día que el trigésimo. Marca de hecho con resultado y un texto destacado como "lo siguiente". Los datos ya están en `user_progress` | Pendiente | Media |
| F36 | Progreso normalizado + gráfico | La media de errores va redondeada a entero (2,4 y 2,6 se ven igual) y compara dictados de 34 palabras con otros de 84. Errores por 100 palabras, con curva por semana. **No toca la escala motivadora**, que va por nº de errores por decisión de producto (`CLAUDE.md`). Concreta F12 | Pendiente | Media |
| F37 | Historial cronológico | `/api/profile` ordena por `errors_count ASC`, documentado como intencionado en el CHANGELOG 1.0.0. Pero la pantalla se llama "Historial" y el `LIMIT 50` sobre ese orden puede dejar fuera el dictado recién hecho. Dos pestañas, "Recents" y "Millors" | Pendiente | Media |

### Bloque E — Accesibilidad y remates

| ID | Feature | Descripción | Estado | Prioridad |
|----|---------|-------------|--------|-----------|
| F38 | El móvil bloquea el zoom | `maximum-scale=1.0` en el viewport de `/mobile`, en una app de leer y escribir texto | Pendiente | Media |
| F39 | Nada de lo que cambia se anuncia | Ni un atributo `aria-` en todo el frontend; el estado del dictado solo cambia visualmente. `aria-live="polite"` y foco visible. Es una app que se usa con los oídos | Pendiente | Media |
| F40 | Modo oscuro | Ninguna regla `prefers-color-scheme` en `style.css`. Las variables de color ya están todas en `:root` | Pendiente | Baja |
| F41 | Escapar el título de los textos personales | `loadTextList()` mete `t.title` crudo en `innerHTML`; el resto de la pantalla sí usa `escapeHtml()`. Solo afecta a la propia cuenta | **Hecho (v6)** | Media |
| F42 | Editar textos personales | Solo se pueden crear y borrar: una errata obliga a rehacer el texto entero. Y crearlos desde el móvil, que hoy no se puede | Pendiente | Baja |
| F43 | Buscar y filtrar en la lista de textos | Son 30 y van a ser más | Pendiente | Baja |
| F44 | La pantalla se apaga a mitad del dictado | En el móvil la síntesis de voz se corta al bloquearse la pantalla. Screen Wake Lock mientras dura el dictado | Pendiente | Media |

### Otros (anteriores a la revisión)

| ID | Feature | Descripción | Estado | Prioridad |
|----|---------|-------------|--------|-----------|
| F12 | Estadísticas avanzadas | Gráficos de progreso por nivel y semana. Lo concreta F36 | Pendiente | Baja |
| F14 | Rate limit en `/api/correct` y `/api/correct-image` | Solo protegidos por `requireAuth`; sin límite de llamadas a la API de Anthropic (coste, no seguridad de datos). F31 reduce el coste por llamada | Pendiente | Baja |
| F15 | Rotación de logs PM2 | `/var/dictats/logs/{out,err}-3.log` sin rotación configurada | Pendiente | Baja |

---

## Plan de versiones

| Versión | Entra | Qué cambia para quien usa la app |
|---------|-------|----------------------------------|
| **v6** | F16–F23, F24, F31, F41, F45 | El dictado deja de pelearse contigo: la pausa dura lo que dura escribir, "Repetir" repite lo que suena, se puede parar, se puede escribir en el móvil. La corrección aparece al instante y marca la palabra correcta. Y se empiezan a guardar los errores. Además hay un rango que sube y baja con lo que haces: la progresión que un dictado suelto no puede dar |
| **v7** | F25–F28, F32 | La app empieza a entrenar: sabe de qué son tus errores, te dice dónde fallas, te devuelve las frases falladas a los pocos días y te deja practicar un minuto |
| **v8** | F29, F30, F33–F37 | Se entrena gramática produciendo texto propio, cada error trae su regla, y el progreso se ve en una curva comparable consigo misma |
| cuando toque | F38–F44 | Modo oscuro, accesibilidad, buscador, la pantalla que no se apaga |

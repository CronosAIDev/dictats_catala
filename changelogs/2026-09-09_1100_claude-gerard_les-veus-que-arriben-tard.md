## [2.0.1] — 2026-09-09 — Les veus que arriben tard

### Corregido

- **Un aparell que sí que té veu podia dir que no en té.** `getVoices()` torna una llista
  **buida fins que el navegador té les veus carregades**, i això no passa alhora a tot
  arreu: a Safari d'iPhone i a Chrome acabat d'obrir arriben més tard, amb l'esdeveniment
  `voiceschanged`.

  El motor ho preguntava **de cop** en començar a llegir, i si en aquell instant la llista
  era buida queia a l'estat `sense-veu` — l'avís més contundent que dona l'app, i seria
  fals. Ara s'espera fins a **un segon** que arribin; si passa i segueix buida, és que de
  veritat no n'hi ha (el cas de F68, un Linux sense síntesi) i llavors sí que es diu.

  L'avís de F21 ja mirava `onvoiceschanged` a la vista; el que no ho feia era la màquina
  d'estats, que és la que decideix si el dictat pot sonar.

  **No està verificat en un iPhone**: aquí no n'hi ha cap. El comportament asíncron de
  `getVoices()` està documentat i es prova amb un doble que avisa com ho fa un navegador,
  però qui ho ha de confirmar és un aparell de veritat.

### Verificado

3 comprovacions noves a `test/dictat.test.js`, amb un `speechSynthesis` fals que **avisa
quan les veus arriben**, com fan els navegadors. 390 a `npm test`.

**Una prova que es trepitjava a ella mateixa.** El bloc de «sense cap veu» deixa el
rellotge corrent 1,3 s; un altre bloc, mentrestant, tornava a posar veus al doble, i quan
aquell rellotge s'acabava comprovava una cosa diferent de la que deia. Ara va l'últim i
tanca ell el resum. Dos blocs que comparteixen estat global i temps no són independents
encara que ho semblin.

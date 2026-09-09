## [2.0.2] — 2026-09-09 — Una foto negra no és una correcció

### Corregido

- **Una foto negra costava una crida al model i tornava faltes inventades** (F82).

  Ho va veure en Gerard: en fer la foto amb la càmera del mòbil, «es veia tot fosc».

  **La part de la càmera no és nostra**, i val la pena que consti perquè és el primer que
  es pensa: l'app **no fa servir `getUserMedia`** —és un `<input type="file"
  capture="environment">`, o sigui que la càmera l'obre el sistema— i **no posem cap
  `Permissions-Policy`**, comprovat a les capçaleres de producció. És el permís de càmera
  del telèfon, i una pàgina web no el pot demanar.

  **El que sí que era nostre és el que passava després.** Aquella imatge negra viatjava a
  la visió del model, costava diners i tornava una transcripció inventada — i el que en
  sortís se li ensenyava a la persona **com si fossin faltes seves**. És exactament el
  pitjor error que pot cometre aquesta app.

  Ara es mira abans d'enviar-la. **I no n'hi ha prou de mirar si és fosca**: un paper
  fotografiat amb poca llum també ho és, i aquella foto és bona. El que distingeix una
  imatge **buida** és que és **plana**: tots els píxels valen gairebé el mateix. Es miren
  les dues coses, i amb contrast passa per fosca que sigui.

  Quan no serveix, es diu on és el permís —iPhone i Android— i que també es pot triar de la
  galeria.

### Verificado

12 comprovacions a `npm test`, sobre la **decisió** i no sobre com es mesura: mesurar
necessita un canvas, però equivocar-se en el llindar és el que faria mal. **Barrar una foto
bona és pitjor que deixar-ne passar una de dolenta** — la dolenta costa una crida; la bona,
que algú no pugui corregir el que ha escrit.

I amb tres imatges fabricades al navegador: negra sencera **(0, 0) rebutjada**, fosca amb
lletra **(40, 25) acceptada** i clara **(254, 11) acceptada**.

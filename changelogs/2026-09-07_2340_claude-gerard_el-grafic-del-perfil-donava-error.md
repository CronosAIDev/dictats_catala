## [1.3.1] — 2026-09-07 — El gràfic del perfil donava error a cada càrrega

### Corregido

- **La corba setmanal del perfil llançava un error a la consola cada vegada que
  s'obria `/profile`** (F36):

  ```
  Error: <svg> attribute height: Expected length, "auto".
  ```

  L'SVG duia `height="auto"`. `auto` és un valor de **CSS**, no una longitud d'SVG: com a
  atribut de presentació el navegador el rebutja. El gràfic es veia bé, però per sort —el
  navegador queia a la seva mida per defecte— i no perquè estigués demanat.

  Ara la mida va on li toca: `width="100%"` amb `preserveAspectRatio` a l'atribut, i
  `height:auto` a l'`style`. Verificat executant-ho al navegador: **cap error a la
  consola** i l'SVG manté la proporció exacta del `viewBox` (672 × 294 per a 320 × 140).

  Ho va destapar **obrir l'app i mirar la consola**, no llegir el codi: la pantalla es
  veia correcta i els 33 tests de `progres.js` passaven, perquè cap dels dos mira el que
  el navegador diu que no entén.

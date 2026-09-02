# F32 — el teu text al costat del correcte

**Data**: 2026-09-02 · **Autor**: claude-gerard · **Branch**: v11

## El mal

La pantalla de resultats només pintava l'original amb els errors marcats: el que havies
escrit tu no apareixia enlloc (fora del mode foto, que ensenya la transcripció en brut).
Per entendre un error havies de reconstruir mentalment què havies posat.

## L'arreglo

Dos panells enfrontats — «El text original» i «El que has escrit» — a `app.html` i
`/mobile` (graella de dues columnes que s'apila en pantalles estretes). El text de
l'alumne **no es guarda ni es reenvia**: `pintaElTeu()` el reconstrueix al client des de
`position`/`span`/`userWrote` que el servidor ja calcula, així queda alineat paraula a
paraula amb l'original:

- Paraula correcta → tal qual.
- Error → el que va escriure l'alumne, marcat, amb tooltip «Tocava: …» i l'explicació.
- Omissió → un forat `___` (`.word-gap`, subratllat discontinu).
- Paraula de més (sense posició a l'original) → al final, marcada.
- Sense correcció (dictat en paper sense foto) el panell s'amaga.

## Verificat

Chrome headless contra `/mobile` amb el flux sencer (dictat → escriure → corregir, amb
la clau d'API caient al fallback d'explicacions genèriques):

- Substitució: la paraula equivocada surt marcada al seu lloc del panell de l'alumne.
- Omissió pura: el forat `___` surt exactament on faltava la paraula.
- Omissió + afegit llunyà: el corrector els casa com a substitució (comportament
  conegut de `buida()`); el panell és fidel al que diu la llista d'errors.
- `app.html`: `pintaElTeu` present i pinta bé un cas mínim; cap error de JS.
- Suite completa: exit 0.

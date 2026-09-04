# L'app es pot fer servir sense mirar-la

**Data**: 2026-09-04 · **Branca**: `v17` · F39 al roadmap

## El punt de partida, comptat

```
$ grep -c "aria-\|role=" public/*.html public/*.js
  ...tots a 0, menys report.js: 2
```

**Cap atribut d'accessibilitat a tot el frontend**, i el focus del teclat era el que posa el
navegador per defecte, que sobre fons blanc gairebé no es veu.

Costa més del normal en aquesta app concreta: **és una app que es fa servir amb les
orelles**. Sents una frase, l'escrius, sents la següent. Qui la faci servir amb un lector de
pantalla n'és usuari de ple dret, no un cas límit — i fins avui l'estat del dictat només
canviava de color i de text, que per a un lector és no canviar gens.

## Què s'ha fet

| | |
|---|---|
| **L'estat del dictat** | `role="status"` amb `aria-live="polite"`, una sola regió per a l'estat, la barra i la frase |
| **L'avís de veu** | `role="alert"` — si no hi ha veu catalana el dictat no sonarà, i això s'ha de saber ara |
| **Les barres** | `role="progressbar"` amb `aria-valuenow` que **es mou de veritat**, la del dictat i la del rang |
| **Els botons de mode** | `aria-pressed`: són un interruptor de dos estats, no dos botons solts |
| **Els enllaços del capçal** | 📊 i 🖥️ tenien `title`, que el ratolí llegeix i un lector no. Ara tenen `aria-label` |
| **El focus** | Contorn de 3 px visible sobre qualsevol fons, i es mou al resultat quan arriba una correcció |
| **El resultat** | S'anuncia: «Molt bé! 40 de 42 paraules, 2 errors.» |
| **Moviment** | `prefers-reduced-motion` respectat |

Tot a `public/a11y.js`, una sola vegada, com `rang.js` i `explicacions.js`.

## La decisió que condiciona la resta

**Tot s'anuncia amb `polite`, mai amb `assertive`.** Mentre es dicta hi ha una veu sintètica
llegint el text: un anunci que la interrompi a cada frase no faria la pantalla accessible,
la faria inservible. I per això l'estat, la barra i l'indicador de frase comparteixen **una
sola** regió viva: separats, el lector diria tres vegades el mateix canvi.

## Dos bugs que ha destapat, i el segon és meu d'avui

Escriure la comprovació al navegador —en comptes de mirar l'HTML— va trobar dues coses que
llegint el codi no es veuen:

**1. El focus s'enfocava a una vista encara amagada.** A `mobile.html` el focus es movia
abans de `showView('results')`. Enfocar una cosa amb `display:none` no fa res: el lector es
quedava on era i l'anunci arribava sense context.

**2. El repintat de F33 s'enduia el focus.** Fa un parell d'hores, a la mateixa sessió, vaig
separar les explicacions perquè arribessin després. Cada vegada que arriben es torna a
pintar el resultat sencer i **això destrueix l'element que tenia el focus**: qui va amb
lector estava llegint la correcció i de cop el focus li saltava al `body`, sense que hagués
passat res que ho justifiqués.

Es resol amb `A11y.preservantFocus()`, que es recupera per `id` — després de repintar,
l'element antic ja no existeix encara que en guardessis la referència.

Val la pena que consti: **F39 ha pagat la primera factura de F33 el mateix dia que es va
introduir**, i cap de les dues coses hauria sortit d'una revisió llegint el diff.

## Verificat executant

`node test/f39.navegador.js` — **9 comprovacions amb Chrome de veritat**: que els atributs
hi són, que els `aria-pressed` **es mouen** en canviar de mode, que la barra de rang diu on
és, que el focus arriba al resultat i que l'anunci surt («Molt bé! 40 de 42 paraules, 2
errors.»).

Fora de `npm test` pel mateix motiu que `f33.integracio.js`. Les 116 d'allà i les 14 de F33
segueixen en verd.

## Sense verificar

- **Cap lector de pantalla de debò l'ha llegit.** El que està provat és que els atributs hi
  són i que canvien quan toca; que NVDA, VoiceOver o TalkBack ho llegeixin bé és una prova
  que necessita el lector posat i una persona escoltant.
- **El contrast dels colors no s'ha mesurat.** És l'altra meitat d'una revisió
  d'accessibilitat seriosa i queda pendent.

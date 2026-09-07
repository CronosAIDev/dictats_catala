# Dues coses que han sortit provant l'app

**Data**: 2026-09-07 · **Branca**: `v25` · F68 i F69 al roadmap

Cap de les dues surt de llegir codi. Surten d'en Gerard obrint l'app i fent-la servir, que
és el que cap prova headless havia fet fins avui.

## F68 — el dictat es donava per fet sense haver sonat

En un Linux sense cap síntesi de veu instal·lada, la pantalla deia **«Dictat completat» amb
la barra al 100 %** i no havia sonat res.

La causa: sense veus, `speak()` acaba a l'instant. El motor encadenava la frase següent, i
les cinc passaven en un sospir. **L'avís de F21 deia la veritat i la màquina d'estats deia
el contrari**, que és pitjor que no avisar.

Ara hi ha un estat propi, `sense-veu`: insígnia taronja, «El dictat no ha pogut sonar en
aquest dispositiu», i cap progrés fals. Escriure i corregir segueixen funcionant, que no
depenien del dictat.

Quatre comprovacions noves a `test/dictat.test.js`, inclosa que amb veu tot segueix igual.

## F69 — divuit paraules no escrites tapaven els cinc errors de veritat

El mateix dictat, escrit a mitges: 26 paraules, 8 escrites. El resultat eren **23 fitxes**,
i divuit deien la mateixa frase, «Aquesta paraula no s'ha escrit». Enmig hi quedaven
enterrats els cinc errors que es poden estudiar: una majúscula, dues d'ortografia, un
diacrític i una b/v.

Deixar de dictar a mitges **no són divuit errors independents**: és una sola cosa que ha
passat. Ara una tirallonga de tres o més paraules seguides sense escriure es resumeix en una
fitxa grisa —«12 paraules seguides · Del dictat, des de "M'agrada" fins a "meravellosa"»—, i
una o dues soltes **no** s'ajunten, que allà sí que importa quina t'has deixat.

De 23 fitxes a 7.

**No es toca el compte.** Els errors segueixen sent els que són i l'escala i els punts no es
mouen. Si algun dia es decideix que abandonar un dictat no ha de puntuar com vint faltes,
això és una altra decisió i es pren a part.

A `public/errors.js`, un sol fitxer per a les dues vistes, com `rang.js`, `textos.js` i
`a11y.js`. 12 comprovacions a `npm test`.

## De passada

`.gitignore` passa de `data/dictats.db` a `data/*.db`: qualsevol base de dades de proves que
es faci en local es queda fora del repo.

## El que NO era un error

De la mateixa prova va sortir una classificació que semblava dolenta —`vlau → blau` marcat
com a **B i V**— i resulta que és correcta: canviar la b per la v és exactament aquesta
regla. Es va comprovar reproduint la correcció sencera. Les altres quatre també eren bones.

# Fase R — banc de proves del corrector, i un bug d'apòstrof que hi ha caigut

**Data**: 2026-08-31 · **Autor**: claude-gerard · **Branch**: v10

Feina de la Fase R del gameplan de publicació a Play, Issue #22 i F55 del roadmap.
El gameplan diu que la Fase R va abans d'empaquetar res, i que si alguna cosa falla
s'arregla abans de continuar. Ha fallat una cosa, i està arreglada.

## El banc

`scripts/benchmark/injecta.js` agafa un text del banc i hi espatlla paraules d'una classe
concreta, retornant exactament quins errors hi ha i on. Amb la mateixa llavor surt sempre
el mateix joc de proves. Les vuit classes són les de la taula de la #22 —les que
discriminen en català— i cada regla toca **una sola cosa** per paraula, o l'error deixa de
ser mesurable.

`scripts/benchmark/puntua.js` ho passa pel corrector i compta. `npm run benchmark`.

No cal clau d'API ni xarxa: **el ground truth surt gratis** perquè l'app ja té el text
correcte, tal com apunta la Issue.

## El resultat: 100 % de recall a les vuit classes

150 casos, 790 errors injectats, **790 trobats**. Cap classe per sota del 100 %.

Els tipus que hi posa el corrector són els sis de sempre: ela geminada, ce trencada i b/v
cauen totes tres dins d'`ortografia`, i la dièresi dins d'`accentuació`. No és cap error
—la taxonomia fina és F25— però queda mesurat que **avui l'app no pot dir «se t'escapa la
ela geminada»**.

## El bug que ha caigut

`A l'estiu el sol` escrit `A el estiu el sol` es comptava com **tres** errors: una paraula
omesa i dues de més. Per a qui escriu és **una sola falta d'apòstrof**, i comptar-li'n
tres és exactament el que F31 existeix per eliminar.

La causa: en desfer l'apòstrof apareix un `el` que **ja existia** unes paraules més enllà a
l'original, i l'àncora de la subseqüència comuna se l'endú. El que quedava ja no tenia la
forma «substitució seguida de paraula afegida» que `ajuntaApostrofs()` sabia reconèixer.

Ara es reconeix també la forma «omissió seguida de dues paraules afegides», provant les
dues combinacions d'ordre, perquè quina de les dues se n'endú l'àncora depèn del text.
Els falsos positius de tot el banc han baixat de **14 a 4**, i l'apostrofació ha passat a
classificar-se bé el 100 % de les vegades (abans, 147 de 152).

**Es pot arribar escrivint**: `el estiu` en comptes de `l'estiu` és la falta d'apòstrof més
corrent que hi ha, i el text `b6` del banc porta un `el` just després. No era un cas de
laboratori.

## Verificat per execució real

- `npm run benchmark`: 790/790 errors trobats, 4 falsos positius sobre 794 reportats.
- La regressió nova de `test/diff.test.js` **falla contra la versió d'abans de l'arreglo**
  (comprovat executant les proves noves contra una còpia del `diff.js` de `HEAD`): dona
  `paraula omesa` més dues `paraula afegida` en comptes d'una `apostrofació`.
- `npm test`: les tres suites en verd amb la prova nova.
- La cobertura del banc, comptada: 140 paraules tocables d'accent general, 56 de diacrític,
  55 d'apostrofació, 12 de ce trencada, 9 de pronoms febles, 7 de dièresi, 7 de b/v i 5
  d'ela geminada.

## NO verificat

- **Cap model s'ha arribat a executar.** El `.env` local no té clau vàlida, així que les
  passades de comparació de models —que són l'entregable que demana la #22— segueixen
  pendents. El que hi ha fet és l'arnès i la part que es pot mesurar sense clau.
- **El camí de la foto no s'ha tocat**, i és on la tria de model decideix de debò.

## Dues coses que el banc ha deixat escrites al roadmap

- **F57**: dos apòstrofs seguits —`L'oli d'oliva` escrit `El oli de oliva`— encara es
  desmunten. Els errors es troben tots, però se'n reporten dos de més. Arreglar-ho demana
  que la fusió tracti seqüències i no parells, i és un canvi de pes: es deixa mesurat i
  documentat en comptes de fer-lo de pressa.
- **F58**: el banc gairebé no té ela geminada (5 paraules) ni dièresi (7), que són de les
  que més discriminen. Per comparar models hi caldria un text escrit a posta.

## I una cosa que canvia què s'ha de mesurar

La #22 proposa mesurar recall, falsos positius i encert de classificació **per model**.
Tenia tot el sentit quan Claude buscava els errors. Des de F31 no els busca: la comparació
es fa al servidor i al model només li queda escriure les explicacions.

O sigui que al camí de **text** aquestes tres mètriques ja no depenen del model — són
deterministes, i les acabo de mesurar sense gastar res. **On la tria de model decideix de
debò és a la foto**: si la visió transcriu malament una paraula que l'usuari havia escrit
bé, se li ensenya una falta que no ha comès. És el «fals positiu que fa mal» que adverteix
la mateixa Issue, però ve de la transcripció i no de la classificació.

Queda escrit a `scripts/benchmark/README.md` i al roadmap.

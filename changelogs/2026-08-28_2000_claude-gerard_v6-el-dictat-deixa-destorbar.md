# v6 — El dictat deixa d'estorbar, i la correcció deixa de dependre de l'API

**Data**: 2026-08-28 · **Autor**: claude-gerard · **Branch**: v6

Bloc A sencer (F16–F23) més F24, F31 i F41. Surt de la revisió d'experiència d'usuari
del mateix dia, que ha deixat F16–F44 escrites al `ROADMAP.md`.

## El canvi de fons: qui compara els textos

Fins ara la comparació la feia el model. Al prompt se li demanava el camp `position`
—l'índex de cada paraula fallada dins l'original— i el frontend pintava en vermell
`paraules[position]`. Comptar índexs no és feina d'un model de llenguatge: quan se li
desviava, l'app subratllava una paraula que estava bé i deixava neta la que havia
fallat.

Ara la comparació es fa a `src/lib/diff.js`, amb àncores per subseqüència comuna més
llarga sobre una clau laxa (minúscules, sense accents ni puntuació de vora) i
aparellament per ordre del que queda entre àncora i àncora. Les posicions són exactes
per construcció. A Claude només li queda escriure les explicacions.

Tres coses que se'n deriven i que no eren l'objectiu:

- **La correcció sobreviu a un fallo de l'API.** Amb un 401 d'Anthropic —cas real
  durant les proves, el `.env` local no té clau vàlida— el dictat s'ha corregit igual,
  amb posicions i tipus correctes i explicacions genèriques per tipus. Abans, un error
  de l'API tornava un 500 i l'alumne es quedava sense res.
- **`l'aigua` → `la aigua` compta com un error, no com dos.** L'alineació ho veia com
  una substitució més una paraula afegida. Per a qui practica és una sola regla, i
  comptar-ho doble inflava l'escala injustament. Es tornen a ajuntar, i el tipus nou és
  `apostrofació`.
- **Tipus nou `majúscules`**, que abans queia dins d'`ortografia`. La taxonomia de debò
  (apostrofació completa, diacrítics, ela geminada, pronoms febles…) és F25, a v7.

## Bloc A — la mecànica

| ID | Abans | Ara |
|---|---|---|
| F16 | `PAUSE_DURATION_MS = 5000`, igual per a una frase de 6 paraules que per a una de 26 | Pausa de 2,2 s per paraula (mín. 4 s, màx. 60 s), compte enrere visible, «Següent frase» i `Ctrl+Enter` per escurçar-la i «+10 s» per allargar-la |
| F17 | «Repetir frase» feia servir `currentPhraseIdx - 1`, que és la frase **anterior** | Repeteix la que sona ara |
| F18 | Un cop començat no es podia aturar; sortir de la vista el deixava sonant | Pausar/reprendre, i sortir de la vista el pausa |
| F19 | `SPEECH_RATE = 0.75` fix | Control 0,5×–1,0×, recordat |
| F20 | 69 signes interns que la veu no diu mai, i tot i així puntuaven | Interruptor «dictar la puntuació». Apagat, els errors de puntuació es mostren i es desen com a avís i **no** compten a l'escala |
| F21 | Sense veu catalana, queia a una de castellana en silenci | S'avisa i s'explica com instal·lar-la a Android, iOS i Windows |
| F22 | Res es desava fins a prémer «Corregir» | Esborrany a `sessionStorage`, fora en corregir i en tancar sessió |
| F23 | `/mobile` no tenia ni un `textarea`: només foto o «Ometre» | Es pot escriure, crear textos propis i anar a `/profile` |

## Una còpia menys

`public/dictat.js` és nou i conté el motor del dictat, que abans estava duplicat a
`app.js` i a dins de `mobile.html`. Per això el bug de F17 hi era dues vegades. Ara
n'hi ha una sola còpia i les dues vistes només hi connecten botons.

La drecera de teclat és `Ctrl+Enter` i no la barra espaiadora, com deia la proposta:
durant la pausa s'està escrivint al `textarea` i la barra hi posaria un espai.

## F24 — es desen els errors

Taula `user_errors`, una fila per error, amb `progress_id`, tipus, paraula correcta, el
que s'ha escrit, posició i `counted` (0 per als avisos de puntuació no dictada). Amb
això ja es pot respondre «de què fallo», que és el que farà falta a tot el bloc B.

## Altres

- `DICTATS_MODEL` a l'entorn, amb `claude-opus-4-6` per defecte: **el model no s'ha
  canviat**. F31 fa que la feina que li queda a Claude càpiga en un model més petit i
  barat, però quin s'hi posa és decisió d'Óscar.
- La correcció per foto ara demana a la visió només la transcripció, i la transcripció
  passa pel mateix diff. Dues crides curtes en lloc d'una de llarga.
- F41: el títol dels textos personals va escapat a les dues vistes.
- «dictado» → «dictat» als textos de la interfície. És un castellanisme, i en una app
  per aprendre català la pantalla també ensenya.

## Revisió abans de commitejar

Una passada de revisió sobre tot el canvi va trobar onze coses. Totes arreglades i
totes amb comprovació:

**Greu — el dictat es podia quedar mut per sempre.** `speechSynthesis.pause()` marca el
sintetitzador sencer i `cancel()` **no** el desmarca. Bastava pausar un dictat, tornar
enrere, triar un altre text i tornar a començar: `atura()` deixava l'estat en `aturat`,
`repren()` ja no era accessible i la veu següent sortia muda, sense `onend`, amb la
pantalla clavada a «Llegint frase 1 de N». Ara `_parla()` i `atura()` fan `resume()`
després de `cancel()`. Hi ha una prova de regressió que falla contra la versió d'abans.

**El mateix flag, per dues portes més.** «Següent frase» i «Repetir frase» acceptaven
l'estat `pausat` i parlaven contra un sintetitzador pausat — al mòbil els quatre botons
són visibles alhora, així que era fàcil d'encertar.

**Pausar just quan s'acaba una frase encallava el dictat.** L'`onend` arribava amb
l'estat ja `pausat` i la funció sortia sense programar la pausa; en reprendre no hi
havia ni veu ni compte enrere. Ara s'apunta què tocava fer i `repren()` ho recupera.

**El client i el servidor no partien el text igual.** `tokenitza()` canvia `||` per un
espai i `textNet()` el treia del tot. Als 30 textos del banc dona igual, perquè el
separador sempre va envoltat d'espais — però un **text personal** escrit
`frase.||frase.` donava una paraula menys al client, i totes les marques posteriors
queien a la paraula equivocada. Que és exactament el que F31 havia d'eliminar.

**Sense sostre de mida a l'alineació.** L'LCS reserva una matriu de (n+1)×(m+1); amb el
límit de 100 kB del body, una sola petició autenticada podia reservar centenars de
megues i bloquejar el servidor. Ara hi ha un màxim de 3.000 paraules i es torna un 413.

**La puntuació es contradeia amb ella mateixa.** Les paraules afegides no ocupen cap
posició de l'original, així que no restaven: escriure sis paraules on n'hi havia tres
donava «3 de 3 correctes» amb 3 errors i **score 100**. Ara compten al denominador
(score 50) i la línia de resultats diu quantes paraules de més hi ha.

**Al mòbil es podia corregir dues vegades.** El botó quedava a l'abast del dit mentre
girava l'indicador: un doble toc feia dues crides a l'API i dues files a l'historial pel
mateix dictat. L'escriptori sí que el bloquejava.

**Una sessió caducada era un carreró sense sortida.** Amb 8 hores de sessió, qui torna
l'endemà i prem «Corregir» rebia un `alert('No autenticat')` i prou. Ara un 401 porta al
login.

**L'error d'apòstrof fusionat només pintava una de les dues paraules** que abasta, que
és el símptoma que aquest fitxer diu que existeix per eliminar. Les diferències porten
ara un `span`.

**El service worker podia servir fitxers vells indefinidament.** La revalidació de
segon pla no estava dins de `event.waitUntil()`, així que el navegador podia matar el
worker abans que acabés el `cache.put`. Amb `dictat.js` acabat de separar de
`mobile.html`, una còpia vella d'un i fresca de l'altre és una avaria real.

**F41 estava a mitges i quedava un castellanisme.** `profile.html` encara pintava
`text_title` i `level` crus a `innerHTML` —i l'historial és justament on es veuen els
títols personals— i encara deia «dictado».

## F45 — Rangs i punts

Un dictat solt no dona sensació de millora: es corregeix, es puntua i s'acaba aquí. El
rang és l'altre eix, l'acumulat.

Vuit rangs amb l'anatomia d'un castell: **Pinya, Folre, Manilles, Tronc, Terços, Dosos,
Aixecador, Enxaneta**. La metàfora és literal —es puja— i de passada explica una cosa
del país, que en aquesta app compta.

Tres decisions que caldrà afinar, i que estan escrites al fitxer perquè es puguin
discutir:

1. **Els punts pugen amb la dificultat, però les pèrdues no.** Un avançat perfecte val
   molt més que un bàsic; equivocar-s'hi costa el mateix que en un bàsic de la mateixa
   llargada. Si el càstig també s'escalés, provar coses difícils sortiria a compte només
   quan ja et surten bé, que és al revés del que volem.
2. **El llindar on es comença a perdre són 6 errors**, que és on l'escala passa de «Bé!»
   a «Progressant!». Les dues coses han de dir el mateix o l'app es contradiu a la
   mateixa pantalla.
3. **Es baixa de rang, amb un marge de 40 punts.** Sense marge, el primer dictat fluix
   després d'ascendir et torna a baixar i el rang fa io-io.

**El rang no substitueix l'escala motivadora.** L'escala («Excel·lent!», «Molt bé!») va
per nombre d'errors i és una decisió de producte escrita a `CLAUDE.md`; diu com ha anat
*aquest* dictat. El rang diu on ets en conjunt. Van a llocs diferents de la pantalla.

Res es desa acumulat: el total es recalcula recorrent l'historial. Costa una consulta
més i, a canvi, el dia que s'afini la fórmula tothom queda recol·locat sol. Columna nova
`total_words` a `user_progress`; els dictats anteriors s'estimen per la mitjana del seu
nivell en comptes de deixar de comptar de cop.

### El ritme que surt

| Perfil | Després de… | On arriba |
|---|---|---|
| Bàsic amb 1-2 errors | 40 dictats | Manilles (3/8) |
| Puja de nivell i va millorant | 80 dictats | Dosos (6/8) |
| Avançat, s'estanca i empitjora | 45 dictats | Arriba a Terços i **cau a Tronc** |

Els números —multiplicadors 1 / 1,5 / 2,2, els trams de qualitat i els llindars— són un
primer tanteig, no una mesura. Queden com a F46 al roadmap per revisar-los amb ús real.

## Proves al repositori

`npm test` — 60 comprovacions, sense dependències. `test/diff.test.js` mira que la
posició de cada error dins l'original sigui exacta; `test/dictat.test.js` simula el
sintetitzador de veu, amb el detall que `cancel()` no desmarca el flag de pausa, que és
el que feia que el dictat es quedés mut. Les regressions de la revisió fallen contra la
versió d'abans de l'arreglo. `test/rang.test.js` cobreix els punts, les pujades, les
baixades i el marge.

## Verificat per execució real

- **El diff**, amb frases catalanes reals: accents, diacrítics, majúscules, puntuació,
  `ç` (que no es classifica com a accent), paraula omesa, paraula afegida, apostrofació
  en els dos sentits. Totes les posicions correctes.
- **El motor del dictat**, amb un arnès que simula `speechSynthesis`: F17 repeteix la
  frase que sona (comprovat a la frase 1 i a la 2), la pausa surt de la frase (1
  paraula → 4 s pel mínim; 17 → 37,4 s; 26 → 57,2 s), pausar i reprendre canvien
  d'estat i criden `pause()`/`resume()`, i el dictat acaba al 100 %.
- **El servidor**: `/`, `/mobile`, `/profile`, `/dictat.js`, `/app.js` → 200.
- **F20 d'extrem a extrem**: la mateixa frase amb dues comes dona 0 errors i 2 avisos
  amb la puntuació no dictada (escala «Excel·lent!»), i 2 errors i 0 avisos amb la
  puntuació dictada (escala «Molt bé!»).
- **F24**: els errors arriben a `user_errors` amb el `counted` correcte, i l'agrupació
  per tipus ja respon.
- **La degradació**: amb el 401 real de l'API, resposta completa i correcta.
- **Les tres pàgines carregades a Chrome headless**: zero errors de consola, i el JS
  pinta de debò (10 textos a escriptori i a mòbil, 4 targetes al perfil). L'avís de veu
  catalana (F21) surt de veritat, perquè aquesta màquina no té cap veu `ca-*`.
- **Les 105 referències `$('id')` de les tres vistes** existeixen al seu HTML.
- **F41 d'extrem a extrem**: un títol `<img src=x onerror=alert(1)>` arriba al DOM
  escapat i no crea cap element.
- **El sostre de mida**: 4.000 paraules tornen un 413.
- **Els rangs, d'extrem a extrem**: quatre avançats perfectes pugen de Pinya a Folre al
  tercer (+81 cada un), i quatre dictats desastrosos resten 22 punts cada un. La targeta
  de rang i l'escala sencera es pinten al perfil al navegador, sense errors de consola.
- Les dades de prova s'han esborrat de la BD local en acabar.

## NO verificat

- **No s'ha mirat com queda.** Les pàgines s'han carregat a Chrome headless i el JS
  s'executa sense errors, però ningú n'ha vist l'aspecte: la disposició dels controls
  nous, el compte enrere corrent, com queda la fila d'ajustos al mòbil. Cal una passada
  visual abans de desplegar.
- **Cap botó s'ha premut de debò.** Pausar, «Següent frase», «+10 s» i el mode d'escriure
  al mòbil estan provats per lògica amb arnès, no per interacció.
- **El camí de l'API de Claude no s'ha exercit mai amb èxit**, perquè el `.env` local
  no té clau vàlida. Només ha corregut la branca de degradació. Les explicacions
  escrites pel model, el prompt nou i el `JSON.parse` de la seva resposta **estan sense
  verificar**.
- **La correcció per foto no s'ha provat gens**: cal clau i una imatge.
- **L'avís de veu catalana (F21) no s'ha pogut provar**: depèn de les veus instal·lades
  al dispositiu i no es pot comprovar sense navegador.
- **La síntesi de veu real** —velocitat, `pause()`/`resume()` de debò, el comportament
  en segon pla al mòbil— està simulada, no provada.
- **El català dels textos nous de la interfície l'he escrit jo**, amb la mateixa
  advertència del fragment de F11: convindria que un parlant natiu hi doni un cop d'ull.
- **Cap número dels rangs està mesurat.** Els multiplicadors, els trams i els vuit
  llindars surten de simulacions meves, no d'historial real. És el primer que caldrà
  moure quan hi hagi ús (F46).
- **Un text personal cobra ×1,2 sigui com sigui**, així que en teoria es pot pujar de
  rang a base de textos trivials. Estimar la dificultat de debò és F47.
- **Els 2200 ms per paraula** surten d'una estimació de 27 paraules per minut, no d'una
  mesura amb usuaris reals. És el primer número que caldrà ajustar amb ús.

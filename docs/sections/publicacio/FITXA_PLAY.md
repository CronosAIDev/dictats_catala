# Fase 4 — Nom públic, ASO i fitxa de Play

> Feina de la Fase 4 del gameplan · Issue
> [#20](https://github.com/CronosAIDev/wiki-cronos/issues/20) · F51 al roadmap.
>
> **Res d'aquí no està decidit.** El nom i la promesa són decisions d'Óscar; això és el
> material perquè les prengui, amb el que he pogut comprovar separat del que és hipòtesi.

## 0. El que he trobat mirant, i que canvia la fase

L'Óscar va escriure a la #20: *«Jo no sé què escriu de veritat un docent català a la cerca
de Play. Aquestes són hipòtesis raonables, no dades.»* Vaig a comprovar-ho, i la primera
cosa que surt no és una paraula clau: és **per què un docent buscaria això ara**.

### El C2 ha deixat de ser un mèrit i és un requisit

- Des del curs **2025-26**, el C2 de català és **requisit indispensable** per entrar a la
  borsa de treball docent (Decret 91/2024, un cop aixecada la suspensió pel TSJC).
- Els docents en actiu que vulguin ser **director o inspector** l'han d'acreditar des del
  curs **2027-28**.
- **Només el 25% del professorat el té.** A primària, un 20% (poc més de 10.000 de 48.000);
  a secundària, un 30% (13.209 de 45.228).
- L'oferta oficial per certificar-lo *«és totalment insuficient i no cobreix la demanda que
  genera el mateix requisit»*.

Això vol dir **unes 70.000 persones a Catalunya**, que són exactament el públic objectiu
que va fixar l'Óscar, amb una necessitat **obligatòria, amb data** i un canal oficial que
no dona l'abast.

> No conec cap dada millor per a una fitxa de Play que aquesta. La intuïció de l'Óscar del
> 29-08 sobre el C2 no era una hipòtesi raonable: era el centre del problema.

### I la trampa, que és precisa

**L'app NO prepara l'examen de C2.** Ho he mirat: el C2 té quatre àrees, i l'**Àrea 2
(«domini pràctic del sistema lingüístic»)** és de **opció múltiple** —omplir buits,
detectar l'opció incorrecta, lèxic—, no un dictat. L'Àrea 3 és expressió escrita.

O sigui que dir *«prepara el teu C2»* seria exactament l'error que la #20 adverteix per a
la sintaxi: prometre una cosa que el producte no fa, i pagar-ho en ressenyes. I aquí seria
pitjor, perquè qui s'hi juga la plaça no perdona.

**On és la línia:** el C2 és el *motiu* pel qual el docent busca, i es pot dir. El que no
es pot dir és que això sigui preparació de l'examen. La frase honesta és que l'app entrena
**l'ortografia i l'accentuació**, que és la base sobre la qual descansen les àrees 2 i 3
—però no l'examen.

### Qui hi ha ja a la botiga

- **CATgrafia: ortografia catalana** (`com.catgrafia.app`) — el competidor directe: teoria
  en vídeo, resums i exercicis d'ortografia catalana, amb test de nivell i exàmens.
- **Dictats en línia de la Generalitat** — gratuïts, oficials, autocorrectius, per nivells
  (elemental, intermedi, suficiència, superior). **És la competència de veritat**, i és
  gratis i té la marca institucional.

**El que cap dels dos fa: corregir el dictat que has fet a mà, en paper, per foto.** Segueix
sent el diferencial, i ara sabem contra què.

---

## 1. El nom públic i l'`applicationId` ⚠️ IRREVERSIBLE

L'`applicationId` **es congela per sempre** en pujar el primer AAB. És la trampa 3 del
gameplan, documentada per `aicamper_app`.

### Nom visible: **Dictats en Català** (17/30 caràcters)

És el que ja diu l'app i el `manifest.webmanifest`, porta la paraula que la gent escriu
(`dictats`) i la llengua. No cal inventar-ne un de nou: un nom de fantasia obligaria a
guanyar-se el reconeixement des de zero, i aquí el que es busca és que et trobin.

### `applicationId`: **`io.generaive.dictats`**

| Opció | A favor | En contra |
|---|---|---|
| **`io.generaive.dictats`** | DNS invers d'un domini que **es controla de veritat** —l'app ja s'hi serveix— i el TWA ja hi ha de posar l'`assetlinks.json`, així que el lligam amb el domini queda fixat igualment | Si Dictats marxa mai a un domini propi, l'identificador es queda enrere per sempre |
| `cat.dictats.app` | Llegeix millor i no lliga amb cap domini d'avui | **No es controla `dictats.cat`.** Un `applicationId` que apunta a un domini d'altri és demanar-se un problema |
| `com.cronosaidev.dictats` | Neutre respecte del producte | Enganxa el nom intern de l'organització a una app pública per sempre |

**Recomanació: `io.generaive.dictats`**, però amb la pregunta al davant: *el domini
`generaive.io` és estable a cinc anys vista?* Si la resposta és no, val la pena decidir el
domini definitiu **abans** del primer AAB, perquè després no hi ha marxa enrere.

---

## 2. Paraules clau

Separo el que he comprovat del que segueix sent hipòtesi, que és el que demanava la #20.

### Comprovat

| Terme | Per què |
|---|---|
| `ortografia catalana` | És el nom del competidor directe a Play (CATgrafia) i el que fa servir la divulgació sobre el tema |
| `dictats` | Els «Dictats en línia» de la Generalitat es diuen així, i és la paraula del recurs que els docents ja fan servir |
| `C2 català`, `nivell C2` | Terme legal i quotidià des del Decret 91/2024. És el que un docent escriu quan busca **per què** ho necessita |
| `nivell superior de català` | El nom oficial del certificat C2 a la Generalitat. Conviu amb «C2» i el fa servir molta gent gran |

### Hipòtesi, per validar amb dades de Play Console

`dictats per a docents` · `ortografia per a professors` · `accentuació catalana` ·
`errors ortogràfics freqüents` · `practicar accents català` · `corregir dictat foto`

> **No fixar la fitxa amb aquests fins a tenir dades.** Play Console dona termes de cerca
> reals un cop l'app és publicada; les primeres setmanes serveixen per corregir-los.

### El que NO s'ha de posar

- ~~`practicar català`, `aprendre català`~~ — atrauen estudiants, que no són el públic, i
  la retenció que Play mesura se'n ressent. Ho va dir l'Óscar el 29-08 i el fitxer del
  gameplan encara les porta.
- ~~`preparació C2`, `examen C2`, `aprovar el C2`~~ — l'app no prepara l'examen. Veure §0.

---

## 3. La fitxa

### Descripció curta (80 caràcters, és el que surt a la cerca)

> **Detecta i elimina les faltes d'ortografia i accentuació que se t'escapen** *(72)*

És la promesa que va decidir l'Óscar el 29-08, literal. Dues alternatives, per si es vol el
diferencial al davant:

- *Dictats en català amb correcció automàtica. També si escrius en paper.* (70)
- *Practica l'ortografia catalana. Corregeix fins i tot el que escrius a mà* (72)

**Recomano la primera.** La cerca la fa qui té un problema («se m'escapen faltes»), no qui
busca una funcionalitat.

### Descripció llarga

```
Corregeix el dictat que has fet a mà, en paper, fotografiant-lo. Cap altra app ho fa.

Dictats en Català és per a qui ja escriu bé i vol deixar de fallar del tot: docents,
correctors i professionals de la llengua que no es poden permetre una falta.

COM FUNCIONA

Tries un text, l'escoltes dictat en veu alta i l'escrius. Al moment tens la correcció
amb cada error marcat a la paraula exacta, classificat per tipus i explicat.

Si prefereixes escriure a mà —que és com es fa un dictat de veritat—, fotografia el
paper i el corregeix igual.

QUÈ CORREGEIX

· Accentuació, oberta i tancada, i els accents diacrítics
· Apostrofació: l'aigua, d'octubre, m'agrada
· Ortografia: ela geminada, ce trencada, dièresi, b/v
· Majúscules i puntuació
· Paraules que t'has deixat o que has afegit

Cada error ve amb el tipus i una explicació en català. No es tracta de dir-te que has
fallat: és saber QUÈ has fallat, que és l'única manera de deixar de fer-ho.

EL DICTAT NO T'ESTORBA

· La pausa entre frases dura el que dura escriure-les, no cinc segons fixos
· Pots pausar, repetir la frase que sona, saltar-la o allargar-la
· Velocitat de lectura ajustable
· Tu decideixes si es dicta la puntuació; si no, no compta com a error

30 TEXTOS I ELS TEUS

Tres nivells de dificultat, deu textos cadascun. I pots crear els teus propis textos:
enganxa qualsevol cosa que vulguis practicar i l'app te la dicta.

ET DIU SI MILLORES

Cada dictat es puntua per nombre d'errors, no per percentatge, que per a qui practica
és molt més llegible. I hi ha un recorregut acumulat, amb l'anatomia d'un castell:
de la pinya a l'enxaneta.

RESPECTE PER LES TEVES DADES

No demana cap permís del sistema: ni ubicació, ni contactes, ni càmera. Les fotos entren
pel selector del navegador. Pots esborrar el compte i tot el que hi ha dins des de la
mateixa app.
```

**Pendent de decidir abans de publicar-la:**

- ⚠️ **El bloc del rang** («ET DIU SI MILLORES») només s'hi queda si l'Óscar diu que els
  rangs entren al llançament, que és la pregunta oberta de la
  [#23](https://github.com/CronosAIDev/wiki-cronos/issues/23). Jo recomano que no entrin.
- La primera línia és el diferencial, com demana la #20. Si es prefereix la promesa al
  davant, es giren les dues primeres frases.
- **Cap menció al C2.** Es pot afegir una frase de context —*«ara que el C2 és requisit
  docent»*— però **només** si queda clar que l'app no prepara l'examen. És una decisió de
  producte, no de redacció.

---

## 4. Captures

La #20 diu que ensenyin **la correcció amb els errors classificats**, no la pantalla
buida. Cinc, en aquest ordre:

| # | Què s'hi veu | Per què va aquí |
|---|---|---|
| 1 | **La correcció**, amb les paraules marcades i els tipus | És el producte. Va primera perquè és l'única captura que la gent mira |
| 2 | **La foto d'un dictat a mà corregit** | El diferencial. La que no pot posar cap competidor |
| 3 | L'explicació d'un error concret | El que converteix «has fallat» en «ja no fallaràs» |
| 4 | El dictat corrent, amb el compte enrere i els controls | Que es vegi que l'app t'espera a tu |
| 5 | El perfil amb el progrés | Retenció |

⚠️ **Cap d'aquestes captures es pot fer encara**, perquè producció no té el codi de v6 i
la crida a Claude no s'ha executat amb èxit des del març (#21). La captura 2 a més
necessita **un dictat escrit a mà de veritat, fotografiat**.

També calen: **icona de 512×512** (ja existeix, `public/icons/icon-512.png`) i **gràfic de
capçalera de 1024×500**, que no existeix.

---

## 5. Què bloqueja tancar la Fase 4

| | Qui |
|---|---|
| Decidir el nom públic i l'`applicationId` — **abans del primer AAB** | Óscar |
| Si la fitxa esmenta el C2 i com | Óscar |
| Si els rangs entren al llançament (#23) | Óscar |
| Validar les paraules clau amb dades reals | Play Console, un cop publicada |
| Fer les captures | Depèn del desplegament (#15) i de la clau d'API |
| Gràfic de capçalera 1024×500 | Per fer |

## Fonts

- [Decret del C2 com a requisit docent — CCOO Educació](https://www.ccoo.cat/educacio/noticies/el-nivell-c2-de-catala-com-a-nou-requisit-docent-una-exigencia-que-te-poc-a-veure-amb-la-millora-de-lus-social-del-catala/)
- [El Departament d'Educació promourà el C2 entre els docents — Llengua catalana, Gencat](https://llengua.gencat.cat/ca/detalls/noticia/El-Departament-dEducacio-promoura-el-nivell-C2-del-catala-entre-els-docents)
- [Només el 25% dels docents tenen el C2 — Diari de Barcelona](https://www.diaridebarcelona.cat/w/nomes-25-docents-tenen-nivell-c2-de-catala-que-govern-vol-exigir-nous-professors)
- [Certificat de nivell superior de català (C2): estructura de la prova — Gencat](https://llengua.gencat.cat/ca/serveis/acreditacio_coneixements/certificats_de_catala/certificats_estructura_i_descripcio_proves/certificat_de_nivell_superior_de_catala_d/)
- [Dictats en línia — Llengua catalana, Gencat](https://llengua.gencat.cat/ca/serveis/aprendre_catala/recursos-per-al-professorat/dictats-en-linia/)
- [CATgrafia: ortografia catalana — Google Play](https://play.google.com/store/apps/details?id=com.catgrafia.app)

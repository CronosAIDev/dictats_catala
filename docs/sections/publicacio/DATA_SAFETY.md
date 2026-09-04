# Fase 3 — Data Safety, classificació i testers

> Feina de la Fase 3 del gameplan · Issue
> [#19](https://github.com/CronosAIDev/wiki-cronos/issues/19).
>
> La #19 diu que el formulari ha de ser **coherent amb el que el codi fa de veritat** i que
> mentir-hi és motiu de retirada. Per això **tot el que hi ha aquí surt d'auditar el codi**,
> amb el fitxer i la línia al costat, no de suposar-lo.

> ## ⚠️ Llegeix això abans d'omplir el formulari (4-09-2026)
>
> Aquest document es va escriure auditant la **Fase 0** (identitat pròpia amb bcrypt i
> Google OAuth), que viu a la branca `v10` i **no és a producció**. La Fase 0 es refà amb
> **Firebase Auth** (decisió del 4-09, issue #16), així que **les files d'identitat d'aquí
> descriuen un sistema que encara no existeix**:
>
> | Fila | Diu | Què passa avui a producció |
> |---|---|---|
> | Contrasenya | Hash de bcrypt de 12 rondes | Dictats **no en desa cap**: comprova el compte contra el sistema de comptes compartit amb els altres serveis del responsable |
> | `google_id` | S'hi desa | **No existeix**: no hi ha Google OAuth |
> | Esborrat de dades | `DELETE /api/account` i `/esborrar-compte` | **Cap de les dues rutes existeix**; s'esborra escrivint al responsable |
>
> La resta —dictats, errors, textos, fotos, avisos d'IA, galeta, preferències— **sí que està
> verificada contra el codi de producció**, i és el gruix del formulari.
>
> **Aquestes tres files s'han de reescriure quan Firebase entri, i abans d'enviar la fitxa.**
> La política pública (`/privacitat`) ja diu el que el codi fa avui, no el que dirà.

## 0. Auditoria: què toca el codi, de veritat

| Dada | On va a parar | Comprovat a |
|---|---|---|
| Correu i nom | MySQL `dictats_usuarios` | `src/lib/usuaris.js` |
| Contrasenya | MySQL, **hash de bcrypt** de 12 rondes. No es pot revertir | `src/lib/usuaris.js` |
| `google_id` | MySQL. De Google només se'n rep `sub`, `email` i `name` | `src/lib/googleOAuth.js` |
| Text del dictat, puntuació, errors | SQLite `user_progress` i `user_errors` | `src/lib/db.js:27,47` |
| Textos personals | SQLite `user_texts` | `src/lib/db.js:19` |
| **Foto d'un dictat a mà** | **Enlloc.** `multer.memoryStorage()`: viu a memòria mentre dura la petició | `src/routes/dictats.js:12` |
| Avisos sobre contingut d'IA | SQLite `content_reports`: text denunciat, motiu, correu, model | `src/lib/db.js` |
| Galeta de sessió | Navegador, `httpOnly`, 8 h | `src/index.js` |
| Preferències i esborrany | `localStorage` i `sessionStorage` del navegador. **No surten mai del dispositiu** | `public/app.js`, `public/mobile.html` |

### El que surt cap a Anthropic, exactament

Això és el punt que la #19 no recollia i que més pesa al formulari.

**Camí de text.** Només se li envien **les paraules fallades**, en aquesta forma:

```js
const diferencies = llista.map((e, i) => ({
  id: i, correcte: e.original, escrit: e.userWrote, tipus: e.type,
}));                                          // src/routes/dictats.js:172
```

**El text sencer que ha escrit l'usuari NO surt del servidor**, ni el seu correu, ni cap
dada del compte. És una conseqüència directa de F31: abans de v6, la comparació la feia el
model i el text hi anava sencer.

**Camí de foto.** La imatge sí que s'envia sencera, perquè transcriure un manuscrit no es
pot fer d'una altra manera. No es desa enlloc.

### El que NO hi ha

Cap analítica, cap SDK de tercers, cap identificador de publicitat, cap permís del sistema
al manifest. Els logs del servidor només registren mètode, URL i un booleà de si hi ha
sessió (`src/index.js:66`) — cap correu.

> Una excepció, i queda dita: si l'esborrat del progrés falla, es registra el correu al log
> per poder netejar les files que quedin (`src/routes/auth.js:117`). És un log operatiu del
> servidor, no una dada que surti enlloc.

---

## 1. Formulari de Data Safety — respostes proposades

### Recollida i compartició

| Tipus de dada | Es recull | Es comparteix | Obligatòria | Finalitat |
|---|---|---|---|---|
| **Informació personal › Adreça de correu** | Sí | No | Sí | Gestió del compte |
| **Informació personal › Nom** | Sí | No | **No** | Gestió del compte |
| **Informació personal › ID d'usuari** (`google_id`) | Sí | No | No | Gestió del compte |
| **Fotos i vídeos › Fotos** | Sí, **processada de manera efímera** | **Sí** → Anthropic | No | Funcionalitat de l'app |
| **Activitat a l'app › Un altre contingut generat per l'usuari** (dictats i textos propis) | Sí | **Sí**, parcialment → Anthropic | Sí | Funcionalitat de l'app |

**Per què «es comparteix: sí» a les dues últimes**, tot i que Anthropic actua com a
proveïdor: perquè les dades surten cap a un tercer i **declarar de menys és el que fa que
et retirin l'app**. Declarar de més no té cap cost.

⚠️ Al contingut generat per l'usuari, la compartició és **parcial** i val la pena que
consti: només hi van les paraules fallades, no el text sencer. El formulari no deixa
matisar-ho, però la política de privacitat sí que ho explica, i les dues han de dir el
mateix.

### El que NO es declara, perquè no hi és

Ubicació · Informació financera · Salut i forma física · Missatges · Fitxers i documents ·
Calendari · Contactes · Historial de navegació · Àudio · Informació i rendiment de l'app ·
Identificadors de dispositiu

### Pràctiques de seguretat

| Pregunta | Resposta | Per què |
|---|---|---|
| Les dades es xifren en trànsit? | **Sí** | HTTPS a tot arreu, certificat vàlid fins al 27-10-2026 |
| Es pot demanar l'esborrat de les dades? | **Sí** | `DELETE /api/account` a l'app i `/esborrar-compte` a la web |
| Compromís amb la política de Play per a famílies? | **No** | El públic són docents adults (decisió d'Óscar, 29-08) |
| Revisió de seguretat independent? | **No** | No se n'ha fet cap. **No marcar-ho** |

### Esborrat del compte

- URL per demanar-lo: **`https://dictation.generaive.io/esborrar-compte`**
- També des de dins de l'app.
- S'esborra **el compte i totes les dades**, no només el compte.

### Política de privacitat

**`https://dictation.generaive.io/privacitat`** — servida per la mateixa app i accessible
sense sessió. Escrita a partir d'aquesta mateixa auditoria: les dues han de dir el mateix,
sempre.

---

## 2. ⚠️ Una cosa que no era a la #19: la política de contingut generat amb IA

Google Play tracta les apps que **generen contingut amb IA** com una àrea regulada a part
des del 2025. Dictats hi entra: les **explicacions de cada error i el missatge d'ànim els
escriu el model**, i es mostren a l'usuari.

El requisit que costa feina:

> Les apps que generen contingut amb IA han d'incloure una manera de **reportar o marcar
> contingut ofensiu des de dins de l'app**, sense haver-ne de sortir.

**✅ Fet** (F64, 31-08-2026). Cada explicació escrita pel model i el missatge final porten
un botó **⚑** que obre un diàleg i envia l'avís a `POST /api/report`, sense sortir de
l'app. Els avisos es desen a la taula `content_reports` amb el text tal com el va veure la
persona, el motiu, el model que el va escriure i la data.

Dues decisions que consten:

- **El botó només surt sobre text que ha escrit el model.** Quan l'API falla, les
  explicacions són genèriques i les hem escrit nosaltres; oferir-ne el report embrutaria
  els avisos amb coses que no són d'IA. El servidor ho marca amb `generada`.
- **No s'amaga res automàticament.** Un toc sense voler faria desaparèixer una explicació
  correcta, i l'app no té ningú de guàrdia. Es desa perquè algú ho miri.

També: si algun element de la fitxa —captures, gràfic de capçalera (F62)— es genera amb IA,
**s'ha de declarar** un per un.

Referència:
[Understanding Google Play's AI-Generated Content policy](https://support.google.com/googleplay/android-developer/answer/14094294)

---

## 3. Classificació de contingut (qüestionari IARC)

L'app no té violència, ni sexualitat, ni drogues, ni jocs d'atzar, ni compres, ni
publicitat, ni comunicació entre usuaris —els textos personals són privats de cada compte i
no es veuen entre usuaris—, ni comparteix la ubicació. Hauria de sortir a la categoria més
baixa (**PEGI 3 / Everyone**).

⚠️ **Dues preguntes que s'han de contestar amb cura**, no en automàtic:

1. Les que pregunten per **contingut generat amb IA i moderat per l'usuari** (veure §2).
2. La d'**interacció entre usuaris**: la resposta és **no**, i convé que segueixi sent no
   —si algun dia hi ha rànquings entre usuaris, això canvia i la classificació també.

Encara que la categoria surti «per a tothom», **la fitxa no ha de suggerir ús escolar per
part d'alumnes**: si Google classifica l'app com a dirigida a menors, apliquen les
obligacions de Play per a públic infantil i cal entrar a *Designed for Families*. Ho avisa
la mateixa #19.

---

## 4. Els 20 testers — el rellotge que ningú ha engegat

| | |
|---|---|
| Què demana Play | 20 testers durant **14 dies seguits**, si el compte de desenvolupador és **personal** |
| Estat | **No ha començat.** Ni un tester reclutat |
| Per què urgeix | Són **dues setmanes de calendari**, no de feina. Corren en paral·lel a tota la resta i comencen quan algú els recluta |

**Si ningú els busca, la publicació s'endarrereix dues setmanes tot i estar la resta a punt.**

### Dues coses que canvien el càlcul

**El perfil del tester.** Han de ser **docents**, com va corregir l'Óscar el 29-08. Un
tester de compromís no torna, i la retenció que Play mesura se'n ressent. I ara sabem on
buscar-los: el C2 és requisit docent i **el 75% del professorat no el té** (veure
`FITXA_PLAY.md`). No falta motiu; falta demanar-ho.

**El tipus de compte.** El requisit dels 20 × 14 dies és per a comptes **personals**. Amb un
compte d'**organització** no aplica — però la verificació d'una organització demana un
D-U-N-S i també triga. **Val la pena decidir-ho abans de pagar els 25 $**, perquè és el que
determina si hi ha dues setmanes d'espera o no.

---

## 5. Què bloqueja tancar la Fase 3

| | Qui |
|---|---|
| Els **25 $** d'alta de desenvolupador | Óscar |
| **Compte personal o d'organització** — determina si calen els 20 testers | Óscar |
| **Reclutar 20 docents** i engegar els 14 dies | Óscar (jo no tinc l'agenda) |
| Confirmar la identitat legal i el contacte de la política | Óscar |
| ~~Botó de report del contingut generat amb IA (§2)~~ | ✅ Fet (F64) |
| Captures i gràfic de capçalera | Depèn del desplegament (#15) |
| Que la política estigui **publicada de veritat** a `dictation.generaive.io/privacitat` | Depèn del desplegament (#15) |

## Fonts

- [Understanding Google Play's AI-Generated Content policy](https://support.google.com/googleplay/android-developer/answer/14094294)
- [Declaring AI-generated content in Play Console](https://support.google.com/googleplay/android-developer/answer/17262077)
- [Understanding Google Play's app account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)

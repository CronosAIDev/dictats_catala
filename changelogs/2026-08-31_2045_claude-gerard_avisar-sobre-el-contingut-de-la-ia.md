# F64 — Es pot avisar sobre el que escriu la IA, sense sortir de l'app

**Data**: 2026-08-31 · **Autor**: claude-gerard · **Branch**: v10

Requisit de Google Play trobat treballant la Fase 3 (#19) i que no era a cap llista del
gameplan. Play tracta les apps que **generen contingut amb IA** com una àrea regulada des
del 2025 i exigeix poder **denunciar contingut ofensiu sense sortir de l'app**.

Dictats hi entra de ple: **l'explicació de cada error i el missatge final els escriu el
model**, i es mostren a qui practica. Sense això, l'app pot rebotar a la revisió — i el
rebot arriba després d'haver pagat els 25 $ i d'haver gastat les dues setmanes de testers.

## Com ha quedat

Un botó **⚑** discret al costat de cada explicació i del missatge final. Obre un diàleg que
explica que allò ho ha escrit una IA i demana, opcionalment, què hi ha malament. L'avís va a
`POST /api/report` i es desa a la taula `content_reports`: el text **tal com el va veure la
persona**, el motiu, el correu, el model que el va escriure i la data.

Es desa el text literal a posta: si demà es reescriu el prompt o es canvia de model, l'avís
ha de seguir dient què es va denunciar.

## Tres decisions que val la pena que constin

**El botó només surt sobre text que ha escrit el model.** Quan l'API falla, les explicacions
són genèriques i les hem escrit nosaltres. Oferir-ne el report embrutaria els avisos amb
coses que no són d'IA i faria inútil la safata. El servidor ho marca amb `generada` a cada
error i `feedbackGenerat` a la correcció.

**No s'amaga res automàticament.** Un toc sense voler faria desaparèixer una explicació
correcta, i aquesta app no té ningú de guàrdia per revisar-ho al moment. Es desa perquè algú
ho miri, i prou.

**El codi viu a `public/report.js`, compartit.** Si cada vista se n'hagués de recordar,
tornaríem a tenir la mateixa cosa escrita a dos llocs — que és exactament com el bug de F17
va acabar existint per duplicat a `app.js` i a `mobile.html`. El mòdul s'enganxa sol amb un
listener delegat: els resultats es repinten sencers a cada correcció i un listener per botó
els aniria acumulant.

## Verificat per execució real

- **El camí sencer al navegador**, amb Chrome de veritat pel protocol DevTools: el mòdul es
  carrega sol, es prem el botó, l'avís arriba al servidor, es desa a la base i el botó passa
  a **✓**. Cap error de consola.
- **El botó no surt sobre text nostre** (`generada: false`) ni sobre text buit, i sí sobre
  text del model.
- **Escapa el que hi posi el model**: un `<img src=x onerror=alert(1)>` com a explicació no
  crea cap element.
- **Cancel·lar el diàleg no envia res**: el botó es queda com estava.
- **Porta `aria-label`**, així que es pot fer servir amb lector de pantalla. (La resta de
  l'app encara no; això és F39.)
- **La ruta està protegida**: sense sessió torna **401**. Ho vaig haver de comprovar dues
  vegades perquè el meu `.env` local té `DICTATS_AUTH_BYPASS=1` i la primera passada donava
  200 per això, no per cap forat.
- Validacions: sense `content` → 400; amb un `kind` inventat → 400. Límit de 20 avisos per
  hora i IP, i talls de mida a 2.000 i 500 caràcters.
- `npm test`: 111 comprovacions, cap falla. Dades de prova esborrades.

## La política de privacitat, al mateix commit

Si el codi desa una cosa nova, la política ho ha de dir el mateix dia — és la regla que
m'he posat a la Fase 3 i val també quan qui l'incompleix sóc jo. `/privacitat` diu ara que
els avisos es desen i què se'n desa, i té un apartat propi explicant que les explicacions
les escriu una IA i que es poden denunciar.

## NO verificat

- **El botó no s'ha vist mai sobre una explicació de veritat**, perquè la clau d'Anthropic
  local no és vàlida i el camí d'èxit del model no s'ha executat mai (#21). El que s'ha
  provat és el mòdul amb un botó injectat i el marcatge `generada` per totes dues bandes.
- **Ningú ha llegit mai un avís.** No hi ha cap pantalla per revisar-los: es consulten
  entrant a la base. Amb el volum d'ús actual (2 correccions en tota la vida de l'app) fer
  una pantalla seria construir per a un problema que no existeix.
- **No s'ha comprovat contra un revisor de Play** si això satisfà el requisit. És el que
  demana la política escrita; si en volen més, es veurà a la revisió.

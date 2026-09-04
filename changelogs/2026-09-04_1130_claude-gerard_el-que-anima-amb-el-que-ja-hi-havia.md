# La barra del rang deixa de mentir, i tres coses que animen sense taules noves

**Data**: 2026-09-04 · **Branca**: `v13` · Issue
[#23](https://github.com/CronosAIDev/wiki-cronos/issues/23) · F50, F34 (parcial), F66

L'Óscar va decidir el 29-08 (opció A) que la promesa és **ortografia i accentuació**, i que
la gamificació de debò no es fa fins que hi hagi gent a qui retenir. La mateixa issue, però,
llista el que **sí que val la pena ara i és barat**: coses que surten de dades que l'app ja
desa. Això és exactament el que hi ha aquí, i res més.

## F50 — la barra buida que semblava trencada

El marge anti-io-io manté el rang encara que els punts caiguin per sota del seu llindar.
Llavors `progres` sortia negatiu, la barra es dibuixava al 0 % i es llegia com si l'app
estigués espatllada.

Ara el progrés es limita al servidor i apareix `sotaLlindar`, que diu la situació amb
paraules i amb la xifra al davant:

> Estàs 27 punts per sota de Manilles. Si en perds 13 més, baixes a Folre.

Que és el que aprieta de debò. Una barra muda no diu res.

**I una cosa que no es veu però evita el pròxim bug**: aquesta lectura estava escrita
**tres vegades** —`app.js`, `mobile.html` i `profile.html`—, que és exactament la forma en
què el bug de F17 va acabar existint per duplicat. Ara viu a `public/rang.js` i les tres
vistes hi criden.

## El que anima, amb el que ja hi havia

Tot surt de `user_progress`. Cap taula nova, cap columna nova, cap pantalla nova.

| | Què diu | D'on surt |
|---|---|---|
| **Ratxa** | «4 dies seguits fent dictats» | Només de `completed_at` |
| **Comparació amb tu mateix** | «La teva mitjana és 4,3» | `AVG(errors_count)` |
| **Fites de volum** | «Aquest és el teu dictat número 10» | `COUNT(*)` |

Tres decisions que valen la pena:

1. **La ratxa no es trenca a mitjanit**, sinó quan passa un dia sencer sense fer-ne cap. Si
   ahir en vas fer i avui encara no, segueix viva i el perfil et convida a fer-ne un.
   Trencar-la a mitjanit seria castigar per no haver-hi arribat encara.
2. **El dia es calcula a `Europe/Madrid`**, no retallant la data d'SQLite, que és UTC. Un
   dictat fet a les 23:30 ha de comptar el dia que era per a qui l'ha fet.
3. **Si has anat pitjor que la teva mitjana, no es diu.** Només es marca quan has anat
   millor; la resta del temps es diu la xifra i prou. És la regla de `CLAUDE.md`: mai renyar.

I una que ja advertia la Issue: **la comparació és sempre amb un mateix**. La taula de
comptes és compartida amb els clients de FeedScale, i ensenyar resultats d'uns a altres
seria un problema de privacitat, no una funcionalitat.

## Verificat executant

- **116 comprovacions** a la suite (28 noves a `test/motivacio.test.js`, 7 a `rang.test.js`).
- Correcció real contra el servidor: la resposta porta `ratxa`, `comparativa` i `fita`, i
  la **fita del dictat número 10 salta al desè exacte**, comptat fent-ne quatre seguits.
- `/api/profile` torna la ratxa.

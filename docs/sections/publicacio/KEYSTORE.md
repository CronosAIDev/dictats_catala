# El keystore de pujada

Fase 2 del gameplan · Issue [#18](https://github.com/CronosAIDev/wiki-cronos/issues/18)

> **Aquest fitxer no conté cap contrasenya, i no n'ha de contenir mai.** Diu on és la clau i
> què fer-hi. La contrasenya viu només a la màquina, al costat del keystore.

## On és

| | |
|---|---|
| Keystore | `~/dictats-keystore/dictats-upload.keystore` (permisos `600`, dins d'un directori `700`) |
| Àlies | `dictats-upload` |
| Contrasenya | `~/dictats-keystore/CLAU.txt`, al costat. **Genera't-la a un gestor de contrasenyes i esborra el fitxer** |
| Algorisme | RSA 4096, SHA384withRSA |
| Vàlid fins | **20-01-2054** (Play demana com a mínim fins al 2033) |

**Fora del repo a posta.** Un keystore commitejat és una clau de signatura pública per
sempre, encara que després es tregui: queda a l'històric de git.

## L'empremta SHA-256, que és el que fa falta

```
79:CE:50:82:91:F5:4B:67:76:77:D8:EA:8F:8B:3D:95:13:13:C0:5C:66:4A:FA:F6:E0:D1:99:0B:54:F8:28:BC
```

Es torna a treure sempre que calgui:

```bash
KT=$(ls -d ~/.bubblewrap/jdk/jdk-17*/bin | head -1)/keytool
$KT -list -v -keystore ~/dictats-keystore/dictats-upload.keystore -alias dictats-upload
```

## Per què «de pujada» i no «de signatura»

Amb **Play App Signing** —que és el que Google fa per defecte des del 2021— aquesta clau
només serveix per **pujar** l'AAB. Qui signa l'app que arriba als mòbils és Google, amb una
clau seva que no veiem mai.

Té dues conseqüències pràctiques:

1. **Si aquesta clau es perd, no es perd l'app.** Es demana un reset de la clau de pujada
   des de Play Console. No és el desastre irreversible d'abans de 2021 — però és una
   molèstia real i un tràmit, així que es custodia igual.
2. **Calen DUES empremtes a l'`assetlinks.json`**: aquesta i la que Google genera amb la
   seva clau. La segona **només existeix després de pujar el primer AAB**.

`scripts/assetlinks.js` es nega a escriure el fitxer amb una sola empremta, i està provat:

```
$ node scripts/assetlinks.js 79:CE:50:...:BC

  Només has donat UNA empremta, i en calen DUES.

  Amb una sola, l'app s'instal·la i s'obre amb la barra de Chrome a sobre,
  i no dona cap error enlloc. És la trampa que costa el dia sencer.
```

## Què queda de la Fase 2

- [x] JDK 17 (`~/.bubblewrap/jdk`, instal·lat pel mateix Bubblewrap)
- [x] Keystore generat i guardat fora del repo
- [x] Empremta de pujada
- [ ] Android SDK — Bubblewrap també se l'instal·la, falta acabar-ho
- [ ] `bubblewrap init` sobre `https://dictation.generaive.io/manifest.webmanifest`
- [ ] AAB signat
- [ ] Provar-lo en un Android real fent un dictat sencer
- [ ] Pujar-lo, agafar la segona empremta i escriure l'`assetlinks.json` de debò

**L'`applicationId` es congela al PUJAR el primer AAB, no al construir-lo.** Per això tot
això d'aquí es pot fer amb la proposta `io.generaive.dictats` sense comprometre res: si
l'Óscar en tria un altre (#18, #20), es refà l'`init` —que és barat— i **aquest keystore
segueix valent igual**, perquè no lliga amb cap identificador.

## [1.5.0] — 2026-09-08 — El domini definitiu ja serveix

### Añadido

- **`dictats.usecronos.com` servint amb HTTPS.** El domini que decideix la #20, viu a
  `kairos-vm`. Verificat per execució, no per suposició:

  | | |
  |---|---|
  | DNS | `34.156.75.104` des de tres resolutors (Google, Cloudflare, Quad9) |
  | Certificat | Let's Encrypt, `CN = dictats.usecronos.com`, fins al **07-12-2026** |
  | Renovació | Registrada al `certbot` de la màquina, com els altres tres dominis |
  | `/login`, `/privacitat`, `/manifest.webmanifest`, `/sw.js` | 200 |
  | `/.well-known/assetlinks.json` | 200 |
  | HTTP | **301** cap a HTTPS |

- **`docs/sections/publicacio/nginx-dictats-usecronos.conf`**: el vhost, versionat. Va en
  un fitxer a part i no dins de `dictats.conf` **a posta**: així retirar-lo és esborrar un
  enllaç simbòlic, i `dictation.generaive.io` no s'ha tocat en cap moment — comprovat
  abans i després, segueix responent 200.

### Modificado

- **`twa-manifest.json`**: `packageId` passa a **`com.usecronos.dictats`** i `host` a
  `dictats.usecronos.com`. És el que congela el primer AAB que es pugi, per sempre.
- **`scripts/assetlinks.js`**: mateix paquet i mateix domini.

### Verificado — i el que no calia fer

**L'app no duia el domini escrit enlloc.** Zero coincidències a `public/`, `src/` i
`data/`: tot són rutes relatives, així que el manifest de la PWA i el service worker ja
serveixen als dos dominis sense tocar ni una línia. El pas de «apuntar el manifest al
domini nou» estava fet per construcció i no ha calgut cap canvi.

El domini només vivia a documentació i a scripts d'empaquetat, que són els dos fitxers de
sobre.

### Pendiente

`dictation.generaive.io` segueix servint igual. Què se'n fa —mantenir-lo redirigint o
retirar-lo— és una decisió que l'Óscar deixa oberta a la #20 i que no bloqueja res.

# F10 — L'app és instal·lable (PWA)

**Data**: 2026-08-26 · **Autor**: claude-gerard · **Branch**: v5

## Fitxers nous

| Fitxer | Què fa |
|---|---|
| `public/manifest.webmanifest` | Nom, icones, `display: standalone`, `start_url: /mobile`, colors |
| `public/sw.js` | Service worker: memòria cau **només** d'estàtics |
| `public/pwa.js` | Registre del service worker, comú a totes les pàgines |
| `public/icons/*.png` | 192, 512, maskable 512 i apple-touch 180 |

Les quatre pàgines (`app`, `mobile`, `profile`, `login`) porten ara el `link` al
manifest, `theme-color`, `apple-touch-icon` i les meta d'iOS.

## La decisió que importa: què NO es guarda a la memòria cau

Aquesta app va darrere d'autenticació i s'instal·la en mòbils que sovint es
comparteixen. El service worker guarda **només** CSS, JS de client i icones. Queden
fora, expressament:

- **Les pàgines HTML.** Contenen l'estat de la sessió de qui ha entrat. Guardar-les
  permetria que el següent usuari del mateix dispositiu veiés la pantalla de l'anterior.
- **Tot el que penja de `/api`.** Són dades personals (textos, progrés, correccions) i
  les respostes d'`/api/correct` depenen del que s'acaba d'escriure.

**Conseqüència volguda: sense connexió l'app no funciona.** Necessita la síntesi de veu,
l'API de Claude i la sessió al servidor. El service worker hi és perquè sigui
instal·lable i per estalviar descàrregues d'estàtics, no per prometre un mode fora de
línia que no podria complir. Si algun dia es vol offline de veritat, cal decidir abans
què es fa amb les dades de sessió en un dispositiu compartit.

Detall menor però real: la instal·lació fa `cache.add` fitxer a fitxer i no `addAll`,
que és tot-o-res — amb `addAll`, un sol estàtic que fallés avortaria la instal·lació
sencera i el service worker no s'activaria mai.

## Verificat amb Chrome headless (CDP), no per suposició

```
service worker registrat:  sí, scope http://localhost:3003/
estat del worker:          active
memòria cau creada:        dictats-estatics-v1  (7 fitxers)
manifest enllaçat:         http://localhost:3003/manifest.webmanifest
el manifest es descarrega: Dictats en català / display=standalone / 3 icones
HTML a la cau:             cap  ← la regla de dalt, comprovada
errors del manifest:       cap, ni crítics ni no crítics (Page.getAppManifest)
```

Els set recursos es serveixen amb el `Content-Type` correcte, i el `.webmanifest`
com a `application/manifest+json` sense tocar res: `express.static` ja el coneix.
La CSP d'`helmet` no ha calgut modificar-la — `worker-src` i `manifest-src` cauen a
`default-src 'self'`.

## NO verificat

- **La instal·lació real en un mòbil.** No s'ha provat en cap Android ni iPhone: el
  diàleg «Afegeix a la pantalla d'inici» depèn del navegador i del dispositiu.
- **En producció sobre HTTPS.** Comprovat a `localhost`, que els navegadors tracten com
  a context segur igual que HTTPS. `dictation.generaive.io` ja té certificat, així que
  hauria de comportar-se igual, però està sense comprovar.
- **Les icones no són un disseny**, són una `ç` blanca sobre el blau del tema, generades
  amb PIL. Compleixen, però si es vol una icona de debò, cal fer-la.

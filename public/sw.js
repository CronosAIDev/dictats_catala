// Service worker de Dictats en català.
//
// Regla de disseny, i no és negociable: aquesta app va darrere d'autenticació i
// s'instal·la en mòbils que sovint es comparteixen. Aquí NOMÉS es guarden a la
// memòria cau els recursos estàtics i públics (CSS, JS de client, icones).
//
// El que NO es guarda mai:
//   - Les pàgines HTML (/, /mobile, /profile): porten el contingut de la sessió
//     de qui hi ha entrat. Si es guardessin, el següent usuari del mateix
//     dispositiu podria veure la pantalla de l'anterior.
//   - Res sota /api: són dades personals (textos, progrés, correccions) i les
//     respostes d'/api/correct depenen del que s'acaba d'escriure.
//
// Conseqüència volguda: sense connexió, l'app no funciona. Necessita la síntesi
// de veu, l'API de Claude i la sessió al servidor. El service worker hi és per a
// que sigui instal·lable i per estalviar descàrregues d'estàtics, no per oferir
// un mode fora de línia que no podria complir.

const CACHE = 'dictats-estatics-v1';

const ESTATICS = [
  '/style.css',
  '/app.js',
  '/pwa.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // addAll és tot-o-res: si un sol fitxer falla, la instal·lació sencera
      // avorta i el service worker no s'activa mai. Un a un, i el que falli
      // simplement no queda a la memòria cau.
      .then((cache) => Promise.all(
        ESTATICS.map((ruta) => cache.add(ruta).catch(() => null)),
      ))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(
        noms.filter((nom) => nom !== CACHE).map((nom) => caches.delete(nom)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Només el mateix origen. Res de tocar peticions a fonts externes.
  if (url.origin !== self.location.origin) return;

  // Navegacions i API: sempre a la xarxa, mai a la memòria cau. Veure la
  // capçalera d'aquest fitxer.
  if (request.mode === 'navigate' || url.pathname.startsWith('/api/')) return;

  if (!ESTATICS.includes(url.pathname)) return;

  // Stale-while-revalidate: serveix ràpid el que hi ha i actualitza al darrere,
  // de manera que un desplegament nou entra al segon cop de fulla.
  event.respondWith(
    caches.open(CACHE).then((cache) => cache.match(request).then((guardat) => {
      const xarxa = fetch(request)
        .then((resposta) => {
          if (resposta && resposta.ok) cache.put(request, resposta.clone());
          return resposta;
        })
        .catch(() => guardat);
      return guardat || xarxa;
    })),
  );
});

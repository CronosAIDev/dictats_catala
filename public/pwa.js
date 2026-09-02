// Registre del service worker. Comú a totes les pàgines.
//
// Es registra després de 'load' per no competir amb la càrrega de la pàgina, i
// tot va dins d'un try/catch perquè cap navegador sense suport (o amb el
// registre bloquejat per la configuració de l'usuari) no trenqui l'app: sense
// service worker, Dictats segueix funcionant igual, només no és instal·lable.
(function registraServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function (error) {
      console.warn('Service worker no registrat:', error);
    });
  });
}());

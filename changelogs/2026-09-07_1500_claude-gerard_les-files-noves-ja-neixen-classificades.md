# Les files noves ja neixen classificades

**Data**: 2026-09-07 · **Branca**: `v23` · remat de F25

Verificant el desplegament de F25 a producció va sortir que la migració no havia escrit cap
línia. **Era correcte** —`user_errors` és buida allà: hi ha 2 dictats desats i cap error—,
però mirant-ho es va veure una cosa que sí que estava mal resolta.

## El problema

Els errors nous s'inserien sense tocar la columna `taxonomia`, així que naixien amb el valor
per defecte, **0**. La migració agafa tot el que tingui una versió anterior a l'actual: cada
arrencada hauria tornat a classificar tots els errors escrits des de l'anterior, **per
sempre**, i hauria escrit una línia de log dient-ho.

No hauria donat cap resultat diferent —classificar és determinista— però és feina que creix
amb l'ús i un missatge que menteix sobre el que ha passat.

## L'arreglo

La versió del catàleg passa a viure amb el catàleg (`taxonomia.VERSIO`), i `desa()` la posa
a cada fila que insereix. La migració queda per al que és: l'historial d'abans del canvi.

## Verificat executant

`test/f25.migracio.js`, nou, amb una base de dades temporal i quatre comprovacions:

- els nou errors d'exemple amb els tipus vells passen cadascun a la seva regla nova;
- queden marcats amb la versió;
- **una segona arrencada no els torna a tocar** (es prova embrutant una fila a posta i veient
  que ningú l'arregla);
- i una fila nova amb la versió posada tampoc.

Fora de `npm test` perquè escriu un fitxer; allà no s'escriu enlloc.

## [1.4.0] — 2026-09-08 — Cada regla ensenya la seva regla

### Corregido

- **Una categoria ensenyava una regla que no era la del seu error** (F71).
  `essa sorda i sonora` s'enduia **quatre distincions diferents** i el text que mostrava
  només en descrivia una:

  | Escrit | Correcte | La regla que li ensenyava era la seva? |
  |---|---|---|
  | `pasa` | `passa` | Sí — s/ss entre vocals |
  | `sentre` | `centre` | **No** — és s/c, no hi ha cap doble essa |
  | `dotse` | `dotze` | **No** — és s/z |

  A qui escrivia «sentre» se li deia *«Entre vocals, una sola s sona sonora (casa) i cal ss
  per a la sorda (passa)»*, que no explica el seu error. **Era ensenyar ortografia
  equivocada**, el mateix que va passar amb «marzipà».

  Ara són tres categories amb la seva regla: **Essa sorda i sonora** (s/ss), **Essa o ce**
  (s/c) i **Essa o zeta** (s/z). Els normalitzadors van de la distinció més estreta a la
  més ampla, que és la norma que ja seguia la resta del fitxer: cadascun esborra **una**
  distinció i el primer que iguala les dues paraules diu quina regla s'ha vulnerat. Quan
  en calen dues alhora (`dotze` escrit `dotsse`) es diu **ortografia**, que és honest:
  inventar una regla seria pitjor que dir «mira com s'escriu».

  `VERSIO` del catàleg puja a **2** i la migració reclassifica l'històric sola. Verificat
  contra la base de proves: **57 errors reclassificats**, i la fila de `sentre` va passar a
  `s/c` a la correcció, al perfil i a la targeta de 60 segons.

- **El perfil deia que el teu problema principal era no haver escrit** (F72). Amb dictats
  deixats a mitges, «De què són els teus errors» encapçalava amb *«el que més t'ha sortit
  és paraula omesa: 36 de 46 errors»*. No és cap regla que es pugui estudiar, i és
  justament la pantalla que ha de dir què estudiar.

  És el mateix problema que F69 va arreglar al **resultat** del dictat, que aquí no havia
  arribat. Ara les tres categories que no són regles —paraula omesa, afegida i incorrecta—
  **no entren al rànquing ni al denominador de les parts**, i es diuen a part com un fet:
  *«D'aquests dictats, 41 paraules del dictat no es van escriure.»* Sense rànquing i sense
  renyar. Amb el mateix historial, el titular ha passat de *«paraula omesa: 36 de 46»* a
  *«ortografia: 5 de 16»*, i les parts han deixat de sortir totes al 2 %.

  Si no n'hi ha cap, no hi ha línia: dir «0 paraules no escrites» és renyar per res.

### Verificado

Les dues coses van sortir **fent un dictat sencer del banc amb el navegador**, no llegint
el codi: la pantalla es veia correcta i els tests passaven. 365 comprovacions a
`npm test` (21 noves) i la migració provada contra dades de veritat.

**Sense verificar**: cap professor de català ha llegit les tres regles noves.

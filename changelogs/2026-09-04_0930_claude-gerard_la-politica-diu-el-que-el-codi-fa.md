# La política diu el que el codi fa avui, no el de la Fase 0

**Data**: 2026-09-04 · **Branca**: `v12` · Issues
[#19](https://github.com/CronosAIDev/wiki-cronos/issues/19),
[#16](https://github.com/CronosAIDev/wiki-cronos/issues/16)

La política de privacitat (F63) es va escriure auditant la **Fase 0**: contrasenya amb
bcrypt, `google_id` i dues vies d'esborrat de compte. Res d'això és a producció, i la Fase
0 es refà amb Firebase Auth (decisió del 4-09). Publicar-la tal qual hauria estat declarar
un sistema que no existeix — exactament el que la mateixa pàgina diu que no farà.

Auditat contra el codi d'avui (`src/lib/auth.js`, `src/routes/auth.js`):

| Deia | Diu ara |
|---|---|
| Contrasenya xifrada amb bcrypt | Dictats **no en desa cap**: comprova el compte contra el sistema de comptes compartit |
| Fila d'`identificador de Google` | Fora: no hi ha Google OAuth |
| Enllaç a `/esborrar-compte` | S'esborra escrivint al responsable, i s'anuncia el botó per quan hi hagi identitat pròpia |
| «Els dos servidors són a la UE» | El servidor de Dictats és a la UE (Bèlgica, `europe-west1-b`, comprovat amb `gcloud`). Del sistema de comptes només es diu el que se'n sap |

`DATA_SAFETY.md` no es reescriu —es refarà amb Firebase— però s'encapçala amb l'avís de
quines tres files descriuen un sistema que encara no existeix, perquè ningú ompli el
formulari de Play amb elles. La resta del document sí que està verificada contra producció.

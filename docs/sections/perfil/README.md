# Secció: Perfil

## Descripció

Historial i estadístiques de l'usuari (`/profile`): dictats completats, puntuació
mitjana, i millor/pitjor resultat.

## Funcionalitats principals

- Llistat d'historial (últims 50 resultats, `/api/profile`)
- Estadístiques: total de dictats, mitjana d'errors, millor resultat
- Llistat de progrés recent (`/api/progress`, últims 20)

## Components clau

- **Vista HTML**: `public/profile.html`
- **Rutes API**: `GET /api/profile`, `GET /api/progress` a `src/routes/dictats.js`
- **Persistència**: SQLite `user_progress` (`src/lib/db.js`)

## Gameplans actius

Cap de moment.

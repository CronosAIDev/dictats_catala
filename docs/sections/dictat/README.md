# Secció: Dictat

## Descripció

Flux principal de l'app: l'usuari tria un nivell (bàsic/intermedi/avançat, o un text
propi), escolta el text per síntesi de veu, i l'escriu — en un editor o en paper amb foto.
Claude compara el resultat amb l'original i retorna una correcció classificada per tipus
d'error, amb una escala motivadora.

## Funcionalitats principals

- Selecció de nivell i text (predefinits + "Els meus textos" personals)
- Dictat per síntesi de veu (Web Speech API, veu `ca-ES`)
- Mode editor (textarea) i mode paper (pujada de foto)
- Correcció per text via Claude (`/api/correct`)
- Correcció per foto via Claude Vision (`/api/correct-image`)
- Gestió de textos personals (crear/llistar/esborrar)
- Escala motivadora per nombre d'errors (no percentatge)

## Components clau

- **Vista HTML**: `public/app.html`
- **Rutes API**: `src/routes/dictats.js` (`/api/texts/*`, `/api/user-texts`, `/api/correct`, `/api/correct-image`)
- **Textos predefinits**: `data/texts.js`
- **Prompt de correcció**: `CORRECTION_PROMPT` a `src/routes/dictats.js`

## Gameplans actius

Cap de moment.

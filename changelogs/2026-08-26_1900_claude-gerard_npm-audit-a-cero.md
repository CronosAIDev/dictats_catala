# F13 — `npm audit` de 7 vulnerabilitats a 0

**Data**: 2026-08-26 · **Autor**: claude-gerard · **Branch**: v5

## Punt de partida

```
7 vulnerabilities (1 low, 3 moderate, 3 high)
```

| Severitat | Paquet | Problema |
|---|---|---|
| high | `ip-address` (via `express-rate-limit`) | XSS a `Address6` i SSRF per octets amb zero al davant |
| high | `multer` | DoS per camps molt niats i per neteja incompleta d'uploads avortats |
| high | `path-to-regexp` | ReDoS per grups opcionals i comodins múltiples |
| moderate | `qs` | DoS remot a `qs.stringify` |
| moderate | `@anthropic-ai/sdk` | requeria salt de versió major |
| low | `body-parser` | — |

## Què s'ha fet

1. `npm audit fix` — sis de les set, sense canvis de codi ni de versió major.
2. `@anthropic-ai/sdk` **0.80.0 → 0.120.0** a part, perquè `npm` el marcava com a
   *breaking change*. Revisat abans d'actualitzar: les dues úniques crides
   (`src/routes/dictats.js:121` i `:188`) fan servir només `model`, `max_tokens` i
   `messages` (text i imatge en base64). No hi ha `thinking`, ni `budget_tokens`, ni
   prefill de l'assistant — que és el que trenca en aquest salt. Superfície intacta.

Resultat: `found 0 vulnerabilities`.

## Verificat per execució real

- `npm audit` → 0 vulnerabilitats.
- L'app arrenca i serveix: `/login` → 200, `/mobile` → 302 (redirigeix a login, correcte).
- `require('@anthropic-ai/sdk')` carrega i `messages.create` existeix.
- `src/routes/dictats.js` es carrega sense petar amb el SDK nou.
- `better-sqlite3` segueix bé: cap `ERR_DLOPEN_FAILED` al log d'arrencada.

## NO verificat

**Cap crida real a l'API d'Anthropic.** El `.env` local té `ANTHROPIC_API_KEY=PENDIENTE`,
així que la correcció de dictats no s'ha pogut provar de punta a punta. La superfície
usada està revisada contra la documentació del SDK, però la primera correcció real
després d'aquest canvi s'ha de mirar.

## Detectat, no tocat (fora de l'abast de F13)

`src/routes/dictats.js:126` i `:198` fan `message.content[0].text` donant per fet que el
primer bloc és de text. Amb `claude-opus-4-6` i sense `thinking` activat això és cert
avui, però és fràgil: amb thinking adaptatiu el primer bloc pot ser de tipus `thinking` i
`.text` seria `undefined`. Filtrar per `block.type === 'text'` ho deixaria a prova de
futur. No ho toco aquí perquè no és una vulnerabilitat.

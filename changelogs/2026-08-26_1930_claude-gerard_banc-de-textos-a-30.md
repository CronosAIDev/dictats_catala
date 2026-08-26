# F11 — El banc de textos passa de 15 a 30

**Data**: 2026-08-26 · **Autor**: claude-gerard · **Branch**: v5

## Què s'ha fet

Cinc textos nous per nivell a `data/texts.js`, doblant el banc:

| Nivell | Abans | Ara | Textos nous |
|---|---|---|---|
| `basic` | 5 | 10 | El temps, La casa, Els animals, La roba, El cap de setmana |
| `intermedi` | 5 | 10 | Els castells, La diada de Sant Jordi, Les Illes Balears, L'excursionisme, La Fira de Santa Llúcia |
| `avancat` | 5 | 10 | Mercè Rodoreda, Pompeu Fabra, El Noucentisme, Joan Miró, La Nova Cançó |

Mateix format que els existents: cinc frases separades per `||`, amb `id`, `title`,
`text` i `description`.

## Graduació pensada per a dictat

- **`basic`**: present d'indicatiu, frases curtes, vocabulari quotidià. Dificultat
  ortogràfica bàsica: apòstrof (`l'hivern`, `m'agrada`), accents oberts i tancats.
- **`intermedi`**: subordinades, pronoms febles (`s'hi`, `se'n`, `endur-se`), numerals
  escrits amb lletres (`vint-i-tres`, `mil set-cents vuitanta-sis`), dièresi (`Suïssa`).
- **`avancat`**: registre culte, incisos amb comes, cometes baixes «», i les grafies que
  més costen: `l·l` (`novel·listes`, `col·lectiu`), `ç`, guionets (`Mont-roig`,
  `dos-cents`).

## Un error meu, detectat i corregit abans de commitejar

Vaig escriure els textos nous amb apòstrof tipogràfic (`’`) mentre la resta del fitxer
fa servir el recte (`'`). En una app de dictat això no és cosmètic: l'usuari escriu el
recte amb el teclat i la correcció hauria marcat 38 falses faltes. Normalitzats els 38.

## Verificat per execució real

- `require('./data/texts.js')` carrega: 10 + 10 + 10 = **30 textos**.
- 30 `id` únics, cap duplicat.
- Els 30 tenen exactament 5 frases i els quatre camps presents.
- Cap frase sense signe de puntuació final; separador ` || ` ben espaiat a tot arreu.
- L'app arrenca amb el fitxer nou i serveix `/login` → 200.

## NO verificat

- **Els endpoints `/api/texts/:level` no s'han pogut provar**: porten `requireAuth` i el
  `.env` local no té credencials de MySQL. La validació és sobre el mòdul de dades, no
  sobre la resposta HTTP.
- **Les dades històriques dels textos de nivell avançat** (dates de naixement i mort,
  any de publicació, any de la declaració de la UNESCO) surten del meu coneixement, no
  d'una font consultada en aquesta sessió. Val la pena que algú les repassi abans de
  donar-les per bones en material didàctic.
- **La correcció ortogràfica del català l'he feta jo.** Convindria que un parlant natiu
  hi doni un cop d'ull: en una app per aprendre a escriure, un text de referència amb una
  falta ensenya la falta.

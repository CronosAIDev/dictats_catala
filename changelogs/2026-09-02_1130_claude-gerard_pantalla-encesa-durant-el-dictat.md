# F44 — la pantalla ja no s'apaga a mitja frase

**Data**: 2026-09-02 · **Autor**: claude-gerard · **Branch**: v11

## El mal

Al mòbil, si la pantalla es bloqueja mentre sona el dictat, la síntesi de veu es talla.
I es bloqueja segur: qui fa el dictat en paper no toca la pantalla en tota l'estona.

## L'arreglo

Screen Wake Lock mentre el dictat corre. L'objecte `pantalla` (duplicat a `app.js` i
`mobile.html`, com `comprovaVeu` de F21) s'enganxa al callback d'estat del motor:

- `llegint` i `pausa` (temps d'escriure) → agafa el lock.
- `pausat`, `fet` i `aturat` → el deixa.
- El sistema allibera el lock en amagar la pestanya: en tornar-hi es recupera
  (`visibilitychange`), només si el dictat segueix viu.
- `resetDictationUI()` d'`app.js` el deixa explícitament, perquè `motor.atura()` no
  avisa el callback.

Sense `navigator.wakeLock` (navegador vell, connexió no segura) no fa res: el dictat
sona exactament com abans. El motor (`dictat.js`) no es toca — segueix sense saber res
del navegador.

## Verificat

Chrome headless contra `/mobile` amb `navigator.wakeLock` simulat i frases que acaben
soles: el lock es demana en arrencar, s'allibera en pausar, es torna a demanar en
reprendre i queda alliberat amb el dictat completat. Suite completa: exit 0.

**Sense verificar**: el comportament amb pantalla real d'Android (no tinc dispositiu).

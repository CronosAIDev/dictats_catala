# F58 — dos textos que carreguen les classes que discriminen

**Data**: 2026-09-01 · **Autor**: claude-gerard · **Branch**: v10

El banc de proves (F55) mesurava amb el que hi havia: 30 textos on l'ela geminada només
apareixia **5** cops, la dièresi **7** i el b/v **7** — contra 140 accents generals. Són
justament les classes que separen un model que sap català d'un que arrossega el castellà,
i amb mostres tan petites el banc no discrimina res al camí de la foto.

Dos textos avançats nous escrits a posta (`a11` «L'aquarel·la del col·legi», `a12` «La
plaça del veïnat»), que fan de textos de dictat normals per a usuaris avançats i alhora
carreguen el banc:

| Classe | Abans | Ara |
|---|---|---|
| ela geminada | 5 | **18** |
| dièresi | 7 | **20** |
| b/v | 7 | **17** |
| ce trencada | 12 | **22** |

Verificat: suite completa exit 0, benchmark 850/850 injectats trobats, 0 falsos positius.

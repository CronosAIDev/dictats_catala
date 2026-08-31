# Fase 4 — Nom públic i fitxa de Play, i el dato que la canvia sencera

**Data**: 2026-08-31 · **Autor**: claude-gerard · **Branch**: v10

Fase 4 del gameplan, Issue #20, F61 al roadmap. Material a
`docs/sections/publicacio/FITXA_PLAY.md`. **Res està decidit**: el nom i la promesa són
decisions d'Óscar; això és el material perquè les prengui.

## El que va sortir mirant en comptes de suposar

L'Óscar va escriure a la #20: *«Jo no sé què escriu de veritat un docent català a la cerca
de Play. Aquestes són hipòtesis raonables, no dades.»* La primera cosa que surt en
comprovar-ho no és una paraula clau, és **per què un docent buscaria això ara**:

- Des del curs **2025-26** el C2 és **requisit indispensable** per entrar a la borsa docent.
- Els que vulguin ser director o inspector l'han d'acreditar des del **2027-28**.
- **Només el 25% del professorat el té**: a primària un 20%, a secundària un 30%.
- L'oferta oficial per certificar-lo no cobreix la demanda que genera el mateix requisit.

Són **unes 70.000 persones**, que és exactament el públic que va fixar l'Óscar, amb una
necessitat obligatòria, amb data, i un canal oficial desbordat. La seva intuïció del 29-08
sobre el C2 no era una hipòtesi raonable: era el centre del problema.

## I la trampa, que és precisa

**L'app no prepara l'examen de C2.** El C2 té quatre àrees i l'Àrea 2 —«domini pràctic del
sistema lingüístic»— és d'**opció múltiple**: omplir buits, detectar l'opció incorrecta,
lèxic. No és un dictat.

Dir «prepara el teu C2» seria exactament l'error que la #20 adverteix per a la sintaxi:
prometre el que el producte no fa. I aquí seria pitjor, perquè qui s'hi juga la plaça no
perdona una ressenya.

La línia és fina i queda escrita: **el C2 és el motiu pel qual el docent busca, i es pot
dir; el que no es pot dir és que això sigui preparació de l'examen.**

## Contra qui es compiteix

- **CATgrafia** (`com.catgrafia.app`), el competidor directe a Play: teoria en vídeo,
  exercicis d'ortografia catalana, test de nivell.
- **Els «Dictats en línia» de la Generalitat**: gratuïts, oficials, autocorrectius i per
  nivells. És la competència de veritat.

Cap dels dos corregeix el dictat **fet a mà, en paper, per foto**. El diferencial es manté,
i ara sabem contra què.

## El que hi ha al document

- **Nom visible**: «Dictats en Català» (17/30 caràcters).
- **`applicationId`**: recomanació `io.generaive.dictats`, amb la taula d'alternatives i la
  pregunta al davant —*és estable el domini `generaive.io` a cinc anys?*—, perquè
  l'identificador **es congela per sempre** amb el primer AAB.
- **Paraules clau** separades en dues llistes: les comprovades (`ortografia catalana`,
  `dictats`, `C2 català`, `nivell superior de català`) i les que segueixen sent hipòtesi i
  s'han de validar amb Play Console un cop publicada. Més les que **no** s'han de posar:
  les d'estudiant que l'Óscar ja va invalidar i que el `GP_*.md` encara porta, i les de
  preparació d'examen.
- **Descripció curta** de 72 caràcters i **llarga** de 1.826, amb el diferencial a la
  primera línia com demana la #20.
- **Guió de cinc captures**, la primera la correcció amb els errors marcats i la segona el
  dictat a mà corregit per foto.

## Verificat

- Els límits de Play: títol 17/30, descripció curta 72/80, llarga 1.826/4.000.
- Els sis fets del context del C2, contra fonts que queden enllaçades al document
  (CCOO Educació, Gencat, Diari de Barcelona i l'estructura oficial de la prova).
- Que l'Àrea 2 del C2 és d'opció múltiple i no un dictat, que és el que sosté tota
  l'advertència.

## NO verificat

- **Les paraules clau hipotètiques no s'han validat amb dades de cerca reals.** Play
  Console dona termes reals només un cop l'app és publicada. Estan marcades com a
  hipòtesi al document, que és el que demanava la #20.
- **No s'ha pogut fer cap captura**: producció no té el codi de v6 i la crida a Claude no
  s'executa amb èxit des del març (#21). La del dictat a mà a més necessita un manuscrit
  real fotografiat.
- **El gràfic de capçalera de 1024×500 no existeix** (F62). L'icona de 512 sí.
- **El català de la fitxa l'he escrit jo.** Va a una botiga pública i és una app
  d'ortografia catalana: convindria que el repassés un natiu abans de publicar-la.

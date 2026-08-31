# Fase 3 — Política de privacitat i Data Safety, escrites auditant el codi

**Data**: 2026-08-31 · **Autor**: claude-gerard · **Branch**: v10

Fase 3 del gameplan, Issue #19, F63 al roadmap. La Issue diu que el formulari ha de ser
*«coherent amb el que el codi fa de veritat»* i que mentir-hi és motiu de retirada. Per això
tot surt d'auditar el codi amb el fitxer i la línia al costat, no de suposar-lo.

## El que ha sortit auditant

**Al camí de text, el text sencer no surt del servidor.** A Anthropic només se li envien les
paraules fallades: la correcta, la que s'ha escrit i el tipus (`dictats.js:172`). Ni el
correu, ni cap dada del compte, ni la resta del que ha escrit l'usuari. **És una
conseqüència directa de F31**: abans de v6 la comparació la feia el model i el text hi anava
sencer. Ningú ho havia buscat com a millora de privacitat, però ho és, i ara es pot declarar.

**Les fotos no es desen enlloc.** `multer.memoryStorage()` (`dictats.js:12`): la imatge viu a
memòria mentre dura la petició i desapareix. No toca cap disc ni cap base de dades. La foto
sí que s'envia sencera a Anthropic, perquè transcriure un manuscrit no es pot fer d'una
altra manera, i això queda dit tal qual.

**No hi ha analítica, ni SDK de tercers, ni identificadors de publicitat, ni cap permís del
sistema.** Els logs registren mètode, URL i un booleà de sessió; cap correu. L'única
excepció és el log d'un esborrat de progrés fallit, i queda documentada al fitxer.

## El que s'ha fet

- **`/privacitat`**, servida per la mateixa app i **sense sessió** —qui encara no té compte
  l'ha de poder llegir abans de fer-se'n un—, enllaçada des del login i des de la pàgina
  d'esborrat. És la URL que va a la fitxa i al formulari.
- **`docs/sections/publicacio/DATA_SAFETY.md`**: l'auditoria, les respostes proposades del
  formulari tipus a tipus, les pràctiques de seguretat, el qüestionari de classificació i el
  que falta per als testers.

Sobre el formulari, una decisió que consti: **fotos i contingut generat per l'usuari es
declaren com a «es comparteix»**, encara que Anthropic hi actuï de proveïdor. Declarar de
menys és el que fa que et retirin l'app; declarar de més no costa res.

## Una cosa que no era a la Issue #19

Google Play tracta les apps que **generen contingut amb IA** com una àrea regulada des del
2025, i exigeix que es pugui **reportar contingut ofensiu des de dins de l'app**. Dictats hi
entra: les explicacions de cada error i el missatge d'ànim els escriu el model.

**Avui no hi ha cap via de report.** És barat —un botó a cada explicació— i evita un rebuig
a la revisió. Queda com a **F64**; no l'he feta aquí perquè no és a la llista de la Issue i
val més que consti pendent que colar-la.

## Verificat per execució real

- `/privacitat` i `/esborrar-compte` tornen **200 sense sessió**, que és com Play ho
  demana.
- La pàgina carregada a Chrome de veritat: 11 apartats, la taula de dades amb 5 files, els
  enllaços a l'esborrat, a Anthropic, a l'APDCAT i al contacte, amplada de lectura de 720 px,
  **cap scroll horitzontal** i cap error de consola.
- Els enllaços creuats des del login.
- `npm test`: 111 comprovacions, cap falla.
- Cada fila de la taula d'auditoria està comprovada contra el fitxer i la línia que cita.

## NO verificat

- **La política no està publicada.** Viu a la branca `v10`, que no s'ha pogut pujar (#15).
  La URL que ha d'anar al formulari, `dictation.generaive.io/privacitat`, **avui dona 404**.
- **La identitat legal i el contacte no els he confirmat amb l'Óscar.** He posat el seu nom
  i `otc@trawlingweb.app`, que és el que hi ha al repo. Ho ha de validar ell abans de
  publicar-ho: és el responsable del tractament i hi posa el nom.
- **No he mirat els termes d'Anthropic per a l'API** (retenció, tractament, si cal un
  encàrrec de tractament signat). La política diu què s'envia i enllaça la seva política de
  privacitat, que és el que puc afirmar; el paperam entre empreses no és cosa meva.
- **El català de la pàgina l'he escrit jo.** Va a una pàgina pública i és un document legal:
  convindria que el repassés un natiu, i idealment algú que hagi escrit una abans.
- **Ni un tester reclutat** (F65). Els 14 dies no han començat a comptar.

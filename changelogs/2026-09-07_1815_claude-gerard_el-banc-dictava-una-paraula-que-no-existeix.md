# El banc dictava una paraula que no existeix

**Data**: 2026-09-07 · **Branca**: `v26` · F70 al roadmap

## Com va sortir

Refent les captures de la fitxa de Play —perquè les del 04-09 havien quedat velles en quatre
dies— la de la correcció ensenyava això:

```
Accentuació    marzipa → marzipà
```

**«Marzipà» no és català.** La paraula és **massapà**. El banc la dictava, la donava per
bona i estava a punt d'entrar en una captura de la botiga.

Comprovat contra el diccionari oficial (`hunspell-ca`, 209.521 entrades): `massapà` hi és,
`marzipà` no. Corregit a `data/texts.js` (`i1`, «Les tradicions catalanes»).

## I ja posats, el banc sencer

798 paraules diferents, passades pel mateix diccionari. La resta d'avisos són falsos
positius de la comprovació —feta a mà, perquè el binari `hunspell` no està instal·lat i el
que hi ha és el diccionari: verbs conjugats (`agrada`, `dinem`, `compro`), femenins i plurals
(`famosa`, `països`, `milions`) i noms propis (Domènech, Montaner, Llach).

**Queda una cosa que no decideixo jo.** El text `a8` cita «Glosari», la columna d'Eugeni
d'Ors. La paraula comuna d'avui és *glossari*, amb dues esses; el títol històric es cita de
les dues maneres. En una app de dictats això és delicat: qui escrigui la forma normativa se
la marcarà com a errada. Ho ha de dir un professor.

## Les captures, refetes

Les del 04-09 ensenyaven una app que ja no existeix: des d'aleshores la llista de textos
porta marques (F35), els errors porten el nom de la seva regla (F25) i el perfil té la corba
(F36) i «de què són els teus errors» (F26).

Ara són **sis**: s'hi afegeix `06-progres.png`, amb les xifres i el perfil d'errors, que és
el que ensenya que l'app **entrena** i no només mesura.

Dues decisions d'enquadrament escrites al script:

- Es descompta l'alçada del capçal enganxat, que si no tapava el títol de la targeta.
- **La corba de F36 no hi surt.** La sembra fa correccions de veritat i no toca cap data, així
  que tots els dictats són d'avui i la corba surt amb **una sola barra**. Una barra no és una
  corba, i falsejar dates per a una captura de botiga seria ensenyar el que no hi ha.

`02-dictat.png` i `05-perfil.png` han sortit **idèntiques byte a byte** a les d'abans, que és
la prova que el generador és determinista.

## Verificat executant

`npm test` en verd i el banc de proves sense moure's: **850/850, 0 falsos positius**.

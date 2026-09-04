# Els colors deixen de ser una tria a ull

**Data**: 2026-09-04 · **Branca**: `v18` · F39 al roadmap (la meitat que faltava)

## Per què al navegador i no llegint el CSS

Al full hi ha les variables, però qui decideix el contrast és **quin color acaba sobre quin
fons**, i això depèn de l'herència, de l'ordre de les regles i de què està visible en aquell
moment. Llegint `style.css` es mesuren parelles que potser no existeixen i s'escapen les que
sí.

`test/f39.contrast.js` recorre les pantalles de veritat —nivells, dictat, correcció, perfil,
login—, calcula el color efectiu i el **fons del primer avantpassat que en tingui un
d'opac**, i aplica la fórmula de la WCAG 2.1. Van sortir **261 trossos de text** en 18
combinacions de color.

## El resultat: quatre colors no hi arribaven

| Color | Sobre | Era | Cal |
|---|---|---|---|
| `--warning` | l'avís de veu | **3,07:1** | 4,5:1 |
| `--success` | el fons verd clar | **3,15:1** | 4,5:1 |
| blanc | el botó «Corregir» | **3,30:1** | 4,5:1 |
| `--text-muted` | el fons blau clar | **4,37:1** | 4,5:1 |
| `--error` | el fons vermell clar | **4,41:1** | 4,5:1 |

El pitjor és el primer i no és casualitat: **l'avís de «aquest dispositiu no té cap veu de
síntesi»**. És el missatge més important que diu l'app —si no el llegeixes, el dictat no
sona i no saps per què— i era el que menys es veia.

Els dos últims fallaven per **una dècima**, que és el cas típic d'una paleta triada a ull:
sembla bé i es queda a mig pam.

## Com s'ha arreglat

Baixant la lluminositat de quatre variables i **mantenint el to**, amb marge en comptes de
quedar-se al límit:

```
--warning     #d97706 -> #b45309     3,07 -> 4,84
--success     #16a34a -> #15803d     3,15 -> 4,79
--error       #dc2626 -> #b91c1c     4,41 -> 5,91
--text-muted  #64748b -> #5b6675     4,37 -> 5,36
```

Es van triar entre candidats mesurant-los tots: els que passaven just (4,53) es van
descartar a posta, perquè el dia que algú toqui un fons tornen a caure.

**I una cosa que la mesura va destapar**: després de canviar la variable, el botó «Corregir»
seguia fallant. `--success` estava **escrit a mà en quatre llocs** (`#16a34a` a `style.css` i
a `mobile.html`), i aquells no es van assabentar del canvi. Ara tots apunten a la variable.

## Verificat executant

```
$ node test/f39.contrast.js
261 trossos de text mesurats · 19 combinacions de color diferents
...
Tot el text arriba a l'AA de la WCAG 2.1
```

I les altres proves segueixen en verd: 116 de `npm test`, 14 de F33, 9 de F39.

**Les captures de la fitxa de Play s'han refet** amb els colors nous: les que hi havia
ensenyaven una app que ja no existeix.

## Sense verificar

- **El contrast dels elements gràfics que NO són text** —la vora d'un camp, el farciment
  d'una barra— també és AA a 3:1 i aquesta mesura no els mira.
- **Cap lector de pantalla de debò** ha llegit l'app encara. Segueix pendent de F39.

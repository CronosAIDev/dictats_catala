# Seccions de l'app — Dictats Català

Aquesta carpeta conté **una subcarpeta per secció/pàgina** de l'app, segons
`wiki-cronos/AI_CODE_INSTRUCTIONS.md` §9.1.

L'app **no** és una SPA amb partials (§8): són **3 HTML separats** servits directament
(`public/app.html`, `public/mobile.html`, `public/profile.html`), cadascun amb les seves
vistes inline perquè l'app és petita. Si algun d'ells supera les 5 vistes internes, cal
migrar-lo al patró de partials abans de seguir afegint-hi.

```
docs/sections/
├── dictat/     ← flux principal: triar nivell, escoltar, escriure/fotografiar, correcció
├── mobile/     ← vista mòbil (/mobile)
└── perfil/     ← historial i estadístiques (/profile)
```

## Regles

1. Els gameplans de millora d'una secció són `GP_*.md` **dins la carpeta d'aquesta
   secció**, no `FN_*.md` a `docs/project/`.
2. Tot gameplan s'enllaça des de [`../project/ROADMAP.md`](../project/ROADMAP.md).
3. Gameplan completat → es mou a `docs/archive/`.

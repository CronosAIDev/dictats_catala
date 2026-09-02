# El script de migració ja no pot migrar els 212 clients de FeedScale

- **Data**: 2026-09-02
- **Sessió**: claude-gerard
- **Branca**: v10

## Què s'ha fet

L'assaig del script acabat d'escriure va destapar que `BrandWaiUserProfile` no té
«els 2 usuaris de Dictats»: té **212 comptes, i són els clients de
FeedScale/Trawlingweb**, que podien entrar a Dictats de rebot perquè l'auth era
compartida. La primera versió els hauria migrat tots — credencials de clients de
l'empresa copiades a la base de Dictats.

Ara el script:

- Per defecte només migra els correus **amb progrés real a Dictats** (SQLite:
  `user_progress` ∪ `user_texts` ∪ `user_errors`, via `DICTATS_DB_PATH`).
- `--correus a@b.c,d@e.f` permet una llista explícita.
- **Migrar-ho tot ja no és una opció que existeixi.**
- Avisa dels correus amb progrés que no siguin a `BrandWaiUserProfile`.

## Sense verificar

L'assaig contra el SQLite de la VM (el que té els usuaris reals de Dictats) es
farà al desplegar la Fase 0; en local només hi ha dades de proves.

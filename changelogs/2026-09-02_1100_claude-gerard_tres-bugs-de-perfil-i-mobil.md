# F49 + F37 + F38 — tres bugs de perfil i mòbil

**Data**: 2026-09-02 · **Autor**: claude-gerard · **Branch**: v11

## F49 — «Sortir» no feia res en un compte nou

`init()` a `public/profile.html` feia `return` quan l'historial era buit, **abans**
d'arribar a registrar el listener de `btn-logout`. Justament l'usuari acabat d'arribar era
qui no podia sortir. El listener ara es registra fora d'`init()`, abans de cap `fetch`.

## F37 — l'«Historial» no era cronològic

`/api/profile` ordenava per `errors_count ASC` amb `LIMIT 50`: amb més de 50 dictats, el
que acabaves de fer podia no sortir a una pantalla que es diu «Historial». Ara el servidor
torna **dues llistes** (`history` per data, `millors` per errors) i la pantalla té dues
pestanyes, «Recents» i «Millors». De passada, les estadístiques (total, mitjana, millor)
ara es calculen amb un agregat SQL sobre **tot** l'historial, no sobre els 50 pintats.

## F38 — el mòbil bloquejava el zoom

`maximum-scale=1.0` al viewport de `/mobile`, en una app de llegir i escriure text (i un
problema d'accessibilitat conegut). Retirat.

## Verificat

Per execució amb Chrome headless contra dos servidors locals:

- Base amb 4 dictats: la pestanya «Recents» encapçala amb el més nou, «Millors» amb el
  d'1 error, i el canvi de pestanya va i torna. Cap error de JS.
- Base buida (el cas del bug F49): l'historial buit es pinta, el click a «Sortir» crida
  `/api/logout` i redirigeix a `/login`.
- Viewport de `/mobile` servit sense `maximum-scale`.
- Suite completa: 79 OK, 0 fallos.

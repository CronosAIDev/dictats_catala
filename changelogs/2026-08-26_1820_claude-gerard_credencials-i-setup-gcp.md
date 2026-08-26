# Credencials fora del repo i setup de GCP corregit

**Data**: 2026-08-26 · **Autor**: claude-gerard · **Branch**: v5

## Què s'ha fet

- **`.gitignore`**: regles per a credencials (`*-dev.json`, `*-sa.json`,
  `credentials*.json`, `service-account*.json`, `gcp-*.json`, `*.pem`, `*.p12`) i per a
  `*.code-workspace`. Comprovat que cap regla nova amaga un fitxer ja trackejat.
- **Retirada `docs/shell/gerard-dev.json`** de l'arbre del repo. Era la private key de
  la SA nominal de Gerard, idèntica byte a byte a la còpia de `~/Documentos/`
  (verificat amb `cmp`) i **mai commitejada** (`git log --all` buit): no cal rotar-la ni
  reescriure història. La còpia bona passa de `664` a `600`.
- **`docs/shell/INSTRUCCIONES_SETUP.md`**: reescrit. Venia copiat de la guia de
  `dataagencies` i imposava dues regles que aquí no es compleixen.
- **`docs/guides/DEVELOPER_HANDBOOK.md`**: taula de devs amb on viu de veritat cada clau,
  comanda de deploy amb la SA de Gerard i avís de credencials fora del repo.
- **`CLAUDE.md`**: `SECURITY_PROTOCOL.md` ja no consta com «pendent de crear» (existeix i
  està trackejat); afegit `INSTRUCCIONES_SETUP.md` a la taula de documents.

## Verificat per execució real contra `kairos-vm`

| Afirmació que hi havia | Realitat |
|---|---|
| `--tunnel-through-iap` obligatori, port 22 tancat | Les dues vies funcionen; el 22 està obert. El flag és opcional. |
| Usuari SSH: `oscar@` | També funciona, però amb `gcloud compute ssh kairos-vm` entres com `gerard` (a `google-sudoers`). |
| Accés per OS Login | `enable-oslogin` no està activat: va per metadata `ssh-keys` del projecte. |

`pm2` a la VM: `dictats-catala` 1.1.1 online, 26 h d'uptime, 3 reinicis.

## No verificat

Els rols de la SA nominal: `getIamPolicy` denegat per a la pròpia SA, així que la llista
de la §5 és la que declara Óscar, no una lectura del projecte. Marcat com a tal al doc.

## Pendent

- Queda una entrada sobrant a la metadata `ssh-keys` del projecte
  (`oscar:` amb la clau pública de Gerard), creada en provar `oscar@kairos-vm`.
- `aicamper` a la mateixa VM: 115 reinicis i 99 s d'uptime — bucle d'arrencada. No és
  d'aquest repo; avisar Óscar.

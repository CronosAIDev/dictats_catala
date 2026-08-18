## [1.1.1] — 2026-08-18 — Credencial de deploy: service account nominal

### Contexto
Reconciliación del handbook con `wiki/AI_CODE_INSTRUCTIONS.md` (§29). Las entradas
del 2026-08-14 sobre acceso a VMs de Google nunca se habían aplicado a este repo:
el handbook documentaba el acceso con la cuenta personal `oscar@prioritygate.com`,
que caduca por la política de sesión de Workspace y en modo no interactivo
(Claude Code, scripts, CI) muere con `Reauthentication failed. cannot prompt during
non-interactive execution`. Es exactamente el fallo que dejó a varios devs semanas
sin poder desplegar en los repos vecinos: la wiki lo explicaba y los handbooks
callaban.

### Mejorado
- **Credencial canónica de deploy**: service account nominal
  `otc-dev@kairos-family-app.iam.gserviceaccount.com`, activada desde
  `~/.ssh/otc-dev.json`. Las SA están exentas de la política de sesión y no
  reautentican nunca.
- `scripts/deploy/deploy-dictats.sh` pasa `--account` explícito (variable `ACCOUNT`)
  en lugar de confiar en la cuenta activa de gcloud, que puede ser cualquiera de las
  7 credenciales de la máquina.
- `DEVELOPER_HANDBOOK.md` § Despliegue: nuevo apartado "Credencial d'accés" con el
  porqué, la regla de no compartir la clave JSON y enlace a
  `wiki/docs/acceso_vms_google_gcloud.md` §5.1/§5.4.
- Documentado explícitamente que **`kairos-vm` NO lleva `--tunnel-through-iap`**
  (IP pública, puerto 22 abierto), a diferencia de `mochi-vm` y `crawlers-vm`. La
  asimetría es la fuente habitual de confusión al copiar comandos entre repos.
- Nueva tabla "Problemes freqüents de deploy" en el handbook: los dos errores de
  reauth, el `Connection timed out` de las VMs con IAP, el `--update-env` silencioso
  (§18.4) y el `ERR_DLOPEN_FAILED` de `better-sqlite3`.
- Handbook § Rama activa: documentado el flujo `vN` de §9.6, que el handbook
  contradecía diciendo que se desarrollaba directamente en `main`.
- `README.md` § Deploy: nota sobre activar la SA antes de lanzar el script.

### Notas
- Verificado antes de documentar: la SA nominal entra en `kairos-vm` sin IAP y ve
  los 4 procesos PM2 de la VM (`aicamper`, `dictats-catala`, `kairos`, `trabaler`).
- Sin cambios de código de la app. Solo credencial de deploy y documentación.

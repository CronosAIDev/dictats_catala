# Setup de tu Service Account nominal para `kairos-family-app`

Óscar te crea una service account nominal para operar sobre el proyecto GCP
`kairos-family-app` (VM `kairos-vm`), que aloja `kairos_app`, `dictats_catala`,
`trabaler`/`heart_monitor` y `aicamper`.

> **Revisado el 2026-08-26 contra la VM.** La versión anterior de este documento venía
> copiada de la guía de `dataagencies` y daba por buenas dos reglas que aquí no se
> cumplen (§4). Lo que sigue está comprobado por ejecución real, no por copia.

## 1. Guarda la key en tu máquina

Recibirás un fichero `<tu-nombre>-dev.json` (por Signal / Bitwarden / entrega física —
NO por email plano).

Colócalo **fuera del árbol de cualquier repo**, con `chmod 600`:

```
Linux/macOS:  ~/.ssh/<tu-nombre>-dev.json     (o ~/Documentos/, ver nota)
Windows:      %USERPROFILE%\.ssh\<tu-nombre>-dev.json
```

> **Nota**: en la máquina de Gerard la key vive en `~/Documentos/gerard-dev.json`, no en
> `~/.ssh/`. Si un script o un handbook no la encuentra, es por eso — busca antes de dar
> el acceso por perdido.

**Nunca commitees este fichero.** El `.gitignore` de este repo ya cubre `*-dev.json`,
`*-sa.json`, `credentials*.json`, `*.pem` y `*.p12`, pero la regla no te salva si lo
guardas en un repo que no la tenga. El 2026-08-26 apareció una copia de
`gerard-dev.json` dentro de `docs/shell/` de este repo; no llegó a commitearse por poco.

## 2. Activa la SA en gcloud

```bash
gcloud auth activate-service-account --key-file=~/.ssh/<tu-nombre>-dev.json
gcloud config set project kairos-family-app
```

No hace falta `gcloud config set account`: la cuenta activa es un estado global de la
máquina y cualquier otra sesión te la mueve por debajo. Pasa `--account` explícito en
cada comando, como hacen los scripts de deploy.

## 3. Prueba el acceso

```bash
gcloud compute ssh kairos-vm \
  --zone=europe-west1-b --project=kairos-family-app \
  --account=<tu-nombre>-dev@kairos-family-app.iam.gserviceaccount.com \
  --command="whoami && hostname"
```

Debe responder tu nombre de usuario y `kairos-vm`, sin pedir contraseña ni fallar por
reauth.

## 4. Reglas duras (corregidas)

- **`--tunnel-through-iap` NO es obligatorio aquí.** `kairos-vm` tiene IP pública
  (34.156.75.104) y el puerto 22 **abierto** a internet: un `ssh` directo llega a
  negociar la clave de host antes de rechazar la autenticación, lo que prueba que `sshd`
  responde. Ambas vías funcionan —comprobadas las dos—, así que el flag es opcional, no
  un requisito. Donde **sí** es obligatorio es en `mochi-vm` y `crawlers-vm` (proyecto
  `dataagencies`), que tienen el 22 cerrado. Ver `wiki-cronos/docs/acceso_kairos_vm.md`.
- **Conéctate con tu propio usuario, no como `oscar@`.** El acceso **no** va por OS
  Login: `enable-oslogin` no está activado ni en el proyecto ni en la instancia. Va por
  la metadata `ssh-keys` **del proyecto**, donde `gcloud` publica tu clave pública la
  primera vez, bajo el usuario que derive de tu cuenta. `gcloud compute ssh kairos-vm`
  te da `gerard`, que está en `google-sudoers` con sudo sin contraseña y te sobra para
  toda la operativa. `oscar@kairos-vm` también funciona, pero deja tu clave publicada
  bajo el usuario de otra persona y te borra la trazabilidad en el audit log. Las apps
  corren bajo `oscar`: para verlas, `sudo -u oscar pm2 list`.

  Consecuencia práctica: cada `gcloud compute ssh <usuario>@kairos-vm` con un usuario
  nuevo **añade una entrada permanente** a la metadata del proyecto. Repásala de vez en
  cuando con `gcloud compute project-info describe`; el 2026-08-26 quedó una entrada
  `oscar:` con la clave de Gerard por una prueba de este tipo.
- **La key es tuya y solo tuya.** No la compartas. Si la pierdes o la ves comprometida,
  avisa a Óscar para revocarla y generar otra.

## 5. Permisos que tienes

Roles que Óscar asigna a la SA nominal en `kairos-family-app`:

- `roles/iap.tunnelResourceAccessor` — abrir túnel IAP a la VM
- `roles/compute.osLogin` — SSH a la VM
- `roles/compute.instanceAdmin.v1` — gestionar la instancia

> **Sin verificar**: la SA nominal no puede leer la política IAM del proyecto
> (`getIamPolicy` → `The caller does not have permission`), así que esta lista es la que
> Óscar declara, no una lectura del proyecto. Lo que sí está comprobado es que el acceso
> SSH y `instances describe` funcionan.

## 6. Deploy de código

Cada repo trae el suyo en `scripts/deploy/`. El de este es `deploy-dictats.sh`, y lleva
la cuenta parametrizada, así que no necesitas tocar el script:

```bash
gcloud auth activate-service-account --key-file=~/Documentos/gerard-dev.json
ACCOUNT=gerard-dev@kairos-family-app.iam.gserviceaccount.com \
  bash scripts/deploy/deploy-dictats.sh
```

Deploy **solo desde `main`**, y solo con el trabajo mergeado y verificado (§9.6).

## 7. Documentación operativa

- `docs/guides/DEVELOPER_HANDBOOK.md` — arquitectura, convenciones y deploy de este repo
- `wiki-cronos/docs/acceso_kairos_vm.md` — guía canónica de acceso a esta VM
- `wiki-cronos/AI_CODE_INSTRUCTIONS.md` §9.6 — git flow y credenciales de deploy

La wiki de Trawlingweb (`wiki/docs/acceso_vms_google_gcloud.md`) cubre `dataagencies`, no
este proyecto: se lee, no se escribe, y sus reglas de IAP no aplican aquí.

## 8. Contacto

Si algo no funciona: `oscar@prioritygate.com` / `otc@trawlingweb.app`.

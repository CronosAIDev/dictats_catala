#!/usr/bin/env bash
# Deploy incremental de dictats_catala a la VM via `git pull`.
# El repo és públic, així que la VM no necessita credencials de GitHub.
#
# Ús des de la màquina local (git bash / WSL):
#   bash scripts/deploy/deploy-dictats.sh
#
# Variables:
#   VM_HOST  → nom de la instància GCP (per defecte kairos-vm)
#   ZONE     → zona GCP (per defecte europe-west1-b)
#   PROJECT  → projecte GCP (per defecte kairos-family-app)
#   REMOTE   → ruta remota (per defecte /var/dictats/app)
#   ACCOUNT  → credencial gcloud (per defecte la SA nominal otc-dev)
#
# La credencial és una SERVICE ACCOUNT NOMINAL, no el compte personal: els comptes
# de Workspace caduquen per política de sessió i en mode no interactiu moren amb
# "Reauthentication failed. cannot prompt during non-interactive execution".
# Les SA estan exemptes. Si no la tens activada:
#   gcloud auth activate-service-account --key-file=<la-teva-clau>.json
#
# ⚠️ El `sudo -u oscar` NO és opcional. L'app i el repo són de l'usuari `oscar`;
# entrant com un altre, git talla amb «dubious ownership» i el desplegament es
# queda a mitges. Aquest script no el portava i per això no funcionava (vist el
# 07-09).
#
# kairos-vm NO porta --tunnel-through-iap (IP pública, port 22 obert), a diferència
# de mochi-vm i crawlers-vm. Detall: wiki/docs/acceso_vms_google_gcloud.md §5.1.
set -euo pipefail

VM_HOST="${VM_HOST:-kairos-vm}"
ZONE="${ZONE:-europe-west1-b}"
PROJECT="${PROJECT:-kairos-family-app}"
REMOTE="${REMOTE:-/var/dictats/app}"
ACCOUNT="${ACCOUNT:-otc-dev@kairos-family-app.iam.gserviceaccount.com}"
APP_USER="${APP_USER:-oscar}"     # de qui són el repo i els processos de PM2

echo "=== dictats_catala deploy → $VM_HOST:$REMOTE (com $ACCOUNT) ==="

gcloud compute ssh "$VM_HOST" --zone="$ZONE" --project="$PROJECT" --account="$ACCOUNT" \
  --command "sudo -u $APP_USER bash -c '
    set -e
    cd $REMOTE
    git pull --ff-only
    npm ci --omit=dev
    npm rebuild better-sqlite3
    pm2 restart dictats-catala --update-env || pm2 start $REMOTE/ecosystem.config.js
    pm2 save
  '"

echo ""
echo "=== Deploy complet ==="
echo "Verifica:"
echo "  curl -s https://dictats.usecronos.com/login -o /dev/null -w '%{http_code}\n'"
echo "  curl -s https://dictats.usecronos.com/.well-known/assetlinks.json"

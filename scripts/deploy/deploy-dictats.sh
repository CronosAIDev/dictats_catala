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
set -euo pipefail

VM_HOST="${VM_HOST:-kairos-vm}"
ZONE="${ZONE:-europe-west1-b}"
PROJECT="${PROJECT:-kairos-family-app}"
REMOTE="${REMOTE:-/var/dictats/app}"

echo "=== dictats_catala deploy → $VM_HOST:$REMOTE ==="

gcloud compute ssh "$VM_HOST" --zone="$ZONE" --project="$PROJECT" --command "
    set -e
    cd $REMOTE
    git pull --ff-only
    npm ci --omit=dev
    npm rebuild better-sqlite3
    pm2 restart dictats-catala --update-env || pm2 start $REMOTE/ecosystem.config.js
    pm2 save
"

echo ""
echo "=== Deploy complet ==="
echo "Verifica: curl -s https://dictation.generaive.io/ -o /dev/null -w '%{http_code}\n'"

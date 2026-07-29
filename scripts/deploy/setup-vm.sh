#!/usr/bin/env bash
# Bootstrap de dictats_catala a la VM (Debian 12).
# Executar UNA sola vegada. Si la VM ja té kairos/trabaler, només crea l'arbre de dirs.
#
# Ús des de la màquina local:
#   gcloud compute scp scripts/deploy/setup-vm.sh kairos-vm:~/setup-dictats.sh --zone=europe-west1-b --project=kairos-family-app
#   gcloud compute ssh kairos-vm --zone=europe-west1-b --project=kairos-family-app -- 'bash ~/setup-dictats.sh'
set -euo pipefail

echo "=== dictats_catala VM bootstrap ==="

sudo apt-get update -y
sudo apt-get install -y curl git build-essential python3 nginx certbot python3-certbot-nginx sqlite3

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1)" != "v20" ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "node: $(node -v)  npm: $(npm -v)"

if ! command -v pm2 >/dev/null 2>&1; then
    sudo npm install -g pm2
fi
echo "pm2: $(pm2 -v)"

sudo mkdir -p /var/dictats/{app,data,logs}
sudo chown -R "$USER":"$USER" /var/dictats

if [ ! -d /var/dictats/app/.git ]; then
    git clone https://github.com/OTRABAZOS/dictats_catala.git /var/dictats/app
fi

if [ -f /var/dictats/app/nginx/dictats.conf ]; then
    sudo cp /var/dictats/app/nginx/dictats.conf /etc/nginx/sites-available/dictats.conf
    sudo ln -sf /etc/nginx/sites-available/dictats.conf /etc/nginx/sites-enabled/dictats.conf
    sudo nginx -t && sudo systemctl reload nginx
fi

echo ""
echo "=== Setup complet ==="
echo "  1. Edita /var/dictats/app/.env  (chmod 600)"
echo "  2. bash scripts/deploy/deploy-dictats.sh   (o npm ci --production a la VM)"
echo "  3. pm2 start /var/dictats/app/ecosystem.config.js && pm2 save"
echo "  4. Apunta el DNS dictation.generaive.io a la IP de la VM"
echo "  5. sudo certbot --nginx -d dictation.generaive.io"

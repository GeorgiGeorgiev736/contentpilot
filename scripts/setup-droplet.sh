#!/usr/bin/env bash
# Run once on a fresh DigitalOcean Ubuntu 22.04 droplet
# Usage: ssh root@YOUR_IP 'bash -s' < scripts/setup-droplet.sh
set -e

echo "=== Installing Docker ==="
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "=== Cloning repo ==="
mkdir -p /opt/autopilot
git clone https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git /opt/autopilot
cd /opt/autopilot

echo "=== Installing certbot for SSL ==="
apt-get install -y certbot
# Run this manually after pointing your DNS to the droplet IP:
# certbot certonly --standalone -d yourdomain.com --agree-tos -m you@email.com
# Then copy certs:
# mkdir -p /opt/autopilot/nginx/certs
# cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/autopilot/nginx/certs/
# cp /etc/letsencrypt/live/yourdomain.com/privkey.pem   /opt/autopilot/nginx/certs/

echo "=== Copy backend/.env ==="
echo "Next step: copy your backend/.env to /opt/autopilot/backend/.env"
echo "  scp ./backend/.env root@YOUR_IP:/opt/autopilot/backend/.env"

echo "=== Setup complete! ==="
echo "After setting .env and SSL certs, run:"
echo "  cd /opt/autopilot && docker compose -f docker-compose.prod.yml up -d --build"

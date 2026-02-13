#!/bin/bash
# deploy.sh — Deploy VDI Taxi to Timeweb VPS
#
# Usage: ./scripts/deploy.sh
#
# Requires: .env file with TIMEWEB_HOST, TIMEWEB_SSH_USER, TIMEWEB_SSH_PASSWORD

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load env
if [ -f "$PROJECT_DIR/.env" ]; then
    source "$PROJECT_DIR/.env"
fi

HOST="${TIMEWEB_HOST:?TIMEWEB_HOST not set}"
USER="${TIMEWEB_SSH_USER:-root}"
REMOTE_DIR="/opt/vdi-taxi"

echo "=== Deploying VDI Taxi to ${USER}@${HOST} ==="

# 1. Build frontend locally
echo "[1/5] Building frontend..."
cd "$PROJECT_DIR"
npm ci
npm run build

# 2. Sync project files to server
echo "[2/5] Syncing files to server..."
rsync -avz --delete \
    --exclude node_modules \
    --exclude .git \
    --exclude .env \
    --exclude "*.db" \
    --exclude dumps/ \
    "$PROJECT_DIR/" "${USER}@${HOST}:${REMOTE_DIR}/"

# 3. Copy .env to server
echo "[3/5] Copying .env..."
scp "$PROJECT_DIR/.env" "${USER}@${HOST}:${REMOTE_DIR}/.env"

# 4. Copy frontend build to server
echo "[4/5] Copying frontend build..."
rsync -avz "$PROJECT_DIR/dist/" "${USER}@${HOST}:${REMOTE_DIR}/dist/"

# 5. Start/restart services on server
echo "[5/5] Starting services..."
ssh "${USER}@${HOST}" bash -c "'
    cd ${REMOTE_DIR}

    # Build and start with production compose
    docker compose -f docker-compose.prod.yml --profile build up frontend-builder
    docker compose -f docker-compose.prod.yml up -d --build

    # Wait and check health
    sleep 10
    docker compose -f docker-compose.prod.yml ps
    curl -sf http://localhost/api/health && echo \" API OK\" || echo \" API FAILED\"
'"

echo "=== Deploy complete! ==="
echo "Site: http://${HOST}"

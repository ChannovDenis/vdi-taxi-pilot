#!/bin/bash
# add_vdi_station.sh — Add a new VDI station (user + xrdp + Guacamole connection)
#
# Usage: ./deploy/add_vdi_station.sh <station_number>
#   Example: ./deploy/add_vdi_station.sh 2
#
# Creates vdiuser<N> on the host, configures xrdp on port 3389,
# and registers an RDP connection in Guacamole.
#
# Station 1 is already provisioned manually. Use this for stations 2-5.

set -euo pipefail

# ── Validate input ──
STATION_NUM="${1:-}"
if [ -z "$STATION_NUM" ] || [ "$STATION_NUM" -lt 2 ] || [ "$STATION_NUM" -gt 5 ]; then
    echo "Usage: $0 <station_number>  (2-5)"
    echo "Station 1 is already provisioned."
    exit 1
fi

USERNAME="vdiuser${STATION_NUM}"
PASSWORD="vdipass${STATION_NUM}${STATION_NUM}${STATION_NUM}"
# Each station uses its own xrdp port: 3390, 3391, 3392, 3393
XRDP_PORT=$((3388 + STATION_NUM))
CONN_NAME="VDI-Station-${STATION_NUM}"

echo "=== Adding VDI Station ${STATION_NUM} ==="
echo "  User:      ${USERNAME}"
echo "  Password:  ${PASSWORD}"
echo "  xrdp port: ${XRDP_PORT}"
echo "  Guacamole: ${CONN_NAME}"
echo ""

# ── Load env for SSH ──
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
if [ -f "$PROJECT_DIR/.env" ]; then
    source "$PROJECT_DIR/.env"
fi
HOST="${TIMEWEB_HOST:?TIMEWEB_HOST not set in .env}"
SSH_USER="${TIMEWEB_SSH_USER:-root}"

# ── Step 1: Create user on server ──
echo "[1/4] Creating user ${USERNAME}..."
ssh -o StrictHostKeyChecking=no "${SSH_USER}@${HOST}" bash -s <<REMOTE_USER
set -e
if id "${USERNAME}" &>/dev/null; then
    echo "User ${USERNAME} already exists, updating password"
    echo "${USERNAME}:${PASSWORD}" | chpasswd
else
    useradd -m -s /bin/bash "${USERNAME}"
    echo "${USERNAME}:${PASSWORD}" | chpasswd
    echo "User ${USERNAME} created"
fi
# Add to ssl-cert group for xrdp
adduser "${USERNAME}" ssl-cert 2>/dev/null || true
# Configure xfce session
echo "xfce4-session" > /home/${USERNAME}/.xsession
chown ${USERNAME}:${USERNAME} /home/${USERNAME}/.xsession
REMOTE_USER
echo "  Done."

# ── Step 2: Configure xrdp for this station ──
# Station 1 uses default xrdp on port 3389.
# Stations 2-5 each get a separate xrdp instance with a unique port.
echo "[2/4] Configuring xrdp on port ${XRDP_PORT}..."
ssh -o StrictHostKeyChecking=no "${SSH_USER}@${HOST}" bash -s <<REMOTE_XRDP
set -e
INSTANCE_DIR="/etc/xrdp-station${STATION_NUM}"

# Copy xrdp config for this instance
if [ ! -d "\$INSTANCE_DIR" ]; then
    cp -r /etc/xrdp "\$INSTANCE_DIR"
fi

# Update port in config
sed -i "s/^port=.*/port=${XRDP_PORT}/" "\$INSTANCE_DIR/xrdp.ini"

# Create systemd service for this instance
cat > /etc/systemd/system/xrdp-station${STATION_NUM}.service <<'UNIT'
[Unit]
Description=xrdp VDI Station ${STATION_NUM}
After=network.target xrdp-sesman.service

[Service]
Type=forking
PIDFile=/run/xrdp-station${STATION_NUM}/xrdp.pid
RuntimeDirectory=xrdp-station${STATION_NUM}
ExecStart=/usr/sbin/xrdp --config ${INSTANCE_DIR}/xrdp.ini --pidfile /run/xrdp-station${STATION_NUM}/xrdp.pid
ExecStop=/usr/sbin/xrdp --config ${INSTANCE_DIR}/xrdp.ini --kill
Restart=on-failure

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable xrdp-station${STATION_NUM}
systemctl restart xrdp-station${STATION_NUM}

# Open firewall for Docker containers
ufw allow from 172.19.0.0/16 to any port ${XRDP_PORT} proto tcp comment "Docker VDI Station ${STATION_NUM}" 2>/dev/null || true
ufw allow from 172.17.0.0/16 to any port ${XRDP_PORT} proto tcp comment "Docker bridge VDI Station ${STATION_NUM}" 2>/dev/null || true

echo "xrdp-station${STATION_NUM} running on port ${XRDP_PORT}"
REMOTE_XRDP
echo "  Done."

# ── Step 3: Install software (skip if already installed for station 1) ──
echo "[3/4] Software already installed system-wide (shared with Station 1). Skipping."

# ── Step 4: Add Guacamole connection ──
echo "[4/4] Adding Guacamole connection '${CONN_NAME}'..."
ssh -o StrictHostKeyChecking=no "${SSH_USER}@${HOST}" bash -s <<REMOTE_GUAC
set -e

# Get Guacamole container IP
GUAC_IP=\$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' vdi-taxi-guacamole-1)

# Get auth token
TOKEN=\$(curl -sf -X POST "http://\$GUAC_IP:8080/guacamole/api/tokens" \\
  -d 'username=guacadmin&password=guacadmin' | python3 -c 'import sys,json; print(json.load(sys.stdin)["authToken"])')

# Docker gateway (host from container perspective)
GATEWAY=\$(docker network inspect vdi-taxi_default --format '{{range .IPAM.Config}}{{.Gateway}}{{end}}')

# Create connection
RESULT=\$(curl -sf -X POST "http://\$GUAC_IP:8080/guacamole/api/session/data/postgresql/connections?token=\$TOKEN" \\
  -H 'Content-Type: application/json' \\
  -d '{
  "name": "${CONN_NAME}",
  "parentIdentifier": "ROOT",
  "protocol": "rdp",
  "parameters": {
    "hostname": "'\$GATEWAY'",
    "port": "${XRDP_PORT}",
    "username": "${USERNAME}",
    "password": "${PASSWORD}",
    "security": "any",
    "ignore-cert": "true",
    "resize-method": "display-update",
    "enable-wallpaper": "false",
    "enable-font-smoothing": "true",
    "enable-full-window-drag": "false",
    "enable-desktop-composition": "false",
    "enable-menu-animations": "false",
    "enable-theming": "true",
    "color-depth": "16",
    "clipboard-encoding": "UTF-8",
    "disable-copy": "false",
    "disable-paste": "false"
  },
  "attributes": {
    "max-connections": "1",
    "max-connections-per-user": "1"
  }
}')

CONN_ID=\$(echo "\$RESULT" | python3 -c 'import sys,json; print(json.load(sys.stdin)["identifier"])')
echo "Guacamole connection created: ${CONN_NAME} (ID: \$CONN_ID)"
REMOTE_GUAC
echo "  Done."

echo ""
echo "=== VDI Station ${STATION_NUM} ready! ==="
echo "  RDP:  ${HOST}:${XRDP_PORT}"
echo "  User: ${USERNAME} / ${PASSWORD}"
echo "  Guacamole connection: ${CONN_NAME}"
echo ""
echo "To test: open Guacamole admin panel and connect to ${CONN_NAME}"

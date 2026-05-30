#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Ouija — VPS setup & deploy script
#
# Tested on: Ubuntu 22.04 / 24.04
#
# What this script does:
#   1. Installs Docker + Docker Compose plugin (if not already present)
#   2. Validates that .env exists and has required values filled in
#   3. Obtains a Let's Encrypt TLS certificate for your domain
#   4. Patches nginx.conf with your actual domain name
#   5. Builds and starts all containers
#
# Usage:
#   cp .env.production .env
#   nano .env              # fill in DOMAIN, passwords, URLs
#   chmod +x setup.sh
#   sudo ./setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[ouija]${NC} $*"; }
warn()  { echo -e "${YELLOW}[ouija]${NC} $*"; }
error() { echo -e "${RED}[ouija] ERROR:${NC} $*" >&2; exit 1; }

# ── Must run as root ──────────────────────────────────────────────────────────
[[ $EUID -eq 0 ]] || error "Please run as root: sudo ./setup.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── 1. Check / install Docker ─────────────────────────────────────────────────
info "Checking Docker installation..."
if ! command -v docker &>/dev/null; then
    info "Docker not found — installing..."
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg lsb-release

    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo "deb [arch=$(dpkg --print-architecture) \
        signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" \
        > /etc/apt/sources.list.d/docker.list

    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io \
        docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
    info "Docker installed successfully."
else
    info "Docker $(docker --version | awk '{print $3}' | tr -d ',') already installed."
fi

if ! docker compose version &>/dev/null; then
    error "Docker Compose plugin not found. Re-run the Docker installation step."
fi

# ── 2. Validate .env ──────────────────────────────────────────────────────────
info "Validating .env..."
[[ -f .env ]] || error ".env not found. Copy .env.production to .env and fill it in."

source .env

check_var() {
    local name=$1 val=${!1:-}
    [[ -n "$val" ]] || error "Required variable '$name' is not set in .env"
    [[ "$val" != *"CHANGE_ME"* ]] || error "'$name' still has a placeholder value — please change it."
}

check_var DOMAIN
check_var POSTGRES_PASSWORD
check_var REDIS_PASSWORD
check_var DATABASE_URL
check_var APP_URL
check_var NEXT_PUBLIC_API_URL
check_var CDN_BASE_URL

info ".env looks good."

# ── 3. Patch nginx.conf with the real domain ──────────────────────────────────
info "Patching nginx/nginx.conf with domain: $DOMAIN"
sed -i "s|\${DOMAIN}|${DOMAIN}|g" nginx/nginx.conf

# ── 4. Open firewall ports ─────────────────────────────────────────────────────
if command -v ufw &>/dev/null; then
    info "Opening ports 80 and 443 in ufw..."
    ufw allow 80/tcp  >/dev/null 2>&1 || true
    ufw allow 443/tcp >/dev/null 2>&1 || true
fi

# ── 5. Obtain TLS certificate via Let's Encrypt ───────────────────────────────
info "Checking for existing TLS certificate for $DOMAIN..."
CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"

if [[ -f "$CERT_PATH" ]]; then
    warn "Certificate already exists at $CERT_PATH — skipping Certbot."
else
    info "Requesting Let's Encrypt certificate for $DOMAIN..."
    info "(Make sure port 80 is open and DNS A/AAAA record points to this server)"

    # Bring up nginx with HTTP-only temporarily so Certbot can do the challenge.
    # We use a minimal inline config that only serves the ACME challenge dir.
    mkdir -p /var/www/certbot

    docker run --rm \
        -v /var/www/certbot:/var/www/certbot \
        -v /etc/letsencrypt:/etc/letsencrypt \
        --network host \
        certbot/certbot certonly \
            --webroot \
            --webroot-path /var/www/certbot \
            --non-interactive \
            --agree-tos \
            --email "admin@${DOMAIN}" \
            -d "${DOMAIN}" \
        || {
            warn "Certbot failed. Common causes:"
            warn "  • DNS A record for $DOMAIN doesn't point to this server yet"
            warn "  • Port 80 is blocked by the VPS firewall/security group"
            warn ""
            warn "You can re-run just the cert step later:"
            warn "  docker run --rm -v /var/www/certbot:/var/www/certbot \\"
            warn "    -v /etc/letsencrypt:/etc/letsencrypt --network host \\"
            warn "    certbot/certbot certonly --webroot --webroot-path /var/www/certbot \\"
            warn "    --non-interactive --agree-tos --email admin@${DOMAIN} -d ${DOMAIN}"
            warn ""
            warn "Then re-run:  docker compose -f docker-compose.prod.yaml up -d"
            error "Aborting because no certificate is available."
        }

    info "Certificate obtained!"
fi

# ── 6. Build and start everything ─────────────────────────────────────────────
info "Building images and starting containers (this takes a few minutes on first run)..."
docker compose -f docker-compose.prod.yaml --env-file .env up -d --build

info ""
info "═══════════════════════════════════════════════════════"
info " Ouija is running!"
info ""
info "  Web app  →  https://${DOMAIN}"
info "  API      →  https://${DOMAIN}/api"
info "  Swagger  →  https://${DOMAIN}/api-docs"
info ""
info " Useful commands:"
info "   View logs:    docker compose -f docker-compose.prod.yaml logs -f"
info "   Stop:         docker compose -f docker-compose.prod.yaml down"
info "   Update:       git pull && docker compose -f docker-compose.prod.yaml up -d --build"
info "   Renew cert:   docker compose -f docker-compose.prod.yaml run --rm certbot renew"
info "═══════════════════════════════════════════════════════"

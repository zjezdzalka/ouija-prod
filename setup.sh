#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Ouija — VPS setup & deploy script
#
# Tested on: Ubuntu 22.04 / 24.04
#
# What this script does:
#   1. Installs Docker + Docker Compose plugin (if not already present)
#   2. Validates that .env exists and has required values filled in
#   3. Derives APP_DOMAIN, API_DOMAIN, CDN_DOMAIN from APP_URL / NEXT_PUBLIC_API_URL / CDN_BASE_URL
#   4. Patches nginx/nginx.conf with your actual domains
#   5. Adds a postgres healthcheck to docker-compose.prod.yaml so the API
#      waits for the DB before running prisma db push
#   6. Obtains Let's Encrypt TLS certificates for all three domains (standalone)
#   7. Builds and starts all containers
#
# Usage:
#   cp .env.production .env
#   nano .env              # fill in passwords, URLs
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

# Safe parser: reads KEY=VALUE lines without evaluating shell syntax.
# Handles unquoted special characters (e.g. SMTP_FROM=Ouija <user@example.com>),
# strips surrounding single/double quotes, skips comments and blank lines.
declare -A _env
while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    if [[ "$val" =~ ^\"(.*)\"$ ]]; then val="${BASH_REMATCH[1]}"
    elif [[ "$val" =~ ^\'(.*)\'$ ]]; then val="${BASH_REMATCH[1]}"; fi
    _env["$key"]="$val"
done < .env

check_var() {
    local name="$1"
    local exists="${_env[$name]+x}"
    [[ -n "$exists" ]] || error "Required variable '$name' is not set in .env"
    local actual="${_env[$name]}"
    [[ -n "$actual" ]]               || error "Required variable '$name' is empty in .env"
    [[ "$actual" != *"CHANGE_ME"* ]] || error "'$name' still has a placeholder value — please change it."
    [[ "$actual" != *"changeme"* ]]  || error "'$name' still has a placeholder value — please change it."
}

check_var POSTGRES_PASSWORD
check_var REDIS_PASSWORD
check_var DATABASE_URL
check_var APP_URL
check_var NEXT_PUBLIC_API_URL
check_var CDN_BASE_URL

# ── 3. Derive domains from URLs ───────────────────────────────────────────────
strip_scheme() { local u="$1"; u="${u#http://}"; u="${u#https://}"; echo "${u%%/*}"; }

APP_DOMAIN="$(strip_scheme "${_env[APP_URL]}")"
API_DOMAIN="$(strip_scheme "${_env[NEXT_PUBLIC_API_URL]}")"
CDN_DOMAIN="$(strip_scheme "${_env[CDN_BASE_URL]}")"

[[ -n "$APP_DOMAIN" ]] || error "Could not derive APP_DOMAIN from APP_URL"
[[ -n "$API_DOMAIN" ]] || error "Could not derive API_DOMAIN from NEXT_PUBLIC_API_URL"
[[ -n "$CDN_DOMAIN" ]] || error "Could not derive CDN_DOMAIN from CDN_BASE_URL"

info "Domains: web=$APP_DOMAIN  api=$API_DOMAIN  cdn=$CDN_DOMAIN"
info ".env looks good."

# ── 4. Patch nginx/nginx.conf with actual domains ─────────────────────────────
[[ -f nginx/nginx.conf ]] || error "nginx/nginx.conf not found in $(pwd)"

info "Patching nginx/nginx.conf..."
# Only replace server_name values and the letsencrypt cert path directory.
# A global replace would mangle the cert file paths since they also contain the domain.
sed -i \
    -e "s|server_name ouija\.rytui\.dev;|server_name ${APP_DOMAIN};|g" \
    -e "s|server_name api-ouija\.rytui\.dev;|server_name ${API_DOMAIN};|g" \
    -e "s|server_name cdn-ouija\.rytui\.dev;|server_name ${CDN_DOMAIN};|g" \
    -e "s|if (\$host = ouija\.rytui\.dev)|if (\$host = ${APP_DOMAIN})|g" \
    -e "s|if (\$host = api-ouija\.rytui\.dev)|if (\$host = ${API_DOMAIN})|g" \
    -e "s|if (\$host = cdn-ouija\.rytui\.dev)|if (\$host = ${CDN_DOMAIN})|g" \
    -e "s|/live/ouija\.rytui\.dev/|/live/${APP_DOMAIN}/|g" \
    nginx/nginx.conf

info "nginx.conf patched." 

# ── 5. Patch Dockerfile: copy prisma.config.ts into runner stage ─────────────
DOCKERFILE="apps/api/Dockerfile"
[[ -f "$DOCKERFILE" ]] || error "$DOCKERFILE not found in $(pwd)"

if ! grep -q "prisma.config.ts" "$DOCKERFILE"; then
    info "Patching $DOCKERFILE: adding prisma.config.ts copy..."
    sed -i 's|COPY apps/api/entrypoint.sh ./entrypoint.sh|COPY apps/api/entrypoint.sh ./entrypoint.sh\nCOPY apps/api/prisma.config.ts ./prisma.config.ts|' "$DOCKERFILE"
    info "Dockerfile patched."
else
    info "prisma.config.ts already in Dockerfile — skipping."
fi

# ── 6. Patch entrypoint.sh: pass --config to prisma db push ──────────────────
ENTRYPOINT="apps/api/entrypoint.sh"
[[ -f "$ENTRYPOINT" ]] || error "$ENTRYPOINT not found in $(pwd)"

if ! grep -q "prisma.config.ts" "$ENTRYPOINT"; then
    info "Patching $ENTRYPOINT: adding --config flag to prisma db push..."
    sed -i 's|npx prisma db push --schema=./prisma/schema.prisma|npx prisma db push --schema=./prisma/schema.prisma --config=./prisma.config.ts|' "$ENTRYPOINT"
    info "entrypoint.sh patched."
else
    info "entrypoint.sh already has --config flag — skipping."
fi

# ── 7. Patch docker-compose.prod.yaml: postgres healthcheck ──────────────────
COMPOSE_FILE="docker-compose.prod.yaml"
[[ -f "$COMPOSE_FILE" ]] || error "$COMPOSE_FILE not found in $(pwd)"

if ! grep -q "pg_isready" "$COMPOSE_FILE"; then
    info "Patching $COMPOSE_FILE: adding postgres healthcheck..."
    python3 - <<'EOF'
import re

with open("docker-compose.prod.yaml") as f:
    content = f.read()

healthcheck = """    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10
"""

# Insert healthcheck after postgres volumes block
content = re.sub(
    r'(  postgres:.*?volumes:\s*\n(?:[ \t]+-[^\n]*\n)+)',
    lambda m: m.group(0) + healthcheck,
    content, count=1, flags=re.DOTALL
)

# Update api depends_on to wait for postgres healthy
content = re.sub(
    r'(  api:.*?depends_on:\s*\n)((?:[ \t]+-[^\n]*\n)+)',
    lambda m: (
        m.group(1) +
        "      postgres:\n        condition: service_healthy\n"
        "      redis:\n        condition: service_started\n"
    ),
    content, count=1, flags=re.DOTALL
)

with open("docker-compose.prod.yaml", "w") as f:
    f.write(content)
print("done")
EOF
    info "Patched successfully."
else
    info "Postgres healthcheck already present — skipping patch."
fi

# ── 8. Open firewall ports ────────────────────────────────────────────────────
if command -v ufw &>/dev/null; then
    info "Opening ports 80 and 443 in ufw..."
    ufw allow 80/tcp  >/dev/null 2>&1 || true
    ufw allow 443/tcp >/dev/null 2>&1 || true
fi

# ── 9. Obtain TLS certificates via Let's Encrypt ─────────────────────────────
# We need certs for all three domains. certbot --standalone spins up its own
# HTTP server on port 80 — make sure nothing else is using it when this runs.

CERT_PATH="/etc/letsencrypt/live/${APP_DOMAIN}/fullchain.pem"

if [[ -f "$CERT_PATH" ]]; then
    warn "Certificate already exists at $CERT_PATH — skipping Certbot."
else
    info "Requesting Let's Encrypt certificates for: $APP_DOMAIN, $API_DOMAIN, $CDN_DOMAIN"
    info "(Make sure port 80 is open and all DNS A records point to this server)"

    docker run --rm \
        -v /etc/letsencrypt:/etc/letsencrypt \
        --network host \
        certbot/certbot certonly \
            --standalone \
            --expand \
            --non-interactive \
            --agree-tos \
            --email "admin@${APP_DOMAIN}" \
            -d "${APP_DOMAIN}" \
            -d "${API_DOMAIN}" \
            -d "${CDN_DOMAIN}" \
        || {
            warn "Certbot failed. Common causes:"
            warn "  • DNS A records for all three domains don't point to this server"
            warn "  • Port 80 is blocked by your VPS firewall/security group"
            warn ""
            warn "Re-run just the cert step:"
            warn "  sudo docker run --rm -v /etc/letsencrypt:/etc/letsencrypt --network host \\"
            warn "    certbot/certbot certonly --standalone --non-interactive --agree-tos \\"
            warn "    --email admin@${APP_DOMAIN} \\"
            warn "    -d ${APP_DOMAIN} -d ${API_DOMAIN} -d ${CDN_DOMAIN}"
            warn ""
            warn "Then re-run: sudo bash setup.sh"
            error "Aborting because no certificate is available."
        }

    info "Certificates obtained!"
fi

# ── 10. Download certbot SSL options files (not generated by --standalone) ────
# nginx.conf references options-ssl-nginx.conf and ssl-dhparams.pem which are
# only written by certbot when using the nginx authenticator. We fetch them
# from certbot's official repo so nginx can start.
SSL_OPTIONS="/etc/letsencrypt/options-ssl-nginx.conf"
SSL_DHPARAMS="/etc/letsencrypt/ssl-dhparams.pem"

if [[ ! -f "$SSL_OPTIONS" ]]; then
    info "Downloading options-ssl-nginx.conf..."
    curl -fsSL https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf         -o "$SSL_OPTIONS"
fi

if [[ ! -f "$SSL_DHPARAMS" ]]; then
    info "Generating ssl-dhparams.pem (this may take a minute)..."
    openssl dhparam -out "$SSL_DHPARAMS" 2048 2>/dev/null
fi

info "SSL options ready."

# ── 11. Build and start everything ─────────────────────────────────────────────
info "Building images and starting containers (this takes a few minutes on first run)..."
docker compose -f docker-compose.prod.yaml --env-file .env up -d --build

info ""
info "═══════════════════════════════════════════════════════"
info " Ouija is running!"
info ""
info "  Web app  →  https://${APP_DOMAIN}"
info "  API      →  https://${API_DOMAIN}"
info "  CDN      →  https://${CDN_DOMAIN}"
info ""
info " Useful commands:"
info "   View logs:    docker compose -f docker-compose.prod.yaml logs -f"
info "   Stop:         docker compose -f docker-compose.prod.yaml down"
info "   Update:       git pull && docker compose -f docker-compose.prod.yaml up -d --build"
info "   Renew cert:   docker compose -f docker-compose.prod.yaml run --rm certbot renew"
info "═══════════════════════════════════════════════════════"

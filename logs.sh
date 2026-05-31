#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Ouija — View logs script
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ -f "docker-compose.prod.yaml" ]]; then
    echo "Showing logs (Ctrl+C to exit)..."
    docker compose -f docker-compose.prod.yaml logs -f --tail=100
else
    echo "Error: docker-compose.prod.yaml not found."
    exit 1
fi
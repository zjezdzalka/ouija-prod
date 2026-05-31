#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Ouija — Stop and cleanup script
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ -f "docker-compose.prod.yaml" ]]; then
    echo "Stopping Ouija containers..."
    docker compose -f docker-compose.prod.yaml down
    echo "Ouija stopped."
else
    echo "Error: docker-compose.prod.yaml not found."
    exit 1
fi
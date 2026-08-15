#!/usr/bin/env bash
set -euo pipefail

FABULA_DIR=/var/www/fabula
MAINTENANCE_FLAG="$FABULA_DIR/maintenance.flag"

rm -f "$MAINTENANCE_FLAG"

if command -v nginx >/dev/null 2>&1; then
  nginx -t
  systemctl reload nginx
fi

echo "Fabula maintenance mode disabled."
echo "Flag removed: $MAINTENANCE_FLAG"

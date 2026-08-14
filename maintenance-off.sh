#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/fabula"

# Remove maintenance flag file
rm -f maintenance.flag

echo "Maintenance mode disabled."

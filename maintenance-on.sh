#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/fabula"

# Create maintenance flag file
touch maintenance.flag

echo "Maintenance mode enabled."
echo "To disable maintenance mode, remove the flag: rm -f maintenance.flag"

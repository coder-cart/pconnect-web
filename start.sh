#!/usr/bin/env bash
#
# Frontend (Next.js web) startup script.
#
# Usage:
#   ./start.sh          # local development (next dev)
#   ./start.sh dev      # same as above
#   ./start.sh prod     # production: build, then serve the optimized output
#
# On Windows run it from Git Bash or WSL:  bash start.sh
#
# Required environment variables (set in .env.local locally, or in Vercel):
#   NEXT_PUBLIC_API_URL   e.g. https://pconnect-api.onrender.com/api
#   NEXT_PUBLIC_WS_URL    e.g. https://pconnect-api.onrender.com
set -euo pipefail

cd "$(dirname "$0")"

MODE="${1:-dev}"

echo "==> PConnect Web — mode: $MODE"

# Ensure a .env.local exists for local runs.
if [ "$MODE" != "prod" ] && [ ! -f .env.local ] && [ -f .env.example ]; then
  echo "==> No .env.local found; copying .env.example -> .env.local (edit it with real values)"
  cp .env.example .env.local
fi

echo "==> Installing dependencies"
npm install

case "$MODE" in
  prod)
    echo "==> Building"
    npm run build
    echo "==> Starting production server on port ${PORT:-3000}"
    npm run start
    ;;
  dev)
    echo "==> Starting dev server on port ${PORT:-3000}"
    npm run dev
    ;;
  *)
    echo "Unknown mode: '$MODE'. Use 'dev' or 'prod'." >&2
    exit 1
    ;;
esac

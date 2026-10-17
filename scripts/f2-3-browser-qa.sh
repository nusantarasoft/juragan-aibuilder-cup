#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MEDIA_DIR="${F23_MEDIA_DIR:-/cursor/stores/self/media}"
mkdir -p "$MEDIA_DIR"
export F23_MEDIA_DIR="$MEDIA_DIR"
export GRAPHQL_URL="${GRAPHQL_URL:-http://127.0.0.1:4001/graphql}"
cd "$ROOT/admin"
  npx playwright test tests/e2e/f2-3-connect-wa-fullstack.spec.ts --project=chromium "$@"

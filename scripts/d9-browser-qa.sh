#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MEDIA="${D9_QA_MEDIA_DIR:-/cursor/stores/self/media}"
mkdir -p "$MEDIA"
cd "$ROOT/admin"
PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://127.0.0.1:3003}" \
GRAPHQL_URL="${GRAPHQL_URL:-http://127.0.0.1:4001/graphql}" \
D9_QA_MEDIA_DIR="$MEDIA" \
  npx playwright test tests/e2e/d9-deck-fullstack.spec.ts --project=chromium "$@"

#!/usr/bin/env bash
# F2-1 fullstack browser QA — requires stack from qa-bootstrap-f1-4-stack.sh,
# migrations applied, middleware :4001, admin :3003 (see middleware/.env.local).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MEDIA="${F21_MEDIA_DIR:-/cursor/stores/self/media}"
mkdir -p "$MEDIA"
cd "$ROOT/admin"
PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://127.0.0.1:3003}" \
GRAPHQL_URL="${GRAPHQL_URL:-http://127.0.0.1:4001/graphql}" \
F21_MEDIA_DIR="$MEDIA" \
  npx playwright test tests/e2e/f2-1-onboarding.spec.ts --project=chromium

#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MEDIA="${F35_MEDIA_DIR:-/cursor/stores/self/media}"
mkdir -p "$MEDIA"
export ONBOARDING_RATE_LIMIT_MAX="${ONBOARDING_RATE_LIMIT_MAX:-999}"
export ONBOARDING_RATE_LIMIT_EMAIL_MAX="${ONBOARDING_RATE_LIMIT_EMAIL_MAX:-999}"
cd "$ROOT/admin"
PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://127.0.0.1:3003}" \
GRAPHQL_URL="${GRAPHQL_URL:-http://127.0.0.1:4001/graphql}" \
F35_MEDIA_DIR="$MEDIA" \
  npx playwright test tests/e2e/f3-5-finance-recruit.spec.ts --project=chromium

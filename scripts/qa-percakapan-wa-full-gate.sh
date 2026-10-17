#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
REPORT_DIR="${REPORT_DIR:-/workspace/.gstack/qa-reports}"
mkdir -p "$REPORT_DIR"
LOG="$REPORT_DIR/qa-percakapan-wa-full-gate-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG") 2>&1

DOCKER="${DOCKER:-sudo docker}"
export DOCKER
docker() { $DOCKER "$@"; }
export -f docker 2>/dev/null || true

echo "==> QA full gate Percakapan WA — $(date -Is)"

if ! $DOCKER info >/dev/null 2>&1; then
  echo "==> Starting dockerd (vfs)"
  sudo dockerd --storage-driver=vfs >/tmp/dockerd-qa.log 2>&1 &
  for i in $(seq 1 60); do
    $DOCKER info >/dev/null 2>&1 && break
    sleep 2
  done
fi

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  printf '%s\n' '#!/bin/sh' 'exec sudo /usr/bin/docker "$@"' | sudo tee /usr/local/bin/docker >/dev/null
  sudo chmod +x /usr/local/bin/docker
fi

bash scripts/qa-bootstrap-f1-4-stack.sh || true

PG_CONTAINER=postgres DB_USER=postgres POSTGRES_DB=nusantarasoft \
  bash scripts/master-production/apply-migrations.sh

node scripts/init-cms-admin.mjs

echo "==> QA seed Percakapan WA"
$DOCKER exec -i postgres psql -U postgres -d nusantarasoft -v ON_ERROR_STOP=1 \
  < supabase/qa-seeds/20261017130000_studio_wa_conversations_qa.sql

echo "==> Hermes send mock :8765"
pkill -f qa-hermes-send-mock.py 2>/dev/null || true
python3 scripts/qa-hermes-send-mock.py 8765 >/tmp/qa-hermes-mock.log 2>&1 &
sleep 1

echo "==> middleware build + vitest"
cd middleware
npm ci
npm run build
MW_VITEST=$(npm run test 2>&1 | tee /tmp/mw-vitest.log | tail -1)
cd ..

echo "==> admin build + vitest"
cd admin
npm ci
npm run build
AD_VITEST=$(npm run test 2>&1 | tee /tmp/ad-vitest.log | tail -1)
cd ..

echo "==> Python unittest kasir-pipe + kasir-tools"
PY_PIPE=$(cd scripts/master-production/hermes-plugins/kasir-pipe && python3 -m unittest discover -s . -p 'test_*.py' 2>&1 | tee /tmp/py-pipe.log | tail -3)
PY_TOOLS=$(cd scripts/master-production/hermes-plugins/kasir-tools && python3 -m unittest discover -s . -p 'test_*.py' 2>&1 | tee /tmp/py-tools.log | tail -3)

echo "==> Start middleware (HERMES_BRIDGE_URL mock)"
pkill -f 'node dist/main' 2>/dev/null || true
pkill -f 'nest start' 2>/dev/null || true
cd middleware
HERMES_BRIDGE_URL=http://127.0.0.1:8765 KASIR_CONSULT_KEY=qa-test-key \
  nohup npm run start:prod > /tmp/middleware-qa.log 2>&1 &
cd ..
for i in $(seq 1 60); do
  curl -sf http://127.0.0.1:4001/graphql -H 'Content-Type: application/json' \
    -d '{"query":"query{__typename}"}' >/dev/null 2>&1 && break
  sleep 2
done

echo "==> Start admin production server"
pkill -f 'next start' 2>/dev/null || true
cd admin
nohup npm run start > /tmp/admin-qa.log 2>&1 &
cd ..
for i in $(seq 1 60); do
  curl -sf http://127.0.0.1:3003/admin/login >/dev/null 2>&1 && break
  sleep 2
done

echo "==> Playwright browsers"
cd admin
npx playwright install chromium

echo "==> Playwright wave gate + Percakapan WA"
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003 GRAPHQL_URL=http://127.0.0.1:4001/graphql \
  npx playwright test tests/e2e/ui-wave-1-recruit-deeplinks.spec.ts \
  tests/e2e/ui-wave-2-admin-buttons.spec.ts \
  tests/e2e/ui-wave-3-admin-buttons.spec.ts \
  tests/e2e/ui-wave-4-admin-buttons.spec.ts \
  tests/e2e/f2-2-recruit-fullstack.spec.ts \
  tests/e2e/f3-1-service-desk-recruit.spec.ts \
  tests/e2e/d9-deck-fullstack.spec.ts \
  tests/e2e/studio-wa-conversations-fullstack.spec.ts \
  --project=chromium --workers=1 2>&1 | tee "$REPORT_DIR/qa-percakapan-wa-playwright-wave.log"

UI_WAVE4_COVERAGE_DIR="$REPORT_DIR" PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003 \
  npx playwright test tests/e2e/ui-wave-4-admin-route-crawl.spec.ts \
  --project=chromium --workers=1 2>&1 | tee "$REPORT_DIR/qa-percakapan-wa-route-crawl.log"

echo "==> Summary pointers"
echo "middleware vitest tail: $MW_VITEST"
echo "admin vitest tail: $AD_VITEST"
echo "py pipe: $PY_PIPE"
echo "py tools: $PY_TOOLS"
echo "LOG=$LOG"

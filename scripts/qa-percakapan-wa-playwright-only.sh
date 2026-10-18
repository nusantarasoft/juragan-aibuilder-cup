#!/usr/bin/env bash
# Minimal stack for studio-wa-conversations-fullstack.spec.ts (4 tests, workers=1).
# Cloud VM: export PATH="/usr/local/bin:$PATH" DOCKER=docker PG_CONTAINER=postgres
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="/usr/local/bin:${PATH:-/usr/bin:/bin}"
export DOCKER="${DOCKER:-docker}"
export QA_DOCKER="$DOCKER"
export PG_CONTAINER="${PG_CONTAINER:-postgres}"
export POSTGRES_DB="${POSTGRES_DB:-nusantarasoft}"
REPORT_DIR="${REPORT_DIR:-/workspace/.gstack/qa-reports}"
mkdir -p "$REPORT_DIR"
LOG="$REPORT_DIR/qa-percakapan-wa-playwright-only-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG") 2>&1

COMPOSE="$DOCKER compose -f docker-compose.local.yml -f docker-compose.qa-override.yml"

echo "==> Free memory (stop app processes; keep docker if running)"
pkill -f 'qa-hermes-send-mock' 2>/dev/null || true
pkill -f 'node dist/main' 2>/dev/null || true
pkill -f 'next start' 2>/dev/null || true
pkill -f 'next-server' 2>/dev/null || true
sleep 2
echo 3 | sudo tee /proc/sys/vm/drop_caches >/dev/null || true
free -h | head -2

echo "==> Ensure dockerd (vfs) for agent VM"
if ! $DOCKER info >/dev/null 2>&1; then
  pkill dockerd 2>/dev/null || true
  sleep 2
  nohup sudo dockerd --storage-driver=vfs >/tmp/dockerd-qa.log 2>&1 &
  for i in $(seq 1 30); do $DOCKER info >/dev/null 2>&1 && break; sleep 2; done
fi

echo "==> Postgres + Auth + REST + Kong"
$DOCKER ps -q 2>/dev/null | xargs -r $DOCKER stop 2>/dev/null || true
bash scripts/qa-bootstrap-f1-4-stack.sh

echo "==> Migrations (QA postgres user)"
PG_CONTAINER="$PG_CONTAINER" DB_USER=postgres POSTGRES_DB="$POSTGRES_DB" DOCKER="$DOCKER" \
  bash scripts/master-production/apply-migrations.sh || true

echo "==> Percakapan QA seed"
$DOCKER exec -i "$PG_CONTAINER" psql -U postgres -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 \
  < supabase/qa-seeds/20261017130000_studio_wa_conversations_qa.sql

echo "==> Hermes mock :8765"
pkill -f qa-hermes-send-mock.py 2>/dev/null || true
python3 scripts/qa-hermes-send-mock.py 8765 >/tmp/qa-hermes-mock.log 2>&1 &
sleep 1

echo "==> Middleware"
cd middleware
if [ ! -f dist/main.js ]; then
  export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"
  npm run build
fi
pkill -f 'node dist/main' 2>/dev/null || true
HERMES_BRIDGE_URL=http://127.0.0.1:8765 KASIR_CONSULT_KEY=qa-test-key \
  nohup node dist/main.js > /tmp/middleware-qa.log 2>&1 &
cd ..
for i in $(seq 1 45); do
  curl -sf http://127.0.0.1:4001/graphql -H 'Content-Type: application/json' \
    -d '{"query":"query{__typename}"}' >/dev/null 2>&1 && break
  sleep 2
done

echo "==> Admin"
cd admin
if [ ! -d .next ]; then
  export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"
  npm run build
fi
pkill -f 'next start' 2>/dev/null || true
nohup npm run start > /tmp/admin-qa.log 2>&1 &
cd ..
for i in $(seq 1 45); do
  curl -sf http://127.0.0.1:3003/admin/login >/dev/null 2>&1 && break
  sleep 2
done

echo "==> Playwright: studio-wa-conversations-fullstack.spec.ts (workers=1)"
cd admin
npx playwright install chromium 2>/dev/null || true
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003 \
  GRAPHQL_URL=http://127.0.0.1:4001/graphql \
  QA_DOCKER="$DOCKER" \
  npx playwright test tests/e2e/studio-wa-conversations-fullstack.spec.ts \
  --project=chromium --workers=1

echo "==> PASS log=$LOG"

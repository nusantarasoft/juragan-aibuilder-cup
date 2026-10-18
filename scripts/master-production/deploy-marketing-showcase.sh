#!/usr/bin/env bash
# Build & restart brochure-gallery (+ optional admin) after Konten Marketing wiring.
# Run ON THE SERVER: cd /opt/nusantarasoft-3 && bash scripts/master-production/deploy-marketing-showcase.sh
#
# Builds images **serially** — `docker compose build admin brochure-gallery` in parallel
# often stalls on RAM and leaves the log looking like a failed/hung build.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$DIR"
CF="docker-compose.master-production.yml"
EF=".env.master-production"

echo "==> build brochure-gallery (serial)"
docker compose -f "$CF" --env-file "$EF" build brochure-gallery

echo "==> build admin (serial, optional UI link on Konten Marketing)"
docker compose -f "$CF" --env-file "$EF" build admin

echo "==> recreate services"
docker compose -f "$CF" --env-file "$EF" up -d --force-recreate --no-deps middleware brochure-gallery admin
docker restart nsoft3-nginx >/dev/null || true

sleep 8
curl -sf -o /dev/null -w "brochure-gallery :3014 -> %{http_code}\n" http://127.0.0.1:3014/ || true
curl -sf http://127.0.0.1:3014/api/brochures | head -c 200 || true
echo
echo "DEPLOY_MARKETING_SHOWCASE_DONE"

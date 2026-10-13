#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# redeploy.sh — run ON THE SERVER (31.97.66.39) inside /opt/nusantarasoft-3
#
#   cd /opt/nusantarasoft-3 && bash scripts/master-production/redeploy.sh
#
# Idempotent: safe for both a fresh install and an update. It (1) makes the
# entrypoints executable, (2) rebuilds the app images serially (admin needs a
# lot of RAM, so never in parallel), (3) ensures the Supabase `_supabase`
# database + schemas exist, (4) fixes auth-schema ownership, (5) brings the
# whole stack up, (6) restores Hermes kasir posture, (7) optionally prunes unused
# nsoft3 images when NSOFT3_PRUNE_IMAGES=1, (8) runs smoke-umkm.sh (non-destructive).
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$DIR"

CF="docker-compose.master-production.yml"
EF=".env.master-production"
PG="nsoft3-postgres"
DB="${POSTGRES_DB:-nusantarasoft}"
SCRIPTS="$DIR/scripts/master-production"

echo "==> [1/10] make entrypoints executable"
chmod +x volumes/api/kong-entrypoint.sh 2>/dev/null || true
chmod +x "$SCRIPTS"/*.sh 2>/dev/null || true

echo "==> [2/10] build app images (serial: middleware, landing-page, admin)"
for svc in middleware landing-page admin; do
  echo "    building $svc ..."
  docker compose -f "$CF" --env-file "$EF" build "$svc"
done

echo "==> [3/10] ensure postgres is up & healthy"
docker compose -f "$CF" --env-file "$EF" up -d postgres
for i in $(seq 1 60); do
  if docker exec "$PG" pg_isready -U postgres -h localhost >/dev/null 2>&1; then
    echo "    postgres ready"; break
  fi
  sleep 2
done

echo "==> [4/10] ensure _supabase database + schemas exist"
if ! docker exec "$PG" psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='_supabase';" | grep -q 1; then
  docker exec "$PG" psql -U postgres -c "CREATE DATABASE _supabase WITH OWNER supabase_admin;"
fi
docker exec "$PG" psql -U postgres -d _supabase -c \
  "CREATE SCHEMA IF NOT EXISTS _analytics AUTHORIZATION supabase_admin; CREATE SCHEMA IF NOT EXISTS _supavisor AUTHORIZATION supabase_admin;"

echo "==> [5/10] fix auth schema ownership (so GoTrue migrations can run)"
docker exec "$PG" psql -U postgres -d "$DB" <<'SQL'
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='auth' LOOP
    EXECUTE format('ALTER TABLE auth.%I OWNER TO supabase_auth_admin;', r.tablename);
  END LOOP;
  FOR r IN SELECT p.oid::regprocedure AS f FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='auth' LOOP
    EXECUTE format('ALTER FUNCTION %s OWNER TO supabase_auth_admin;', r.f);
  END LOOP;
  FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname='auth' LOOP
    EXECUTE format('ALTER SEQUENCE auth.%I OWNER TO supabase_auth_admin;', r.sequencename);
  END LOOP;
END $$;
ALTER SCHEMA auth OWNER TO supabase_auth_admin;
SQL

echo "==> [6/10] apply app schema migrations (idempotent)"
POSTGRES_DB="$DB" PG_CONTAINER="$PG" bash "$SCRIPTS/apply-migrations.sh"

echo "==> [7/10] bring the whole stack up"
docker compose -f "$CF" --env-file "$EF" up -d

# Nginx resolves upstream IPs at start; recreate of app containers can leave stale IPs (502).
echo "==> reload nsoft3-nginx DNS for app upstreams"
docker restart nsoft3-nginx >/dev/null

# 103 flips UMKM WhatsApp labels off Guide Flow. Must run after new middleware
# is serving (step 6 skipped it). Idempotent once tracked in schema_migrations.
echo "==> apply post-up migrations (103 UMKM unguided labels)"
POSTGRES_DB="$DB" PG_CONTAINER="$PG" APPLY_AFTER_UP=1 bash "$SCRIPTS/apply-migrations.sh"

echo "==> [8/10] Hermes kasir posture (plugins + silence + allowlist + locks)"
# Compose up may recreate hermes and drop soft config; always re-apply.
sleep 15
HERMES_HOME="$DIR/volumes/hermes" \
  python3 "$SCRIPTS/hermes-kasir-posture.py" apply --sync-plugins
# Restart so Hermes reloads config.yaml from the volume.
docker compose -f "$CF" --env-file "$EF" up -d --force-recreate --no-deps hermes
sleep 20
HERMES_HOME="$DIR/volumes/hermes" HERMES_CONTAINER=nsoft3-hermes \
  python3 "$SCRIPTS/hermes-kasir-posture.py" apply --docker --container nsoft3-hermes
# Multimodal OFF smoke (no live WA send unless SMOKE_SEND=1)
docker cp "$SCRIPTS/hermes-multimodal-smoke.py" nsoft3-hermes:/opt/data/multimodal-smoke.py
docker exec -e HERMES_HOME=/opt/data nsoft3-hermes \
  python3 /opt/data/multimodal-smoke.py off --phone "${KASIR_SMOKE_PHONE:-6287859031592}" \
  || echo "WARN multimodal OFF smoke failed (non-fatal for stack up)"

if [[ "${NSOFT3_PRUNE_IMAGES:-0}" == "1" ]]; then
  echo "==> [9/10] prune unused nsoft3 Docker images (NSOFT3_PRUNE_IMAGES=1)"
  bash "$SCRIPTS/prune-nsoft3-images.sh"
else
  echo "==> [9/10] skip image prune (set NSOFT3_PRUNE_IMAGES=1 to run prune-nsoft3-images.sh)"
fi

echo "==> [10/10] UMKM post-deploy smoke (non-destructive)"
bash "$SCRIPTS/smoke-umkm.sh"

echo
echo "==> done. current status:"
docker ps -a --filter name=nsoft3 --format '{{.Names}} | {{.Status}}' | sort

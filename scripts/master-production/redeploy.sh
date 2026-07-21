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
# whole stack up.
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$DIR"

CF="docker-compose.master-production.yml"
EF=".env.master-production"
PG="nsoft3-postgres"
DB="${POSTGRES_DB:-nusantarasoft}"

echo "==> [1/7] make entrypoints executable"
chmod +x volumes/api/kong-entrypoint.sh scripts/waha-entrypoint.sh 2>/dev/null || true

echo "==> [2/7] build app images (serial: middleware, landing-page, admin)"
for svc in middleware landing-page admin; do
  echo "    building $svc ..."
  docker compose -f "$CF" --env-file "$EF" build "$svc"
done

echo "==> [3/7] ensure postgres is up & healthy"
docker compose -f "$CF" --env-file "$EF" up -d postgres
for i in $(seq 1 60); do
  if docker exec "$PG" pg_isready -U postgres -h localhost >/dev/null 2>&1; then
    echo "    postgres ready"; break
  fi
  sleep 2
done

echo "==> [4/7] ensure _supabase database + schemas exist"
if ! docker exec "$PG" psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='_supabase';" | grep -q 1; then
  docker exec "$PG" psql -U postgres -c "CREATE DATABASE _supabase WITH OWNER supabase_admin;"
fi
docker exec "$PG" psql -U postgres -d _supabase -c \
  "CREATE SCHEMA IF NOT EXISTS _analytics AUTHORIZATION supabase_admin; CREATE SCHEMA IF NOT EXISTS _supavisor AUTHORIZATION supabase_admin;"

echo "==> [5/7] fix auth schema ownership (so GoTrue migrations can run)"
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

echo "==> [6/7] apply app schema migrations (idempotent)"
POSTGRES_DB="$DB" PG_CONTAINER="$PG" bash "$DIR/scripts/master-production/apply-migrations.sh"

echo "==> [7/7] bring the whole stack up"
docker compose -f "$CF" --env-file "$EF" up -d

echo
echo "==> done. current status:"
docker ps -a --filter name=nsoft3 --format '{{.Names}} | {{.Status}}' | sort

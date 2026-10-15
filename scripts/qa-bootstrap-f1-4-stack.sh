#!/usr/bin/env bash
# F1-4 / VO fullstack QA — Postgres + Auth + REST + Kong (no MinIO required for AOS/VO).
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE="sudo docker compose -f docker-compose.local.yml -f docker-compose.qa-override.yml"
PG=postgres
DB="${POSTGRES_DB:-nusantarasoft}"

echo "==> Postgres"
$COMPOSE up -d postgres
for i in $(seq 1 60); do
  if sudo docker exec "$PG" pg_isready -U postgres -h localhost >/dev/null 2>&1; then break; fi
  sleep 2
done

echo "==> DB fixes (_supabase, graphql_public, auth ownership)"
sudo docker exec -i "$PG" psql -U postgres -d "$DB" -v ON_ERROR_STOP=0 <<'SQL'
SELECT 'CREATE DATABASE _supabase' WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '_supabase')\gexec
SQL
sudo docker exec -i "$PG" psql -U postgres -d nusantarasoft -v ON_ERROR_STOP=0 <<'SQL'
CREATE SCHEMA IF NOT EXISTS graphql_public;
CREATE SCHEMA IF NOT EXISTS storage;
SQL
sudo docker exec -i "$PG" psql -U postgres -d "$DB" <<'SQL'
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='auth' LOOP
      EXECUTE format('ALTER TABLE auth.%I OWNER TO supabase_auth_admin;', r.tablename);
    END LOOP;
    FOR r IN SELECT p.oid::regprocedure AS f FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='auth' LOOP
      EXECUTE format('ALTER FUNCTION %s OWNER TO supabase_auth_admin;', r.f);
    END LOOP;
    FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname='auth' LOOP
      EXECUTE format('ALTER SEQUENCE auth.%I OWNER TO supabase_auth_admin;', r.sequencename);
    END LOOP;
    ALTER SCHEMA auth OWNER TO supabase_auth_admin;
  END IF;
END $$;
SQL

echo "==> Auth, REST, Kong (skip analytics dependency)"
$COMPOSE up -d --no-deps auth rest 2>/dev/null || true
sleep 5
sudo docker restart supabase-auth supabase-rest 2>/dev/null || $COMPOSE up -d --no-deps auth rest
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:8000/rest/v1/ -H "apikey: ${ANON_KEY:-x}" >/dev/null 2>&1; then break; fi
  sleep 2
done
$COMPOSE up -d --no-deps kong 2>/dev/null || sudo docker start supabase-kong

echo "==> CMS admin user"
node scripts/init-cms-admin.mjs

echo "==> Stack ready (postgres, auth, rest, kong on :8000)"

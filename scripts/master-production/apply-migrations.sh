#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# apply-migrations.sh — run ON THE SERVER inside /opt/nusantarasoft-3
#
# Applies the app schema to the running postgres container. The postgres image
# only auto-runs files directly in /docker-entrypoint-initdb.d (NOT the mounted
# `migrations/` subdir), so on a fresh volume the app schema must be applied
# explicitly. This script:
#   1. applies the active module schemas (middleware/sql/*) that later
#      migrations depend on (inv_items, etc.),
#   2. applies every supabase/migrations/*.sql (except 99900001* seeds) in
#      filename order,
#   3. tracks applied files in public.schema_migrations so it is idempotent.
#
# Seeds (99900001*) are demo data and are intentionally skipped. Apply them
# manually if wanted:  bash scripts/master-production/apply-migrations.sh --seeds
#
# 00000000000103_studio_umkm_unguided.sql is skipped unless APPLY_AFTER_UP=1
# (must run after new middleware is Up). redeploy.sh sets that after `up -d`.
# ═══════════════════════════════════════════════════════════════════════════
set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PG="${PG_CONTAINER:-nsoft3-postgres}"
DB="${POSTGRES_DB:-nusantarasoft}"
U="${DB_USER:-supabase_admin}"
HOSTDIR="$DIR/supabase/migrations"
CONTDIR="/docker-entrypoint-initdb.d/migrations"
WITH_SEEDS=0
[ "${1:-}" = "--seeds" ] && WITH_SEEDS=1

psql_q() { docker exec "$PG" psql -U "$U" -d "$DB" -tAc "$1" 2>/dev/null | tr -d '[:space:]'; }
mark()   { docker exec "$PG" psql -U "$U" -d "$DB" -q -c \
             "INSERT INTO public.schema_migrations (id) VALUES ('$1') ON CONFLICT (id) DO NOTHING;" >/dev/null; }
is_done(){ [ "$(psql_q "SELECT 1 FROM public.schema_migrations WHERE id='$1';")" = "1" ]; }

docker exec "$PG" psql -U "$U" -d "$DB" -q -c \
  "CREATE TABLE IF NOT EXISTS public.schema_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());" >/dev/null

echo "==> module schemas (middleware/sql)"
for rel in \
  middleware/sql/inventory_schema.sql \
  middleware/sql/procurement_schema.sql \
  middleware/sql/wms_putaway_pick_schema.sql \
  middleware/sql/acct_phase1.sql \
  middleware/sql/acct_phase3_apar.sql \
  middleware/sql/pm_pmbok7_8_schema.sql ; do
  is_done "$rel" && { echo "   skip $rel"; continue; }
  [ -f "$DIR/$rel" ] || { echo "   miss $rel (not present)"; continue; }
  printf '   apply %-45s ' "$rel"
  if docker exec -i "$PG" psql -U "$U" -d "$DB" -v ON_ERROR_STOP=1 -q < "$DIR/$rel" >/tmp/mig.out 2>&1; then
    mark "$rel"; echo ok
  else echo FAILED; tail -c 600 /tmp/mig.out; echo; fi
done

echo "==> supabase/migrations (non-seed)"
fails=""
for f in $(ls -1 "$HOSTDIR" | grep -E '\.sql$' | grep -v -E '^99900001' | sort); do
  id="supabase/migrations/$f"
  is_done "$id" && continue
  # 103 must wait until new middleware is Up (old router is use_guided_flow-first).
  if [ "$f" = "00000000000103_studio_umkm_unguided.sql" ] && [ "${APPLY_AFTER_UP:-}" != "1" ]; then
    echo "   skip $f (APPLY_AFTER_UP!=1 — after middleware Up)"
    continue
  fi
  printf '   apply %-58s ' "$f"
  # Prefer host file via stdin — container bind mounts can lag after git pull
  # until postgres is recreated. Fall back to in-container path if needed.
  if docker exec -i "$PG" psql -U "$U" -d "$DB" -v ON_ERROR_STOP=1 -q < "$HOSTDIR/$f" >/tmp/mig.out 2>&1; then
    mark "$id"; echo ok
  elif docker exec "$PG" test -f "$CONTDIR/$f" && \
       docker exec "$PG" psql -U "$U" -d "$DB" -v ON_ERROR_STOP=1 -q -f "$CONTDIR/$f" >/tmp/mig.out 2>&1; then
    mark "$id"; echo ok
  else echo FAILED; tail -c 400 /tmp/mig.out | tr '\n' ' '; echo; fails="$fails $f"; fi
done

if [ "$WITH_SEEDS" = "1" ]; then
  echo "==> seeds (99900001*)"
  for f in $(ls -1 "$HOSTDIR" | grep -E '^99900001.*\.sql$' | sort); do
    id="supabase/migrations/$f"
    is_done "$id" && continue
    printf '   apply %-58s ' "$f"
    if docker exec -i "$PG" psql -U "$U" -d "$DB" -v ON_ERROR_STOP=1 -q < "$HOSTDIR/$f" >/tmp/mig.out 2>&1; then
      mark "$id"; echo ok
    elif docker exec "$PG" test -f "$CONTDIR/$f" && \
         docker exec "$PG" psql -U "$U" -d "$DB" -v ON_ERROR_STOP=1 -q -f "$CONTDIR/$f" >/tmp/mig.out 2>&1; then
      mark "$id"; echo ok
    else echo FAILED; tail -c 400 /tmp/mig.out | tr '\n' ' '; echo; fails="$fails $f"; fi
  done
fi

docker exec "$PG" psql -U "$U" -d "$DB" -q -c "NOTIFY pgrst, 'reload schema';" >/dev/null 2>&1 || true
echo "==> tracked: $(psql_q 'SELECT count(*) FROM public.schema_migrations;')  |  public tables: $(psql_q "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")"
echo "==> failures:${fails:- none}"

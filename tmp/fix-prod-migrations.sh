#!/usr/bin/env bash
set -euo pipefail
cd /opt/nusantarasoft-3
PG=nsoft3-postgres
U=supabase_admin
DB=nusantarasoft

for f in \
  00000000000094_studio_notes.sql \
  00000000000095_studio_outputs_report_presets.sql \
  00000000000096_studio_outputs_flashcards.sql \
  00000000000097_studio_outputs_video_overview.sql \
  00000000000098_studio_notebook_share.sql \
  00000000000099_studio_notebook_icon_fix.sql \
  00000000000100_match_studio_chunks_source_ids.sql
do
  echo "=== apply $f ==="
  docker exec -i "$PG" psql -U "$U" -d "$DB" -v ON_ERROR_STOP=1 -q < "supabase/migrations/$f"
  docker exec "$PG" psql -U "$U" -d "$DB" -q -c \
    "INSERT INTO public.schema_migrations (id) VALUES ('supabase/migrations/$f') ON CONFLICT (id) DO NOTHING;"
  echo OK
done

docker exec "$PG" psql -U "$U" -d "$DB" -q -c "NOTIFY pgrst, 'reload schema';" || true
docker restart nsoft3-nginx >/dev/null
sleep 4
curl -s -m 10 -o /dev/null -w "admin=%{http_code} " http://127.0.0.1:3013/
curl -s -m 10 -o /dev/null -w "nginx=%{http_code} " http://127.0.0.1:8090/
curl -s -m 10 -o /dev/null -w "gql=%{http_code}\n" -H "Content-Type: application/json" --data '{"query":"{__typename}"}' http://127.0.0.1:8090/graphql
docker inspect nsoft3-middleware --format "middleware={{.State.Health.Status}}"
docker inspect nsoft3-admin --format "admin={{.State.Status}}"

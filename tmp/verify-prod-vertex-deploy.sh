#!/usr/bin/env bash
set -euo pipefail
sleep 5
curl -s -m 10 -o /dev/null -w "admin=%{http_code} " http://127.0.0.1:3013/
curl -s -m 10 -o /dev/null -w "nginx=%{http_code} " http://127.0.0.1:8090/
curl -s -m 10 -o /dev/null -w "gql=%{http_code}\n" -H "Content-Type: application/json" --data '{"query":"{__typename}"}' http://127.0.0.1:8090/graphql
docker inspect nsoft3-middleware --format "middleware={{.State.Health.Status}}"
docker inspect nsoft3-admin --format "admin={{.State.Health.Status}}"
docker exec nsoft3-postgres psql -U supabase_admin -d nusantarasoft -tAc \
  "SELECT column_name FROM information_schema.columns WHERE table_name='studio_settings' AND column_name='google_service_account_json';"
docker exec nsoft3-postgres psql -U supabase_admin -d nusantarasoft -tAc \
  "SELECT id FROM public.schema_migrations WHERE id LIKE '%00101%';"
cd /opt/nusantarasoft-3 && git rev-parse --short HEAD

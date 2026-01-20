@echo off
REM Nusantarasoft Docker - Minimal Infrastructure Pull
REM Updated: 2026-01-13
REM Full Stack: Frontend (Landing + Admin), Middleware, Backend (Supabase)

echo =======================================
echo NUSANTARASOFT - MINIMAL STACK PULL
echo =======================================
echo.
echo Stack Components:
echo   FRONTEND:   Landing Page (public) + Admin CMS
echo   MIDDLEWARE: GraphQL API Layer
echo   BACKEND:    Supabase (Database, Auth, Storage, API)
echo.

cd /d "%~dp0.."

echo [1/5] Backend - Supabase Core...
docker pull supabase/postgres:15.8.1.085
docker pull supabase/studio:2025.12.09-sha-434634f
docker pull supabase/gotrue:v2.183.0
docker pull supabase/postgres-meta:v0.93.1
docker pull supabase/logflare:1.26.25
docker pull supabase/edge-runtime:v1.69.28
docker pull supabase/realtime:v2.68.0
docker pull supabase/storage-api:v1.33.0
docker pull supabase/supavisor:2.7.4
docker pull kong:2.8.1

echo.
echo [2/5] Storage and Infrastructure...
docker pull minio/minio:latest
docker pull minio/mc:latest
docker pull darthsim/imgproxy:v3.8.0
docker pull timberio/vector:0.28.1-alpine

echo.
echo [3/5] Proxy and Management...
docker pull traefik:latest
docker pull jc21/nginx-proxy-manager:latest
docker pull portainer/portainer-ce:latest

echo.
echo [4/5] DNS and Mail...
docker pull pihole/pihole:latest
docker pull sameersbn/bind:latest
docker pull ghcr.io/docker-mailserver/docker-mailserver:latest
docker pull roundcube/roundcubemail:latest

echo.
echo [5/5] Realtime...
docker pull node:20-alpine

echo.
echo =======================================
echo MINIMAL STACK IMAGES READY!
echo =======================================
echo.
echo Next Steps:
echo   1. Build local images:
echo      docker compose -f docker-compose.minimal.yml build middleware admin landing-page
echo.
echo   2. Start minimal stack:
echo      scripts\start-minimal.bat
echo.
echo Access URLs after starting:
echo   - Landing Page:        http://localhost:3000
echo   - Admin CMS:           http://localhost:3003
echo   - GraphQL Middleware:  http://localhost:4001/graphql
echo   - Supabase Studio:     http://localhost:8000
echo   - Minio Console:       http://localhost:9001
echo   - Portainer:           http://localhost:9090
echo.
pause

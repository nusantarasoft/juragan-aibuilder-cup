@echo off
REM Nusantarasoft Docker - Minimal Infrastructure Pull
REM Updated: 2026-01-01
REM Full Stack: Frontend (Landing + Admin), Middleware, Backend (Supabase)

echo =======================================
echo NUSANTARASOFT - MINIMAL FULL STACK
echo =======================================
echo.
echo Stack Components:
echo   FRONTEND:   Landing Page (public) + Admin CMS
echo   MIDDLEWARE: GraphQL API Layer
echo   BACKEND:    Supabase (Database, Auth, Storage, API)
echo.

echo [1/6] Backend - Supabase Core...
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
docker compose pull postgres minio minio-createbucket kong auth rest realtime storage imgproxy meta functions analytics vector supavisor studio traefik nginxproxymanager portainer n8n mailserver bind9 pihole roundcube socketio socketio-admin

echo.
echo [2/6] Backend - Storage (Minio)...
REM Minio is now pulled via docker compose pull in [1/6]

echo.
echo [3/6] Infrastructure - Proxy...
REM Traefik and Nginx Proxy Manager are now pulled via docker compose pull in [1/6]

echo.
echo [4/6] Infrastructure - Management...
REM Portainer is now pulled via docker compose pull in [1/6]

echo.
echo [5/6] Middleware + Frontend (Build locally)...
echo    Middleware and Frontend are built from local Dockerfiles
echo    Run: docker compose build middleware admin landing-page

echo.
echo [6/6] Automation...
docker pull n8nio/n8n:latest

echo.
echo =======================================
echo MINIMAL FULL STACK IMAGES READY!
echo =======================================
echo.
echo Images pulled: 22 + 3 local builds
echo.
echo Run: docker compose build middleware admin landing-page
echo Then: start-minimal.bat
echo.
echo Access URLs:
echo   - Landing Page:     http://localhost:3000 (PUBLIC)
echo   - Admin CMS:        http://localhost:3003 (ADMIN)
echo   - Supabase Studio:  http://localhost:8000
echo   - Portainer:        http://localhost:9090
echo   - n8n:              http://localhost:5678
echo.
pause

@echo off
REM Nusantarasoft Docker - Start Minimal Full Stack
REM Updated: 2026-01-01
REM Full Stack: Frontend (Landing + Admin), Middleware, Backend (Supabase)

echo =======================================
echo NUSANTARASOFT - STARTING FULL STACK
echo =======================================
echo.
echo Stack:
echo   FRONTEND:   Landing Page + Admin CMS
echo   MIDDLEWARE: GraphQL API
echo   BACKEND:    Supabase + Minio
echo.

cd /d "%~dp0.."

echo Stopping any existing containers...
docker compose -f docker-compose.minimal.yml down --remove-orphans 2>nul

echo.
echo Building local images...
docker compose -f docker-compose.minimal.yml build middleware admin landing-page

echo.
echo Starting services...
docker compose -f docker-compose.minimal.yml up -d

echo.
echo =======================================
echo FULL STACK STARTED!
echo =======================================
echo.
echo ===================== ACCESS URLS =====================
echo.
echo   PUBLIC WEBSITE:
echo   ------------------------------------------------
echo   Landing Page:       http://localhost:3000
echo.
echo   ADMIN / CMS:
echo   ------------------------------------------------
echo   Admin CMS:          http://localhost:3003
echo   Supabase Studio:    http://localhost:8000
echo.
echo   REALTIME:
echo   ------------------------------------------------
echo   Socket.IO Server:   http://localhost:3002
echo   Socket.IO Admin:    http://localhost:8088
echo.
echo   MANAGEMENT:
echo   ------------------------------------------------
echo   Portainer:          http://localhost:9090
echo   Nginx Proxy Mgr:    http://localhost:8081
echo   n8n Automation:     http://localhost:5678
echo.
echo   MAIL & DNS:
echo   ------------------------------------------------
echo   Roundcube Mail:     http://localhost:8082
echo   Pi-hole DNS:        http://localhost:8053/admin
echo   Bind9 Admin:        http://localhost:10000
echo.
echo   STORAGE:
echo   ------------------------------------------------
echo   Minio Console:      http://localhost:9001
echo.
echo ========================================================
echo.
echo Commands:
echo   Stop:   docker compose stop
echo   View:   docker compose ps
echo   Logs:   docker compose logs -f [service]
echo   Build:  docker compose build [service]
echo.
pause

@echo off
REM Nusantarasoft Docker - Update All Script
REM Updated: 2026-01-01
REM Pulls latest images, rebuilds local images, restarts services

echo =======================================
echo NUSANTARASOFT - UPDATE ALL
echo =======================================
echo.

cd /d "%~dp0.."

echo [1/5] Stopping services...
docker compose down

echo.
echo [2/5] Pulling latest images...
docker compose pull

echo.
echo [3/5] Rebuilding local images (Admin, Middleware)...
docker compose build middleware admin

echo.
echo [4/5] Cleaning old images...
docker image prune -f

echo.
echo [5/5] Starting services...
docker compose up -d

echo.
echo =======================================
echo UPDATE COMPLETE!
echo =======================================
echo.

docker compose ps

echo.
pause

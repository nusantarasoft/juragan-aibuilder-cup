@echo off
REM Nusantarasoft Docker - Cleanup Script
REM Updated: 2026-01-01
REM Removes unused Docker resources to free disk space

echo =======================================
echo NUSANTARASOFT - DOCKER CLEANUP
echo =======================================
echo.

echo [1/4] Stopping all containers...
docker compose down --remove-orphans

echo.
echo [2/4] Removing unused images...
docker image prune -a -f

echo.
echo [3/4] Clearing build cache...
docker builder prune -a -f

echo.
echo [4/4] Removing stopped containers...
docker container prune -f

echo.
echo =======================================
echo CLEANUP COMPLETE!
echo =======================================
echo.

docker system df

echo.
echo To restart services: start-minimal.bat
echo.
pause

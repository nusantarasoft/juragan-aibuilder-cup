@echo off
REM Nusantarasoft Docker - Start Minimal Infrastructure
REM Starts: Mail, DNS, LDAP, Reverse Proxy, Portainer

echo =======================================
echo STARTING MINIMAL INFRASTRUCTURE STACK
echo =======================================

cd /d "%~dp0.."

echo.
echo Stopping any existing containers...
docker compose down --remove-orphans 2>nul

echo.
echo Starting services...
docker compose up -d ^
    openldap ^
    phpldapadmin ^
    nginxproxymanager ^
    traefik ^
    bind9 ^
    mailserver ^
    roundcube ^
    portainer

echo.
echo =======================================
echo MINIMAL INFRASTRUCTURE STARTED!
echo =======================================
echo.
echo Access URLs:
echo   - Portainer:        http://localhost:9090
echo   - BIND9 Webmin:     http://localhost:10000  (root / Nusantarasoft123!)
echo   - phpLDAPadmin:     http://localhost:8089
echo   - Nginx Proxy Mgr:  http://localhost:8081   (admin@example.com / changeme)
echo   - Roundcube:        http://localhost:8082
echo.
echo NOTE: To add mail users, use docker-mailserver CLI:
echo   docker exec -it mailserver setup email add user@domain.com
echo.
echo To stop: docker compose stop
echo To view: docker compose ps
echo.
pause

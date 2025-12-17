@echo off
REM Nusantarasoft Docker - Minimal Infrastructure Pull
REM Core services: Mail, DNS, LDAP, Reverse Proxy, Portainer

echo =======================================
echo Pulling MINIMAL INFRASTRUCTURE STACK
echo =======================================

echo.
echo [1/5] Core Databases...
docker pull postgres:15

echo.
echo [2/5] LDAP Directory...
docker pull osixia/openldap:latest
docker pull osixia/phpldapadmin:latest

echo.
echo [3/5] Reverse Proxy...
docker pull jc21/nginx-proxy-manager:latest
docker pull traefik:latest

echo.
echo [4/5] DNS (BIND9 with Webmin)...
docker pull sameersbn/bind:latest

echo.
echo [5/5] Email Server + Webmail...
docker pull ghcr.io/docker-mailserver/docker-mailserver:latest
docker pull roundcube/roundcubemail:latest

echo.
echo [6/6] Web Admin (Portainer)...
docker pull portainer/portainer-ce:latest

echo.
echo =======================================
echo MINIMAL INFRASTRUCTURE COMPLETE!
echo =======================================
echo.
echo Images pulled: 10
echo.
echo Web Admin URLs after startup:
echo   - Portainer:        http://localhost:9090
echo   - BIND9 Webmin:     http://localhost:10000
echo   - phpLDAPadmin:     http://localhost:8089
echo   - Nginx Proxy Mgr:  http://localhost:8081
echo   - Roundcube:        http://localhost:8082
echo.
echo Run start-minimal.bat to start these services.
echo.
pause

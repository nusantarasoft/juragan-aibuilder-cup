@echo off
REM Nusantarasoft Docker - Minimal Infrastructure Pull
REM Core services: Mail, DNS, LDAP, Reverse Proxy, Portainer

echo =======================================
echo Pulling MINIMAL INFRASTRUCTURE STACK
echo =======================================

echo.
echo [1/6] Core Databases...
docker pull mariadb:10.11
docker pull redis:7-alpine
docker pull postgres:15

echo.
echo [2/6] LDAP Directory...
docker pull osixia/openldap:latest
docker pull osixia/phpldapadmin:latest

echo.
echo [3/6] Reverse Proxy...
docker pull jc21/nginx-proxy-manager:latest
docker pull traefik:latest

echo.
echo [4/6] DNS Services (includes Webmin UI)...
docker pull pihole/pihole:latest
docker pull sameersbn/bind:latest

echo.
echo [5/6] Mailcow Email Server...
docker pull mailcow/postfix:latest
docker pull mailcow/dovecot:2.31
docker pull mailcow/sogo:latest
docker pull mailcow/rspamd:latest
docker pull mailcow/nginx:1.03
docker pull mailcow/phpfpm:latest

echo.
echo [6/6] Web Admin (Portainer)...
docker pull portainer/portainer-ce:latest

echo.
echo =======================================
echo MINIMAL INFRASTRUCTURE COMPLETE!
echo =======================================
echo.
echo Images pulled: 17
echo.
echo Web Admin URLs after startup:
echo   - Portainer:        http://localhost:9090
echo   - BIND9 Webmin:     http://localhost:10000
echo   - Pi-hole:          http://localhost:8053/admin
echo   - phpLDAPadmin:     http://localhost:8089
echo   - Nginx Proxy Mgr:  http://localhost:8081
echo   - Mailcow Admin:    http://localhost:8082
echo   - SOGo Webmail:     https://localhost:8444/SOGo
echo.
echo Run start-minimal.bat to start these services.
echo.
pause

@echo off
REM Nusantarasoft Docker - Start Minimal Infrastructure
REM Starts: Mail, DNS, LDAP, Reverse Proxy, Portainer

echo =======================================
echo STARTING MINIMAL INFRASTRUCTURE STACK
echo =======================================

cd /d "%~dp0.."

echo.
echo Starting services...
docker compose up -d ^
    openldap ^
    phpldapadmin ^
    nginxproxymanager ^
    traefik ^
    pihole ^
    bind9 ^
    mysql-mailcow ^
    redis-mailcow ^
    postfix-mailcow ^
    dovecot-mailcow ^
    sogo-mailcow ^
    rspamd-mailcow ^
    nginx-mailcow ^
    php-fpm-mailcow ^
    portainer

echo.
echo =======================================
echo MINIMAL INFRASTRUCTURE STARTED!
echo =======================================
echo.
echo Access URLs:
echo   - Portainer:        http://localhost:9090
echo   - BIND9 Webmin:     http://localhost:10000  (root / Nusantarasoft123!)
echo   - Pi-hole:          http://localhost:8053/admin
echo   - phpLDAPadmin:     http://localhost:8089
echo   - Nginx Proxy Mgr:  http://localhost:8081   (admin@example.com / changeme)
echo   - Mailcow Admin:    http://localhost:8082
echo   - SOGo Webmail:     https://localhost:8444/SOGo
echo.
echo To stop: docker compose stop
echo To view: docker compose ps
echo.
pause

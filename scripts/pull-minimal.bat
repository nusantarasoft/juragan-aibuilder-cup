@echo off
REM Nusantarasoft Docker - Minimal Infrastructure Pull
REM Core services: Mail, DNS, LDAP, Reverse Proxy, Portainer, Supabase, n8n, Dremio

echo =======================================
echo Pulling MINIMAL INFRASTRUCTURE STACK
echo =======================================

echo.
echo [1/7] Supabase PostgreSQL...
docker pull supabase/postgres:15.8.1.085

echo.
echo [2/7] Supabase Services...
docker pull supabase/studio:2025.12.09-sha-434634f
docker pull supabase/gotrue:v2.183.0
docker pull supabase/postgres-meta:v0.93.1
docker pull supabase/logflare:1.26.25
docker pull supabase/edge-runtime:v1.69.28
docker pull supabase/realtime:v2.68.0
docker pull supabase/storage-api:v1.33.0
docker pull supabase/supavisor:2.7.4
docker pull kong:2.8.1
docker pull postgrest/postgrest:v14.1
docker pull timberio/vector:0.28.1-alpine
docker pull darthsim/imgproxy:v3.8.0

echo.
echo [3/7] LDAP Directory...
docker pull osixia/openldap:latest
docker pull osixia/phpldapadmin:latest

echo.
echo [4/7] Reverse Proxy...
docker pull jc21/nginx-proxy-manager:latest
docker pull traefik:latest

echo.
echo [5/7] DNS (BIND9 with Webmin)...
docker pull sameersbn/bind:latest

echo.
echo [6/7] Email Server + Webmail...
docker pull ghcr.io/docker-mailserver/docker-mailserver:latest
docker pull roundcube/roundcubemail:latest

echo.
echo [7/9] Web Admin (Portainer)...
docker pull portainer/portainer-ce:latest

echo.
echo [8/9] Workflow Automation (n8n)...
docker pull n8nio/n8n:latest

echo.
echo [9/9] Data Lakehouse (Dremio)...
docker pull dremio/dremio-oss:latest

echo.
echo =======================================
echo MINIMAL INFRASTRUCTURE COMPLETE!
echo =======================================
echo.
echo Images pulled: 21
echo.
echo Web Admin URLs after startup:
echo   - Portainer:        http://localhost:9090
echo   - BIND9 Webmin:     http://localhost:10000
echo   - phpLDAPadmin:     http://localhost:8089
echo   - Nginx Proxy Mgr:  http://localhost:8081
echo   - Roundcube:        http://localhost:8082
echo   - Supabase Studio:  http://localhost:8000
echo   - Supabase API:     http://localhost:8000
echo   - n8n:              http://localhost:5678
echo   - Dremio:           http://localhost:9047
echo.
echo Run start-minimal.bat to start these services.
echo.
pause

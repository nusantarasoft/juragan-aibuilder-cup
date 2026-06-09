@echo off
REM Nusantarasoft Docker - Full Pull Script
REM Updated: 2026-01-01
REM Pulls all Docker images for Nusantarasoft platform

echo =======================================
echo NUSANTARASOFT - PULLING ALL IMAGES
echo =======================================
echo.

echo [1/12] Core Infrastructure...
docker pull supabase/postgres:15.8.1.085
docker pull traefik:latest
docker pull portainer/portainer-ce:latest

echo.
echo [2/12] Data Analytics (Minio, Dremio, Nessie)...
docker pull minio/minio:latest
docker pull minio/mc:latest
docker pull dremio/dremio-oss:latest
docker pull alexmerced/dremio-superset:latest
docker pull projectnessie/nessie:latest
docker pull dpage/pgadmin4:latest

echo.
echo [3/12] Supabase Services...
docker pull supabase/studio:2025.12.09-sha-434634f
docker pull kong:2.8.1
docker pull supabase/gotrue:v2.183.0
docker pull postgrest/postgrest:v14.1
docker pull supabase/realtime:v2.68.0
docker pull supabase/storage-api:v1.33.0
docker pull darthsim/imgproxy:v3.8.0
docker pull supabase/postgres-meta:v0.93.1
docker pull supabase/edge-runtime:v1.69.28
docker pull supabase/logflare:1.26.25
docker pull timberio/vector:0.28.1-alpine
docker pull supabase/supavisor:2.7.4

echo.
echo [4/12] Workflow Automation...
docker pull n8nio/n8n:latest
docker pull jenkins/jenkins:lts
docker pull node:20-alpine
docker pull quay.io/ansible/awx:latest
docker pull redis:7-alpine

echo.
echo [5/12] Infrastructure (LDAP, DNS, Proxy)...
docker pull osixia/openldap:latest
docker pull osixia/phpldapadmin:latest
docker pull jc21/nginx-proxy-manager:latest
docker pull pihole/pihole:latest
docker pull sameersbn/bind:latest

echo.
echo [6/12] Email Server...
docker pull ghcr.io/docker-mailserver/docker-mailserver:latest
docker pull roundcube/roundcubemail:latest

echo.
echo [7/12] Monitoring (Zabbix, Prometheus, Grafana)...
docker pull zabbix/zabbix-server-pgsql:latest
docker pull zabbix/zabbix-web-nginx-pgsql:latest
docker pull rancher/k3s:latest
docker pull prom/prometheus:latest
docker pull grafana/grafana:latest
docker pull grafana/loki:latest
docker pull grafana/promtail:latest

echo.
echo [8/12] Security (Keycloak, Vault, CrowdSec)...
docker pull quay.io/keycloak/keycloak:latest
docker pull hashicorp/vault:latest
docker pull crowdsecurity/crowdsec:latest

echo.
echo [9/12] Collaboration (Mattermost, Nextcloud, Jitsi)...
docker pull mattermost/mattermost-team-edition:latest
docker pull nextcloud:latest
docker pull jitsi/web:stable

echo.
echo [10/12] DevOps (Registry, SonarQube)...
REM GitLab disabled - too resource heavy
docker pull registry:2
docker pull sonarqube:community

echo.
echo [11/12] Messaging (Kafka, RabbitMQ, Hasura)...
docker pull confluentinc/cp-zookeeper:latest
docker pull confluentinc/cp-kafka:latest
docker pull provectuslabs/kafka-ui:latest
docker pull rabbitmq:3-management
docker pull hasura/graphql-engine:latest

echo.
echo [12/12] CMS Stack (Build locally)...
echo Admin and Middleware are built from local Dockerfiles
echo Run: docker compose build admin middleware

echo.
echo =======================================
echo ALL IMAGES PULLED SUCCESSFULLY!
echo =======================================
echo.
echo Total images: ~55+
echo GitLab: SKIPPED (disabled for resource savings)
echo.
echo Next: Run 'docker compose up -d' to start services
echo.
pause

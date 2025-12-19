@echo off
REM Nusantarasoft Docker - Partial Pull Script
REM Run each section separately to avoid timeouts

echo =======================================
echo Pulling Stack 1: Core Infrastructure
echo =======================================
docker pull postgres:15
docker pull postgres:latest
docker pull redis:7-alpine
docker pull mariadb:10.11
docker pull traefik:latest
docker pull portainer/portainer-ce:latest

echo =======================================
echo Pulling Stack 2: Data Analytics
echo =======================================
docker pull minio/minio:latest
docker pull minio/mc:latest
docker pull dremio/dremio-oss:latest
docker pull alexmerced/dremio-superset:latest
docker pull projectnessie/nessie:latest
docker pull dpage/pgadmin4:latest
docker pull mindsdb/mindsdb:latest
docker pull mintplexlabs/anythingllm:latest

echo =======================================
echo Pulling Stack 3: Supabase (Updated Dec 2025)
echo =======================================
docker pull supabase/postgres:latest
docker pull supabase/studio:2025.12.09-sha-434634f
docker pull kong:2.8.1
docker pull supabase/gotrue:latest
docker pull postgrest/postgrest:v14.1
docker pull supabase/realtime:v2.68.0
docker pull supabase/storage-api:v1.33.0
docker pull darthsim/imgproxy:latest
docker pull supabase/postgres-meta:latest
docker pull supabase/edge-runtime:latest
docker pull supabase/logflare:latest
docker pull timberio/vector:latest
docker pull supabase/supavisor:latest

echo =======================================
echo Pulling Stack 4: Workflow Automation
echo =======================================
docker pull n8nio/n8n:latest
docker pull jenkins/jenkins:lts
docker pull node:20-alpine

echo =======================================
echo Pulling Stack 5: Infrastructure DNS
echo =======================================
docker pull osixia/openldap:latest
docker pull osixia/phpldapadmin:latest
docker pull jc21/nginx-proxy-manager:latest
docker pull pihole/pihole:latest
docker pull sameersbn/bind:latest

echo =======================================
echo Pulling Stack 6: Mailcow
echo =======================================
docker pull mailcow/postfix:latest
docker pull mailcow/dovecot:latest
docker pull mailcow/sogo:latest
docker pull mailcow/rspamd:latest
docker pull mailcow/nginx:latest
docker pull mailcow/phpfpm:latest

echo =======================================
echo Pulling Stack 7: Monitoring
echo =======================================
docker pull zabbix/zabbix-server-pgsql:latest
docker pull zabbix/zabbix-web-nginx-pgsql:latest
docker pull rancher/k3s:latest
docker pull prom/prometheus:latest
docker pull grafana/grafana:latest
docker pull grafana/loki:latest
docker pull grafana/promtail:latest

echo =======================================
echo Pulling Stack 8: Security
echo =======================================
docker pull crowdsecurity/crowdsec:latest
docker pull hashicorp/vault:latest

echo =======================================
echo Pulling Stack 9: Collaboration
echo =======================================
docker pull mattermost/mattermost-team-edition:latest
docker pull nextcloud:latest
docker pull jitsi/web:stable

echo =======================================
echo Pulling Stack 10: DevOps
echo =======================================
docker pull gitlab/gitlab-ce:latest
docker pull sonarqube:community
docker pull registry:2

echo =======================================
echo Pulling Stack 11: Messaging
echo =======================================
docker pull confluentinc/cp-zookeeper:latest
docker pull confluentinc/cp-kafka:latest
docker pull provectuslabs/kafka-ui:latest
docker pull rabbitmq:3-management
docker pull hasura/graphql-engine:latest

echo =======================================
echo Pulling from Quay.io (requires stable connection)
echo =======================================
docker pull quay.io/keycloak/keycloak:latest
docker pull quay.io/ansible/awx:latest

echo =======================================
echo ALL PULLS COMPLETE!
echo =======================================
pause

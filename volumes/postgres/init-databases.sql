-- Initialize multiple databases for all services
-- This script runs automatically when postgres container starts for the first time

-- Create databases for each service
CREATE DATABASE awx;
CREATE DATABASE zabbix;
CREATE DATABASE keycloak;
CREATE DATABASE mattermost;
CREATE DATABASE nextcloud;
CREATE DATABASE sonarqube;
CREATE DATABASE npm;

-- Grant all privileges to the admin user on each database
-- Note: The admin user is created via POSTGRES_USER env var

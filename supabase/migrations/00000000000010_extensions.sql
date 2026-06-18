-- ============================================================================
-- Nusantarasoft PostgreSQL Extensions
-- Total: 81 extensions enabled
-- This script runs on database init
-- ============================================================================

-- ============================================================================
-- CORE SUPABASE EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgjwt;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pg_graphql;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ============================================================================
-- AI/ML & VECTOR SEARCH
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- TIME-SERIES
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- ============================================================================
-- FULL-TEXT SEARCH
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS rum;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS pgroonga;
CREATE EXTENSION IF NOT EXISTS pgroonga_database;
CREATE EXTENSION IF NOT EXISTS dict_int;
CREATE EXTENSION IF NOT EXISTS dict_xsyn;

-- ============================================================================
-- GEOSPATIAL (PostGIS Suite)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_raster;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS postgis_sfcgal;
CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;
CREATE EXTENSION IF NOT EXISTS pgrouting;
CREATE EXTENSION IF NOT EXISTS address_standardizer;
CREATE EXTENSION IF NOT EXISTS address_standardizer_data_us;

-- ============================================================================
-- HTTP & FOREIGN DATA WRAPPERS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS http;
CREATE EXTENSION IF NOT EXISTS wrappers;
CREATE EXTENSION IF NOT EXISTS dblink;
CREATE EXTENSION IF NOT EXISTS postgres_fdw;
CREATE EXTENSION IF NOT EXISTS file_fdw;

-- ============================================================================
-- DATA TYPES
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS hstore;
CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS intarray;
CREATE EXTENSION IF NOT EXISTS isn;
CREATE EXTENSION IF NOT EXISTS seg;
CREATE EXTENSION IF NOT EXISTS xml2;

-- ============================================================================
-- VALIDATION & AUDIT
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_jsonschema;
CREATE EXTENSION IF NOT EXISTS pgaudit;
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- ============================================================================
-- JAVASCRIPT & LANGUAGES
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS plv8;
CREATE EXTENSION IF NOT EXISTS plcoffee;
CREATE EXTENSION IF NOT EXISTS plls;
CREATE EXTENSION IF NOT EXISTS plpgsql_check;
CREATE EXTENSION IF NOT EXISTS pg_tle;

-- ============================================================================
-- MESSAGE QUEUE (requires schema)
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS pgmq;
CREATE EXTENSION IF NOT EXISTS pgmq SCHEMA pgmq;

-- ============================================================================
-- MONITORING & PERFORMANCE
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_stat_monitor;
CREATE EXTENSION IF NOT EXISTS pg_buffercache;
CREATE EXTENSION IF NOT EXISTS hypopg;
CREATE EXTENSION IF NOT EXISTS index_advisor;
CREATE EXTENSION IF NOT EXISTS pgstattuple;
CREATE EXTENSION IF NOT EXISTS pg_freespacemap;
CREATE EXTENSION IF NOT EXISTS pg_visibility;
CREATE EXTENSION IF NOT EXISTS pg_walinspect;
CREATE EXTENSION IF NOT EXISTS pgrowlocks;
CREATE EXTENSION IF NOT EXISTS pageinspect;
CREATE EXTENSION IF NOT EXISTS amcheck;
CREATE EXTENSION IF NOT EXISTS old_snapshot;

-- ============================================================================
-- UTILITIES
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS tablefunc;
CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_hashids;
CREATE EXTENSION IF NOT EXISTS pgtap;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS bloom;
CREATE EXTENSION IF NOT EXISTS pg_prewarm;
CREATE EXTENSION IF NOT EXISTS pg_repack;
CREATE EXTENSION IF NOT EXISTS pg_surgery;
CREATE EXTENSION IF NOT EXISTS adminpack;
CREATE EXTENSION IF NOT EXISTS sslinfo;
CREATE EXTENSION IF NOT EXISTS tcn;
CREATE EXTENSION IF NOT EXISTS tsm_system_rows;
CREATE EXTENSION IF NOT EXISTS tsm_system_time;
CREATE EXTENSION IF NOT EXISTS lo;
CREATE EXTENSION IF NOT EXISTS intagg;
CREATE EXTENSION IF NOT EXISTS refint;

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS autoinc;
CREATE EXTENSION IF NOT EXISTS insert_username;
CREATE EXTENSION IF NOT EXISTS moddatetime;

-- ============================================================================
-- SPECIAL REQUIREMENTS
-- ============================================================================
-- pg_cron: Must be created in 'postgres' database, not other databases
-- Run separately: docker exec postgres psql -U supabase_admin -d postgres -c "CREATE EXTENSION IF NOT EXISTS pg_cron;"

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '81 Nusantarasoft extensions enabled successfully';
END $$;

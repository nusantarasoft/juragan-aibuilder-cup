\set pguser `echo "$POSTGRES_USER"`

create schema if not exists _realtime;
alter schema _realtime owner to :pguser;
grant all on schema _realtime to supabase_admin;
alter default privileges in schema _realtime grant all on tables to supabase_admin;

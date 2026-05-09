SELECT relname, unnest(relacl)::text as acl_entry
FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' AND c.relkind = 'r'
AND c.relname IN ('itsm_tickets', 'itsm_service_portfolio')
ORDER BY c.relname, acl_entry;

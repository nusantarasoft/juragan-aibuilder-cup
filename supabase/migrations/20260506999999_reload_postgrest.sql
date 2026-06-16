-- Refresh PostgREST schema cache after DDL changes
NOTIFY pgrst, 'reload schema';

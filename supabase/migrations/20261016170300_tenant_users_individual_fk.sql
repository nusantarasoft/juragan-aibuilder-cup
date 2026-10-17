-- D-25: migration 50 may run before public.individuals exists, leaving tenant_users.individual_id
-- without a PostgREST-visible FK. Re-assert so embeds like tenant_users→individuals work.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'individuals'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'tenant_users'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_users_individual_id_fkey'
  ) THEN
    ALTER TABLE public.tenant_users
      ADD CONSTRAINT tenant_users_individual_id_fkey
      FOREIGN KEY (individual_id)
      REFERENCES public.individuals(id)
      ON DELETE SET NULL;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

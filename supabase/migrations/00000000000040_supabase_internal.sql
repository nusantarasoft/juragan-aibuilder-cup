-- Create Supabase internal database only once.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '_supabase') THEN
    EXECUTE 'CREATE DATABASE _supabase WITH OWNER ' || quote_ident(current_user);
  END IF;
END $$;

-- Idempotent: volumes/db/migrations/20260506_realtime_notifications.sql

DO $$ DECLARE t text; BEGIN
    FOREACH t IN ARRAY ARRAY['notifications','notification_logs','ops_runs','ops_run_steps'] LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        EXCEPTION
            WHEN duplicate_object THEN NULL;
            WHEN undefined_table THEN
                RAISE NOTICE 'Skipping realtime for missing table: %', t;
        END;
    END LOOP;
END $$;

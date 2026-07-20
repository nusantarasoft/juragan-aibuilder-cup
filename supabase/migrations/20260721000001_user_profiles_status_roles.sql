-- User management: status + restrict CMS roles to super_admin | admin
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE public.user_profiles
    ALTER COLUMN role SET DEFAULT 'admin';

UPDATE public.user_profiles
SET role = CASE
        WHEN lower(replace(replace(role, ' ', '_'), '-', '_')) IN ('super_admin', 'admin')
            THEN lower(replace(replace(role, ' ', '_'), '-', '_'))
        ELSE 'admin'
    END
WHERE role IS NULL
   OR lower(replace(replace(role, ' ', '_'), '-', '_')) NOT IN ('super_admin', 'admin');

UPDATE public.user_profiles
SET status = 'active'
WHERE status IS NULL OR status NOT IN ('active', 'inactive');

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_role_check'
    ) THEN
        ALTER TABLE public.user_profiles
            ADD CONSTRAINT user_profiles_role_check
            CHECK (role IN ('super_admin', 'admin'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_status_check'
    ) THEN
        ALTER TABLE public.user_profiles
            ADD CONSTRAINT user_profiles_status_check
            CHECK (status IN ('active', 'inactive'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON public.user_profiles(status);

NOTIFY pgrst, 'reload schema';

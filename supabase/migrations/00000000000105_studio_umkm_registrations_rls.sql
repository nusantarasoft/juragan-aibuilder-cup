-- UMKM registrations: lock down PostgREST access (CEO review D8)
-- Pipe + middleware use service_role (bypasses RLS). No anon/authenticated write.

ALTER TABLE public.studio_umkm_registrations ENABLE ROW LEVEL SECURITY;

-- Drop any accidental open policies if re-run
DROP POLICY IF EXISTS studio_umkm_registrations_all ON public.studio_umkm_registrations;
DROP POLICY IF EXISTS studio_umkm_registrations_select ON public.studio_umkm_registrations;
DROP POLICY IF EXISTS studio_umkm_registrations_anon ON public.studio_umkm_registrations;

-- No policies for anon/authenticated => denied under RLS.
-- service_role bypasses RLS (Supabase / PostgREST).

REVOKE ALL ON TABLE public.studio_umkm_registrations FROM anon;
REVOKE ALL ON TABLE public.studio_umkm_registrations FROM authenticated;

GRANT ALL ON TABLE public.studio_umkm_registrations TO service_role;
GRANT ALL ON TABLE public.studio_umkm_registrations TO authenticator;

COMMENT ON TABLE public.studio_umkm_registrations IS
    'WA self-serve UMKM signup drafts; RLS on; service_role only (Hermes pipe + middleware admin).';

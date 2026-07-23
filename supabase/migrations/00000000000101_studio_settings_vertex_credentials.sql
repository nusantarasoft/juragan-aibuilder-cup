-- AI Studio: Vertex service account JSON (stored like other provider secrets)
ALTER TABLE public.studio_settings
  ADD COLUMN IF NOT EXISTS google_service_account_json TEXT;

COMMENT ON COLUMN public.studio_settings.google_service_account_json IS
  'GCP service account JSON for Vertex AI (ADC fallback if empty). Never returned to clients.';

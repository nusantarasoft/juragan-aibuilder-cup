-- Persist MinIO bucket on notebook sources (apply via Supabase migration 20260619000003)

ALTER TABLE public.studio_notebook_sources
    ADD COLUMN IF NOT EXISTS bucket_name text;

COMMENT ON COLUMN public.studio_notebook_sources.bucket_name IS
    'MinIO/S3 bucket for s3_key (from media.bucket_name or default cms-media on upload)';

UPDATE public.studio_notebook_sources s
SET bucket_name = m.bucket_name
FROM public.media m
WHERE s.media_id = m.id
  AND s.bucket_name IS NULL
  AND m.bucket_name IS NOT NULL;

UPDATE public.studio_notebook_sources
SET bucket_name = 'cms-media'
WHERE bucket_name IS NULL
  AND media_id IS NULL
  AND s3_key IS NOT NULL;

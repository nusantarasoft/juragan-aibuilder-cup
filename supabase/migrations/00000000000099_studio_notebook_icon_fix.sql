-- Fix notebook icons that were corrupted by non-UTF8 encoding (stored as "????").
-- The column DEFAULT itself was also corrupted on some DBs, so new rows kept getting "????".

UPDATE public.studio_notebooks
SET icon = '📓'
WHERE icon IS NULL
   OR btrim(icon) = ''
   OR icon ~ '^\?+$'
   OR icon ~ E'^(\ufffd)+$';

ALTER TABLE public.studio_notebooks
    ALTER COLUMN icon SET DEFAULT '📓';

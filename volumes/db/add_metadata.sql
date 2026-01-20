-- Add metadata column to media table
-- Required for storing tags and other AI-generated metadata

ALTER TABLE public.media 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for faster JSONB searching if needed later
CREATE INDEX IF NOT EXISTS idx_media_metadata ON public.media USING gin (metadata);

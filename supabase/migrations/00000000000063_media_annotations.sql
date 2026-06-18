-- ===========================================
-- MEDIA ANNOTATIONS TABLE
-- For syncing Label Studio annotations
-- ===========================================

CREATE TABLE IF NOT EXISTS public.media_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id UUID REFERENCES public.media(id) ON DELETE CASCADE,
    ls_task_id INT NOT NULL,
    ls_project_id INT NOT NULL,
    predictions JSONB DEFAULT '[]',
    annotations JSONB DEFAULT '[]',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'annotated', 'reviewed')),
    annotated_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(media_id, ls_task_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_annotations_media_id ON public.media_annotations(media_id);
CREATE INDEX IF NOT EXISTS idx_media_annotations_status ON public.media_annotations(status);
CREATE INDEX IF NOT EXISTS idx_media_annotations_ls_task_id ON public.media_annotations(ls_task_id);

-- Enable RLS
ALTER TABLE public.media_annotations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read" ON public.media_annotations FOR SELECT USING (true);
CREATE POLICY "Allow service full access" ON public.media_annotations FOR ALL USING (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_media_annotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS media_annotations_updated_at ON public.media_annotations;
CREATE TRIGGER media_annotations_updated_at
    BEFORE UPDATE ON public.media_annotations
    FOR EACH ROW
    EXECUTE FUNCTION update_media_annotations_updated_at();

-- Studio Notes (user-authored notes within a notebook; requires studio_notebooks + studio_outputs)

CREATE TABLE IF NOT EXISTS public.studio_notes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    notebook_id uuid NOT NULL,
    user_id uuid,
    title character varying(500) NOT NULL DEFAULT 'Catatan',
    content text NOT NULL DEFAULT '',
    source_output_id uuid,
    origin character varying(30) NOT NULL DEFAULT 'manual',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT studio_notes_pkey PRIMARY KEY (id),
    CONSTRAINT studio_notes_notebook_id_fkey FOREIGN KEY (notebook_id)
        REFERENCES public.studio_notebooks(id) ON DELETE CASCADE,
    CONSTRAINT studio_notes_source_output_id_fkey FOREIGN KEY (source_output_id)
        REFERENCES public.studio_outputs(id) ON DELETE SET NULL,
    CONSTRAINT studio_notes_origin_check CHECK (origin IN ('manual', 'chat', 'output'))
);

CREATE INDEX IF NOT EXISTS idx_studio_notes_notebook
    ON public.studio_notes (notebook_id, updated_at DESC);

ALTER TABLE public.studio_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for authenticated users" ON public.studio_notes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all access for service role" ON public.studio_notes
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Studio outputs library (NotebookLM-style artifacts per notebook)
CREATE TABLE IF NOT EXISTS public.studio_outputs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    notebook_id uuid NOT NULL,
    output_type character varying(50) NOT NULL,
    title character varying(500) NOT NULL,
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT studio_outputs_pkey PRIMARY KEY (id),
    CONSTRAINT studio_outputs_notebook_id_fkey FOREIGN KEY (notebook_id)
        REFERENCES public.studio_notebooks(id) ON DELETE CASCADE,
    CONSTRAINT studio_outputs_type_check CHECK (
        output_type IN (
            'report', 'mind_map', 'quiz', 'faq', 'audio_script', 'brief', 'data_table'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_studio_outputs_notebook ON public.studio_outputs (notebook_id);
CREATE INDEX IF NOT EXISTS idx_studio_outputs_type ON public.studio_outputs (notebook_id, output_type);

ALTER TABLE public.studio_outputs ENABLE ROW LEVEL SECURITY;

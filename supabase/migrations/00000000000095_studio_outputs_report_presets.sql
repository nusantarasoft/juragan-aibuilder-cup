-- Expand studio_outputs.output_type to include NotebookLM-style report presets.

ALTER TABLE public.studio_outputs DROP CONSTRAINT IF EXISTS studio_outputs_type_check;

ALTER TABLE public.studio_outputs ADD CONSTRAINT studio_outputs_type_check CHECK (
    output_type IN (
        'report', 'mind_map', 'quiz', 'faq', 'audio_script', 'brief', 'data_table',
        'study_guide', 'briefing_doc', 'timeline', 'blog_post'
    )
);

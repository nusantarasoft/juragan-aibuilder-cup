-- Remove legacy external-RAG columns from Studio schema (internal RAG only).

ALTER TABLE IF EXISTS studio_notebooks
    DROP COLUMN IF EXISTS ragflow_dataset_id,
    DROP COLUMN IF EXISTS ragflow_chat_id;

ALTER TABLE IF EXISTS studio_notebook_sources
    DROP COLUMN IF EXISTS ragflow_doc_id;

ALTER TABLE IF EXISTS studio_conversations
    DROP COLUMN IF EXISTS ragflow_session_id;

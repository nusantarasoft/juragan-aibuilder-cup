-- Agentic OS — persisted task queue (F1-1): explicit UI demo mode flag
ALTER TABLE aos_settings
    ADD COLUMN IF NOT EXISTS ui_demo_mode BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN aos_settings.ui_demo_mode IS
    'When true, Agentic OS UI shows Demo badges for roster agents (explicit demo mode). Real DB task queue still runs.';

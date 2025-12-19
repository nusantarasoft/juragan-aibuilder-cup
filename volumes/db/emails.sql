-- Email Database Schema for Supabase
-- This migration creates tables for storing emails in PostgreSQL
-- Enables frontend email client and big data analytics

-- ============================================================================
-- EMAIL ACCOUNTS (link to mailserver accounts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.email_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- References auth.users(id) when Supabase Auth is configured
    email_address TEXT UNIQUE NOT NULL,
    display_name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- EMAILS (main email storage)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id TEXT UNIQUE,
    thread_id UUID REFERENCES public.emails(id),
    account_id UUID REFERENCES public.email_accounts(id) ON DELETE CASCADE,
    
    -- Addresses
    from_address TEXT NOT NULL,
    from_name TEXT,
    to_addresses JSONB NOT NULL DEFAULT '[]',
    cc_addresses JSONB DEFAULT '[]',
    bcc_addresses JSONB DEFAULT '[]',
    reply_to TEXT,
    
    -- Content
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    snippet TEXT, -- First 200 chars for preview
    
    -- Folder and Status
    folder TEXT DEFAULT 'INBOX',
    is_read BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    is_draft BOOLEAN DEFAULT FALSE,
    is_spam BOOLEAN DEFAULT FALSE,
    is_trash BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    received_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Analytics metadata
    labels TEXT[] DEFAULT '{}',
    raw_headers JSONB,
    size_bytes INTEGER,
    has_attachments BOOLEAN DEFAULT FALSE,
    importance TEXT DEFAULT 'normal' CHECK (importance IN ('low', 'normal', 'high'))
);

-- ============================================================================
-- EMAIL ATTACHMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.email_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID REFERENCES public.emails(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    content_type TEXT,
    size_bytes INTEGER,
    storage_path TEXT, -- Path in Supabase Storage
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR ANALYTICS AND PERFORMANCE
-- ============================================================================

-- Time-based queries (most common for analytics)
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON public.emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_sent_at ON public.emails(sent_at DESC);

-- Folder queries
CREATE INDEX IF NOT EXISTS idx_emails_folder ON public.emails(folder);
CREATE INDEX IF NOT EXISTS idx_emails_account_folder ON public.emails(account_id, folder);

-- Address queries
CREATE INDEX IF NOT EXISTS idx_emails_from ON public.emails(from_address);

-- Status queries
CREATE INDEX IF NOT EXISTS idx_emails_unread ON public.emails(account_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_emails_starred ON public.emails(account_id, is_starred) WHERE is_starred = TRUE;

-- Label queries (GIN for array search)
CREATE INDEX IF NOT EXISTS idx_emails_labels ON public.emails USING GIN(labels);

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_emails_search ON public.emails 
    USING GIN(to_tsvector('english', COALESCE(subject, '') || ' ' || COALESCE(body_text, '')));

-- Thread queries
CREATE INDEX IF NOT EXISTS idx_emails_thread ON public.emails(thread_id);

-- Attachments
CREATE INDEX IF NOT EXISTS idx_attachments_email ON public.email_attachments(email_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Update snippet from body_text
CREATE OR REPLACE FUNCTION public.update_email_snippet()
RETURNS TRIGGER AS $$
BEGIN
    NEW.snippet := LEFT(COALESCE(NEW.body_text, ''), 200);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update snippet
DROP TRIGGER IF EXISTS trigger_update_email_snippet ON public.emails;
CREATE TRIGGER trigger_update_email_snippet
    BEFORE INSERT OR UPDATE ON public.emails
    FOR EACH ROW
    EXECUTE FUNCTION public.update_email_snippet();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;

-- Email Accounts: Users can only see their own accounts
CREATE POLICY "Users can view own email accounts"
    ON public.email_accounts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email accounts"
    ON public.email_accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email accounts"
    ON public.email_accounts FOR UPDATE
    USING (auth.uid() = user_id);

-- Emails: Users can only see emails for their accounts
CREATE POLICY "Users can view own emails"
    ON public.emails FOR SELECT
    USING (
        account_id IN (
            SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own emails"
    ON public.emails FOR INSERT
    WITH CHECK (
        account_id IN (
            SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own emails"
    ON public.emails FOR UPDATE
    USING (
        account_id IN (
            SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own emails"
    ON public.emails FOR DELETE
    USING (
        account_id IN (
            SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
        )
    );

-- Attachments: Follow email permissions
CREATE POLICY "Users can view attachments of own emails"
    ON public.email_attachments FOR SELECT
    USING (
        email_id IN (
            SELECT e.id FROM public.emails e
            JOIN public.email_accounts a ON e.account_id = a.id
            WHERE a.user_id = auth.uid()
        )
    );

-- Service role bypass (for edge functions)
CREATE POLICY "Service role full access to emails"
    ON public.emails FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to email_accounts"
    ON public.email_accounts FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to attachments"
    ON public.email_attachments FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- Email statistics by account
CREATE OR REPLACE VIEW public.email_stats AS
SELECT 
    a.email_address,
    COUNT(*) as total_emails,
    COUNT(*) FILTER (WHERE e.is_read = FALSE) as unread_count,
    COUNT(*) FILTER (WHERE e.is_starred) as starred_count,
    COUNT(*) FILTER (WHERE e.folder = 'INBOX') as inbox_count,
    COUNT(*) FILTER (WHERE e.folder = 'SENT') as sent_count,
    COUNT(*) FILTER (WHERE e.is_spam) as spam_count,
    MIN(e.received_at) as first_email,
    MAX(e.received_at) as last_email
FROM public.email_accounts a
LEFT JOIN public.emails e ON a.id = e.account_id
GROUP BY a.id, a.email_address;

-- Daily email volume (for analytics dashboard)
CREATE OR REPLACE VIEW public.email_volume_daily AS
SELECT 
    DATE(received_at) as date,
    COUNT(*) as email_count,
    COUNT(*) FILTER (WHERE folder = 'INBOX') as received,
    COUNT(*) FILTER (WHERE folder = 'SENT') as sent
FROM public.emails
WHERE received_at > NOW() - INTERVAL '90 days'
GROUP BY DATE(received_at)
ORDER BY date DESC;

-- Top senders (for analytics)
CREATE OR REPLACE VIEW public.top_senders AS
SELECT 
    from_address,
    from_name,
    COUNT(*) as email_count,
    MAX(received_at) as last_email
FROM public.emails
WHERE received_at > NOW() - INTERVAL '30 days'
GROUP BY from_address, from_name
ORDER BY email_count DESC
LIMIT 50;

COMMENT ON TABLE public.emails IS 'Stores all emails for frontend access and big data analytics';
COMMENT ON TABLE public.email_accounts IS 'Links Supabase users to email addresses';
COMMENT ON TABLE public.email_attachments IS 'Email attachment metadata, files stored in Supabase Storage';

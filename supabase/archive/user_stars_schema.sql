-- Grant permissions for public schema
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- Create user_stars table
CREATE TABLE IF NOT EXISTS public.user_stars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    path TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, path)
);

-- Enable RLS
ALTER TABLE public.user_stars ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for local development)
CREATE POLICY "Public can view stars" 
ON public.user_stars FOR SELECT 
USING (true);

CREATE POLICY "Public can insert stars" 
ON public.user_stars FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public can delete stars" 
ON public.user_stars FOR DELETE 
USING (true);

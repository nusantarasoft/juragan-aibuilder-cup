-- ============================================================================
-- Chat System Schema with Supabase Realtime
-- Features: Rooms, Messages, Presence, Reactions
-- ============================================================================

-- ============================================================================
-- CHAT ROOMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'public' CHECK (type IN ('public', 'private', 'direct')),
    avatar_url TEXT,
    created_by UUID, -- logical FK to auth.users(id)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default public room
INSERT INTO chat_rooms (id, name, description, type) VALUES
    ('00000000-0000-0000-0000-000000000001', 'General', 'General discussion', 'public')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CHAT ROOM MEMBERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_room_members (
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID, -- logical FK to auth.users(id) ON DELETE CASCADE
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

-- ============================================================================
-- CHAT MESSAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID, -- logical FK to auth.users(id) ON DELETE SET NULL
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'system')),
    
    -- Optional file attachment
    file_id UUID REFERENCES files(id),
    
    -- Reply to another message
    reply_to_id UUID REFERENCES chat_messages(id),
    
    -- Edit tracking
    edited_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MESSAGE REACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID, -- logical FK to auth.users(id) ON DELETE CASCADE
    emoji TEXT NOT NULL, -- e.g., '👍', '❤️', '😂'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (message_id, user_id, emoji)
);

-- ============================================================================
-- USER PRESENCE (for online status)
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_presence (
    user_id UUID PRIMARY KEY, -- logical FK to auth.users(id) ON DELETE CASCADE
    status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS chat_messages_room_idx ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_user_idx ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS chat_room_members_user_idx ON chat_room_members(user_id);

-- ============================================================================
-- ENABLE REALTIME
-- ============================================================================
-- Enable realtime (only if publication exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_reactions;
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_presence;
  END IF;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_presence ENABLE ROW LEVEL SECURITY;

-- Public rooms are visible to all
CREATE POLICY "Anyone can view public rooms" ON chat_rooms
    FOR SELECT USING (type = 'public');

-- Presence is public
CREATE POLICY "View presence" ON chat_presence FOR SELECT USING (true);

-- Auth-dependent policies (only when auth schema exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = 'auth') THEN
    EXECUTE 'CREATE POLICY "Members can view their rooms" ON chat_rooms FOR SELECT USING (EXISTS (SELECT 1 FROM chat_room_members WHERE room_id = chat_rooms.id AND user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Users can create rooms" ON chat_rooms FOR INSERT WITH CHECK (auth.uid() = created_by)';
    EXECUTE 'CREATE POLICY "View room memberships" ON chat_room_members FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM chat_room_members m WHERE m.room_id = chat_room_members.room_id AND m.user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "Join public rooms" ON chat_room_members FOR INSERT WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM chat_rooms WHERE id = room_id AND type = ''public''))';
    EXECUTE 'CREATE POLICY "View messages in joined rooms" ON chat_messages FOR SELECT USING (EXISTS (SELECT 1 FROM chat_room_members WHERE room_id = chat_messages.room_id AND user_id = auth.uid()) OR EXISTS (SELECT 1 FROM chat_rooms WHERE id = chat_messages.room_id AND type = ''public''))';
    EXECUTE 'CREATE POLICY "Send messages to joined rooms" ON chat_messages FOR INSERT WITH CHECK (user_id = auth.uid() AND (EXISTS (SELECT 1 FROM chat_room_members WHERE room_id = chat_messages.room_id AND user_id = auth.uid()) OR EXISTS (SELECT 1 FROM chat_rooms WHERE id = chat_messages.room_id AND type = ''public'')))';
    EXECUTE 'CREATE POLICY "Manage own reactions" ON chat_reactions FOR ALL USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Manage own presence" ON chat_presence FOR ALL USING (user_id = auth.uid())';
  END IF;
END $$;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Get unread message count
CREATE OR REPLACE FUNCTION get_unread_count(p_room_id UUID, p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    last_read TIMESTAMPTZ;
    unread_count INTEGER;
BEGIN
    SELECT last_read_at INTO last_read
    FROM chat_room_members
    WHERE room_id = p_room_id AND user_id = p_user_id;
    
    SELECT COUNT(*) INTO unread_count
    FROM chat_messages
    WHERE room_id = p_room_id
        AND created_at > COALESCE(last_read, '1970-01-01')
        AND user_id != p_user_id;
    
    RETURN unread_count;
END;
$$;

-- Mark room as read
CREATE OR REPLACE FUNCTION mark_room_read(p_room_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE chat_room_members
    SET last_read_at = NOW()
    WHERE room_id = p_room_id AND user_id = auth.uid();
END;
$$;

DO $$ BEGIN RAISE NOTICE 'Chat schema created successfully'; END $$;

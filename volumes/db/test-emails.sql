-- Test email insert
INSERT INTO emails (from_address, from_name, to_addresses, subject, body_text, folder, received_at)
VALUES (
    'admin@nusantarasoft.local',
    'Admin',
    '[{"address":"anugroho@nusantarasoft.local", "name":"Anugroho"}]'::jsonb,
    'Test Email from Database',
    'Hello! This is a test email inserted directly into the Supabase database for demonstration.',
    'INBOX',
    NOW()
);

-- Add another test email
INSERT INTO emails (from_address, from_name, to_addresses, subject, body_text, folder, received_at, is_read)
VALUES (
    'support@nusantarasoft.local',
    'Support Team',
    '[{"address":"admin@nusantarasoft.local"}]'::jsonb,
    'Welcome to Nusantarasoft Email',
    'Welcome to the Nusantarasoft email system! Your email is now integrated with Supabase for analytics and frontend access.',
    'INBOX',
    NOW() - INTERVAL '1 hour',
    true
);

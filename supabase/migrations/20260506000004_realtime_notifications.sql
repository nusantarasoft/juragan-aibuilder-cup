-- Enable Supabase Realtime on notifications table for live push
-- This allows the admin frontend to subscribe to INSERT events

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Also enable for notification_logs (for delivery tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE notification_logs;

-- Enable for ops_runs (for real-time run status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE ops_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE ops_run_steps;

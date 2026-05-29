-- Seed Demo Data for Operations & Notifications modules
-- Run: cat seed.sql | docker compose exec -T postgres psql -U supabase_admin -d postgres

DO $$
DECLARE
    t_id UUID := '00000000-0000-0000-0000-000000000010';
    -- Playbook IDs
    pb_health UUID;
    pb_deploy UUID;
    pb_onboard UUID;
    pb_security UUID;
    pb_monthly UUID;
    -- Step IDs
    s1 UUID; s2 UUID; s3 UUID; s4 UUID; s5 UUID;
    -- Channel IDs
    ch_email UUID;
    ch_whatsapp UUID;
    ch_webhook UUID;
    ch_inapp UUID;
    -- Template IDs
    tpl_assign UUID;
    tpl_complete UUID;
    tpl_overdue UUID;
BEGIN

-- ═══════════════════════════════════════════════════
-- PLAYBOOKS
-- ═══════════════════════════════════════════════════

INSERT INTO ops_playbooks (id, tenant_id, name, description, category, priority, estimated_minutes, tags, created_by)
VALUES
  (gen_random_uuid(), t_id, 'Daily Server Health Check', 'Verify all production servers are healthy, check disk space, CPU, memory, and review error logs', 'maintenance', 'high', 30, ARRAY['daily','infrastructure','monitoring'], 'system')
RETURNING id INTO pb_health;

INSERT INTO ops_playbooks (id, tenant_id, name, description, category, priority, estimated_minutes, tags, created_by)
VALUES
  (gen_random_uuid(), t_id, 'Production Deployment Checklist', 'Step-by-step guide for deploying releases to production with rollback procedures', 'maintenance', 'critical', 60, ARRAY['deployment','release','devops'], 'system')
RETURNING id INTO pb_deploy;

INSERT INTO ops_playbooks (id, tenant_id, name, description, category, priority, estimated_minutes, tags, created_by)
VALUES
  (gen_random_uuid(), t_id, 'New Employee Onboarding', 'Complete onboarding workflow for new hires including account setup, access provisioning, and orientation', 'onboarding', 'medium', 120, ARRAY['hr','onboarding','new-hire'], 'system')
RETURNING id INTO pb_onboard;

INSERT INTO ops_playbooks (id, tenant_id, name, description, category, priority, estimated_minutes, tags, created_by)
VALUES
  (gen_random_uuid(), t_id, 'Weekly Security Audit', 'Review access logs, check for suspicious activity, verify firewall rules, and rotate credentials', 'security', 'high', 45, ARRAY['weekly','security','compliance'], 'system')
RETURNING id INTO pb_security;

INSERT INTO ops_playbooks (id, tenant_id, name, description, category, priority, estimated_minutes, tags, created_by)
VALUES
  (gen_random_uuid(), t_id, 'Monthly Compliance Report', 'Generate and review monthly compliance reports for data protection, audit logs, and access controls', 'compliance', 'medium', 90, ARRAY['monthly','compliance','reporting'], 'system')
RETURNING id INTO pb_monthly;

-- ═══════════════════════════════════════════════════
-- PLAYBOOK STEPS
-- ═══════════════════════════════════════════════════

-- Daily Server Health Check steps
INSERT INTO ops_playbook_steps (playbook_id, step_order, title, description, step_type, is_required, estimated_minutes) VALUES
  (pb_health, 1, 'Check CPU & Memory Usage', 'Verify CPU < 80% and Memory < 85% on all production nodes', 'check', true, 5),
  (pb_health, 2, 'Verify Disk Space', 'Ensure all volumes have > 20% free space', 'check', true, 3),
  (pb_health, 3, 'Review Error Logs', 'Check application error logs for new critical/fatal entries', 'task', true, 10),
  (pb_health, 4, 'Verify Backup Status', 'Confirm last backup completed successfully', 'check', true, 5),
  (pb_health, 5, 'Check SSL Certificates', 'Verify SSL certs are not expiring within 30 days', 'check', false, 3),
  (pb_health, 6, 'Update Status Dashboard', 'Mark health check as complete in monitoring dashboard', 'notification', true, 2);

-- Production Deployment steps
INSERT INTO ops_playbook_steps (playbook_id, step_order, title, description, step_type, is_required, estimated_minutes) VALUES
  (pb_deploy, 1, 'Pre-flight Checks', 'Verify all CI tests pass and staging is green', 'check', true, 5),
  (pb_deploy, 2, 'Notify Team of Deployment', 'Send deployment notification to #ops channel', 'notification', true, 2),
  (pb_deploy, 3, 'Create Database Backup', 'Take a snapshot of production database before deployment', 'task', true, 10),
  (pb_deploy, 4, 'Deploy to Production', 'Execute deployment script and monitor for errors', 'task', true, 15),
  (pb_deploy, 5, 'Run Smoke Tests', 'Execute post-deployment smoke test suite', 'check', true, 10),
  (pb_deploy, 6, 'Manager Approval', 'Get sign-off from engineering manager', 'approval', true, 5),
  (pb_deploy, 7, 'Update Release Notes', 'Document changes in changelog and notify stakeholders', 'task', true, 10);

-- New Employee Onboarding steps
INSERT INTO ops_playbook_steps (playbook_id, step_order, title, description, step_type, is_required, estimated_minutes) VALUES
  (pb_onboard, 1, 'Create Email & Accounts', 'Set up company email, Slack, and SSO accounts', 'task', true, 15),
  (pb_onboard, 2, 'Provision System Access', 'Grant access to required systems and tools', 'task', true, 20),
  (pb_onboard, 3, 'Assign Equipment', 'Prepare and assign laptop, monitors, and peripherals', 'task', true, 15),
  (pb_onboard, 4, 'Schedule Orientation', 'Book orientation meetings with team leads', 'task', true, 10),
  (pb_onboard, 5, 'HR Document Review', 'Verify employment documents and NDA are signed', 'approval', true, 20),
  (pb_onboard, 6, 'Welcome Package', 'Prepare welcome kit and company handbook', 'task', false, 15),
  (pb_onboard, 7, 'Day 1 Buddy Assignment', 'Assign an onboarding buddy from the team', 'task', true, 5),
  (pb_onboard, 8, 'Send Welcome Notification', 'Notify team about the new hire joining', 'notification', true, 5);

-- Weekly Security Audit steps
INSERT INTO ops_playbook_steps (playbook_id, step_order, title, description, step_type, is_required, estimated_minutes) VALUES
  (pb_security, 1, 'Review Access Logs', 'Check for unusual login patterns or failed attempts', 'task', true, 15),
  (pb_security, 2, 'Check Firewall Rules', 'Verify no unauthorized rules were added', 'check', true, 10),
  (pb_security, 3, 'Scan for Vulnerabilities', 'Run automated vulnerability scanner', 'task', true, 10),
  (pb_security, 4, 'Review User Permissions', 'Verify no privilege escalations occurred', 'task', false, 5),
  (pb_security, 5, 'Security Sign-off', 'Security officer approves the audit results', 'approval', true, 5);

-- Monthly Compliance steps
INSERT INTO ops_playbook_steps (playbook_id, step_order, title, description, step_type, is_required, estimated_minutes) VALUES
  (pb_monthly, 1, 'Export Audit Logs', 'Export all system audit logs for the month', 'task', true, 15),
  (pb_monthly, 2, 'Generate Access Report', 'Create report of all access changes', 'task', true, 15),
  (pb_monthly, 3, 'Review Data Retention', 'Verify data retention policies are followed', 'check', true, 10),
  (pb_monthly, 4, 'Compile Compliance Summary', 'Write executive summary of compliance status', 'task', true, 20),
  (pb_monthly, 5, 'Compliance Officer Review', 'Submit report for compliance officer approval', 'approval', true, 15),
  (pb_monthly, 6, 'Archive Report', 'Store approved report in compliance archive', 'task', true, 10);

-- ═══════════════════════════════════════════════════
-- SCHEDULES
-- ═══════════════════════════════════════════════════

INSERT INTO ops_schedules (tenant_id, playbook_id, name, cron_expression, timezone, is_active, created_by) VALUES
  (t_id, pb_health, 'Daily Health Check — 9 AM', '0 9 * * *', 'Asia/Jakarta', true, 'system'),
  (t_id, pb_security, 'Weekly Security Audit — Monday 10 AM', '0 10 * * 1', 'Asia/Jakarta', true, 'system'),
  (t_id, pb_monthly, 'Monthly Compliance — 1st of Month', '0 8 1 * *', 'Asia/Jakarta', true, 'system');

-- ═══════════════════════════════════════════════════
-- NOTIFICATION CHANNELS
-- ═══════════════════════════════════════════════════

INSERT INTO notification_channels (id, tenant_id, name, channel_type, config, is_active)
VALUES
  (gen_random_uuid(), t_id, 'Primary Email (SMTP)', 'email', '{"host":"smtp.gmail.com","port":587,"secure":false}', true)
RETURNING id INTO ch_email;

INSERT INTO notification_channels (id, tenant_id, name, channel_type, config, is_active)
VALUES
  (gen_random_uuid(), t_id, 'WhatsApp Gateway', 'whatsapp', '{"gateway_url":"http://waha:3000","api_key":""}', false)
RETURNING id INTO ch_whatsapp;

INSERT INTO notification_channels (id, tenant_id, name, channel_type, config, is_active)
VALUES
  (gen_random_uuid(), t_id, 'Webhook (Slack)', 'webhook', '{"url":"https://hooks.slack.com/services/xxx","method":"POST"}', true)
RETURNING id INTO ch_webhook;

INSERT INTO notification_channels (id, tenant_id, name, channel_type, config, is_active)
VALUES
  (gen_random_uuid(), t_id, 'In-App Notifications', 'in_app', '{}', true)
RETURNING id INTO ch_inapp;

-- ═══════════════════════════════════════════════════
-- NOTIFICATION TEMPLATES
-- ═══════════════════════════════════════════════════

INSERT INTO notification_templates (id, tenant_id, name, channel_type, subject, body, variables, is_active)
VALUES
  (gen_random_uuid(), t_id, 'Task Assigned', 'email', 'You have been assigned: {{task_name}}', 'Hello {{user_name}},\n\nYou have been assigned to the task "{{task_name}}" in the {{module}} module.\n\nDue: {{due_date}}\nPriority: {{priority}}\n\nPlease complete it at your earliest convenience.', ARRAY['user_name','task_name','module','due_date','priority'], true)
RETURNING id INTO tpl_assign;

INSERT INTO notification_templates (id, tenant_id, name, channel_type, subject, body, variables, is_active)
VALUES
  (gen_random_uuid(), t_id, 'Run Completed', 'in_app', NULL, '✅ {{run_name}} has been completed successfully by {{completed_by}}. Duration: {{duration}}', ARRAY['run_name','completed_by','duration'], true)
RETURNING id INTO tpl_complete;

INSERT INTO notification_templates (id, tenant_id, name, channel_type, subject, body, variables, is_active)
VALUES
  (gen_random_uuid(), t_id, 'Overdue Alert', 'email', '⚠️ Overdue: {{task_name}}', 'The following task is overdue:\n\nTask: {{task_name}}\nAssigned to: {{assignee}}\nDue: {{due_date}}\nModule: {{module}}\n\nPlease take immediate action.', ARRAY['task_name','assignee','due_date','module'], true)
RETURNING id INTO tpl_overdue;

INSERT INTO notification_templates (tenant_id, name, channel_type, subject, body, variables, is_active) VALUES
  (t_id, 'Webhook Alert', 'webhook', NULL, '{"event":"{{event}}","module":"{{module}}","message":"{{message}}","timestamp":"{{timestamp}}"}', ARRAY['event','module','message','timestamp'], true),
  (t_id, 'WhatsApp Reminder', 'whatsapp', NULL, '🔔 *{{title}}*\n{{message}}\n\n_Sent from Nusantarasoft Operations_', ARRAY['title','message'], true);

-- ═══════════════════════════════════════════════════
-- NOTIFICATION RULES
-- ═══════════════════════════════════════════════════

INSERT INTO notification_rules (tenant_id, name, module, event, channel_id, template_id, recipient_type, recipient_value, is_active) VALUES
  (t_id, 'Notify on task assignment', 'ops', 'assign', ch_email, tpl_assign, 'assignee', NULL, true),
  (t_id, 'Notify on run completion', 'ops', 'complete', ch_inapp, tpl_complete, 'creator', NULL, true),
  (t_id, 'Alert on overdue tasks', 'ops', 'overdue', ch_email, tpl_overdue, 'assignee', NULL, true),
  (t_id, 'Slack webhook on incidents', 'itsm', 'create', ch_webhook, NULL, 'webhook', NULL, true),
  (t_id, 'CRM deal closed notification', 'crm', 'status_change', ch_inapp, NULL, 'creator', NULL, true),
  (t_id, 'HR leave approval alert', 'hr', 'create', ch_email, NULL, 'role', 'manager', true);

-- ═══════════════════════════════════════════════════
-- SAMPLE NOTIFICATIONS (inbox)
-- ═══════════════════════════════════════════════════

INSERT INTO notifications (tenant_id, user_id, title, message, module, icon, is_read) VALUES
  (t_id, 'system', '🚀 Operations Module Deployed', 'The Operations module is now live with 5 playbooks and 3 schedules configured.', 'ops', '🚀', false),
  (t_id, 'system', '🔔 Notifications System Active', 'Email, WhatsApp, Webhook, and In-App channels are configured and ready.', 'notifications', '🔔', false),
  (t_id, 'system', '📊 Export Audit Dashboard', 'The Export Audit Log is now tracking all PDF and Excel exports across modules.', 'permissions', '📊', true),
  (t_id, 'system', '🔐 Dynamic Permissions Enabled', 'Export permission toggles in Profiles now control actual UI visibility.', 'permissions', '🔐', true),
  (t_id, 'system', '✅ Daily Health Check Scheduled', 'Automatic daily health checks will run at 9 AM Jakarta time.', 'ops', '✅', false);

RAISE NOTICE 'Demo data seeded successfully!';
RAISE NOTICE 'Playbooks: 5 (with 32 steps total)';
RAISE NOTICE 'Schedules: 3';
RAISE NOTICE 'Channels: 4 (email, whatsapp, webhook, in-app)';
RAISE NOTICE 'Templates: 5';
RAISE NOTICE 'Rules: 6';
RAISE NOTICE 'Notifications: 5';

END $$;

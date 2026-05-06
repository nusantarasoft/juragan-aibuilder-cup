-- ═══════════════════════════════════════════════════════════════════
-- NUSANTARASOFT 3 — Ops & Notifications Demo Seed Data
-- Populates realistic runs, run steps, notifications, and rules
-- Run: docker exec -i postgres psql -U supabase_admin -d nusantarasoft < seed_demo.sql
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tid UUID := '00000000-0000-0000-0000-000000000010';
    -- Playbook IDs
    v_pb_health UUID := 'f5af6d4b-feb9-4a7f-bcd1-b47f78c752ab';
    v_pb_deploy UUID := '11e2faeb-c232-4aa4-8467-363d99ea6675';
    v_pb_onboard UUID := 'e3324a0d-4e41-46df-b302-ab4b6ce4fb54';
    v_pb_security UUID := 'fdd67e9e-ab11-4f46-a891-c485b09e0a7f';
    v_pb_compliance UUID := '2639d90a-de6b-488a-a7d4-624bfc3e31eb';
    -- Run IDs
    v_run1 UUID; v_run2 UUID; v_run3 UUID; v_run4 UUID; v_run5 UUID;
    v_run6 UUID; v_run7 UUID; v_run8 UUID;
BEGIN
    -- ═══ RUN 1: Completed Daily Health Check (yesterday) ═══
    INSERT INTO ops_runs (tenant_id, playbook_id, name, status, started_by, started_at, completed_at, notes)
    VALUES (v_tid, v_pb_health, 'Daily Health Check — May 5', 'completed', 'admin',
            NOW() - INTERVAL '1 day 2 hours', NOW() - INTERVAL '1 day 1 hour 30 minutes',
            'All systems nominal. CPU at 42%, memory 61%.')
    RETURNING id INTO v_run1;

    INSERT INTO ops_run_steps (run_id, step_id, step_order, title, status, assignee_id, assignee_name, started_at, completed_at, completed_by, notes) VALUES
    (v_run1, '0aa77cbb-1efd-4f45-912e-b8ad18ce476c', 1, 'Check CPU & Memory Usage', 'completed', 'admin', 'Admin', NOW()-INTERVAL '1d 2h', NOW()-INTERVAL '1d 1h55m', 'admin', 'CPU 42%, RAM 61%'),
    (v_run1, '2e4315f6-2349-4df4-a322-e67501e9480b', 2, 'Verify Disk Space', 'completed', 'admin', 'Admin', NOW()-INTERVAL '1d 1h55m', NOW()-INTERVAL '1d 1h50m', 'admin', '73% used, 120GB free'),
    (v_run1, 'ef01c2aa-65e6-46e5-880f-e9742b39d5e2', 3, 'Review Error Logs', 'completed', 'admin', 'Admin', NOW()-INTERVAL '1d 1h50m', NOW()-INTERVAL '1d 1h45m', 'admin', '3 warnings, 0 errors'),
    (v_run1, 'cdf90ba4-444d-4db1-938d-714552462e40', 4, 'Verify Backup Status', 'completed', 'admin', 'Admin', NOW()-INTERVAL '1d 1h45m', NOW()-INTERVAL '1d 1h40m', 'admin', 'Last backup: 4h ago'),
    (v_run1, '5d58c35e-27a2-484d-8fb1-377eef2d025b', 5, 'Check SSL Certificates', 'completed', 'admin', 'Admin', NOW()-INTERVAL '1d 1h40m', NOW()-INTERVAL '1d 1h35m', 'admin', 'All valid, nearest expiry: 89 days'),
    (v_run1, 'ef769b2c-d9dd-4bde-87e6-5afc8a37b5cc', 6, 'Update Status Dashboard', 'completed', 'admin', 'Admin', NOW()-INTERVAL '1d 1h35m', NOW()-INTERVAL '1d 1h30m', 'admin', 'Dashboard updated');

    -- ═══ RUN 2: In-Progress Production Deployment ═══
    INSERT INTO ops_runs (tenant_id, playbook_id, name, status, started_by, started_at, due_at, notes)
    VALUES (v_tid, v_pb_deploy, 'Release v2.7.2 Deployment', 'in_progress', 'admin',
            NOW() - INTERVAL '45 minutes', NOW() + INTERVAL '2 hours',
            'Deploying v2.7.2 with Realtime notifications.')
    RETURNING id INTO v_run2;

    INSERT INTO ops_run_steps (run_id, step_id, step_order, title, status, assignee_id, assignee_name, started_at, completed_at, completed_by, notes) VALUES
    (v_run2, 'a4f943ab-d1cf-4204-818b-c431be643f59', 1, 'Pre-flight Checks', 'completed', 'admin', 'Admin', NOW()-INTERVAL '45m', NOW()-INTERVAL '40m', 'admin', 'All tests passing'),
    (v_run2, '9451065b-5b5e-4285-89de-1aed4221af63', 2, 'Notify Team of Deployment', 'completed', 'admin', 'Admin', NOW()-INTERVAL '40m', NOW()-INTERVAL '38m', 'admin', 'Slack #deployments notified'),
    (v_run2, 'b105cbbd-1bba-4e9b-9e27-8d34b5e52890', 3, 'Create Database Backup', 'completed', 'admin', 'Admin', NOW()-INTERVAL '38m', NOW()-INTERVAL '30m', 'admin', 'pg_dump completed: 842MB'),
    (v_run2, '97033247-84a9-4540-9b5b-d5498d78e11c', 4, 'Deploy to Production', 'in_progress', 'admin', 'Admin', NOW()-INTERVAL '25m', NULL, NULL, 'Docker images pulling...'),
    (v_run2, '97af8ccf-6d21-405e-80f0-6162b595e0c8', 5, 'Run Smoke Tests', 'pending', NULL, NULL, NULL, NULL, NULL, NULL),
    (v_run2, 'ef4ea4ec-372c-4cc4-b37e-238b199cdbd2', 6, 'Manager Approval', 'pending', NULL, NULL, NULL, NULL, NULL, NULL),
    (v_run2, '83b82942-f2da-468c-907f-f987597a94eb', 7, 'Update Release Notes', 'pending', NULL, NULL, NULL, NULL, NULL, NULL);

    -- ═══ RUN 3: Completed Onboarding ═══
    INSERT INTO ops_runs (tenant_id, playbook_id, name, status, started_by, started_at, completed_at, notes)
    VALUES (v_tid, v_pb_onboard, 'Onboarding: Sarah Chen', 'completed', 'hr_team',
            NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days 4 hours',
            'Backend engineer. Team: Platform.')
    RETURNING id INTO v_run3;

    INSERT INTO ops_run_steps (run_id, step_id, step_order, title, status, assignee_id, assignee_name, started_at, completed_at, completed_by) VALUES
    (v_run3, 'a8f8ffca-1875-4905-b2b9-3c0e9bf6f62d', 1, 'Create Email & Accounts', 'completed', 'it_admin', 'IT Admin', NOW()-INTERVAL '3d', NOW()-INTERVAL '2d22h', 'it_admin'),
    (v_run3, 'bdff0ecf-c1bf-4fd9-8266-a4d0ff63a24e', 2, 'Provision System Access', 'completed', 'it_admin', 'IT Admin', NOW()-INTERVAL '2d22h', NOW()-INTERVAL '2d20h', 'it_admin'),
    (v_run3, '1c8dee1c-ce72-423a-98d9-f946208e09a8', 3, 'Assign Equipment', 'completed', 'facilities', 'Facilities', NOW()-INTERVAL '2d20h', NOW()-INTERVAL '2d18h', 'facilities'),
    (v_run3, 'f691a821-256c-4c5c-8a03-e3b25152cbdc', 4, 'Schedule Orientation', 'completed', 'hr_team', 'HR Team', NOW()-INTERVAL '2d18h', NOW()-INTERVAL '2d16h', 'hr_team'),
    (v_run3, '70f559e2-c086-4986-9136-dd1f0d03106b', 5, 'HR Document Review', 'completed', 'hr_team', 'HR Team', NOW()-INTERVAL '2d16h', NOW()-INTERVAL '2d12h', 'hr_team'),
    (v_run3, 'd8467f53-e9f2-4006-96e6-1145db3b1ffa', 6, 'Welcome Package', 'completed', 'hr_team', 'HR Team', NOW()-INTERVAL '2d12h', NOW()-INTERVAL '2d8h', 'hr_team'),
    (v_run3, 'b5ff0d50-eb0f-4e24-8c79-ca76f0379024', 7, 'Day 1 Buddy Assignment', 'completed', 'hr_team', 'HR Team', NOW()-INTERVAL '2d8h', NOW()-INTERVAL '2d6h', 'hr_team'),
    (v_run3, 'd457f02f-e715-4081-917c-ef569e1471ea', 8, 'Send Welcome Notification', 'completed', 'system', 'System', NOW()-INTERVAL '2d6h', NOW()-INTERVAL '2d4h', 'system');

    -- ═══ RUN 4: Failed Security Audit ═══
    INSERT INTO ops_runs (tenant_id, playbook_id, name, status, started_by, started_at, completed_at, notes)
    VALUES (v_tid, v_pb_security, 'Security Audit — Week 18', 'failed', 'security_team',
            NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days 20 hours',
            'FAILED: 2 critical vulnerabilities found in dependency scan.')
    RETURNING id INTO v_run4;

    INSERT INTO ops_run_steps (run_id, step_id, step_order, title, status, assignee_id, assignee_name, started_at, completed_at, completed_by, notes) VALUES
    (v_run4, '90ad1d82-3483-4137-bca3-e8b2a54bdfb9', 1, 'Review Access Logs', 'completed', 'security_team', 'Security', NOW()-INTERVAL '5d', NOW()-INTERVAL '4d23h', 'security_team', 'No anomalies'),
    (v_run4, '21899488-2976-42ce-b53e-a897e5a54d38', 2, 'Check Firewall Rules', 'completed', 'security_team', 'Security', NOW()-INTERVAL '4d23h', NOW()-INTERVAL '4d22h', 'security_team', '2 unused rules removed'),
    (v_run4, '319d7edd-7dcc-40c1-9d2d-1d8b3f318b84', 3, 'Scan for Vulnerabilities', 'failed', 'security_team', 'Security', NOW()-INTERVAL '4d22h', NOW()-INTERVAL '4d21h', 'security_team', 'CVE-2026-1234 and CVE-2026-5678 found'),
    (v_run4, 'efe15a4c-9a0a-42a3-8ca0-25144feed557', 4, 'Review User Permissions', 'skipped', NULL, NULL, NULL, NULL, NULL, 'Skipped due to failure'),
    (v_run4, '7a040073-1fbb-4acf-b6f3-f838ebbf8c80', 5, 'Security Sign-off', 'skipped', NULL, NULL, NULL, NULL, NULL, 'Cannot sign off — audit failed');

    -- ═══ RUN 5: Pending Compliance Report ═══
    INSERT INTO ops_runs (tenant_id, playbook_id, name, status, started_by, started_at, due_at, notes)
    VALUES (v_tid, v_pb_compliance, 'May 2026 Compliance Report', 'pending', NULL,
            NULL, NOW() + INTERVAL '5 days',
            'Scheduled for month-end compliance review.')
    RETURNING id INTO v_run5;

    INSERT INTO ops_run_steps (run_id, step_id, step_order, title, status) VALUES
    (v_run5, '67d6f8f7-d731-4ca2-bd30-5f88dcb05099', 1, 'Export Audit Logs', 'pending'),
    (v_run5, '80991ada-07d1-45be-9e9b-d9844ba52cec', 2, 'Generate Access Report', 'pending'),
    (v_run5, 'e87bfa2f-8297-4262-a005-427d08c756e0', 3, 'Review Data Retention', 'pending'),
    (v_run5, '5cce1c3a-72be-4d51-8c76-95a94316aea4', 4, 'Compile Compliance Summary', 'pending'),
    (v_run5, '59566bed-7082-4cac-8e4d-922d2c62070c', 5, 'Compliance Officer Review', 'pending'),
    (v_run5, '724cac27-4bec-489f-a070-90347de19270', 6, 'Archive Report', 'pending');

    -- ═══ RUN 6: Completed Health Check (2 days ago) ═══
    INSERT INTO ops_runs (tenant_id, playbook_id, name, status, started_by, started_at, completed_at)
    VALUES (v_tid, v_pb_health, 'Daily Health Check — May 3', 'completed', 'admin',
            NOW() - INTERVAL '3 days 3 hours', NOW() - INTERVAL '3 days 2 hours 30 minutes')
    RETURNING id INTO v_run6;

    INSERT INTO ops_run_steps (run_id, step_id, step_order, title, status, assignee_id, assignee_name, started_at, completed_at, completed_by) VALUES
    (v_run6, '0aa77cbb-1efd-4f45-912e-b8ad18ce476c', 1, 'Check CPU & Memory Usage', 'completed', 'admin', 'Admin', NOW()-INTERVAL '3d3h', NOW()-INTERVAL '3d2h55m', 'admin'),
    (v_run6, '2e4315f6-2349-4df4-a322-e67501e9480b', 2, 'Verify Disk Space', 'completed', 'admin', 'Admin', NOW()-INTERVAL '3d2h55m', NOW()-INTERVAL '3d2h50m', 'admin'),
    (v_run6, 'ef01c2aa-65e6-46e5-880f-e9742b39d5e2', 3, 'Review Error Logs', 'completed', 'admin', 'Admin', NOW()-INTERVAL '3d2h50m', NOW()-INTERVAL '3d2h45m', 'admin'),
    (v_run6, 'cdf90ba4-444d-4db1-938d-714552462e40', 4, 'Verify Backup Status', 'completed', 'admin', 'Admin', NOW()-INTERVAL '3d2h45m', NOW()-INTERVAL '3d2h40m', 'admin'),
    (v_run6, '5d58c35e-27a2-484d-8fb1-377eef2d025b', 5, 'Check SSL Certificates', 'completed', 'admin', 'Admin', NOW()-INTERVAL '3d2h40m', NOW()-INTERVAL '3d2h35m', 'admin'),
    (v_run6, 'ef769b2c-d9dd-4bde-87e6-5afc8a37b5cc', 6, 'Update Status Dashboard', 'completed', 'admin', 'Admin', NOW()-INTERVAL '3d2h35m', NOW()-INTERVAL '3d2h30m', 'admin');

    -- ═══ RUN 7: Cancelled Onboarding ═══
    INSERT INTO ops_runs (tenant_id, playbook_id, name, status, started_by, started_at, completed_at, notes)
    VALUES (v_tid, v_pb_onboard, 'Onboarding: James Rivera (cancelled)', 'cancelled', 'hr_team',
            NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days',
            'Offer declined by candidate.')
    RETURNING id INTO v_run7;

    INSERT INTO ops_run_steps (run_id, step_id, step_order, title, status, notes) VALUES
    (v_run7, 'a8f8ffca-1875-4905-b2b9-3c0e9bf6f62d', 1, 'Create Email & Accounts', 'completed', 'Accounts created'),
    (v_run7, 'bdff0ecf-c1bf-4fd9-8266-a4d0ff63a24e', 2, 'Provision System Access', 'skipped', 'Cancelled — offer declined');

    -- ═══ RUN 8: In-Progress Security Audit (today) ═══
    INSERT INTO ops_runs (tenant_id, playbook_id, name, status, started_by, started_at, due_at)
    VALUES (v_tid, v_pb_security, 'Security Audit — Week 19', 'in_progress', 'security_team',
            NOW() - INTERVAL '2 hours', NOW() + INTERVAL '4 hours')
    RETURNING id INTO v_run8;

    INSERT INTO ops_run_steps (run_id, step_id, step_order, title, status, assignee_id, assignee_name, started_at, completed_at, completed_by) VALUES
    (v_run8, '90ad1d82-3483-4137-bca3-e8b2a54bdfb9', 1, 'Review Access Logs', 'completed', 'security_team', 'Security', NOW()-INTERVAL '2h', NOW()-INTERVAL '1h45m', 'security_team'),
    (v_run8, '21899488-2976-42ce-b53e-a897e5a54d38', 2, 'Check Firewall Rules', 'completed', 'security_team', 'Security', NOW()-INTERVAL '1h45m', NOW()-INTERVAL '1h30m', 'security_team'),
    (v_run8, '319d7edd-7dcc-40c1-9d2d-1d8b3f318b84', 3, 'Scan for Vulnerabilities', 'in_progress', 'security_team', 'Security', NOW()-INTERVAL '1h20m', NULL, NULL),
    (v_run8, 'efe15a4c-9a0a-42a3-8ca0-25144feed557', 4, 'Review User Permissions', 'pending', NULL, NULL, NULL, NULL, NULL),
    (v_run8, '7a040073-1fbb-4acf-b6f3-f838ebbf8c80', 5, 'Security Sign-off', 'pending', NULL, NULL, NULL, NULL, NULL);

    -- ═══ ADDITIONAL NOTIFICATIONS ═══
    INSERT INTO notifications (tenant_id, user_id, title, message, module, link, icon, is_read, created_at) VALUES
    (v_tid, 'system', 'Deployment Started', 'Release v2.7.2 deployment is in progress', 'ops', '/admin/ops/runs', NULL, false, NOW()-INTERVAL '45m'),
    (v_tid, 'system', 'Security Audit Failed', '2 critical CVEs found in dependency scan — Week 18', 'ops', '/admin/ops/runs', NULL, true, NOW()-INTERVAL '5d'),
    (v_tid, 'system', 'New Employee Onboarded', 'Sarah Chen has completed all onboarding steps', 'hr', '/admin/ops/history', NULL, true, NOW()-INTERVAL '2d4h'),
    (v_tid, 'system', 'Compliance Report Due', 'May 2026 compliance report due in 5 days', 'ops', '/admin/ops/runs', NULL, false, NOW()-INTERVAL '30m'),
    (v_tid, 'system', 'SSL Certificate Expiring', 'api.nusantarasoft.id SSL expires in 89 days', 'system', '/admin/ops/system-health', NULL, true, NOW()-INTERVAL '1d'),
    (v_tid, 'system', 'Backup Verified', 'Database backup verified — 842MB, integrity check passed', 'system', NULL, NULL, true, NOW()-INTERVAL '25m'),
    (v_tid, 'system', 'Schedule Created', 'Weekly Security Audit schedule activated — cron: 0 10 * * 1', 'ops', '/admin/ops/schedules', NULL, true, NOW()-INTERVAL '6d'),
    (v_tid, 'system', 'Realtime Connected', 'Supabase Realtime WebSocket notifications are now active', 'system', '/admin/notifications/preferences', NULL, false, NOW()-INTERVAL '10m');

    -- ═══ ADDITIONAL NOTIFICATION LOGS ═══
    INSERT INTO notification_logs (tenant_id, channel_type, recipient, subject, body, status, created_at) VALUES
    (v_tid, 'email', 'devops@nusantarasoft.id', 'Deployment v2.7.2 Started', 'Release v2.7.2 deployment has been initiated by admin.', 'sent', NOW()-INTERVAL '45m'),
    (v_tid, 'email', 'security@nusantarasoft.id', 'Security Audit FAILED', 'Critical vulnerabilities detected: CVE-2026-1234, CVE-2026-5678', 'sent', NOW()-INTERVAL '4d20h'),
    (v_tid, 'whatsapp', '+628123456789', 'Urgent: Security Audit Failed', 'Week 18 audit failed. Immediate action required.', 'sent', NOW()-INTERVAL '4d20h'),
    (v_tid, 'email', 'hr@nusantarasoft.id', 'Onboarding Complete: Sarah Chen', 'All 8 onboarding steps completed successfully.', 'sent', NOW()-INTERVAL '2d4h'),
    (v_tid, 'in_app', 'admin', 'Compliance Report Due', 'May 2026 report is due in 5 days.', 'sent', NOW()-INTERVAL '30m'),
    (v_tid, 'webhook', 'https://hooks.slack.com/services/T01/B02/deploy', 'Deployment Started', '{"status":"in_progress","version":"v2.7.2"}', 'sent', NOW()-INTERVAL '44m'),
    (v_tid, 'email', 'compliance@nusantarasoft.id', 'Monthly Report Reminder', 'Please submit the compliance report by May 11.', 'sent', NOW()-INTERVAL '2h'),
    (v_tid, 'whatsapp', '+628987654321', 'Backup Status', 'Daily backup completed. Size: 842MB.', 'failed', NOW()-INTERVAL '1d2h'),
    (v_tid, 'email', 'admin@nusantarasoft.id', 'SSL Expiry Warning', 'api.nusantarasoft.id SSL certificate expires in 89 days.', 'sent', NOW()-INTERVAL '1d'),
    (v_tid, 'webhook', 'https://hooks.slack.com/services/T01/B02/security', 'Security Alert', '{"severity":"critical","cve_count":2}', 'sent', NOW()-INTERVAL '4d20h');

    RAISE NOTICE 'Demo data seeded: 8 runs, 50+ run steps, 8 notifications, 10 delivery logs';
END $$;

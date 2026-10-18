-- ═══════════════════════════════════════════════════════════
-- ITSM SEED DATA — Realistic examples for all submenus
-- ═══════════════════════════════════════════════════════════

-- ─── 1. CATEGORIES (/admin/itsm/categories) ──────────────
INSERT INTO itsm_categories (id, tenant_id, name, description, icon, status) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'default', 'Hardware', 'Physical equipment issues — laptops, desktops, printers, peripherals', 'Monitor', 'active'),
  ('a0000000-0000-0000-0000-000000000002', 'default', 'Software', 'Software installation, licensing, bugs, and updates', 'Code', 'active'),
  ('a0000000-0000-0000-0000-000000000003', 'default', 'Network', 'Network connectivity, VPN, firewall, and Wi-Fi issues', 'Wifi', 'active'),
  ('a0000000-0000-0000-0000-000000000004', 'default', 'Security', 'Security incidents, access control, antivirus, and compliance', 'Shield', 'active'),
  ('a0000000-0000-0000-0000-000000000005', 'default', 'Email & Communication', 'Email, Teams, Slack, video conferencing issues', 'Mail', 'active'),
  ('a0000000-0000-0000-0000-000000000006', 'default', 'Database', 'Database performance, backups, replication, and access', 'Database', 'active'),
  ('a0000000-0000-0000-0000-000000000007', 'default', 'Cloud & Infrastructure', 'Cloud services, servers, containers, and virtualization', 'Cloud', 'active'),
  ('a0000000-0000-0000-0000-000000000008', 'default', 'Access & Identity', 'User accounts, permissions, SSO, MFA, and password reset', 'Key', 'active')
ON CONFLICT (id) DO NOTHING;

-- Sub-categories
INSERT INTO itsm_categories (id, tenant_id, name, description, parent_id, icon, status) VALUES
  ('a0000000-0000-0000-0000-000000000011', 'default', 'Laptop Issues', 'Laptop hardware problems', 'a0000000-0000-0000-0000-000000000001', 'Laptop', 'active'),
  ('a0000000-0000-0000-0000-000000000012', 'default', 'Printer Issues', 'Printer and scanner problems', 'a0000000-0000-0000-0000-000000000001', 'Printer', 'active'),
  ('a0000000-0000-0000-0000-000000000021', 'default', 'OS Issues', 'Operating system crashes and updates', 'a0000000-0000-0000-0000-000000000002', 'Monitor', 'active'),
  ('a0000000-0000-0000-0000-000000000022', 'default', 'Application Errors', 'Application crashes and bugs', 'a0000000-0000-0000-0000-000000000002', 'AlertTriangle', 'active')
ON CONFLICT (id) DO NOTHING;


-- ─── 2. SLA POLICIES (/admin/itsm/sla) ───────────────────
INSERT INTO itsm_sla_policies (id, tenant_id, name, priority, response_time_minutes, resolution_time_minutes, escalation_after_minutes, status) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'default', 'Critical SLA — P1',   'critical', 15,   240,  60,   'active'),
  ('b0000000-0000-0000-0000-000000000002', 'default', 'High SLA — P2',       'high',     30,   480,  120,  'active'),
  ('b0000000-0000-0000-0000-000000000003', 'default', 'Medium SLA — P3',     'medium',   120,  1440, 480,  'active'),
  ('b0000000-0000-0000-0000-000000000004', 'default', 'Low SLA — P4',        'low',      480,  2880, 1440, 'active')
ON CONFLICT (id) DO NOTHING;


-- ─── 3. INCIDENTS / TICKETS (/admin/itsm/tickets) ────────
INSERT INTO itsm_tickets (id, tenant_id, ticket_number, title, description, category_id, priority, status, impact, urgency, reporter_name, reporter_email, assigned_to, assigned_group, sla_policy_id, sla_response_due, sla_resolution_due, channel, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'default', 'INC-0001',
   'Email server down — all users affected',
   'The corporate email server (Exchange Online) has been down since 8:00 AM. Users cannot send or receive emails. Affecting approximately 500 employees across all departments.',
   'a0000000-0000-0000-0000-000000000005', 'critical', 'open', 'high', 'high',
   'Budi Santoso', 'budi.santoso@nusantarasoft.local', 'Ahmad Rizky', 'IT Infrastructure',
   'b0000000-0000-0000-0000-000000000001',
   NOW() + INTERVAL '15 minutes', NOW() + INTERVAL '4 hours', 'phone', NOW() - INTERVAL '30 minutes'),

  ('c0000000-0000-0000-0000-000000000002', 'default', 'INC-0002',
   'Laptop blue screen on login',
   'Dell Latitude 5540 shows BSOD (DRIVER_IRQL_NOT_LESS_OR_EQUAL) every time user attempts to log in. Started after Windows update KB5034441 was installed yesterday.',
   'a0000000-0000-0000-0000-000000000011', 'high', 'in_progress', 'medium', 'high',
   'Siti Rahayu', 'siti.rahayu@nusantarasoft.local', 'Dimas Prayoga', 'Desktop Support',
   'b0000000-0000-0000-0000-000000000002',
   NOW() + INTERVAL '30 minutes', NOW() + INTERVAL '8 hours', 'portal', NOW() - INTERVAL '2 hours'),

  ('c0000000-0000-0000-0000-000000000003', 'default', 'INC-0003',
   'VPN connection drops intermittently',
   'Cisco AnyConnect VPN keeps disconnecting every 10-15 minutes when working from home. Error: "Connection attempt has failed." Tried reinstalling but issue persists.',
   'a0000000-0000-0000-0000-000000000003', 'medium', 'new', 'medium', 'medium',
   'Andi Wijaya', 'andi.wijaya@nusantarasoft.local', NULL, 'Network Team',
   'b0000000-0000-0000-0000-000000000003',
   NOW() + INTERVAL '2 hours', NOW() + INTERVAL '24 hours', 'email', NOW() - INTERVAL '1 hour'),

  ('c0000000-0000-0000-0000-000000000004', 'default', 'INC-0004',
   'SAP cannot generate financial report',
   'When running the monthly financial report (transaction FBL3N), SAP throws error "DBIF_RSQL_SQL_ERROR". Report has been working fine until this morning. Month-end closing is due tomorrow.',
   'a0000000-0000-0000-0000-000000000022', 'high', 'pending', 'high', 'high',
   'Dewi Lestari', 'dewi.lestari@nusantarasoft.local', 'Reza Firmansyah', 'Application Support',
   'b0000000-0000-0000-0000-000000000002',
   NOW() + INTERVAL '30 minutes', NOW() + INTERVAL '8 hours', 'portal', NOW() - INTERVAL '3 hours'),

  ('c0000000-0000-0000-0000-000000000005', 'default', 'INC-0005',
   'Printer paper jam on 3rd floor',
   'HP LaserJet Pro MFP M428fdw on the 3rd floor keeps jamming. Paper tray 2 seems to be misaligned. Users have tried clearing the jam but it recurs every few pages.',
   'a0000000-0000-0000-0000-000000000012', 'low', 'resolved', 'low', 'low',
   'Fajar Nugroho', 'fajar.nugroho@nusantarasoft.local', 'Yusuf Hakim', 'Desktop Support',
   'b0000000-0000-0000-0000-000000000004',
   NOW() - INTERVAL '6 hours', NOW() + INTERVAL '42 hours', 'portal', NOW() - INTERVAL '1 day'),

  ('c0000000-0000-0000-0000-000000000006', 'default', 'INC-0006',
   'Suspicious login attempts detected',
   'Security monitoring detected 50+ failed login attempts from IP 203.45.67.89 targeting the admin account within 10 minutes. Possible brute force attack in progress.',
   'a0000000-0000-0000-0000-000000000004', 'critical', 'in_progress', 'high', 'high',
   'Security Bot', 'secops@nusantarasoft.local', 'Ahmad Rizky', 'Security Operations',
   'b0000000-0000-0000-0000-000000000001',
   NOW() + INTERVAL '15 minutes', NOW() + INTERVAL '4 hours', 'monitoring', NOW() - INTERVAL '15 minutes')
ON CONFLICT (id) DO NOTHING;


-- ─── 3b. TICKET COMMENTS ─────────────────────────────────
INSERT INTO itsm_ticket_comments (ticket_id, author, content, is_internal) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Ahmad Rizky', 'Investigating the Exchange server. Initial check shows the mail transport service is stopped. Attempting restart.', false),
  ('c0000000-0000-0000-0000-000000000001', 'Ahmad Rizky', 'Service restart failed. Checking event logs for root cause. May need to escalate to Microsoft support.', true),
  ('c0000000-0000-0000-0000-000000000002', 'Dimas Prayoga', 'Booted into Safe Mode successfully. Uninstalled KB5034441. Testing normal boot now.', false),
  ('c0000000-0000-0000-0000-000000000004', 'Reza Firmansyah', 'SAP team confirmed database tablespace is 98% full. Waiting for DBA team to extend tablespace.', false),
  ('c0000000-0000-0000-0000-000000000005', 'Yusuf Hakim', 'Replaced paper tray 2 roller assembly. Printer is working fine now. Ran 50 test pages with no jams.', false),
  ('c0000000-0000-0000-0000-000000000006', 'Ahmad Rizky', 'Blocked IP 203.45.67.89 on the firewall. Reviewing affected account for any successful unauthorized access.', false);


-- ─── 4. SERVICE PORTFOLIO (/admin/itsm/portfolio) ────────
INSERT INTO itsm_service_portfolio (id, tenant_id, service_code, name, description, business_owner, technical_owner, lifecycle_status, service_type, criticality, cost_center, budget_allocated, sla_target, dependencies, risks, notes, published_to_catalog) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'default', 'SVC-0001',
   'Corporate Email Service',
   'Enterprise email service based on Microsoft Exchange Online. Provides email, calendar, contacts, and shared mailboxes for all employees. Includes 50GB mailbox per user, email archiving, and advanced threat protection.',
   'HR Department', 'IT Infrastructure Team', 'active', 'business', 'critical',
   'IT-001', 250000, '99.9% uptime', 'Azure AD, Internet connectivity, DNS', 'Single vendor dependency on Microsoft', 'Renewal date: December 2026', true),

  ('d0000000-0000-0000-0000-000000000002', 'default', 'SVC-0002',
   'VPN Remote Access',
   'Secure remote access VPN service using Cisco AnyConnect. Enables employees to securely connect to corporate network from any location. Supports split-tunnel and full-tunnel modes.',
   'Operations', 'Network Team', 'active', 'technical', 'high',
   'IT-002', 80000, '99.5% uptime', 'Firewall, AD authentication, Internet', 'VPN concentrator is single point of failure', 'Planning to add redundant node in Q3', true),

  ('d0000000-0000-0000-0000-000000000003', 'default', 'SVC-0003',
   'Cloud Backup Service',
   'Automated daily backup service for all corporate data including file shares, databases (PostgreSQL & SQL Server), and virtual machines. Uses AWS S3 with 30-day retention and cross-region replication.',
   'Finance Department', 'IT Infrastructure Team', 'active', 'technical', 'critical',
   'IT-003', 120000, 'RPO: 24h, RTO: 4h', 'AWS S3, Network connectivity, Storage', 'Data loss if backup fails silently', 'Last DR test: March 2026 — passed', false),

  ('d0000000-0000-0000-0000-000000000004', 'default', 'SVC-0004',
   'Employee Onboarding IT Setup',
   'End-to-end IT provisioning for new employees. Includes laptop setup, AD account creation, email provisioning, software installation, security training enrollment, and access badge configuration.',
   'HR Department', 'Desktop Support', 'active', 'business', 'medium',
   'HR-001', 45000, 'Complete within 2 business days', 'AD, Email, Asset Management', 'Delays if hardware not in stock', 'Average 15 new hires per month', true),

  ('d0000000-0000-0000-0000-000000000005', 'default', 'SVC-0005',
   'AI/ML Platform',
   'Internal AI/ML platform based on MindsDB for business intelligence and predictive analytics. Provides model training, inference APIs, and integration with existing data sources.',
   'Data Science Team', 'IT Infrastructure Team', 'pipeline', 'business', 'medium',
   'IT-005', 200000, '99% uptime', 'MindsDB, PostgreSQL, GPU servers', 'High compute costs, model accuracy variability', 'Pilot phase with 3 use cases', false)
ON CONFLICT (id) DO NOTHING;


-- ─── 5. SERVICE CATALOG (/admin/itsm/catalog) ────────────
INSERT INTO itsm_service_catalog (id, tenant_id, portfolio_service_id, catalog_code, name, short_description, description, category_id, icon, estimated_delivery, cost, approval_required, approval_type, fulfillment_group, status, request_count, form_fields) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'default', 'd0000000-0000-0000-0000-000000000001', 'CAT-0001',
   'New Email Account',
   'Request a new corporate email account for an employee',
   'Creates a new Microsoft Exchange Online mailbox with standard 50GB storage. Includes calendar, contacts, and Teams integration. Account will follow naming convention: firstname.lastname@nusantarasoft.local',
   'a0000000-0000-0000-0000-000000000005', 'Mail', '4 hours', 'Free (included)',
   false, 'simple', 'IT Infrastructure', 'active', 23,
   '[{"name":"employeeName","label":"Employee Name","type":"text","required":true},{"name":"department","label":"Department","type":"select","options":["HR","Finance","Engineering","Sales","Operations"],"required":true},{"name":"startDate","label":"Start Date","type":"date","required":true}]'),

  ('e0000000-0000-0000-0000-000000000002', 'default', 'd0000000-0000-0000-0000-000000000002', 'CAT-0002',
   'VPN Access Request',
   'Request VPN access for remote work',
   'Grants Cisco AnyConnect VPN access for secure remote connectivity. Requires manager approval. Access will be configured based on user role and department access policies.',
   'a0000000-0000-0000-0000-000000000003', 'Shield', '1 business day', 'Free (included)',
   true, 'manager', 'Network Team', 'active', 45,
   '[{"name":"reason","label":"Business Justification","type":"textarea","required":true},{"name":"duration","label":"Access Duration","type":"select","options":["1 month","3 months","6 months","Permanent"],"required":true}]'),

  ('e0000000-0000-0000-0000-000000000003', 'default', 'd0000000-0000-0000-0000-000000000004', 'CAT-0003',
   'New Laptop Request',
   'Request a new laptop for a new or existing employee',
   'Standard issue laptop: Dell Latitude 5550 (i7, 16GB RAM, 512GB SSD). For special requirements (developer/design workstations), please specify in the notes. Includes standard software package installation.',
   'a0000000-0000-0000-0000-000000000001', 'Laptop', '3-5 business days', 'Rp 18,500,000',
   true, 'multi_level', 'Desktop Support', 'active', 12,
   '[{"name":"employeeName","label":"Employee Name","type":"text","required":true},{"name":"laptopType","label":"Laptop Type","type":"select","options":["Standard","Developer","Design","Executive"],"required":true},{"name":"justification","label":"Justification","type":"textarea","required":true}]'),

  ('e0000000-0000-0000-0000-000000000004', 'default', NULL, 'CAT-0004',
   'Password Reset',
   'Request a password reset for your corporate account',
   'Resets your Active Directory password. You will receive a temporary password via SMS to your registered mobile number. You must change it upon first login.',
   'a0000000-0000-0000-0000-000000000008', 'Key', '15 minutes', 'Free',
   false, 'simple', 'Service Desk', 'active', 156,
   '[{"name":"accountType","label":"Account Type","type":"select","options":["AD/Windows","Email","VPN","SAP","CRM"],"required":true},{"name":"mobileNumber","label":"Mobile Number","type":"text","required":true}]'),

  ('e0000000-0000-0000-0000-000000000005', 'default', NULL, 'CAT-0005',
   'Software Installation Request',
   'Request software installation or license activation',
   'Request installation of approved software on your workstation. For software not on the approved list, additional approval from IT Security is required. Includes license procurement if needed.',
   'a0000000-0000-0000-0000-000000000002', 'Code', '1-2 business days', 'Varies by software',
   true, 'manager', 'Desktop Support', 'active', 34,
   '[{"name":"softwareName","label":"Software Name","type":"text","required":true},{"name":"version","label":"Version","type":"text","required":false},{"name":"justification","label":"Business Justification","type":"textarea","required":true},{"name":"existingLicense","label":"Do you have a license?","type":"select","options":["Yes","No - need to purchase"],"required":true}]'),

  ('e0000000-0000-0000-0000-000000000006', 'default', NULL, 'CAT-0006',
   'Database Access Request',
   'Request read/write access to a database',
   'Grants access to specified database with appropriate permission level. All access is logged and audited. Production database write access requires VP-level approval.',
   'a0000000-0000-0000-0000-000000000006', 'Database', '1 business day', 'Free',
   true, 'multi_level', 'Database Administration', 'active', 8,
   '[{"name":"databaseName","label":"Database Name","type":"text","required":true},{"name":"accessLevel","label":"Access Level","type":"select","options":["Read Only","Read/Write","Admin"],"required":true},{"name":"environment","label":"Environment","type":"select","options":["Development","Staging","Production"],"required":true},{"name":"justification","label":"Justification","type":"textarea","required":true}]')
ON CONFLICT (id) DO NOTHING;


-- ─── 6. SERVICE REQUESTS (/admin/itsm/requests) ──────────
INSERT INTO itsm_service_requests (id, tenant_id, request_number, title, description, catalog_item_id, category_id, priority, status, requested_for, requester_name, requester_email, fulfillment_group, notes, created_at) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'default', 'SR-0001',
   'New laptop for Putri Handayani — Marketing',
   'New hire starting April 21. Needs standard marketing laptop with Adobe Creative Suite.',
   'e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'medium', 'approved',
   'Putri Handayani', 'HR Admin', 'hr.admin@nusantarasoft.local', 'Desktop Support',
   'Manager approved. Design-type laptop requested due to marketing design work.', NOW() - INTERVAL '2 days'),

  ('f0000000-0000-0000-0000-000000000002', 'default', 'SR-0002',
   'VPN access for Agus Suryanto — Remote work',
   'Employee relocating to Surabaya branch. Needs permanent VPN access for daily work.',
   'e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'low', 'in_fulfillment',
   'Agus Suryanto', 'Agus Suryanto', 'agus.suryanto@nusantarasoft.local', 'Network Team',
   'Approved by line manager. Setting up VPN profile.', NOW() - INTERVAL '1 day'),

  ('f0000000-0000-0000-0000-000000000003', 'default', 'SR-0003',
   'Password reset — Cannot access SAP',
   'Locked out of SAP after 3 failed attempts. Need password reset urgently for month-end closing.',
   'e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000008', 'high', 'fulfilled',
   'Dewi Lestari', 'Dewi Lestari', 'dewi.lestari@nusantarasoft.local', 'Service Desk',
   'Password reset completed. Temp password sent via SMS.', NOW() - INTERVAL '3 hours'),

  ('f0000000-0000-0000-0000-000000000004', 'default', 'SR-0004',
   'Install Visual Studio Code — Engineering team',
   'Need VS Code with Python and Docker extensions for new microservices project.',
   'e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'low', 'submitted',
   'Reza Firmansyah', 'Reza Firmansyah', 'reza@nusantarasoft.local', 'Desktop Support',
   NULL, NOW() - INTERVAL '6 hours'),

  ('f0000000-0000-0000-0000-000000000005', 'default', 'SR-0005',
   'Production database read access — analytics project',
   'Need read-only access to nusantarasoft production DB for quarterly dashboard report.',
   'e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006', 'medium', 'submitted',
   'Data Analytics Team', 'Ika Permata', 'ika.permata@nusantarasoft.local', 'Database Administration',
   'VP approval pending.', NOW() - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;


-- ─── 7. PROBLEMS (/admin/itsm/problems) ──────────────────
INSERT INTO itsm_problems (id, tenant_id, problem_number, title, description, category_id, priority, status, impact, root_cause, workaround, is_known_error, assigned_to, assigned_group, reporter_name, reporter_email, created_at) VALUES
  ('10000000-0000-0000-0000-000000000001', 'default', 'PRB-0001',
   'Recurring Exchange Online service degradation',
   'Email delivery delays of 15-30 minutes occurring every Tuesday and Thursday between 9-11 AM. Pattern has been observed for 3 consecutive weeks. Affects approximately 200 users in Jakarta office.',
   'a0000000-0000-0000-0000-000000000005', 'high', 'investigating', 'high',
   NULL, 'Users can use Teams chat as temporary communication alternative',
   false, 'Ahmad Rizky', 'IT Infrastructure', 'Ahmad Rizky', 'ahmad.rizky@nusantarasoft.local',
   NOW() - INTERVAL '2 weeks'),

  ('10000000-0000-0000-0000-000000000002', 'default', 'PRB-0002',
   'Windows BSOD after KB5034441 update',
   'Multiple users (8 reported so far) experiencing Blue Screen of Death after installing Windows update KB5034441. All affected machines are Dell Latitude 5540 with Intel 13th gen processors.',
   'a0000000-0000-0000-0000-000000000021', 'high', 'root_cause_identified', 'medium',
   'Incompatible Intel graphics driver v31.0.101.4091 with the KB5034441 update. Microsoft acknowledged the issue.',
   'Boot into Safe Mode, uninstall KB5034441, block update via WSUS until Microsoft releases fix.',
   true, 'Dimas Prayoga', 'Desktop Support', 'Dimas Prayoga', 'dimas@nusantarasoft.local',
   NOW() - INTERVAL '5 days'),

  ('10000000-0000-0000-0000-000000000003', 'default', 'PRB-0003',
   'SAP performance degradation during month-end',
   'SAP system response time increases 5x during the last 3 days of every month. Financial reports that normally take 2 minutes take 10+ minutes. Database tablespace regularly reaches 95%+.',
   'a0000000-0000-0000-0000-000000000006', 'medium', 'new', 'high',
   NULL, 'Schedule heavy reports for off-peak hours (before 7 AM or after 7 PM)',
   false, 'Reza Firmansyah', 'Application Support', 'Dewi Lestari', 'dewi@nusantarasoft.local',
   NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- Link problems to incidents
INSERT INTO itsm_problem_incidents (problem_id, incident_id) VALUES
  ('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004')
ON CONFLICT DO NOTHING;


-- ─── 8. CHANGE REQUESTS (/admin/itsm/changes) ────────────
INSERT INTO itsm_changes (id, tenant_id, change_number, title, description, category_id, change_type, priority, risk_level, status, impact, implementation_plan, rollback_plan, test_plan, scheduled_start, scheduled_end, cab_required, cab_decision, cab_notes, cab_date, requested_by, assigned_to, assigned_group, related_problem_id, created_at) VALUES
  ('20000000-0000-0000-0000-000000000001', 'default', 'CHG-0001',
   'Upgrade PostgreSQL from 15.8 to 16.2',
   'Upgrade the main PostgreSQL database server from version 15.8 to 16.2 for improved performance, security patches, and new features including logical replication improvements.',
   'a0000000-0000-0000-0000-000000000006', 'normal', 'high', 'medium', 'approved',
   'high',
   '1. Take full database backup\n2. Notify all users of 2-hour maintenance window\n3. Stop application services\n4. Run pg_upgrade with --link option\n5. Run ANALYZE on all databases\n6. Start application services\n7. Verify all connections and functionality',
   '1. Stop PostgreSQL 16.2\n2. Restore pg_hba.conf and postgresql.conf from backup\n3. Start PostgreSQL 15.8\n4. Verify connections\n5. Notify users of rollback',
   '1. Run pgbench before and after upgrade\n2. Test all Supabase services connectivity\n3. Run application integration tests\n4. Verify backup/restore functionality\n5. Test replication status',
   NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days' + INTERVAL '2 hours',
   true, 'approved', 'CAB approved with condition: must have DBA on standby during upgrade window', NOW() - INTERVAL '1 day',
   'Ahmad Rizky', 'Ahmad Rizky', 'IT Infrastructure', NULL,
   NOW() - INTERVAL '5 days'),

  ('20000000-0000-0000-0000-000000000002', 'default', 'CHG-0002',
   'Deploy new firewall rules for remote access',
   'Implement new firewall rules to restrict VPN access to specific IP ranges and add geo-blocking for countries where we have no employees. Part of security hardening initiative after recent brute force attempts.',
   'a0000000-0000-0000-0000-000000000004', 'emergency', 'critical', 'high', 'implementing',
   'medium',
   '1. Document current firewall rules\n2. Create new ACL rules in staging firewall\n3. Test VPN connectivity from allowed regions\n4. Deploy to production firewall\n5. Monitor for 24 hours\n6. Update VPN documentation',
   '1. Remove new ACL rules\n2. Restore previous firewall configuration\n3. Verify all VPN users can connect\n4. Notify security team',
   '1. Test VPN from Jakarta, Surabaya, and Singapore offices\n2. Verify geo-blocking works for blocked countries\n3. Test split-tunnel and full-tunnel modes\n4. Verify no legitimate users are blocked',
   NOW() - INTERVAL '1 hour', NOW() + INTERVAL '3 hours',
   false, NULL, NULL, NULL,
   'Ahmad Rizky', 'Network Admin', 'Network Team', NULL,
   NOW() - INTERVAL '2 hours'),

  ('20000000-0000-0000-0000-000000000003', 'default', 'CHG-0003',
   'Block Windows update KB5034441 via WSUS',
   'Block the problematic Windows update KB5034441 from deploying to Dell Latitude 5540 laptops via WSUS. This is a workaround until Microsoft releases a fixed version.',
   'a0000000-0000-0000-0000-000000000021', 'standard', 'medium', 'low', 'completed',
   'low',
   '1. Log into WSUS console\n2. Decline update KB5034441\n3. Create computer group for affected Dell models\n4. Apply decline to the group\n5. Force WSUS sync on all clients',
   '1. Re-approve KB5034441 in WSUS\n2. Force sync on affected machines',
   '1. Verify update no longer shows as available on test machine\n2. Confirm no BSOD reports after 48 hours',
   NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '1 hour',
   false, NULL, NULL, NULL,
   'Dimas Prayoga', 'Dimas Prayoga', 'Desktop Support', '10000000-0000-0000-0000-000000000002',
   NOW() - INTERVAL '4 days'),

  ('20000000-0000-0000-0000-000000000004', 'default', 'CHG-0004',
   'Migrate MindsDB to GPU-enabled server',
   'Move the MindsDB AI/ML platform from CPU-only Docker container to a dedicated GPU server (NVIDIA A100) for faster model training. Expected 10x improvement in training time.',
   'a0000000-0000-0000-0000-000000000007', 'normal', 'medium', 'medium', 'draft',
   'low',
   '1. Set up NVIDIA drivers and CUDA on new server\n2. Install Docker with GPU support\n3. Migrate MindsDB data and models\n4. Update docker-compose configuration\n5. Run benchmark tests\n6. Switch production traffic',
   '1. Revert docker-compose to CPU configuration\n2. Restart MindsDB containers\n3. Verify model serving is functional',
   '1. Train a sample model and compare CPU vs GPU time\n2. Run inference benchmark\n3. Verify all existing models load correctly',
   NULL, NULL,
   true, NULL, NULL, NULL,
   'Data Science Team', NULL, 'IT Infrastructure', NULL,
   NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;


-- ─── 9. KNOWLEDGE ARTICLES (/admin/itsm/knowledge) ───────
INSERT INTO itsm_knowledge_articles (id, tenant_id, article_number, title, content, category_id, article_type, status, related_problem_id, author, tags, views, helpful_count, published_at, created_at) VALUES
  ('30000000-0000-0000-0000-000000000001', 'default', 'KA-0001',
   'How to connect to VPN from home',
   E'# Connecting to Nusantarasoft VPN\n\n## Prerequisites\n- Cisco AnyConnect client installed (download from IT Portal)\n- Active AD account\n- MFA enabled on your account\n\n## Steps\n1. Open **Cisco AnyConnect Secure Mobility Client**\n2. Enter server address: `vpn.nusantarasoft.local`\n3. Click **Connect**\n4. Enter your **AD username** and **password**\n5. Approve the MFA push notification on your phone\n6. Wait for connection to establish (green icon in system tray)\n\n## Troubleshooting\n- **Connection drops**: Try switching from Wi-Fi to ethernet\n- **Authentication failed**: Reset password at https://password.nusantarasoft.local\n- **Slow connection**: Use split-tunnel mode (Settings > Preferences)',
   'a0000000-0000-0000-0000-000000000003', 'how_to', 'published', NULL,
   'Ahmad Rizky', ARRAY['vpn','remote','cisco','anyconnect'], 342, 89,
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '45 days'),

  ('30000000-0000-0000-0000-000000000002', 'default', 'KA-0002',
   'Fix: Windows BSOD after KB5034441 update (Dell Latitude)',
   E'# Fix for BSOD after Windows Update KB5034441\n\n## Affected Devices\n- Dell Latitude 5540 with Intel 13th Gen processors\n- Intel Graphics Driver v31.0.101.4091\n\n## Symptoms\n- Blue screen with error: DRIVER_IRQL_NOT_LESS_OR_EQUAL\n- Occurs during login or shortly after\n\n## Solution\n1. Boot into **Safe Mode** (hold Shift + click Restart)\n2. Go to **Settings > Windows Update > Update History**\n3. Click **Uninstall updates**\n4. Find and uninstall **KB5034441**\n5. Restart normally\n6. The update is now blocked via WSUS (CHG-0003)\n\n## Prevention\n- Do NOT manually install KB5034441\n- Wait for the patched version from Microsoft',
   'a0000000-0000-0000-0000-000000000021', 'solution', 'published', '10000000-0000-0000-0000-000000000002',
   'Dimas Prayoga', ARRAY['bsod','windows','update','dell','driver'], 156, 45,
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '4 days'),

  ('30000000-0000-0000-0000-000000000003', 'default', 'KA-0003',
   'How to reset your Active Directory password',
   E'# Password Reset Guide\n\n## Self-Service Reset (Recommended)\n1. Go to https://password.nusantarasoft.local\n2. Click **Forgot Password**\n3. Enter your **username** and **employee ID**\n4. Choose verification method: SMS or Email\n5. Enter the verification code\n6. Create a new password (min 12 chars, must include uppercase, lowercase, number, special char)\n\n## Via Service Desk\n1. Call IT Service Desk: ext. 1234\n2. Or submit a Service Request (SR) in the IT portal\n3. Provide your employee ID for verification\n4. Temporary password will be sent via SMS\n\n## Password Policy\n- Minimum 12 characters\n- Must not match last 5 passwords\n- Expires every 90 days\n- Locked after 5 failed attempts (auto-unlock after 30 minutes)',
   'a0000000-0000-0000-0000-000000000008', 'how_to', 'published', NULL,
   'Service Desk Team', ARRAY['password','reset','active directory','account'], 891, 234,
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '90 days'),

  ('30000000-0000-0000-0000-000000000004', 'default', 'KA-0004',
   'Setting up development environment for new engineers',
   E'# Developer Onboarding — Environment Setup\n\n## Required Tools\n1. **Visual Studio Code** — submit SR via catalog\n2. **Docker Desktop** — pre-installed on developer laptops\n3. **Git** — pre-installed, configure with your @nusantarasoft email\n4. **Node.js 20 LTS** — via nvm\n5. **PostgreSQL client (psql)** — for database access\n\n## Repository Access\n1. Request GitLab access from your team lead\n2. Clone the monorepo: `git clone git@gitlab.nusantarasoft.local:nusantarasoft/platform.git`\n3. Follow the README.md for setup instructions\n\n## Database Access\n1. Submit a Database Access Request via Service Catalog\n2. Development DB: `dev-db.nusantarasoft.local:5432`\n3. Never connect to production directly!\n\n## Helpful Links\n- API Docs: http://localhost:8000\n- Supabase Studio: http://localhost:3000\n- Portainer: http://localhost:9090',
   'a0000000-0000-0000-0000-000000000002', 'how_to', 'published', NULL,
   'Engineering Lead', ARRAY['onboarding','developer','setup','environment'], 67, 18,
   NOW() - INTERVAL '14 days', NOW() - INTERVAL '20 days'),

  ('30000000-0000-0000-0000-000000000005', 'default', 'KA-0005',
   'Investigating SAP performance issues — runbook',
   E'# SAP Performance Troubleshooting Runbook\n\n## Quick Checks\n1. Check DB tablespace usage: `SELECT * FROM dba_tablespace_usage_metrics`\n2. Check active sessions: transaction SM50\n3. Check system log: transaction SM21\n\n## Common Causes\n- **Tablespace full**: Extend datafile or clean up old logs\n- **Long-running queries**: Cancel via SM50, optimize in SE11\n- **Lock contention**: Check SM12 for locked entries\n\n## Escalation\n- L1: Application Support team (30 min response)\n- L2: SAP Basis team (1 hour response)\n- L3: SAP vendor support (4 hour response)',
   'a0000000-0000-0000-0000-000000000006', 'troubleshooting', 'draft', '10000000-0000-0000-0000-000000000003',
   'Reza Firmansyah', ARRAY['sap','performance','database','runbook'], 12, 3,
   NULL, NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;


-- ─── 10. APPROVALS ───────────────────────────────────────
INSERT INTO itsm_approvals (tenant_id, record_type, record_id, approval_level, approver_name, approver_email, status, decision_notes, decided_at) VALUES
  ('default', 'service_request', 'f0000000-0000-0000-0000-000000000001', 1, 'Marketing Manager', 'marketing.mgr@nusantarasoft.local', 'approved', 'Approved — new hire confirmed starting April 21', NOW() - INTERVAL '1 day'),
  ('default', 'service_request', 'f0000000-0000-0000-0000-000000000001', 2, 'IT Manager', 'it.mgr@nusantarasoft.local', 'approved', 'Design laptop approved. Stock available.', NOW() - INTERVAL '12 hours'),
  ('default', 'service_request', 'f0000000-0000-0000-0000-000000000002', 1, 'Operations Manager', 'ops.mgr@nusantarasoft.local', 'approved', 'Remote work approved per company policy', NOW() - INTERVAL '18 hours'),
  ('default', 'service_request', 'f0000000-0000-0000-0000-000000000005', 1, 'Data Team Lead', 'data.lead@nusantarasoft.local', 'approved', 'Read-only access sufficient for analytics dashboard', NOW() - INTERVAL '2 hours'),
  ('default', 'service_request', 'f0000000-0000-0000-0000-000000000005', 2, 'VP Engineering', 'vp.eng@nusantarasoft.local', 'pending', NULL, NULL),
  ('default', 'change', '20000000-0000-0000-0000-000000000001', 1, 'CAB Board', 'cab@nusantarasoft.local', 'approved', 'Approved with condition: DBA on standby', NOW() - INTERVAL '1 day');

-- Signal PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

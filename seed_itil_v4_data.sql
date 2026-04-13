-- ═══════════════════════════════════════════════════════════
-- ITIL v4 SEED DATA — All New Modules
-- ═══════════════════════════════════════════════════════════

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  1. CMDB — Configuration Items                           ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO itsm_configuration_items (id, tenant_id, ci_number, name, ci_class, ci_type, status, environment, criticality, location, department, owner, managed_by, vendor, manufacturer, model, serial_number, ip_address, os_info, version, cpu, memory_gb, storage_gb, purchase_date, warranty_expiry)
VALUES
('50000000-0000-0000-0000-000000000001', 'default', 'CI-0001', 'PROD-DB-01 (PostgreSQL Primary)', 'software', 'database', 'active', 'production', 'critical', 'Jakarta DC-1 Rack A4', 'IT Infrastructure', 'Ahmad Rizal', 'DevOps Team', 'PostgreSQL Global Development Group', NULL, 'PostgreSQL 15.8', NULL, '10.0.1.50', 'Ubuntu 22.04 LTS', '15.8', '8 vCPU Intel Xeon', 64, 1000, '2024-06-15', '2027-06-15'),
('50000000-0000-0000-0000-000000000002', 'default', 'CI-0002', 'APP-WEB-01 (Next.js Admin)', 'software', 'application', 'active', 'production', 'high', 'Jakarta DC-1 Rack B2', 'IT Applications', 'Budi Santoso', 'DevOps Team', 'Vercel', NULL, 'Next.js 14', NULL, '10.0.1.100', 'Alpine Linux 3.19', '14.0', '4 vCPU', 16, 100, '2024-09-01', '2026-09-01'),
('50000000-0000-0000-0000-000000000003', 'default', 'CI-0003', 'NET-FW-01 (Perimeter Firewall)', 'network', 'firewall', 'active', 'production', 'critical', 'Jakarta DC-1 Rack A1', 'IT Security', 'Citra Dewi', 'Network Team', 'Fortinet', 'Fortinet', 'FortiGate 200F', 'FGT200F-SN-98342', '10.0.0.1', 'FortiOS 7.4', '7.4.2', NULL, NULL, NULL, '2024-03-10', '2027-03-10'),
('50000000-0000-0000-0000-000000000004', 'default', 'CI-0004', 'SRV-MAIL-01 (Mail Server)', 'software', 'service', 'active', 'production', 'high', 'Jakarta DC-1 Rack B3', 'IT Infrastructure', 'Ahmad Rizal', 'DevOps Team', 'Docker Mailserver', NULL, 'docker-mailserver', NULL, '10.0.1.82', 'Ubuntu 22.04 LTS', 'latest', '2 vCPU', 8, 200, '2024-06-15', '2027-06-15'),
('50000000-0000-0000-0000-000000000005', 'default', 'CI-0005', 'SRV-LDAP-01 (OpenLDAP)', 'software', 'directory_service', 'active', 'production', 'high', 'Jakarta DC-1 Rack A5', 'IT Security', 'Citra Dewi', 'Security Team', 'OpenLDAP Foundation', NULL, 'OpenLDAP 2.6', NULL, '10.0.1.389', 'Alpine Linux 3.19', '2.6', '2 vCPU', 4, 50, '2024-06-15', '2027-06-15'),
('50000000-0000-0000-0000-000000000006', 'default', 'CI-0006', 'MON-PROMETHEUS-01 (Monitoring)', 'software', 'monitoring', 'active', 'production', 'high', 'Jakarta DC-1 Rack C1', 'IT Infrastructure', 'Eka Putra', 'DevOps Team', 'Prometheus Authors', NULL, 'Prometheus', NULL, '10.0.1.90', 'Alpine Linux 3.19', '2.48', '4 vCPU', 16, 500, '2024-09-01', '2027-09-01'),
('50000000-0000-0000-0000-000000000007', 'default', 'CI-0007', 'WKS-ENG-DELL-01', 'hardware', 'workstation', 'active', 'production', 'medium', 'Office Jakarta - Engineering Floor 3', 'Engineering', 'Farhan Dev', 'IT Support', 'Dell', 'Dell', 'Precision 5570', 'DELL-5570-XJ3H9', NULL, 'Windows 11 Pro', '23H2', 'Intel i7-12800H', 32, 1000, '2024-01-15', '2027-01-15'),
('50000000-0000-0000-0000-000000000008', 'default', 'CI-0008', 'NET-SW-CORE-01 (Core Switch)', 'network', 'switch', 'active', 'production', 'critical', 'Jakarta DC-1 Rack A1', 'IT Infrastructure', 'Ahmad Rizal', 'Network Team', 'Cisco', 'Cisco', 'Catalyst 9300', 'CAT9300-SN-12847', '10.0.0.2', 'IOS-XE 17.9', '17.9.4', NULL, NULL, NULL, '2023-11-20', '2028-11-20')
ON CONFLICT (id) DO NOTHING;

-- CI Relationships
INSERT INTO itsm_ci_relationships (source_ci_id, target_ci_id, relationship_type, description) VALUES
('50000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'depends_on', 'Admin app depends on PostgreSQL database'),
('50000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000005', 'depends_on', 'Mail server authenticates against LDAP'),
('50000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000001', 'connected_to', 'Prometheus monitors PostgreSQL'),
('50000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000002', 'connected_to', 'Prometheus monitors Next.js app'),
('50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000008', 'runs_on', 'DB server connected via core switch'),
('50000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000008', 'connected_to', 'Firewall connects to core switch')
ON CONFLICT DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  2. EVENTS (Monitoring)                                  ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO itsm_events (id, tenant_id, event_number, source, event_type, severity, status, title, description, category, resource_name, resource_type, metric_name, metric_value, threshold_value, ci_id, occurred_at)
VALUES
('51000000-0000-0000-0000-000000000001', 'default', 'EVT-0001', 'prometheus', 'warning', 'medium', 'acknowledged', 'High CPU Usage on PROD-DB-01', 'CPU usage exceeded 85% threshold for 5 minutes on the primary PostgreSQL server.', 'infrastructure', 'PROD-DB-01', 'server', 'cpu_usage', '87.3%', '85%', '50000000-0000-0000-0000-000000000001', NOW() - INTERVAL '2 hours'),
('51000000-0000-0000-0000-000000000002', 'default', 'EVT-0002', 'uptime_kuma', 'exception', 'high', 'escalated', 'Mail Server Unreachable', 'SMTP health check failed 3 consecutive times. Port 587 not responding.', 'application', 'SRV-MAIL-01', 'service', 'availability', 'down', 'up', '50000000-0000-0000-0000-000000000004', NOW() - INTERVAL '1 hour'),
('51000000-0000-0000-0000-000000000003', 'default', 'EVT-0003', 'prometheus', 'warning', 'medium', 'new', 'Disk Space Low on Monitoring Server', 'Disk usage at 82% on /var/lib/prometheus. Retention data growing faster than expected.', 'infrastructure', 'MON-PROMETHEUS-01', 'server', 'disk_usage', '82%', '80%', '50000000-0000-0000-0000-000000000006', NOW() - INTERVAL '30 minutes'),
('51000000-0000-0000-0000-000000000004', 'default', 'EVT-0004', 'grafana', 'alert', 'critical', 'new', 'Database Connection Pool Exhausted', 'PostgreSQL max_connections (100) nearly reached. 97 active connections detected. Application performance may degrade.', 'database', 'PROD-DB-01', 'database', 'active_connections', '97', '90', '50000000-0000-0000-0000-000000000001', NOW() - INTERVAL '15 minutes'),
('51000000-0000-0000-0000-000000000005', 'default', 'EVT-0005', 'n8n', 'informational', 'low', 'closed', 'Scheduled Backup Completed', 'Daily PostgreSQL backup completed successfully. Backup size: 2.3GB. Uploaded to S3.', 'infrastructure', 'PROD-DB-01', 'database', 'backup_status', 'success', 'success', '50000000-0000-0000-0000-000000000001', NOW() - INTERVAL '6 hours'),
('51000000-0000-0000-0000-000000000006', 'default', 'EVT-0006', 'manual', 'warning', 'high', 'new', 'SSL Certificate Expiring in 14 Days', 'The wildcard SSL certificate for *.nusantarasoft.local expires on 2026-04-27. Renewal required.', 'security', 'NET-FW-01', 'network_device', 'cert_expiry_days', '14', '30', '50000000-0000-0000-0000-000000000003', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  3. RELEASES                                             ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO itsm_releases (id, tenant_id, release_number, title, version, description, release_type, status, priority, risk_level, planned_start, planned_end, release_manager, build_team, test_lead, deployment_plan, rollback_plan)
VALUES
('52000000-0000-0000-0000-000000000001', 'default', 'REL-0001', 'NusantaraSoft Platform v4.0 GA', 'v4.0.0', 'Major release including all ITIL v4 practices, CMDB, Event Management, Release Management, Agent Workforce, and Service Continuity modules.', 'major', 'testing', 'high', 'medium', '2026-04-20', '2026-04-27', 'Ahmad Rizal', 'Platform Engineering', 'QA Team', '1. Blue-green deployment\n2. Database migration with rollback point\n3. Canary release to 10% traffic\n4. Full rollout after 24h monitoring', 'Revert to v3.9.x Docker images. Restore database from pre-migration backup.'),
('52000000-0000-0000-0000-000000000002', 'default', 'REL-0002', 'Security Patch Bundle Q2-2026', 'v3.9.5', 'Cumulative security patches for OpenSSL, Node.js, and PostgreSQL dependencies. Includes fix for CVE-2026-1234.', 'patch', 'deployed', 'critical', 'low', '2026-04-01', '2026-04-02', 'Citra Dewi', 'Security Team', 'Citra Dewi', 'Rolling update across all containers. No downtime expected.', 'Rollback Docker images to previous tags.'),
('52000000-0000-0000-0000-000000000003', 'default', 'REL-0003', 'CRM AI Intelligence Module', 'v4.1.0', 'Minor release adding Vertex AI-powered lead scoring, deal insights, and campaign content generation to the CRM module.', 'minor', 'planning', 'medium', 'medium', '2026-05-01', '2026-05-07', 'Budi Santoso', 'AI/ML Team', 'QA Team', 'Feature-flagged deployment. AI features enabled per tenant.', 'Disable AI feature flags. No data migration needed.')
ON CONFLICT (id) DO NOTHING;

-- Link changes to releases
INSERT INTO itsm_release_changes (release_id, change_id, sort_order)
SELECT '52000000-0000-0000-0000-000000000001', id, 1 FROM itsm_changes WHERE change_number = 'CHG-0001'
ON CONFLICT DO NOTHING;
INSERT INTO itsm_release_changes (release_id, change_id, sort_order)
SELECT '52000000-0000-0000-0000-000000000002', id, 1 FROM itsm_changes WHERE change_number = 'CHG-0002'
ON CONFLICT DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  4. AGENTS (Workforce)                                   ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO itsm_agents (id, tenant_id, agent_code, name, email, phone, title, department, team, role, status, shift, shift_start, shift_end, max_tickets, current_ticket_count, avg_resolution_hours, customer_satisfaction_score, total_tickets_resolved, sla_compliance_pct)
VALUES
('53000000-0000-0000-0000-000000000001', 'default', 'AGT-0001', 'Ahmad Rizal', 'ahmad.rizal@nusantarasoft.local', '+62-812-3456-7001', 'Senior System Administrator', 'IT Infrastructure', 'Infrastructure', 'team_lead', 'active', 'day', '08:00', '17:00', 8, 3, 4.2, 4.7, 342, 96.5),
('53000000-0000-0000-0000-000000000002', 'default', 'AGT-0002', 'Budi Santoso', 'budi.santoso@nusantarasoft.local', '+62-812-3456-7002', 'Application Support Specialist', 'IT Applications', 'Application Support', 'senior_agent', 'active', 'day', '08:00', '17:00', 10, 5, 3.8, 4.5, 528, 94.2),
('53000000-0000-0000-0000-000000000003', 'default', 'AGT-0003', 'Citra Dewi', 'citra.dewi@nusantarasoft.local', '+62-812-3456-7003', 'Security Analyst', 'IT Security', 'Security Operations', 'specialist', 'active', 'day', '09:00', '18:00', 6, 2, 6.1, 4.8, 189, 98.1),
('53000000-0000-0000-0000-000000000004', 'default', 'AGT-0004', 'Dian Purnama', 'dian.purnama@nusantarasoft.local', '+62-812-3456-7004', 'Help Desk Agent', 'IT Support', 'Service Desk', 'agent', 'active', 'day', '07:00', '16:00', 15, 8, 2.1, 4.3, 1247, 91.8),
('53000000-0000-0000-0000-000000000005', 'default', 'AGT-0005', 'Eka Putra', 'eka.putra@nusantarasoft.local', '+62-812-3456-7005', 'DevOps Engineer', 'IT Infrastructure', 'DevOps', 'senior_agent', 'active', 'flexible', '10:00', '19:00', 8, 4, 5.5, 4.6, 276, 95.3),
('53000000-0000-0000-0000-000000000006', 'default', 'AGT-0006', 'Farhan Maulana', 'farhan.m@nusantarasoft.local', '+62-812-3456-7006', 'Night Shift Support', 'IT Support', 'Service Desk', 'agent', 'active', 'night', '22:00', '07:00', 12, 2, 3.0, 4.1, 423, 89.5)
ON CONFLICT (id) DO NOTHING;

-- Agent Skills
INSERT INTO itsm_agent_skills (agent_id, skill_name, proficiency_level, certified, certification_name, certification_expiry)
VALUES
('53000000-0000-0000-0000-000000000001', 'linux_administration', 'expert', true, 'RHCE', '2027-06-15'),
('53000000-0000-0000-0000-000000000001', 'database_postgresql', 'advanced', true, 'PostgreSQL DBA', '2027-03-01'),
('53000000-0000-0000-0000-000000000001', 'docker_kubernetes', 'advanced', true, 'CKA', '2026-12-01'),
('53000000-0000-0000-0000-000000000001', 'networking', 'intermediate', false, NULL, NULL),
('53000000-0000-0000-0000-000000000002', 'javascript_nodejs', 'expert', false, NULL, NULL),
('53000000-0000-0000-0000-000000000002', 'database_postgresql', 'intermediate', false, NULL, NULL),
('53000000-0000-0000-0000-000000000002', 'cloud_gcp', 'advanced', true, 'GCP Professional Cloud Developer', '2027-01-15'),
('53000000-0000-0000-0000-000000000003', 'cybersecurity', 'expert', true, 'CISSP', '2027-09-20'),
('53000000-0000-0000-0000-000000000003', 'incident_response', 'advanced', true, 'GCIH', '2027-05-10'),
('53000000-0000-0000-0000-000000000003', 'networking', 'advanced', false, NULL, NULL),
('53000000-0000-0000-0000-000000000004', 'windows_administration', 'intermediate', false, NULL, NULL),
('53000000-0000-0000-0000-000000000004', 'active_directory', 'intermediate', false, NULL, NULL),
('53000000-0000-0000-0000-000000000004', 'itil_service_desk', 'intermediate', true, 'ITIL 4 Foundation', '2028-01-01'),
('53000000-0000-0000-0000-000000000005', 'docker_kubernetes', 'expert', true, 'CKA', '2027-08-01'),
('53000000-0000-0000-0000-000000000005', 'cicd_pipelines', 'expert', false, NULL, NULL),
('53000000-0000-0000-0000-000000000005', 'cloud_gcp', 'advanced', true, 'GCP Professional DevOps Engineer', '2027-04-01'),
('53000000-0000-0000-0000-000000000006', 'windows_administration', 'intermediate', false, NULL, NULL),
('53000000-0000-0000-0000-000000000006', 'networking', 'beginner', false, NULL, NULL)
ON CONFLICT DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  5. SERVICE CONTINUITY PLANS                             ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO itsm_continuity_plans (id, tenant_id, plan_number, title, plan_type, status, description, scope, rto_hours, rpo_hours, mtpd_hours, recovery_priority, risk_assessment, recovery_strategy, recovery_procedures, communication_plan, escalation_contacts, test_frequency, plan_owner, last_test_date, last_test_result, next_test_date)
VALUES
('54000000-0000-0000-0000-000000000001', 'default', 'BCP-0001', 'Core Database Disaster Recovery Plan', 'drp', 'active', 'Disaster recovery plan for the primary PostgreSQL database cluster serving all enterprise modules.', 'PostgreSQL primary/replica cluster, WAL archiving, point-in-time recovery', 4, 1, 24, 'critical', 'Single point of failure: primary DB server. Risk: hardware failure, data corruption, ransomware. Likelihood: Low. Impact: Critical.', 'Automated failover to standby replica. Point-in-time recovery from WAL archives in S3. Manual rebuild from latest daily backup as last resort.', '1. Detect failure via Prometheus alert\n2. Verify primary is truly down (no split-brain)\n3. Promote standby replica to primary\n4. Update connection strings via DNS\n5. Verify application connectivity\n6. Restore WAL replay if needed\n7. Rebuild new standby from promoted primary', 'Notify CTO within 15 minutes. Update status page. Email all department heads within 30 minutes.', 'Primary: Ahmad Rizal (+62-812-3456-7001)\nSecondary: Eka Putra (+62-812-3456-7005)\nEscalation: CTO Gunawan (+62-812-9999-0001)', 'quarterly', 'Ahmad Rizal', '2026-01-15', 'passed', '2026-04-15'),
('54000000-0000-0000-0000-000000000002', 'default', 'BCP-0002', 'Email Service Business Continuity Plan', 'bcp', 'active', 'Business continuity plan for the corporate email system including SMTP, IMAP, and webmail.', 'Docker Mailserver, Roundcube, LDAP authentication, spam filtering', 2, 0.5, 8, 'high', 'Email is critical for internal and external communications. Risk: server failure, DNS issues, certificate expiry. Mitigation: containerized deployment allows quick rebuild.', 'Primary: Restart container from Docker Compose. Secondary: Rebuild from config backup. Tertiary: Temporary redirection to backup MX.', '1. Check mail server container health\n2. Attempt container restart\n3. If failed, rebuild from docker-compose.yml\n4. Verify LDAP connectivity\n5. Test send/receive\n6. Monitor mail queue', 'Notify IT team immediately. Email users via backup channel (Teams/Slack) about estimated downtime.', 'Primary: Ahmad Rizal\nSecondary: Dian Purnama', 'semi_annually', 'Ahmad Rizal', '2025-10-01', 'passed', '2026-04-01'),
('54000000-0000-0000-0000-000000000003', 'default', 'BCP-0003', 'Full Platform Crisis Recovery Plan', 'crisis', 'draft', 'Comprehensive crisis management plan for total datacenter failure or major security breach affecting all NusantaraSoft services.', 'All 29 Docker containers, database, file storage, DNS, reverse proxy, monitoring', 8, 4, 72, 'critical', 'Catastrophic scenario: complete DC failure, extended power outage, or coordinated cyber attack. Probability: Very low. Impact: Total business disruption.', 'Failover to DR site. Restore from off-site backups. Coordinate with ISP for DNS redirection.', '1. Activate crisis management team\n2. Assess scope of impact\n3. Initiate DR site activation\n4. Restore databases from off-site backup\n5. Deploy containers from registry\n6. Update DNS records\n7. Verify all 29 services\n8. Gradual traffic migration\n9. Post-incident review within 48h', 'Executive notification within 5 minutes. Customer notification within 1 hour. Press statement if needed within 4 hours.', 'Crisis Commander: CEO\nTechnical Lead: CTO\nCommunications: CMO\nIT Lead: Ahmad Rizal', 'annually', 'CTO Gunawan', NULL, NULL, '2026-06-01')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  6. AVAILABILITY RECORDS                                 ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO itsm_availability_records (id, tenant_id, service_id, ci_id, period_start, period_end, uptime_minutes, downtime_minutes, planned_downtime_minutes, unplanned_downtime_minutes, mtbf_hours, mtrs_hours, incident_count, sla_target_pct, notes)
VALUES
('55000000-0000-0000-0000-000000000001', 'default', NULL, '50000000-0000-0000-0000-000000000001', '2026-03-01', '2026-03-31', 44544, 96, 60, 36, 720, 0.6, 2, 99.9, 'March 2026 - PostgreSQL Primary. Two brief maintenance windows. One unplanned restart due to OOM.'),
('55000000-0000-0000-0000-000000000002', 'default', NULL, '50000000-0000-0000-0000-000000000002', '2026-03-01', '2026-03-31', 44610, 30, 30, 0, 1440, 0, 0, 99.9, 'March 2026 - Next.js Admin App. One planned deployment window. Zero unplanned downtime.'),
('55000000-0000-0000-0000-000000000003', 'default', NULL, '50000000-0000-0000-0000-000000000003', '2026-03-01', '2026-03-31', 44640, 0, 0, 0, NULL, 0, 0, 99.99, 'March 2026 - Perimeter Firewall. 100% uptime. No incidents.'),
('55000000-0000-0000-0000-000000000004', 'default', NULL, '50000000-0000-0000-0000-000000000004', '2026-03-01', '2026-03-31', 44400, 240, 0, 240, 360, 2, 3, 99.5, 'March 2026 - Mail Server. Three unplanned outages related to SMTP relay configuration.')
ON CONFLICT (id) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  7. DEPLOYMENTS                                          ║
-- ╚═══════════════════════════════════════════════════════════╝

INSERT INTO itsm_deployments (id, tenant_id, deployment_number, title, description, deployment_type, status, environment, release_id, planned_start, planned_end, actual_start, actual_end, deployed_by, deployment_team, deployment_steps, validation_steps, validation_result, deployment_log)
VALUES
('56000000-0000-0000-0000-000000000001', 'default', 'DEP-0001', 'Security Patch Bundle Q2 Deployment', 'Production deployment of security patches including OpenSSL and Node.js updates.', 'rolling', 'completed', 'production', '52000000-0000-0000-0000-000000000002', '2026-04-01 22:00:00+07', '2026-04-02 02:00:00+07', '2026-04-01 22:05:00+07', '2026-04-02 00:30:00+07', 'Eka Putra', 'DevOps Team', '1. Pull updated base images\n2. Rebuild containers with new deps\n3. Rolling restart: monitoring → middleware → admin\n4. Verify health checks pass\n5. Run smoke tests', '1. All containers healthy (docker ps)\n2. GraphQL endpoint responding\n3. Admin UI login working\n4. Database connections stable\n5. SSL certificate valid', 'passed', 'All 29 containers updated successfully. Rolling restart completed in 2h 25m. Zero downtime. All health checks passed.'),
('56000000-0000-0000-0000-000000000002', 'default', 'DEP-0002', 'NusantaraSoft v4.0 Staging Deployment', 'Pre-production deployment of v4.0 platform including all ITIL v4 modules to staging environment for UAT.', 'blue_green', 'completed', 'staging', '52000000-0000-0000-0000-000000000001', '2026-04-10 10:00:00+07', '2026-04-10 14:00:00+07', '2026-04-10 10:15:00+07', '2026-04-10 13:45:00+07', 'Eka Putra', 'DevOps Team', '1. Deploy blue environment\n2. Run database migrations\n3. Seed test data\n4. Switch traffic to blue\n5. Verify all modules', '1. All ITSM submodules accessible\n2. CMDB showing configuration items\n3. Event management receiving events\n4. Release management listing releases\n5. Agent workload dashboard loading', 'passed', 'Blue-green deployment to staging successful. All 7 new ITIL modules verified. UAT team notified.'),
('56000000-0000-0000-0000-000000000003', 'default', 'DEP-0003', 'NusantaraSoft v4.0 Production Deployment', 'Production deployment of v4.0 GA release with full ITIL v4 implementation.', 'blue_green', 'planned', 'production', '52000000-0000-0000-0000-000000000001', '2026-04-20 22:00:00+07', '2026-04-21 04:00:00+07', NULL, NULL, NULL, 'DevOps + Platform Engineering', '1. Pre-deployment backup\n2. Deploy green environment\n3. Run database migrations\n4. Canary: 10% traffic\n5. Monitor for 2 hours\n6. Full cutover\n7. Decommission old blue', '1. Full regression test suite\n2. Performance benchmarks\n3. Security scan\n4. Data integrity verification\n5. 24h monitoring period', NULL, NULL)
ON CONFLICT (id) DO NOTHING;


NOTIFY pgrst, 'reload schema';

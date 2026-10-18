-- ═══════════════════════════════════════════════════════════
-- ADD TICKET STAKEHOLDERS — Many-to-Many relationship
-- 1 ticket can have multiple stakeholders (agents/people)
-- 1 stakeholder can be linked to multiple tickets
-- ═══════════════════════════════════════════════════════════

-- ─── TABLE ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS itsm_ticket_stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  ticket_id UUID NOT NULL REFERENCES itsm_tickets(id) ON DELETE CASCADE,
  stakeholder_name TEXT NOT NULL,
  stakeholder_email TEXT,
  stakeholder_type TEXT NOT NULL DEFAULT 'involved',  -- 'assignee', 'watcher', 'approver', 'involved', 'affected', 'reporter', 'escalation'
  role_description TEXT,                               -- e.g. "DBA Support", "Incident Commander"
  agent_id UUID REFERENCES itsm_agents(id),           -- FK to agent if stakeholder is an agent
  added_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ticket_id, stakeholder_name, stakeholder_type)
);

-- ─── INDEXES ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_itsm_ticket_stakeholders_ticket ON itsm_ticket_stakeholders(ticket_id);
CREATE INDEX IF NOT EXISTS idx_itsm_ticket_stakeholders_agent ON itsm_ticket_stakeholders(agent_id);
CREATE INDEX IF NOT EXISTS idx_itsm_ticket_stakeholders_name ON itsm_ticket_stakeholders(stakeholder_name);

-- ─── SEED DATA ────────────────────────────────────────────
-- Each ticket gets multiple stakeholders with different roles.
-- Using real agent IDs where stakeholder is an internal agent.

-- INC-0001: Email server down (Critical — many stakeholders)
INSERT INTO itsm_ticket_stakeholders (tenant_id, ticket_id, stakeholder_name, stakeholder_email, stakeholder_type, role_description, agent_id) VALUES
  ('default', 'c0000000-0000-0000-0000-000000000001', 'Ahmad Rizky', 'ahmad.rizky@nusantarasoft.local', 'assignee', 'Primary investigator — Infrastructure lead', NULL),
  ('default', 'c0000000-0000-0000-0000-000000000001', 'Budi Santoso', 'budi.santoso@nusantarasoft.local', 'reporter', 'Reported the outage from HR department', '53000000-0000-0000-0000-000000000002'),
  ('default', 'c0000000-0000-0000-0000-000000000001', 'Eka Putra', 'eka.putra@nusantarasoft.local', 'involved', 'DevOps support — Docker container diagnostics', '53000000-0000-0000-0000-000000000005'),
  ('default', 'c0000000-0000-0000-0000-000000000001', 'Citra Dewi', 'citra.dewi@nusantarasoft.local', 'watcher', 'Security monitoring — checking for attack vectors', '53000000-0000-0000-0000-000000000003'),
  ('default', 'c0000000-0000-0000-0000-000000000001', 'CTO Gunawan', 'gunawan@nusantarasoft.local', 'escalation', 'Executive escalation due to company-wide impact', NULL)
ON CONFLICT DO NOTHING;

-- INC-0002: Laptop BSOD (High — 2 stakeholders)
INSERT INTO itsm_ticket_stakeholders (tenant_id, ticket_id, stakeholder_name, stakeholder_email, stakeholder_type, role_description, agent_id) VALUES
  ('default', 'c0000000-0000-0000-0000-000000000002', 'Dimas Prayoga', 'dimas@nusantarasoft.local', 'assignee', 'Desktop Support — handling hardware issue', NULL),
  ('default', 'c0000000-0000-0000-0000-000000000002', 'Dian Purnama', 'dian.purnama@nusantarasoft.local', 'involved', 'Help desk — initial triage and user communication', '53000000-0000-0000-0000-000000000004'),
  ('default', 'c0000000-0000-0000-0000-000000000002', 'Siti Rahayu', 'siti.rahayu@nusantarasoft.local', 'reporter', 'End user affected by BSOD', NULL)
ON CONFLICT DO NOTHING;

-- INC-0003: VPN drops (Medium — 3 stakeholders)
INSERT INTO itsm_ticket_stakeholders (tenant_id, ticket_id, stakeholder_name, stakeholder_email, stakeholder_type, role_description, agent_id) VALUES
  ('default', 'c0000000-0000-0000-0000-000000000003', 'Farhan Maulana', 'farhan.m@nusantarasoft.local', 'involved', 'Night shift monitoring — initial detection', '53000000-0000-0000-0000-000000000006'),
  ('default', 'c0000000-0000-0000-0000-000000000003', 'Citra Dewi', 'citra.dewi@nusantarasoft.local', 'watcher', 'Security review of VPN configuration', '53000000-0000-0000-0000-000000000003'),
  ('default', 'c0000000-0000-0000-0000-000000000003', 'Andi Wijaya', 'andi.wijaya@nusantarasoft.local', 'reporter', 'End user experiencing VPN issues', NULL)
ON CONFLICT DO NOTHING;

-- INC-0004: SAP report failure (High — 3 stakeholders)
INSERT INTO itsm_ticket_stakeholders (tenant_id, ticket_id, stakeholder_name, stakeholder_email, stakeholder_type, role_description, agent_id) VALUES
  ('default', 'c0000000-0000-0000-0000-000000000004', 'Reza Firmansyah', 'reza@nusantarasoft.local', 'assignee', 'Application Support — SAP specialist', NULL),
  ('default', 'c0000000-0000-0000-0000-000000000004', 'Budi Santoso', 'budi.santoso@nusantarasoft.local', 'involved', 'Application team lead — coordinating with DBA', '53000000-0000-0000-0000-000000000002'),
  ('default', 'c0000000-0000-0000-0000-000000000004', 'Ahmad Rizky', 'ahmad.rizky@nusantarasoft.local', 'involved', 'DBA support — tablespace extension', NULL),
  ('default', 'c0000000-0000-0000-0000-000000000004', 'Dewi Lestari', 'dewi.lestari@nusantarasoft.local', 'reporter', 'Finance — month-end closing dependency', NULL)
ON CONFLICT DO NOTHING;

-- INC-0005: Printer jam (Low — 2 stakeholders)
INSERT INTO itsm_ticket_stakeholders (tenant_id, ticket_id, stakeholder_name, stakeholder_email, stakeholder_type, role_description, agent_id) VALUES
  ('default', 'c0000000-0000-0000-0000-000000000005', 'Yusuf Hakim', 'yusuf@nusantarasoft.local', 'assignee', 'Desktop Support — hardware repair', NULL),
  ('default', 'c0000000-0000-0000-0000-000000000005', 'Fajar Nugroho', 'fajar.nugroho@nusantarasoft.local', 'reporter', 'End user on 3rd floor', NULL)
ON CONFLICT DO NOTHING;

-- INC-0006: Suspicious login (Critical — 4 stakeholders)
INSERT INTO itsm_ticket_stakeholders (tenant_id, ticket_id, stakeholder_name, stakeholder_email, stakeholder_type, role_description, agent_id) VALUES
  ('default', 'c0000000-0000-0000-0000-000000000006', 'Ahmad Rizky', 'ahmad.rizky@nusantarasoft.local', 'assignee', 'Infrastructure — firewall rule update', NULL),
  ('default', 'c0000000-0000-0000-0000-000000000006', 'Citra Dewi', 'citra.dewi@nusantarasoft.local', 'involved', 'Security analyst — threat investigation', '53000000-0000-0000-0000-000000000003'),
  ('default', 'c0000000-0000-0000-0000-000000000006', 'Eka Putra', 'eka.putra@nusantarasoft.local', 'involved', 'DevOps — log analysis and forensics', '53000000-0000-0000-0000-000000000005'),
  ('default', 'c0000000-0000-0000-0000-000000000006', 'CTO Gunawan', 'gunawan@nusantarasoft.local', 'escalation', 'Executive notification — security breach protocol', NULL)
ON CONFLICT DO NOTHING;

-- ─── GRANTS ───────────────────────────────────────────────
GRANT ALL ON itsm_ticket_stakeholders TO anon, authenticated, service_role, authenticator;

-- Signal PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

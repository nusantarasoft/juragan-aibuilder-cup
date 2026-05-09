-- Seed: Export logs sample data
-- Run after 20260506_data_export_logs.sql

INSERT INTO data_export_logs (user_id, user_email, user_name, export_type, module, file_name, record_count, date_range_start, date_range_end, ip_address, created_at)
SELECT * FROM (VALUES
  ('system', 'admin@nusantarasoft.id', 'Admin User', 'pdf', 'hr.employees', 'employees_report_2026-05.pdf', 156, '2026-04-01', '2026-04-30', '192.168.1.10', now() - interval '2 hours'),
  ('system', 'admin@nusantarasoft.id', 'Admin User', 'excel', 'crm.contacts', 'contacts_export_2026-05.xlsx', 1842, '2026-01-01', '2026-05-06', '192.168.1.10', now() - interval '3 hours'),
  ('system', 'hr@nusantarasoft.id', 'HR Manager', 'pdf', 'hr.attendance', 'attendance_may_2026.pdf', 320, '2026-05-01', '2026-05-06', '192.168.1.15', now() - interval '5 hours'),
  ('system', 'finance@nusantarasoft.id', 'Finance Lead', 'excel', 'accounting.journal', 'journal_entries_q1.xlsx', 2450, '2026-01-01', '2026-03-31', '192.168.1.20', now() - interval '1 day'),
  ('system', 'admin@nusantarasoft.id', 'Admin User', 'pdf', 'itsm.tickets', 'tickets_summary_apr.pdf', 89, '2026-04-01', '2026-04-30', '192.168.1.10', now() - interval '1 day 2 hours'),
  ('system', 'ops@nusantarasoft.id', 'Ops Manager', 'excel', 'ops.playbooks', 'playbooks_export.xlsx', 5, '2026-01-01', '2026-05-06', '192.168.1.25', now() - interval '1 day 4 hours'),
  ('system', 'hr@nusantarasoft.id', 'HR Manager', 'pdf', 'hr.payroll', 'payroll_april_2026.pdf', 156, '2026-04-01', '2026-04-30', '192.168.1.15', now() - interval '2 days'),
  ('system', 'finance@nusantarasoft.id', 'Finance Lead', 'excel', 'accounting.invoices', 'invoices_q1_2026.xlsx', 890, '2026-01-01', '2026-03-31', '192.168.1.20', now() - interval '2 days 3 hours'),
  ('system', 'admin@nusantarasoft.id', 'Admin User', 'pdf', 'crm.deals', 'deals_pipeline_may.pdf', 45, '2026-05-01', '2026-05-06', '192.168.1.10', now() - interval '3 days'),
  ('system', 'ops@nusantarasoft.id', 'Ops Manager', 'excel', 'notifications.rules', 'notification_rules.xlsx', 6, '2026-01-01', '2026-05-06', '192.168.1.25', now() - interval '3 days 1 hour'),
  ('system', 'admin@nusantarasoft.id', 'Admin User', 'pdf', 'inventory.products', 'products_catalog.pdf', 523, '2026-01-01', '2026-05-06', '192.168.1.10', now() - interval '4 days'),
  ('system', 'hr@nusantarasoft.id', 'HR Manager', 'excel', 'hr.performance', 'performance_reviews_q1.xlsx', 78, '2026-01-01', '2026-03-31', '192.168.1.15', now() - interval '5 days'),
  ('system', 'finance@nusantarasoft.id', 'Finance Lead', 'pdf', 'accounting.balance', 'balance_sheet_q1.pdf', 1, '2026-01-01', '2026-03-31', '192.168.1.20', now() - interval '6 days'),
  ('system', 'admin@nusantarasoft.id', 'Admin User', 'excel', 'commerce.orders', 'orders_march_2026.xlsx', 1290, '2026-03-01', '2026-03-31', '192.168.1.10', now() - interval '7 days'),
  ('system', 'ops@nusantarasoft.id', 'Ops Manager', 'pdf', 'ops.runs', 'ops_runs_report.pdf', 12, '2026-04-01', '2026-04-30', '192.168.1.25', now() - interval '8 days')
) AS v(user_id, user_email, user_name, export_type, module, file_name, record_count, date_range_start, date_range_end, ip_address, created_at)
WHERE NOT EXISTS (SELECT 1 FROM data_export_logs LIMIT 1);

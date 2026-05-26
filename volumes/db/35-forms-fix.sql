INSERT INTO form_fields (id, template_id, section_title, field_type, label, description, is_required, sort_order) VALUES
('f0f10003-0000-0000-0000-000000000009', 'f0f00001-0000-0000-0000-000000000003', NULL, 'textarea', 'Audit Notes', 'Additional observations and recommendations', false, 9)
ON CONFLICT (id) DO NOTHING;

INSERT INTO form_fields (id, template_id, section_title, field_type, label, description, is_required, sort_order, options) VALUES
('f0f10003-0000-0000-0000-000000000010', 'f0f00001-0000-0000-0000-000000000003', NULL, 'select', 'Overall Compliance Rating', 'Overall assessment of security posture', true, 10, '[{"value":"compliant","label":"Fully Compliant"},{"value":"partial","label":"Partially Compliant"},{"value":"non_compliant","label":"Non-Compliant"},{"value":"critical","label":"Critical Findings"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO form_submissions (id, tenant_id, template_id, submitted_by, status, total_score, max_possible_score, percentage, grade, submitted_at) VALUES
('f0f30001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'f0f00001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'approved', 4.35, 5.00, 87.00, 'Good', NOW() - INTERVAL '5 days'),
('f0f30001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'f0f00001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'approved', 3.80, 5.00, 76.00, 'Good', NOW() - INTERVAL '3 days'),
('f0f30001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'f0f00001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'submitted', 4.70, 5.00, 94.00, 'Excellent', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO form_field_values (submission_id, field_id, value, numeric_value, score, max_score) VALUES
('f0f30001-0000-0000-0000-000000000001', 'f0f10001-0000-0000-0000-000000000002', '4', 4, 4.0, 5.0),
('f0f30001-0000-0000-0000-000000000001', 'f0f10001-0000-0000-0000-000000000003', '5', 5, 5.0, 5.0),
('f0f30001-0000-0000-0000-000000000001', 'f0f10001-0000-0000-0000-000000000004', '88', 88, 88.0, 100.0),
('f0f30001-0000-0000-0000-000000000001', 'f0f10001-0000-0000-0000-000000000005', '4', 4, 4.0, 5.0),
('f0f30001-0000-0000-0000-000000000001', 'f0f10001-0000-0000-0000-000000000006', '4', 4, 4.0, 5.0),
('f0f30001-0000-0000-0000-000000000001', 'f0f10001-0000-0000-0000-000000000012', '4', 4, 4.0, 5.0)
ON CONFLICT DO NOTHING;

INSERT INTO form_scores (tenant_id, submission_id, dimension, score, max_score, weight, weighted_score) VALUES
('00000000-0000-0000-0000-000000000010', 'f0f30001-0000-0000-0000-000000000001', 'Goals', 4.0, 5.0, 0.30, 1.20),
('00000000-0000-0000-0000-000000000010', 'f0f30001-0000-0000-0000-000000000001', 'Quality', 5.0, 5.0, 0.20, 1.00),
('00000000-0000-0000-0000-000000000010', 'f0f30001-0000-0000-0000-000000000001', 'Productivity', 4.40, 5.0, 0.20, 0.88),
('00000000-0000-0000-0000-000000000010', 'f0f30001-0000-0000-0000-000000000001', 'Initiative', 4.0, 5.0, 0.15, 0.60),
('00000000-0000-0000-0000-000000000010', 'f0f30001-0000-0000-0000-000000000001', 'Communication', 4.0, 5.0, 0.15, 0.60)
ON CONFLICT DO NOTHING;

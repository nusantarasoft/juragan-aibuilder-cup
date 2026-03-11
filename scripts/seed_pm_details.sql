-- PM Detailed Content Seeding Script for Nusantarasoft
-- Relates Charters, Risks, Sprints, and Tasks to seeded projects

BEGIN;

DO $$ 
DECLARE 
    v_tenant_id UUID := '00000000-0000-0000-0000-000000000010';
    v_owner_id UUID := '0151c942-bac0-4883-94a6-03ad6f5f52c5';
    v_prj_pmbok_id UUID := '1cb8d8ee-273a-4df4-85fa-1ed24598a07d';
    v_prj_agile_id UUID := '5da0e769-1125-4466-9b5d-ddf30c2fdc48';
    v_prj_hybrid_id UUID := '83e1d254-4d62-413e-87e3-473dd22cb92e';
    v_sprint_id UUID;
BEGIN
    -- 1. PMBOK Project Details (PRJ-0001)
    
    -- Project Charter
    INSERT INTO public.pm_project_charters (project_id, tenant_id, purpose, objectives, high_level_requirements, key_stakeholders)
    VALUES (
        v_prj_pmbok_id, v_tenant_id,
        'Modernize the city infrastructure to support smart city initiatives and improve citizen services.',
        '1. Upgrade 50% of city sensors by Q4. 2. Establish a unified data hub for public transit.',
        'High-speed fiber connectivity, IoT sensor arrays, Public transit API integration.',
        'City Council, IT Department, Transport Authority, Citizen Advocacy Groups'
    ) ON CONFLICT (project_id) DO NOTHING;

    -- Risk Register
    INSERT INTO public.pm_risk_registers (project_id, tenant_id, risk_name, description, category, probability, impact, status, owner_id)
    VALUES 
    (v_prj_pmbok_id, v_tenant_id, 'Technological Obsolescence', 'Sensor hardware may become outdated before full deployment.', 'Technical', 2, 4, 'identified', v_owner_id),
    (v_prj_pmbok_id, v_tenant_id, 'Budget Overrun', 'Sub-contractor costs exceeding initial estimates.', 'Management', 3, 5, 'analyzed', v_owner_id),
    (v_prj_pmbok_id, v_tenant_id, 'Regulatory Delay', 'Permit approvals from city council taking longer than expected.', 'External', 4, 3, 'identified', v_owner_id);

    -- EVM Initial Data
    INSERT INTO public.pm_earned_values (project_id, tenant_id, snapshot_date, planned_value, earned_value, actual_cost)
    VALUES (v_prj_pmbok_id, v_tenant_id, CURRENT_DATE - INTERVAL '7 days', 100000.00, 95000.00, 98000.00);

    -- 2. Agile Project Details (PRJ-0002)

    -- Sprint 1 (Active)
    INSERT INTO public.pm_sprints (tenant_id, project_id, name, goal, status, start_date, end_date)
    VALUES (v_tenant_id, v_prj_agile_id, 'Core Feature Sprint', 'Implement core UI components and login flow.', 'active', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '9 days')
    RETURNING id INTO v_sprint_id;

    -- Tasks for Sprint 1
    INSERT INTO public.pm_tasks (tenant_id, project_id, sprint_id, title, description, status, priority, type, assignee_id)
    VALUES 
    (v_tenant_id, v_prj_agile_id, v_sprint_id, 'Design System Implementation', 'Create a consistent set of buttons, cards, and inputs.', 'done', 'high', 'story', v_owner_id),
    (v_tenant_id, v_prj_agile_id, v_sprint_id, 'Login Logic Integration', 'Connect frontend login forms to backend auth service.', 'in_progress', 'highest', 'story', v_owner_id),
    (v_tenant_id, v_prj_agile_id, v_sprint_id, 'Fix Navigation Flashing', 'Address the flickering issue when switching dashboard tabs.', 'todo', 'medium', 'bug', v_owner_id),
    (v_tenant_id, v_prj_agile_id, v_sprint_id, 'Sidebar User Profile Card', 'Implement the profile section at the bottom of the sidebar.', 'todo', 'low', 'story', v_owner_id);

    -- Sprint 2 (Planned)
    INSERT INTO public.pm_sprints (tenant_id, project_id, name, goal, status, start_date, end_date)
    VALUES (v_tenant_id, v_prj_agile_id, 'Profile & Settings Sprint', 'Implement user profile management and application settings.', 'planned', CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '24 days');

    -- 3. Hybrid Project Details (PRJ-0003)

    -- Mix of Sprint (Agile dev) and Risk (PMBOK logistics)
    INSERT INTO public.pm_sprints (tenant_id, project_id, name, goal, status, start_date, end_date)
    VALUES (v_tenant_id, v_prj_hybrid_id, 'MVP Launch Sprint', 'Finalize MVP features for public beta.', 'active', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '12 days')
    RETURNING id INTO v_sprint_id;

    INSERT INTO public.pm_tasks (tenant_id, project_id, sprint_id, title, description, status, priority, type, assignee_id)
    VALUES (v_tenant_id, v_prj_hybrid_id, v_sprint_id, 'Final Beta Refinement', 'Tweak performance based on alpha feedback.', 'in_progress', 'high', 'story', v_owner_id);

    INSERT INTO public.pm_risk_registers (project_id, tenant_id, risk_name, description, category, probability, impact, status, owner_id)
    VALUES (v_prj_hybrid_id, v_tenant_id, 'Server Capacity Load', 'Potential crash on launch day due to high user volume.', 'Technical', 3, 5, 'identified', v_owner_id);

END $$;

COMMIT;

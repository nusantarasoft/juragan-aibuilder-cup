-- Database Seeding Script for Nusantarasoft
-- Adds sample data for Project Management and CRM modules

BEGIN;

-- 1. Setup Sample Owner (Individual + Tenant User)
-- We'll use the existing tenant: 00000000-0000-0000-0000-000000000010
-- We'll use the existing profile: 00000000-0000-0000-0000-000000000020 (System Admin)

DO $$ 
DECLARE 
    v_tenant_id UUID := '00000000-0000-0000-0000-000000000010';
    v_profile_id UUID := '00000000-0000-0000-0000-000000000020';
    v_individual_id UUID;
    v_owner_id UUID;
    v_account_id UUID;
    v_contact_id UUID;
    v_prj_pmbok_id UUID;
    v_prj_agile_id UUID;
    v_prj_hybrid_id UUID;
    v_deal_id UUID;
    v_campaign_id UUID;
BEGIN
    -- 1. Create Individual (The Person)
    INSERT INTO public.individuals (tenant_id, first_name, last_name, email, job_title, lead_status, status)
    VALUES (v_tenant_id, 'Adityo', 'Nugroho', 'adityo@nusantarasoft.com', 'CEO', 'qualified', 'active')
    RETURNING id INTO v_individual_id;

    -- 2. Create Tenant User (The System User)
    INSERT INTO public.tenant_users (tenant_id, individual_id, profile_id, title, department)
    VALUES (v_tenant_id, v_individual_id, v_profile_id, 'Chief Executive', 'Executive')
    RETURNING id INTO v_owner_id;

    -- Update individual owner
    UPDATE public.individuals SET owner_id = v_owner_id WHERE id = v_individual_id;

    -- 3. Projects (PMBOK, Agile, Hybrid)
    
    -- PMBOK Project
    INSERT INTO public.pm_projects (
        tenant_id, project_number, name, description, status, priority, budget, owner_id, methodology,
        pmbok_scope_enabled, pmbok_cost_enabled, pmbok_risk_enabled
    ) VALUES (
        v_tenant_id, 'PRJ-0001', 'Metropolis Infrastructure Upgrade', 
        'Large-scale urban infrastructure modernization following strict PMP guidelines.',
        'planning', 'high', 1500000.00, v_owner_id, 'pmbok',
        true, true, true
    ) RETURNING id INTO v_prj_pmbok_id;

    -- Agile Project
    INSERT INTO public.pm_projects (
        tenant_id, project_number, name, description, status, priority, budget, owner_id, methodology
    ) VALUES (
        v_tenant_id, 'PRJ-0002', 'Mobile App Redesign', 
        'Iterative UI/UX overhaul of the customer-facing mobile application using Scrum.',
        'active', 'medium', 50000.00, v_owner_id, 'agile'
    ) RETURNING id INTO v_prj_agile_id;

    -- Hybrid Project
    INSERT INTO public.pm_projects (
        tenant_id, project_number, name, description, status, priority, budget, owner_id, methodology,
        pmbok_risk_enabled
    ) VALUES (
        v_tenant_id, 'PRJ-0003', 'SaaS Platform Launch', 
        'Launching the new B2B SaaS platform with a mix of Agile dev and PMBOK risk management.',
        'active', 'critical', 250000.00, v_owner_id, 'hybrid',
        true
    ) RETURNING id INTO v_prj_hybrid_id;

    -- 4. CRM Entities

    -- Account
    INSERT INTO public.accounts (tenant_id, name, type, industry, website, owner_id, status)
    VALUES (v_tenant_id, 'Nusantarasoft Industries', 'customer', 'Technology', 'https://nusantarasoft.com', v_owner_id, 'active')
    RETURNING id INTO v_account_id;

    -- Contact (Link Adityo to Account)
    INSERT INTO public.contacts (tenant_id, individual_id, account_id, title, role, is_primary, owner_id)
    VALUES (v_tenant_id, v_individual_id, v_account_id, 'CEO', 'decision_maker', true, v_owner_id)
    RETURNING id INTO v_contact_id;

    -- Deal
    INSERT INTO public.deals (tenant_id, name, amount, stage, probability, close_date, account_id, contact_id, owner_id)
    VALUES (v_tenant_id, 'Enterprise License Upgrade', 50000.00, 'proposal', 60, CURRENT_DATE + INTERVAL '30 days', v_account_id, v_contact_id, v_owner_id)
    RETURNING id INTO v_deal_id;

    -- Campaign
    INSERT INTO public.campaigns (tenant_id, name, type, status, budget, expected_revenue, owner_id)
    VALUES (v_tenant_id, 'Q4 Digital Transformation Webinar', 'webinar', 'active', 5000.00, 25000.00, v_owner_id)
    RETURNING id INTO v_campaign_id;

    -- Case
    INSERT INTO public.cases (tenant_id, subject, status, priority, type, contact_id, account_id, owner_id)
    VALUES (v_tenant_id, 'SLA Inquiry - Priority Port', 'working', 'high', 'question', v_contact_id, v_account_id, v_owner_id);

    -- Activity
    INSERT INTO public.crm_activities (tenant_id, activity_type, subject, description, related_to_type, related_to_id, status, owner_id)
    VALUES (v_tenant_id, 'meeting', 'Follow-up on Enterprise Deal', 'Discussing terms and timeline for the license upgrade.', 'deal', v_deal_id, 'open', v_owner_id);

    -- Note
    INSERT INTO public.crm_notes (tenant_id, title, body, related_to_type, related_to_id, is_pinned, owner_id)
    VALUES (v_tenant_id, 'Strategic Importance', 'Key strategic partner with high growth potential in the next fiscal year.', 'account', v_account_id, true, v_owner_id);

END $$;

COMMIT;

# CRM System Design — Individual-Centric CRM

## Core Principle: Individual = Person

**Individual is THE unified representation of a person** in the entire system. Unlike Salesforce where Contact requires Account, our Individual exists independently:

```
┌─────────────────────────────────────────────────────────────────┐
│                     INDIVIDUAL (Person)                         │
│                                                                 │
│  "A real human being. Everything starts from here."             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐   An Individual can be...                     │
│  │              │                                               │
│  │  Individual  │──▶ A User/Admin (tenant_users.individual_id)  │
│  │   (Person)   │──▶ A Lead (leads.individual_id)               │
│  │              │──▶ An Account Contact (account_individuals)   │
│  │              │──▶ Just a person (no account needed!)         │
│  │              │                                               │
│  │              │   Has multiple...                              │
│  │              │──▶ Contacts (emails, phones, addresses)       │
│  │              │──▶ Activities (calls, meetings, tasks)        │
│  │              │──▶ Opportunities (via contact roles)          │
│  │              │──▶ Cases (support tickets)                    │
│  └──────────────┘                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Connection to User & Permissions

```
Individual (person identity)
    │
    ├──▶ tenant_users (if this person is a system user)
    │        │
    │        ├── profile_id → Permission Profile
    │        ├── role_id → Role Hierarchy (data visibility)
    │        └── permission_sets → Additive permissions
    │
    ├──▶ accounts (many-to-many, person works at multiple companies)
    │
    ├──▶ leads (sales qualification process for this person)
    │
    └──▶ contacts (this person's contact info: emails, phones, addresses)
```

### Key Differences from Salesforce

| Feature | Salesforce | Our System |
|---------|-----------|------------|
| Contact requires Account | ✅ Yes | ❌ No — Individual exists independently |
| Person can be without Account | ❌ No (need PersonAccount) | ✅ Yes — Individual is standalone |
| Person works at multiple companies | ❌ 1 Contact per Account | ✅ Many-to-many via `account_individuals` |
| Lead is separate entity | ✅ Yes (duplicated data) | ✅ Yes but LINKED to Individual (no duplication) |
| Contact = Person | ✅ Yes | ❌ Contact = contact INFO (email/phone/address) |
| User = Contact | ❌ Separate | ✅ User IS an Individual |

---

## Entity Relationship Diagram

```
                        ┌──────────────┐
                   ┌───▶│  Activities  │◀───┐
                   │    └──────────────┘    │
                   │                        │
   ┌───────────┐   │   ┌────────────┐      │
   │   User/   │───┼──▶│ INDIVIDUAL │◀─────┼────────────┐
   │   Admin   │   │   │  (Person)  │      │            │
   └───────────┘   │   └──────┬─────┘      │            │
   (tenant_users)  │          │             │            │
                   │    ┌─────┴──────┐      │     ┌──────┴──────┐
                   │    │  Contacts  │      │     │   Account   │
                   │    │(email/ph)  │      │     │  (Company)  │
                   │    └────────────┘      │     └──────┬──────┘
                   │                        │            │
                   │    ┌────────────┐      │     ┌──────┴──────┐
                   └───▶│    Lead    │──────┘     │Opportunity  │
                        │(sales qual)│            └──────┬──────┘
                        └────────────┘                   │
                                                  ┌──────┴──────┐
                                                  │    Cases     │
                                                  └─────────────┘
         
         ┌──────────────┐    ┌───────────────┐    ┌──────────────┐
         │   Products   │───▶│  Price Books  │    │  Campaigns   │
         └──────────────┘    └───────────────┘    └──────────────┘
```

---

## Database Schema

### The Individual (Core Person Entity)

```sql
-- ═══════════════════════════════════════════════════
-- INDIVIDUALS = THE unified person representation
-- Can exist without Account. Can be User. Can be Lead.
-- ═══════════════════════════════════════════════════
CREATE TABLE individuals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES tenant_users(id),
    
    -- ─── Personal Identity ───
    salutation VARCHAR(20),           -- Mr., Mrs., Dr., etc.
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    suffix VARCHAR(20),
    nickname VARCHAR(100),
    
    -- ─── Demographics ───
    date_of_birth DATE,
    gender VARCHAR(20),
    nationality VARCHAR(100),
    preferred_language VARCHAR(10) DEFAULT 'en',
    
    -- ─── Current Professional (primary, not tied to specific account) ───
    job_title VARCHAR(255),
    department VARCHAR(255),
    
    -- ─── Social / Web ───
    linkedin_url TEXT,
    twitter_handle VARCHAR(100),
    website TEXT,
    
    -- ─── Classification ───
    individual_type VARCHAR(50) DEFAULT 'person',
        -- 'person', 'vip', 'partner', 'vendor_contact', 'internal'
    source VARCHAR(100),              -- 'web', 'referral', 'event', 'cold_outreach', 'import'
    tags JSONB DEFAULT '[]',
    
    -- ─── Media ───
    avatar_url TEXT,
    
    -- ─── Status ───
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'deceased'
    
    -- ─── System Link ───
    -- If this Individual is a system user, this links to tenant_users
    -- (Reverse FK: tenant_users.individual_id → individuals.id)
    -- No FK here to avoid circular dependency
    
    -- ─── Custom ───
    custom_fields JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_individuals_tenant ON individuals(tenant_id);
CREATE INDEX idx_individuals_owner ON individuals(owner_id);
CREATE INDEX idx_individuals_name ON individuals(tenant_id, last_name, first_name);
CREATE INDEX idx_individuals_type ON individuals(tenant_id, individual_type);
```

### Contacts (Contact INFO for an Individual)

```sql
-- ═══════════════════════════════════════════════════
-- CONTACTS = contact information entries
-- An Individual has MANY contacts (multiple emails, phones, addresses)
-- ═══════════════════════════════════════════════════
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    individual_id UUID NOT NULL REFERENCES individuals(id) ON DELETE CASCADE,
    
    -- ─── Contact Type ───
    contact_type VARCHAR(30) NOT NULL, -- 'email', 'phone', 'address', 'social'
    label VARCHAR(50) DEFAULT 'primary',
        -- 'primary', 'work', 'home', 'other', or custom label
    
    -- ─── Belongs to which account context? (optional) ───
    -- e.g., work email at Company A, vs work email at Company B
    account_id UUID REFERENCES accounts(id),
    
    -- ─── Email ───
    email VARCHAR(255),
    
    -- ─── Phone ───
    phone_number VARCHAR(50),
    phone_country_code VARCHAR(5),
    phone_extension VARCHAR(10),
    
    -- ─── Address ───
    street_line_1 VARCHAR(255),
    street_line_2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    
    -- ─── Social ───
    social_platform VARCHAR(50),
    social_handle VARCHAR(255),
    social_url TEXT,
    
    -- ─── Flags ───
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    opt_out BOOLEAN DEFAULT false,     -- unsubscribed from communications
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_individual ON contacts(individual_id);
CREATE INDEX idx_contacts_email ON contacts(tenant_id, email);
CREATE INDEX idx_contacts_account ON contacts(account_id);
```

### Accounts (Organizations/Companies)

```sql
-- ═══════════════════════════════════════════════════
-- ACCOUNTS = Organizations / Companies
-- Individual does NOT require an Account to exist
-- ═══════════════════════════════════════════════════
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES tenant_users(id),
    
    -- ─── Company Info ───
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    account_number VARCHAR(50),
    
    -- ─── Classification ───
    account_type VARCHAR(50) DEFAULT 'prospect',
        -- 'prospect', 'customer', 'partner', 'vendor', 'competitor'
    industry VARCHAR(100),
    sub_industry VARCHAR(100),
    rating VARCHAR(20),                -- 'hot', 'warm', 'cold'
    tier VARCHAR(20),                  -- 'enterprise', 'mid_market', 'smb'
    
    -- ─── Financial ───
    annual_revenue DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    employee_count INTEGER,
    fiscal_year_end VARCHAR(10),
    
    -- ─── Contact ───
    website TEXT,
    phone VARCHAR(50),
    fax VARCHAR(50),
    
    -- ─── Billing Address ───
    billing_street VARCHAR(255),
    billing_city VARCHAR(100),
    billing_state VARCHAR(100),
    billing_postal_code VARCHAR(20),
    billing_country VARCHAR(100),
    
    -- ─── Shipping Address ───
    shipping_street VARCHAR(255),
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(100),
    shipping_postal_code VARCHAR(20),
    shipping_country VARCHAR(100),
    
    -- ─── Hierarchy ───
    parent_account_id UUID REFERENCES accounts(id),
    
    -- ─── Social ───
    linkedin_url TEXT,
    twitter_handle VARCHAR(100),
    
    -- ─── Media ───
    logo_url TEXT,
    
    -- ─── Codes ───
    sic_code VARCHAR(10),
    naics_code VARCHAR(10),
    duns_number VARCHAR(20),
    
    -- ─── Status ───
    status VARCHAR(50) DEFAULT 'active',
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accounts_tenant ON accounts(tenant_id);
CREATE INDEX idx_accounts_owner ON accounts(owner_id);
CREATE INDEX idx_accounts_name ON accounts(tenant_id, name);
CREATE INDEX idx_accounts_parent ON accounts(parent_account_id);
```

### Individual ↔ Account (Many-to-Many)

```sql
-- ═══════════════════════════════════════════════════
-- ACCOUNT_INDIVIDUALS = Person works at Company
-- One Individual can work at MANY Accounts
-- One Account can have MANY Individuals
-- ═══════════════════════════════════════════════════
CREATE TABLE account_individuals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    individual_id UUID NOT NULL REFERENCES individuals(id) ON DELETE CASCADE,
    
    -- ─── Role at this account ───
    role_at_account VARCHAR(100),      -- 'CEO', 'CTO', 'Decision Maker', 'Influencer'
    job_title_at_account VARCHAR(255), -- title specific to this account
    department_at_account VARCHAR(255),
    
    -- ─── Flags ───
    is_primary_contact BOOLEAN DEFAULT false,
    is_billing_contact BOOLEAN DEFAULT false,
    
    -- ─── Relationship ───
    relationship_type VARCHAR(50) DEFAULT 'employee',
        -- 'employee', 'consultant', 'board_member', 'contractor', 'advisor'
    
    -- ─── Tenure ───
    start_date DATE,
    end_date DATE,                     -- NULL = still active
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, individual_id)
);

CREATE INDEX idx_account_individuals_individual ON account_individuals(individual_id);
CREATE INDEX idx_account_individuals_account ON account_individuals(account_id);
```

### Leads (Sales Qualification linked to Individual)

```sql
-- ═══════════════════════════════════════════════════
-- LEADS = Sales qualification process for a person
-- Lead REFERENCES an Individual (no data duplication)
-- When converted: lead is marked converted,
--   Individual gets linked to Account + Opportunity
-- ═══════════════════════════════════════════════════
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES tenant_users(id),
    
    -- ─── Link to Individual (THE person) ───
    individual_id UUID NOT NULL REFERENCES individuals(id),
    
    -- ─── Lead-specific context (NOT duplicated from Individual) ───
    company_name VARCHAR(255),         -- the company this lead is about (may create Account on convert)
    
    -- ─── Lead Classification ───
    lead_source VARCHAR(100),
        -- 'web', 'phone_inquiry', 'partner_referral', 'trade_show', 'cold_outreach'
    status VARCHAR(50) DEFAULT 'new',
        -- 'new', 'contacted', 'working', 'qualified', 'unqualified', 'converted'
    rating VARCHAR(20),                -- 'hot', 'warm', 'cold'
    score INTEGER DEFAULT 0,           -- lead scoring
    
    -- ─── Qualification ───
    budget VARCHAR(100),               -- BANT: Budget
    authority VARCHAR(100),            -- BANT: Authority
    need TEXT,                         -- BANT: Need
    timeline VARCHAR(100),             -- BANT: Timeline
    
    -- ─── Conversion Tracking ───
    is_converted BOOLEAN DEFAULT false,
    converted_at TIMESTAMPTZ,
    converted_account_id UUID REFERENCES accounts(id),
    converted_opportunity_id UUID REFERENCES opportunities(id),
    converted_by UUID REFERENCES tenant_users(id),
    
    -- ─── Campaign ───
    campaign_id UUID REFERENCES campaigns(id),
    
    -- ─── Engagement ───
    last_activity_at TIMESTAMPTZ,
    description TEXT,
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_leads_individual ON leads(individual_id);
CREATE INDEX idx_leads_status ON leads(tenant_id, status);
CREATE INDEX idx_leads_owner ON leads(owner_id);
```

### Opportunities (Sales Pipeline)

```sql
-- ═══════════════════════════════════════════════════
-- OPPORTUNITY STAGES
-- ═══════════════════════════════════════════════════
CREATE TABLE opportunity_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    probability INTEGER DEFAULT 0,     -- 0-100
    sort_order INTEGER DEFAULT 0,
    is_closed BOOLEAN DEFAULT false,
    is_won BOOLEAN DEFAULT false,
    forecast_category VARCHAR(50),     -- 'pipeline', 'best_case', 'commit', 'closed'
    UNIQUE(tenant_id, name)
);

-- ═══════════════════════════════════════════════════
-- OPPORTUNITIES
-- ═══════════════════════════════════════════════════
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES tenant_users(id),
    
    -- ─── Core ───
    name VARCHAR(255) NOT NULL,
    account_id UUID REFERENCES accounts(id),
    stage_id UUID NOT NULL REFERENCES opportunity_stages(id),
    
    -- ─── Financial ───
    amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    expected_revenue DECIMAL(15,2),
    
    -- ─── Timeline ───
    close_date DATE,
    
    -- ─── Classification ───
    opportunity_type VARCHAR(50),      -- 'new_business', 'existing_business', 'renewal'
    lead_source VARCHAR(100),
    probability INTEGER DEFAULT 0,
    next_step TEXT,
    
    -- ─── Primary Contact ───
    primary_contact_id UUID REFERENCES individuals(id),
    
    -- ─── Campaign ───
    campaign_id UUID REFERENCES campaigns(id),
    
    -- ─── Status ───
    is_closed BOOLEAN DEFAULT false,
    is_won BOOLEAN DEFAULT false,
    closed_at TIMESTAMPTZ,
    loss_reason VARCHAR(255),
    competitor VARCHAR(255),
    
    description TEXT,
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Opportunity ↔ Individual contact roles
CREATE TABLE opportunity_contact_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    individual_id UUID NOT NULL REFERENCES individuals(id) ON DELETE CASCADE,
    role VARCHAR(100),                 -- 'decision_maker', 'influencer', 'evaluator', 'champion'
    is_primary BOOLEAN DEFAULT false,
    UNIQUE(opportunity_id, individual_id)
);

-- Opportunity Line Items
CREATE TABLE opportunity_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    price_book_entry_id UUID REFERENCES price_book_entries(id),
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    description TEXT,
    sort_order INTEGER DEFAULT 0
);
```

### Cases (Support/Service)

```sql
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES tenant_users(id),
    
    case_number SERIAL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- ─── Classification ───
    status VARCHAR(50) DEFAULT 'new',
        -- 'new', 'in_progress', 'escalated', 'on_hold', 'closed'
    priority VARCHAR(20) DEFAULT 'medium',
    case_type VARCHAR(50),             -- 'question', 'problem', 'feature_request', 'incident'
    case_origin VARCHAR(50),           -- 'web', 'email', 'phone', 'chat'
    category VARCHAR(100),
    sub_category VARCHAR(100),
    
    -- ─── Related ───
    account_id UUID REFERENCES accounts(id),
    individual_id UUID REFERENCES individuals(id),
    
    -- ─── Resolution ───
    resolution TEXT,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    
    -- ─── SLA ───
    sla_due_date TIMESTAMPTZ,
    first_response_at TIMESTAMPTZ,
    is_escalated BOOLEAN DEFAULT false,
    escalated_at TIMESTAMPTZ,
    
    -- ─── Parent ───
    parent_case_id UUID REFERENCES cases(id),
    
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE case_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES tenant_users(id),
    body TEXT NOT NULL,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Activities

```sql
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES tenant_users(id),
    
    -- ─── Type ───
    activity_type VARCHAR(30) NOT NULL, -- 'task', 'event', 'call', 'email', 'meeting'
    
    -- ─── Core ───
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- ─── Schedule ───
    start_datetime TIMESTAMPTZ,
    end_datetime TIMESTAMPTZ,
    due_date DATE,
    is_all_day BOOLEAN DEFAULT false,
    
    -- ─── Status ───
    status VARCHAR(50) DEFAULT 'not_started',
    priority VARCHAR(20) DEFAULT 'normal',
    
    -- ─── Call specifics ───
    call_direction VARCHAR(10),        -- 'inbound', 'outbound'
    call_duration_seconds INTEGER,
    call_result VARCHAR(50),
    
    -- ─── Email specifics ───
    email_from VARCHAR(255),
    email_to VARCHAR(255),
    email_cc VARCHAR(255),
    
    -- ─── Location ───
    location VARCHAR(255),
    meeting_url TEXT,
    
    -- ─── Related (polymorphic) ───
    related_to_type VARCHAR(50),       -- 'account', 'opportunity', 'case', 'lead', 'project'
    related_to_id UUID,
    
    -- ─── Individual ───
    individual_id UUID REFERENCES individuals(id),
    
    -- ─── Recurrence ───
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern JSONB,
    
    completed_at TIMESTAMPTZ,
    reminder_datetime TIMESTAMPTZ,
    
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_related ON activities(related_to_type, related_to_id);
CREATE INDEX idx_activities_individual ON activities(individual_id);
```

### Products, Price Books, Campaigns

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    product_code VARCHAR(50),
    description TEXT,
    family VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE price_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_standard BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE price_book_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    price_book_id UUID NOT NULL REFERENCES price_books(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    unit_price DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    UNIQUE(price_book_id, product_id)
);

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES tenant_users(id),
    
    name VARCHAR(255) NOT NULL,
    campaign_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'planned',
    
    start_date DATE,
    end_date DATE,
    
    budgeted_cost DECIMAL(15,2),
    actual_cost DECIMAL(15,2),
    expected_revenue DECIMAL(15,2),
    
    num_sent INTEGER DEFAULT 0,
    expected_response DECIMAL(5,2),
    
    description TEXT,
    parent_campaign_id UUID REFERENCES campaigns(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE campaign_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    individual_id UUID NOT NULL REFERENCES individuals(id),
    lead_id UUID REFERENCES leads(id), -- optional: if added as a lead
    status VARCHAR(50) DEFAULT 'sent',
    first_responded_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Notes (Universal)

```sql
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES tenant_users(id),
    
    title VARCHAR(255),
    body TEXT NOT NULL,
    
    parent_type VARCHAR(50) NOT NULL,  -- 'individual', 'account', 'lead', 'opportunity', 'case'
    parent_id UUID NOT NULL,
    
    is_private BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_parent ON notes(parent_type, parent_id);
```

---

## Lead Conversion Flow

```
LEAD CONVERSION:

1. Lead exists → linked to Individual (person data lives on Individual)
2. User clicks "Convert Lead"
3. Conversion wizard:
   a. Account: Create new OR link to existing Account
   b. Opportunity: Optionally create new Opportunity
   c. Preview: Show what will happen
4. On convert:
   - Create/link Account → add Individual to account_individuals
   - Create Opportunity (optional) → primary_contact = Individual
   - Update lead: is_converted=true, converted_at, converted_account_id, converted_opportunity_id
   - Lead.status = 'converted'
   - Individual remains unchanged (it's the SAME person)
```

---

## UI Pages

### `/admin/crm`

| Page | Purpose |
|------|---------|
| `/crm` | Dashboard: pipeline, recent activities, key metrics |
| `/crm/individuals` | List/search all people. Filters: type, status, account, has lead |
| `/crm/individuals/[id]` | Detail: person info, contacts (email/phone/address), accounts (where they work), leads, activities, opportunities, cases |
| `/crm/accounts` | List with hierarchy indicator, filters |
| `/crm/accounts/[id]` | Detail: company info, people (individuals), opportunities, cases, activities |
| `/crm/leads` | Kanban (by status) + list. Lead scoring, bulk assign |
| `/crm/leads/[id]` | Detail: Individual info pane, BANT qualification, convert button, activities |
| `/crm/opportunities` | Pipeline board (Kanban by stage), list view, forecasting |
| `/crm/opportunities/[id]` | Detail: stage path, products, contact roles, activities |
| `/crm/cases` | List with priority/status filters, SLA indicators |
| `/crm/cases/[id]` | Detail: timeline, comments, resolution, SLA clock |
| `/crm/activities` | Calendar view + list, filter by type |
| `/crm/products` | Product catalog with price books |
| `/crm/campaigns` | Campaign list with ROI metrics |
| `/crm/campaigns/[id]` | Detail: members, hierarchy, metrics |

### Key UI Components

1. **Individual Detail Page** — Shows person + all their contacts (emails, phones, addresses), accounts they work at, lead status, activity timeline
2. **Pipeline Board** — Kanban columns by opportunity stage
3. **Lead Conversion Wizard** — Multi-step: select/create Account → create Opportunity
4. **Contact Card** — Inline editable list of contact info (grouped by account context)
5. **Account Hierarchy** — Tree view of parent-child accounts with linked individuals
6. **Activity Timeline** — Chronological feed on any record
7. **Related Records Tabs** — Tab view on detail pages

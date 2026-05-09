-- ═══════════════════════════════════════════════════════════
-- Accounting Module — Phase 3: AP/AR Invoices
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS acct_invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    invoice_type    VARCHAR(20) NOT NULL,         -- 'payable' (bill) or 'receivable' (invoice)
    invoice_number  VARCHAR(30) NOT NULL,
    contact_id      UUID REFERENCES acct_contacts(id),
    contact_name    VARCHAR(255),
    invoice_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date        DATE NOT NULL,
    currency_code   VARCHAR(3) DEFAULT 'IDR',
    exchange_rate   NUMERIC(18,8) DEFAULT 1.0,
    subtotal        NUMERIC(18,4) DEFAULT 0,
    tax_amount      NUMERIC(18,4) DEFAULT 0,
    total_amount    NUMERIC(18,4) DEFAULT 0,
    amount_paid     NUMERIC(18,4) DEFAULT 0,
    amount_due      NUMERIC(18,4) DEFAULT 0,
    reference       VARCHAR(100),
    notes           TEXT,
    account_id      UUID REFERENCES acct_accounts(id),  -- AP or AR account
    journal_id      UUID REFERENCES acct_journals(id),  -- linked journal entry
    payment_journal_id UUID REFERENCES acct_journals(id),
    status          VARCHAR(20) DEFAULT 'draft',  -- draft, sent, partial, paid, overdue, cancelled
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS acct_invoice_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id      UUID NOT NULL REFERENCES acct_invoices(id) ON DELETE CASCADE,
    line_number     INT NOT NULL DEFAULT 1,
    description     TEXT NOT NULL,
    account_id      UUID REFERENCES acct_accounts(id),  -- expense/revenue account
    quantity        NUMERIC(18,4) DEFAULT 1,
    unit_price      NUMERIC(18,4) DEFAULT 0,
    amount          NUMERIC(18,4) DEFAULT 0,
    tax_id          UUID REFERENCES acct_taxes(id),
    tax_amount      NUMERIC(18,4) DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_acct_invoices_tenant ON acct_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_acct_invoices_type ON acct_invoices(tenant_id, invoice_type);
CREATE INDEX IF NOT EXISTS idx_acct_invoices_status ON acct_invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_acct_invoices_contact ON acct_invoices(contact_id);
CREATE INDEX IF NOT EXISTS idx_acct_invoices_due ON acct_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_acct_invoice_lines ON acct_invoice_lines(invoice_id);

-- Grant access
GRANT ALL ON acct_invoices TO anon, authenticated, service_role, authenticator;
GRANT ALL ON acct_invoice_lines TO anon, authenticated, service_role, authenticator;

-- ═══════════════════════════════════════════════════════════
-- Seed: Sample Contacts (Vendors & Customers)
-- ═══════════════════════════════════════════════════════════
INSERT INTO acct_contacts (tenant_id, contact_type, code, name, company, email, phone, city, tax_id_number, payment_terms)
VALUES
    ('00000000-0000-0000-0000-000000000010', 'vendor', 'V-001', 'PT Sumber Makmur', 'PT Sumber Makmur', 'purchasing@sumbermakmur.co.id', '021-5551234', 'Jakarta', '01.234.567.8-012.000', 30),
    ('00000000-0000-0000-0000-000000000010', 'vendor', 'V-002', 'CV Teknik Mandiri', 'CV Teknik Mandiri', 'sales@teknikmandiri.com', '031-4445678', 'Surabaya', '02.345.678.9-013.000', 14),
    ('00000000-0000-0000-0000-000000000010', 'vendor', 'V-003', 'PT Indo Logistik', 'PT Indo Logistik', 'info@indologistik.co.id', '021-7778899', 'Jakarta', '03.456.789.0-014.000', 45),
    ('00000000-0000-0000-0000-000000000010', 'customer', 'C-001', 'PT Maju Bersama', 'PT Maju Bersama', 'finance@majubersama.co.id', '021-3331122', 'Jakarta', '04.567.890.1-015.000', 30),
    ('00000000-0000-0000-0000-000000000010', 'customer', 'C-002', 'CV Karya Utama', 'CV Karya Utama', 'admin@karyautama.com', '022-6665544', 'Bandung', '05.678.901.2-016.000', 14),
    ('00000000-0000-0000-0000-000000000010', 'customer', 'C-003', 'PT Nusantara Jaya', 'PT Nusantara Jaya', 'ap@nusantarajaya.co.id', '021-9998877', 'Jakarta', '06.789.012.3-017.000', 30),
    ('00000000-0000-0000-0000-000000000010', 'customer', 'C-004', 'PT Digital Kreatif', 'PT Digital Kreatif', 'billing@digitalkreatif.id', '021-1112233', 'Jakarta', '07.890.123.4-018.000', 15)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- Seed: Sample Invoices
-- ═══════════════════════════════════════════════════════════
DO $$
DECLARE
    tid UUID := '00000000-0000-0000-0000-000000000010';
    c_v1 UUID; c_v2 UUID; c_c1 UUID; c_c2 UUID; c_c3 UUID; c_c4 UUID;
    a_ap UUID; a_ar UUID; a_mat UUID; a_sales UUID; a_service UUID;
    inv1 UUID; inv2 UUID; inv3 UUID; inv4 UUID; inv5 UUID; inv6 UUID;
BEGIN
    SELECT id INTO c_v1 FROM acct_contacts WHERE tenant_id=tid AND code='V-001' LIMIT 1;
    SELECT id INTO c_v2 FROM acct_contacts WHERE tenant_id=tid AND code='V-002' LIMIT 1;
    SELECT id INTO c_c1 FROM acct_contacts WHERE tenant_id=tid AND code='C-001' LIMIT 1;
    SELECT id INTO c_c2 FROM acct_contacts WHERE tenant_id=tid AND code='C-002' LIMIT 1;
    SELECT id INTO c_c3 FROM acct_contacts WHERE tenant_id=tid AND code='C-003' LIMIT 1;
    SELECT id INTO c_c4 FROM acct_contacts WHERE tenant_id=tid AND code='C-004' LIMIT 1;
    SELECT id INTO a_ap FROM acct_accounts WHERE tenant_id=tid AND account_code='2110';
    SELECT id INTO a_ar FROM acct_accounts WHERE tenant_id=tid AND account_code='1210';
    SELECT id INTO a_mat FROM acct_accounts WHERE tenant_id=tid AND account_code='5110';
    SELECT id INTO a_sales FROM acct_accounts WHERE tenant_id=tid AND account_code='4100';
    SELECT id INTO a_service FROM acct_accounts WHERE tenant_id=tid AND account_code='4200';

    -- AP invoices (bills from vendors)
    INSERT INTO acct_invoices (id,tenant_id,invoice_type,invoice_number,contact_id,contact_name,invoice_date,due_date,subtotal,tax_amount,total_amount,amount_paid,amount_due,reference,notes,account_id,status) VALUES
    (gen_random_uuid(),tid,'payable','BILL-2026-001',c_v1,'PT Sumber Makmur','2026-01-05','2026-02-04',100000000,11000000,111000000,111000000,0,'PO-2026-001','Bahan baku besi dan aluminium',a_ap,'paid')
    RETURNING id INTO inv1;
    INSERT INTO acct_invoice_lines (invoice_id,line_number,description,account_id,quantity,unit_price,amount) VALUES
    (inv1,1,'Besi hollow 4x4 (500 batang)',a_mat,500,120000,60000000),
    (inv1,2,'Aluminium sheet 1mm (200 lembar)',a_mat,200,200000,40000000);

    INSERT INTO acct_invoices (id,tenant_id,invoice_type,invoice_number,contact_id,contact_name,invoice_date,due_date,subtotal,tax_amount,total_amount,amount_paid,amount_due,reference,notes,account_id,status) VALUES
    (gen_random_uuid(),tid,'payable','BILL-2026-002',c_v2,'CV Teknik Mandiri','2026-02-10','2026-02-24',35000000,3850000,38850000,0,38850000,'PO-2026-003','Jasa perawatan mesin CNC',a_ap,'sent')
    RETURNING id INTO inv2;
    INSERT INTO acct_invoice_lines (invoice_id,line_number,description,account_id,quantity,unit_price,amount) VALUES
    (inv2,1,'Servis mesin CNC Fanuc',a_mat,1,25000000,25000000),
    (inv2,2,'Spare parts bearing & seal',a_mat,1,10000000,10000000);

    INSERT INTO acct_invoices (id,tenant_id,invoice_type,invoice_number,contact_id,contact_name,invoice_date,due_date,subtotal,tax_amount,total_amount,amount_paid,amount_due,reference,notes,account_id,status) VALUES
    (gen_random_uuid(),tid,'payable','BILL-2026-003',c_v1,'PT Sumber Makmur','2026-03-15','2026-04-14',80000000,8800000,88800000,44400000,44400000,'PO-2026-006','Bahan baku Q2',a_ap,'partial')
    RETURNING id INTO inv3;
    INSERT INTO acct_invoice_lines (invoice_id,line_number,description,account_id,quantity,unit_price,amount) VALUES
    (inv3,1,'Besi hollow 6x6 (300 batang)',a_mat,300,180000,54000000),
    (inv3,2,'Pipa galvanis 2 inch (100 batang)',a_mat,100,260000,26000000);

    -- AR invoices (invoices to customers)
    INSERT INTO acct_invoices (id,tenant_id,invoice_type,invoice_number,contact_id,contact_name,invoice_date,due_date,subtotal,tax_amount,total_amount,amount_paid,amount_due,reference,notes,account_id,status) VALUES
    (gen_random_uuid(),tid,'receivable','INV-2026-001',c_c1,'PT Maju Bersama','2026-01-10','2026-02-09',160000000,17600000,177600000,177600000,0,'SO-2026-001','Penjualan produk manufaktur',a_ar,'paid')
    RETURNING id INTO inv4;
    INSERT INTO acct_invoice_lines (invoice_id,line_number,description,account_id,quantity,unit_price,amount) VALUES
    (inv4,1,'Custom metal bracket A-100 (1000 pcs)',a_sales,1000,100000,100000000),
    (inv4,2,'Assembly & finishing',a_sales,1000,60000,60000000);

    INSERT INTO acct_invoices (id,tenant_id,invoice_type,invoice_number,contact_id,contact_name,invoice_date,due_date,subtotal,tax_amount,total_amount,amount_paid,amount_due,reference,notes,account_id,status) VALUES
    (gen_random_uuid(),tid,'receivable','INV-2026-002',c_c2,'CV Karya Utama','2026-02-08','2026-02-22',50000000,5500000,55500000,55500000,0,'SO-2026-002','Jasa konsultasi IT',a_ar,'paid')
    RETURNING id INTO inv5;
    INSERT INTO acct_invoice_lines (invoice_id,line_number,description,account_id,quantity,unit_price,amount) VALUES
    (inv5,1,'Konsultasi infrastruktur IT (10 hari)',a_service,10,5000000,50000000);

    INSERT INTO acct_invoices (id,tenant_id,invoice_type,invoice_number,contact_id,contact_name,invoice_date,due_date,subtotal,tax_amount,total_amount,amount_paid,amount_due,reference,notes,account_id,status) VALUES
    (gen_random_uuid(),tid,'receivable','INV-2026-003',c_c3,'PT Nusantara Jaya','2026-03-12','2026-04-11',300000000,33000000,333000000,0,333000000,'SO-2026-003','Penjualan produk batch Q1',a_ar,'sent')
    RETURNING id INTO inv6;
    INSERT INTO acct_invoice_lines (invoice_id,line_number,description,account_id,quantity,unit_price,amount) VALUES
    (inv6,1,'Metal frame industrial (500 unit)',a_sales,500,400000,200000000),
    (inv6,2,'Welding & coating service',a_sales,500,200000,100000000);

    -- Draft invoice
    INSERT INTO acct_invoices (tenant_id,invoice_type,invoice_number,contact_id,contact_name,invoice_date,due_date,subtotal,tax_amount,total_amount,amount_paid,amount_due,notes,account_id,status)
    VALUES (tid,'receivable','INV-2026-004',c_c4,'PT Digital Kreatif','2026-04-02','2026-04-17',80000000,8800000,88800000,0,88800000,'[DRAFT] Jasa development web portal',a_ar,'draft');

    RAISE NOTICE 'Phase 3 AP/AR invoices seeded: 3 AP + 4 AR invoices';
END $$;

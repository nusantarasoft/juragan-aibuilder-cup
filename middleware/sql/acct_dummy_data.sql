-- Dummy Accounting Data for NusantaraSoft
-- Realistic Indonesian SME transactions (Jan-Mar 2026)
DO $$
DECLARE
    tid UUID := '00000000-0000-0000-0000-000000000010';
    -- Account IDs (looked up from DB)
    a_cash UUID; a_bank UUID; a_petty UUID; a_ar UUID; a_ppn_in UUID;
    a_merch UUID; a_equip UUID; a_vehicles UUID; a_acc_dep UUID;
    a_ap UUID; a_ppn_out UUID; a_pph21 UUID; a_accrued UUID;
    a_capital UUID; a_retained UUID;
    a_sales UUID; a_service UUID; a_other_inc UUID; a_interest UUID;
    a_materials UUID; a_labor UUID; a_salaries UUID; a_rent UUID;
    a_utilities UUID; a_office UUID; a_deprec UUID; a_insurance UUID;
    a_profess UUID; a_marketing UUID; a_travel UUID; a_bank_chg UUID;
    -- Journal IDs
    j1 UUID; j2 UUID; j3 UUID; j4 UUID; j5 UUID; j6 UUID; j7 UUID;
    j8 UUID; j9 UUID; j10 UUID; j11 UUID; j12 UUID; j13 UUID; j14 UUID; j15 UUID;
BEGIN
    -- Lookup account IDs
    SELECT id INTO a_cash FROM acct_accounts WHERE tenant_id=tid AND account_code='1110';
    SELECT id INTO a_bank FROM acct_accounts WHERE tenant_id=tid AND account_code='1120';
    SELECT id INTO a_petty FROM acct_accounts WHERE tenant_id=tid AND account_code='1140';
    SELECT id INTO a_ar FROM acct_accounts WHERE tenant_id=tid AND account_code='1210';
    SELECT id INTO a_ppn_in FROM acct_accounts WHERE tenant_id=tid AND account_code='1230';
    SELECT id INTO a_merch FROM acct_accounts WHERE tenant_id=tid AND account_code='1310';
    SELECT id INTO a_equip FROM acct_accounts WHERE tenant_id=tid AND account_code='1410';
    SELECT id INTO a_vehicles FROM acct_accounts WHERE tenant_id=tid AND account_code='1420';
    SELECT id INTO a_acc_dep FROM acct_accounts WHERE tenant_id=tid AND account_code='1490';
    SELECT id INTO a_ap FROM acct_accounts WHERE tenant_id=tid AND account_code='2110';
    SELECT id INTO a_ppn_out FROM acct_accounts WHERE tenant_id=tid AND account_code='2120';
    SELECT id INTO a_pph21 FROM acct_accounts WHERE tenant_id=tid AND account_code='2130';
    SELECT id INTO a_accrued FROM acct_accounts WHERE tenant_id=tid AND account_code='2150';
    SELECT id INTO a_capital FROM acct_accounts WHERE tenant_id=tid AND account_code='3100';
    SELECT id INTO a_retained FROM acct_accounts WHERE tenant_id=tid AND account_code='3200';
    SELECT id INTO a_sales FROM acct_accounts WHERE tenant_id=tid AND account_code='4100';
    SELECT id INTO a_service FROM acct_accounts WHERE tenant_id=tid AND account_code='4200';
    SELECT id INTO a_other_inc FROM acct_accounts WHERE tenant_id=tid AND account_code='4300';
    SELECT id INTO a_interest FROM acct_accounts WHERE tenant_id=tid AND account_code='4400';
    SELECT id INTO a_materials FROM acct_accounts WHERE tenant_id=tid AND account_code='5110';
    SELECT id INTO a_labor FROM acct_accounts WHERE tenant_id=tid AND account_code='5120';
    SELECT id INTO a_salaries FROM acct_accounts WHERE tenant_id=tid AND account_code='5210';
    SELECT id INTO a_rent FROM acct_accounts WHERE tenant_id=tid AND account_code='5220';
    SELECT id INTO a_utilities FROM acct_accounts WHERE tenant_id=tid AND account_code='5230';
    SELECT id INTO a_office FROM acct_accounts WHERE tenant_id=tid AND account_code='5240';
    SELECT id INTO a_deprec FROM acct_accounts WHERE tenant_id=tid AND account_code='5250';
    SELECT id INTO a_insurance FROM acct_accounts WHERE tenant_id=tid AND account_code='5260';
    SELECT id INTO a_profess FROM acct_accounts WHERE tenant_id=tid AND account_code='5270';
    SELECT id INTO a_marketing FROM acct_accounts WHERE tenant_id=tid AND account_code='5280';
    SELECT id INTO a_travel FROM acct_accounts WHERE tenant_id=tid AND account_code='5290';
    SELECT id INTO a_bank_chg FROM acct_accounts WHERE tenant_id=tid AND account_code='5300';

    -- ═══ JV-01: Owner's Capital Investment ═══
    INSERT INTO acct_journals (id,tenant_id,journal_number,journal_type,journal_date,reference,memo,total_debit,total_credit,status,posted_by,posted_at)
    VALUES (gen_random_uuid(),tid,'JV-2026-0001','opening','2026-01-02','CAPITAL-001','Setoran modal awal pemilik',500000000,500000000,'posted','admin',NOW())
    RETURNING id INTO j1;
    INSERT INTO acct_journal_lines (journal_id,line_number,account_id,description,debit,credit,base_debit,base_credit) VALUES
    (j1,1,a_bank,'Setoran modal ke Bank BCA IDR',500000000,0,500000000,0),
    (j1,2,a_capital,'Modal disetor pemilik',0,500000000,0,500000000);

    -- ═══ JV-02: Purchase inventory from supplier ═══
    INSERT INTO acct_journals (id,tenant_id,journal_number,journal_type,journal_date,reference,memo,total_debit,total_credit,status,posted_by,posted_at)
    VALUES (gen_random_uuid(),tid,'JV-2026-0002','general','2026-01-05','PO-2026-001','Pembelian bahan baku dari PT Sumber Makmur',111000000,111000000,'posted','admin',NOW())
    RETURNING id INTO j2;
    INSERT INTO acct_journal_lines (journal_id,line_number,account_id,description,debit,credit,base_debit,base_credit) VALUES
    (j2,1,a_materials,'Bahan baku - besi dan aluminium',100000000,0,100000000,0),
    (j2,2,a_ppn_in,'PPN Masukan 11%',11000000,0,11000000,0),
    (j2,3,a_ap,'Hutang ke PT Sumber Makmur',0,111000000,0,111000000);

    -- ═══ JV-03: Sales invoice - PT Maju Bersama ═══
    INSERT INTO acct_journals (id,tenant_id,journal_number,journal_type,journal_date,reference,memo,total_debit,total_credit,status,posted_by,posted_at)
    VALUES (gen_random_uuid(),tid,'JV-2026-0003','general','2026-01-10','INV-2026-001','Penjualan barang ke PT Maju Bersama',177600000,177600000,'posted','admin',NOW())
    RETURNING id INTO j3;
    INSERT INTO acct_journal_lines (journal_id,line_number,account_id,description,debit,credit,base_debit,base_credit) VALUES
    (j3,1,a_ar,'Piutang PT Maju Bersama',177600000,0,177600000,0),
    (j3,2,a_sales,'Penjualan produk manufaktur',0,160000000,0,160000000),
    (j3,3,a_ppn_out,'PPN Keluaran 11%',0,17600000,0,17600000);

    -- ═══ JV-04: Monthly rent payment ═══
    INSERT INTO acct_journals (id,tenant_id,journal_number,journal_type,journal_date,reference,memo,total_debit,total_credit,status,posted_by,posted_at)
    VALUES (gen_random_uuid(),tid,'JV-2026-0004','general','2026-01-15','RENT-JAN','Pembayaran sewa kantor dan gudang Januari',25000000,25000000,'posted','admin',NOW())
    RETURNING id INTO j4;
    INSERT INTO acct_journal_lines (journal_id,line_number,account_id,description,debit,credit,base_debit,base_credit) VALUES
    (j4,1,a_rent,'Sewa kantor Jl. Sudirman - Januari',15000000,0,15000000,0),
    (j4,2,a_rent,'Sewa gudang Cikarang - Januari',10000000,0,10000000,0),
    (j4,3,a_bank,'Transfer Bank BCA',0,25000000,0,25000000);

    -- ═══ JV-05: January payroll ═══
    INSERT INTO acct_journals (id,tenant_id,journal_number,journal_type,journal_date,reference,memo,total_debit,total_credit,status,posted_by,posted_at)
    VALUES (gen_random_uuid(),tid,'JV-2026-0005','general','2026-01-25','PAYROLL-JAN','Gaji karyawan bulan Januari (15 orang)',85000000,85000000,'posted','admin',NOW())
    RETURNING id INTO j5;
    INSERT INTO acct_journal_lines (journal_id,line_number,account_id,description,debit,credit,base_debit,base_credit) VALUES
    (j5,1,a_salaries,'Gaji pokok 15 karyawan',75000000,0,75000000,0),
    (j5,2,a_salaries,'Tunjangan makan & transport',10000000,0,10000000,0),
    (j5,3,a_bank,'Transfer gaji via Bank BCA',0,80000000,0,80000000),
    (j5,4,a_pph21,'PPh 21 dipotong',0,5000000,0,5000000);

    -- ═══ JV-06: Customer payment received ═══
    INSERT INTO acct_journals (id,tenant_id,journal_number,journal_type,journal_date,reference,memo,total_debit,total_credit,status,posted_by,posted_at)
    VALUES (gen_random_uuid(),tid,'JV-2026-0006','general','2026-01-28','RCV-2026-001','Pembayaran dari PT Maju Bersama',177600000,177600000,'posted','admin',NOW())
    RETURNING id INTO j6;
    INSERT INTO acct_journal_lines (journal_id,line_number,account_id,description,debit,credit,base_debit,base_credit) VALUES
    (j6,1,a_bank,'Transfer masuk dari PT Maju Bersama',177600000,0,177600000,0),
    (j6,2,a_ar,'Pelunasan INV-2026-001',0,177600000,0,177600000);

    -- ═══ JV-07: Utilities & office expenses ═══
    INSERT INTO acct_journals (id,tenant_id,journal_number,journal_type,journal_date,reference,memo,total_debit,total_credit,status,posted_by,posted_at)
    VALUES (gen_random_uuid(),tid,'JV-2026-0007','general','2026-01-30','UTIL-JAN','Biaya listrik, air, internet Januari',8500000,8500000,'posted','admin',NOW())
    RETURNING id INTO j7;
    INSERT INTO acct_journal_lines (journal_id,line_number,account_id,description,debit,credit,base_debit,base_credit) VALUES
    (j7,1,a_utilities,'PLN - listrik kantor & gudang',4500000,0,4500000,0),
    (j7,2,a_utilities,'PDAM - air',800000,0,800000,0),
    (j7,3,a_utilities,'Internet Biznet 100Mbps',1200000,0,1200000,0),
    (j7,4,a_office,'ATK dan perlengkapan kantor',2000000,0,2000000,0),
    (j7,5,a_bank,'Transfer Bank BCA',0,8500000,0,8500000);

    -- ═══ JV-08: Feb sales - CV Karya Utama ═══
    INSERT INTO acct_journals (id,tenant_id,journal_number,journal_type,journal_date,reference,memo,total_debit,total_credit,status,posted_by,posted_at)
    VALUES (gen_random_uuid(),tid,'JV-2026-0008','general','2026-02-08','INV-2026-002','Penjualan jasa konsultasi ke CV Karya Utama',55500000,55500000,'posted','admin',NOW())
    RETURNING id INTO j8;
    INSERT INTO acct_journal_lines (journal_id,line_number,account_id,description,debit,credit,base_debit,base_credit) VALUES
    (j8,1,a_ar,'Piutang CV Karya Utama',55500000,0,55500000,0),
    (j8,2,a_service,'Jasa konsultasi IT - Feb',0,50000000,0,50000000),
    (j8,3,a_ppn_out,'PPN Keluaran 11%',0,5500000,0,5500000);

    -- ═══ JV-09: Feb payroll ═══
    INSERT INTO acct_journals (id,tenant_id,journal_number,journal_type,journal_date,reference,memo,total_debit,total_credit,status,posted_by,posted_at)
    VALUES (gen_random_uuid(),tid,'JV-2026-0009','general','2026-02-25','PAYROLL-FEB','Gaji karyawan bulan Februari',85000000,85000000,'posted','admin',NOW())
    RETURNING id INTO j9;
    INSERT INTO acct_journal_lines (journal_id,line_number,account_id,description,debit,credit,base_debit,base_credit) VALUES
    (j9,1,a_salaries,'Gaji pokok 15 karyawan',75000000,0,75000000,0),
    (j9,2,a_salaries,'Tunjangan makan & transport',10000000,0,10000000,0),
    (j9,3,a_bank,'Transfer gaji via Bank BCA',0,80000000,0,80000000),
    (j9,4,a_pph21,'PPh 21 dipotong',0,5000000,0,5000000);

    -- ═══ JV-10: Feb rent + marketing ═══
    INSERT INTO acct_journals (id,tenant_id,journal_number,journal_type,journal_date,reference,memo,total_debit,total_credit,status,posted_by,posted_at)
    VALUES (gen_random_uuid(),tid,'JV-2026-0010','general','2026-02-28','OPEX-FEB','Biaya operasional Februari',43500000,43500000,'posted','admin',NOW())
    RETURNING id INTO j10;
    INSERT INTO acct_journal_lines (journal_id,line_number,account_id,description,debit,credit,base_debit,base_credit) VALUES
    (j10,1,a_rent,'Sewa kantor & gudang Februari',25000000,0,25000000,0),
    (j10,2,a_marketing,'Google Ads & social media',8000000,0,8000000,0),
    (j10,3,a_insurance,'Asuransi karyawan BPJS',4000000,0,4000000,0),
    (j10,4,a_utilities,'Listrik, air, internet Feb',6500000,0,6500000,0),
    (j10,5,a_bank,'Transfer Bank BCA',0,43500000,0,43500000);

    -- ═══ JV-11: Equipment purchase ═══
    INSERT INTO acct_journals (id,tenant_id,journal_number,journal_type,journal_date,reference,memo,total_debit,total_credit,status,posted_by,posted_at)
    VALUES (gen_random_uuid(),tid,'JV-2026-0011','general','2026-03-03','PO-2026-005','Pembelian mesin CNC baru',222000000,222000000,'posted','admin',NOW())
    RETURNING id INTO j11;
    INSERT INTO acct_journal_lines (journal_id,line_number,account_id,description,debit,credit,base_debit,base_credit) VALUES
    (j11,1,a_equip,'Mesin CNC Fanuc Robodrill',200000000,0,200000000,0),
    (j11,2,a_ppn_in,'PPN Masukan 11%',22000000,0,22000000,0),
    (j11,3,a_bank,'DP 50% Bank BCA',0,111000000,0,111000000),
    (j11,4,a_ap,'Hutang sisa 50%',0,111000000,0,111000000);

    -- ═══ JV-12: March big sales ═══
    INSERT INTO acct_journals (id,tenant_id,journal_number,journal_type,journal_date,reference,memo,total_debit,total_credit,status,posted_by,posted_at)
    VALUES (gen_random_uuid(),tid,'JV-2026-0012','general','2026-03-12','INV-2026-003','Penjualan besar ke PT Nusantara Jaya',333000000,333000000,'posted','admin',NOW())
    RETURNING id INTO j12;
    INSERT INTO acct_journal_lines (journal_id,line_number,account_id,description,debit,credit,base_debit,base_credit) VALUES
    (j12,1,a_ar,'Piutang PT Nusantara Jaya',333000000,0,333000000,0),
    (j12,2,a_sales,'Penjualan produk batch Q1',0,300000000,0,300000000),
    (j12,3,a_ppn_out,'PPN Keluaran 11%',0,33000000,0,33000000);

    -- ═══ JV-13: COGS for March sales ═══
    INSERT INTO acct_journals (id,tenant_id,journal_number,journal_type,journal_date,reference,memo,total_debit,total_credit,status,posted_by,posted_at)
    VALUES (gen_random_uuid(),tid,'JV-2026-0013','general','2026-03-12','COGS-Q1','HPP penjualan Q1',180000000,180000000,'posted','admin',NOW())
    RETURNING id INTO j13;
    INSERT INTO acct_journal_lines (journal_id,line_number,account_id,description,debit,credit,base_debit,base_credit) VALUES
    (j13,1,a_materials,'Bahan baku terpakai',120000000,0,120000000,0),
    (j13,2,a_labor,'Tenaga kerja langsung',60000000,0,60000000,0),
    (j13,3,a_merch,'Pengurangan persediaan',0,180000000,0,180000000);

    -- ═══ JV-14: March payroll ═══
    INSERT INTO acct_journals (id,tenant_id,journal_number,journal_type,journal_date,reference,memo,total_debit,total_credit,status,posted_by,posted_at)
    VALUES (gen_random_uuid(),tid,'JV-2026-0014','general','2026-03-25','PAYROLL-MAR','Gaji karyawan bulan Maret + bonus Q1',105000000,105000000,'posted','admin',NOW())
    RETURNING id INTO j14;
    INSERT INTO acct_journal_lines (journal_id,line_number,account_id,description,debit,credit,base_debit,base_credit) VALUES
    (j14,1,a_salaries,'Gaji pokok 15 karyawan',75000000,0,75000000,0),
    (j14,2,a_salaries,'Tunjangan & bonus Q1',30000000,0,30000000,0),
    (j14,3,a_bank,'Transfer gaji via Bank BCA',0,98000000,0,98000000),
    (j14,4,a_pph21,'PPh 21 dipotong',0,7000000,0,7000000);

    -- ═══ JV-15: Depreciation adjustment Q1 ═══
    INSERT INTO acct_journals (id,tenant_id,journal_number,journal_type,journal_date,reference,memo,total_debit,total_credit,status,posted_by,posted_at)
    VALUES (gen_random_uuid(),tid,'AJ-2026-0001','adjusting','2026-03-31','DEP-Q1','Penyusutan aset tetap Q1 2026',12500000,12500000,'posted','admin',NOW())
    RETURNING id INTO j15;
    INSERT INTO acct_journal_lines (journal_id,line_number,account_id,description,debit,credit,base_debit,base_credit) VALUES
    (j15,1,a_deprec,'Penyusutan peralatan Q1',7500000,0,7500000,0),
    (j15,2,a_deprec,'Penyusutan kendaraan Q1',5000000,0,5000000,0),
    (j15,3,a_acc_dep,'Akumulasi penyusutan',0,12500000,0,12500000);

    -- ═══ Update account balances based on posted journals ═══
    UPDATE acct_accounts a SET current_balance = a.opening_balance + COALESCE(sub.net, 0), updated_at = NOW()
    FROM (
        SELECT jl.account_id, SUM(jl.base_debit) - SUM(jl.base_credit) AS net
        FROM acct_journal_lines jl
        JOIN acct_journals j ON j.id = jl.journal_id
        WHERE j.tenant_id = tid AND j.status = 'posted'
        GROUP BY jl.account_id
    ) sub WHERE a.id = sub.account_id;

    -- Also add a draft journal for testing
    INSERT INTO acct_journals (tenant_id,journal_number,journal_type,journal_date,reference,memo,total_debit,total_credit,status)
    VALUES (tid,'JV-2026-0016','general','2026-04-02','INV-2026-004','[DRAFT] Penjualan ke PT Digital Kreatif',88800000,88800000,'draft');

    RAISE NOTICE 'Dummy accounting data inserted: 15 posted journals + 1 draft';
END $$;

-- ═══════════════════════════════════════════════════════
-- Rental Engine — Seed Data
-- ═══════════════════════════════════════════════════════

-- Assets (6 rental items)
INSERT INTO rental_assets (tenant_id, asset_code, asset_name, serial_number, category, condition, purchase_date, purchase_cost, current_location, daily_rate, deposit_amount, last_maintenance_date, next_maintenance_date, total_rentals, total_revenue, status)
VALUES
    ('default', 'RNT-CAM-001', 'Canon EOS R5 Camera Kit', 'CAM-2024-R5-0012', 'Camera', 'excellent', '2024-06-15', 65000000, 'Denpasar Office', 500000, 5000000, '2026-02-15', '2026-05-15', 28, 14000000, 'available'),
    ('default', 'RNT-CAM-002', 'Sony A7 IV Camera Kit', 'CAM-2024-A7-0034', 'Camera', 'good', '2024-03-20', 42000000, 'Denpasar Office', 400000, 4000000, '2026-01-10', '2026-04-10', 35, 14000000, 'rented'),
    ('default', 'RNT-PRJ-001', 'Epson EB-L735U Projector', 'PRJ-2025-EB-0001', 'Projector', 'excellent', '2025-01-10', 18000000, 'Surabaya Office', 300000, 2000000, '2026-03-01', '2026-06-01', 12, 3600000, 'available'),
    ('default', 'RNT-DRN-001', 'DJI Mavic 3 Pro Drone', 'DRN-2024-M3P-0008', 'Drone', 'good', '2024-09-01', 35000000, 'Denpasar Office', 750000, 7500000, '2026-02-20', '2026-05-20', 18, 13500000, 'rented'),
    ('default', 'RNT-VEH-001', 'Toyota HiAce Commuter Van', 'VEH-2023-HIA-B1234', 'Vehicle', 'good', '2023-07-15', 450000000, 'Denpasar Depot', 1200000, 12000000, '2026-03-10', '2026-06-10', 45, 54000000, 'available'),
    ('default', 'RNT-AUD-001', 'JBL PartyBox 710 Speaker', 'AUD-2025-JBL-0003', 'Audio', 'fair', '2025-02-01', 12000000, 'Denpasar Office', 250000, 2000000, '2025-12-15', '2026-03-15', 22, 5500000, 'maintenance')
ON CONFLICT DO NOTHING;

-- Contracts (4 in various states)
INSERT INTO rental_contracts (tenant_id, contract_code, asset_id, asset_name, customer_name, customer_email, customer_phone, customer_id_number, checkout_date, expected_return_date, actual_return_date, daily_rate, deposit_amount, deposit_returned, subtotal, late_fee, damage_fee, total_charge, checkout_condition, return_condition, checkout_notes, return_notes, status)
SELECT 'default', v.ccode, a.id, a.asset_name, v.cust_name, v.cust_email, v.cust_phone, v.cust_id,
       v.checkout_date::date, v.expected_return::date,
       CASE WHEN v.actual_return IS NOT NULL THEN v.actual_return::date ELSE NULL END,
       v.daily_rate, v.deposit, v.deposit_returned, v.subtotal, v.late_fee, v.damage_fee, v.total,
       v.checkout_cond, v.return_cond, v.checkout_notes, v.return_notes, v.status
FROM rental_assets a
JOIN (VALUES
    ('RNT-CAM-002', 'RC-2026-001', 'Ahmad Firdaus', 'ahmad@mail.com', '081234568001', '3171060601000001', '2026-03-20', '2026-03-25', NULL, 400000, 4000000, 0, 2000000, 0, 0, 2000000, 'good', NULL, 'Wedding photography project', NULL, 'active'),
    ('RNT-DRN-001', 'RC-2026-002', 'PT Aerial Survey Indonesia', 'ops@aerial.co.id', '081234568002', 'PKP-2024-123456', '2026-03-18', '2026-03-22', NULL, 750000, 7500000, 0, 3000000, 0, 0, 3000000, 'good', NULL, 'Mapping project — Nusa Penida', NULL, 'active'),
    ('RNT-CAM-001', 'RC-2026-003', 'Lestari Photo Studio', 'lestari@photo.com', '081234568003', '3171070701950003', '2026-03-10', '2026-03-15', '2026-03-15', 500000, 5000000, 5000000, 2500000, 0, 0, 2500000, 'excellent', 'excellent', 'Product photography', 'Returned in perfect condition', 'returned'),
    ('RNT-PRJ-001', 'RC-2026-004', 'Bali Convention Center', 'events@balicc.com', '081234568004', 'PKP-2025-654321', '2026-03-01', '2026-03-05', '2026-03-08', 300000, 2000000, 1500000, 1500000, 900000, 500000, 2900000, 'excellent', 'fair', 'Conference presentation', 'Minor lens damage + 3 days late', 'returned')
) AS v(acode, ccode, cust_name, cust_email, cust_phone, cust_id, checkout_date, expected_return, actual_return, daily_rate, deposit, deposit_returned, subtotal, late_fee, damage_fee, total, checkout_cond, return_cond, checkout_notes, return_notes, status)
ON a.asset_code = v.acode
ON CONFLICT DO NOTHING;

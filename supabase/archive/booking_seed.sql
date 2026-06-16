-- ═══════════════════════════════════════════════════════
-- Booking & Ticketing — Seed Data
-- ═══════════════════════════════════════════════════════

-- Schedules (2 ship routes + 1 event)
INSERT INTO booking_schedules (tenant_id, schedule_code, route_name, origin, destination, departure_time, arrival_time, duration_minutes, capacity, vehicle_name, vessel_type, price_economy, price_business, price_vip, status)
VALUES
    ('default', 'RT-JKT-SBY', 'Jakarta → Surabaya Express', 'Tanjung Priok, Jakarta', 'Tanjung Perak, Surabaya', '08:00', '20:00', 720, 250, 'KM Nusantara Jaya', 'Ferry', 350000, 650000, 1200000, 'active'),
    ('default', 'RT-DPS-LBK', 'Bali → Lombok Fast Boat', 'Sanur Beach, Bali', 'Bangsal Harbor, Lombok', '09:30', '12:00', 150, 80, 'FB Gili Express', 'Fast Boat', 180000, 350000, 500000, 'active'),
    ('default', 'EV-MUS-DPS', 'Bali Maritime Museum Visit', 'Denpasar Maritime Museum', NULL, '10:00', '16:00', 360, 50, NULL, 'Event', 75000, 150000, 0, 'active')
ON CONFLICT DO NOTHING;

-- Occurrences (6 departures)
INSERT INTO booking_occurrences (schedule_id, departure_date, departure_time, total_capacity, booked_count, checked_in_count, status)
SELECT s.id, v.dep_date::date, v.dep_time::time, v.capacity, v.booked, v.checked_in, v.status
FROM booking_schedules s
JOIN (VALUES
    ('RT-JKT-SBY', '2026-03-28', '08:00', 250, 142, 0, 'scheduled'),
    ('RT-JKT-SBY', '2026-03-29', '08:00', 250, 78, 0, 'scheduled'),
    ('RT-DPS-LBK', '2026-03-28', '09:30', 80, 64, 62, 'departed'),
    ('RT-DPS-LBK', '2026-03-29', '09:30', 80, 23, 0, 'scheduled'),
    ('EV-MUS-DPS', '2026-04-05', '10:00', 50, 35, 0, 'scheduled'),
    ('RT-JKT-SBY', '2026-03-27', '08:00', 250, 210, 208, 'completed')
) AS v(scode, dep_date, dep_time, capacity, booked, checked_in, status)
ON s.schedule_code = v.scode
ON CONFLICT DO NOTHING;

-- Bookings (8 bookings)
INSERT INTO bookings (tenant_id, booking_code, schedule_id, occurrence_id, customer_name, customer_email, customer_phone, passenger_count, class, total_amount, paid_amount, status)
SELECT 'default', v.bcode, s.id, o.id, v.cust_name, v.cust_email, v.cust_phone, v.pax, v.class, v.total, v.paid, v.status
FROM booking_schedules s
JOIN booking_occurrences o ON o.schedule_id = s.id
JOIN (VALUES
    ('RT-JKT-SBY', '2026-03-28', 'BK-2026-0001', 'Wayan Sudiarta', 'wayan@mail.com', '081234567001', 3, 'economy', 1050000, 1050000, 'confirmed'),
    ('RT-JKT-SBY', '2026-03-28', 'BK-2026-0002', 'Ni Made Dewi', 'dewi@mail.com', '081234567002', 2, 'business', 1300000, 1300000, 'confirmed'),
    ('RT-JKT-SBY', '2026-03-28', 'BK-2026-0003', 'John Smith', 'john@mail.com', '081234567003', 1, 'vip', 1200000, 1200000, 'confirmed'),
    ('RT-DPS-LBK', '2026-03-28', 'BK-2026-0004', 'Sarah Connor', 'sarah@mail.com', '081234567004', 2, 'economy', 360000, 360000, 'checked_in'),
    ('RT-DPS-LBK', '2026-03-28', 'BK-2026-0005', 'Budi Hartono', 'budi@mail.com', '081234567005', 4, 'business', 1400000, 1400000, 'checked_in'),
    ('RT-DPS-LBK', '2026-03-29', 'BK-2026-0006', 'Ketut Adi', 'ketut@mail.com', '081234567006', 1, 'economy', 180000, 0, 'pending'),
    ('EV-MUS-DPS', '2026-04-05', 'BK-2026-0007', 'Museum Group A', 'group@museum.com', '081234567007', 10, 'economy', 750000, 750000, 'confirmed'),
    ('RT-JKT-SBY', '2026-03-27', 'BK-2026-0008', 'Past Traveler', 'traveler@mail.com', '081234567008', 2, 'economy', 700000, 700000, 'completed')
) AS v(scode, dep_date, bcode, cust_name, cust_email, cust_phone, pax, class, total, paid, status)
ON s.schedule_code = v.scode AND o.departure_date = v.dep_date::date
ON CONFLICT DO NOTHING;

-- Passengers (10 passengers across bookings)
INSERT INTO booking_passengers (booking_id, name, id_number, nationality, class, notes)
SELECT b.id, v.pname, v.pid, v.nat, v.class, v.notes
FROM bookings b
JOIN (VALUES
    ('BK-2026-0001', 'Wayan Sudiarta', '3171010101800001', 'Indonesian', 'economy', NULL),
    ('BK-2026-0001', 'Ketut Sudiarta', '3171020201900002', 'Indonesian', 'economy', 'Child'),
    ('BK-2026-0001', 'Ni Luh Ayu', '3171030301950003', 'Indonesian', 'economy', NULL),
    ('BK-2026-0002', 'Ni Made Dewi', '3171040401880004', 'Indonesian', 'business', NULL),
    ('BK-2026-0002', 'I Gede Oka', '3171050501850005', 'Indonesian', 'business', NULL),
    ('BK-2026-0003', 'John Smith', 'P12345678', 'American', 'vip', 'Special assistance'),
    ('BK-2026-0004', 'Sarah Connor', 'P87654321', 'Australian', 'economy', NULL),
    ('BK-2026-0004', 'Kyle Reese', 'P11223344', 'Australian', 'economy', NULL),
    ('BK-2026-0005', 'Budi Hartono', '3173010101900001', 'Indonesian', 'business', NULL),
    ('BK-2026-0005', 'Siti Rahayu', '3173020201920002', 'Indonesian', 'business', NULL)
) AS v(bcode, pname, pid, nat, class, notes)
ON b.booking_code = v.bcode
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- Booking & Ticketing Engine Schema
-- Tables: booking_schedules, booking_occurrences,
--         booking_seats, bookings, booking_passengers
-- ═══════════════════════════════════════════════════════

-- 1. Schedules (route/event definitions)
CREATE TABLE IF NOT EXISTS booking_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    item_id UUID REFERENCES inv_items(id) ON DELETE SET NULL,
    schedule_code TEXT NOT NULL,
    route_name TEXT NOT NULL,
    origin TEXT,
    destination TEXT,
    departure_time TIME,
    arrival_time TIME,
    duration_minutes INT,
    recurrence_rule TEXT,
    capacity INT DEFAULT 100,
    capacity_per_class JSONB DEFAULT '{}',
    vehicle_name TEXT,
    vessel_type TEXT,
    price_economy NUMERIC(14,2) DEFAULT 0,
    price_business NUMERIC(14,2) DEFAULT 0,
    price_vip NUMERIC(14,2) DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active','suspended','cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_schedules_tenant ON booking_schedules(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_schedules_code ON booking_schedules(tenant_id, schedule_code);

ALTER TABLE booking_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking_schedules_all" ON booking_schedules FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON booking_schedules TO anon, authenticated, service_role, authenticator;

-- 2. Occurrences (individual departures/events)
CREATE TABLE IF NOT EXISTS booking_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES booking_schedules(id) ON DELETE CASCADE,
    departure_date DATE NOT NULL,
    departure_time TIME,
    total_capacity INT DEFAULT 100,
    booked_count INT DEFAULT 0,
    checked_in_count INT DEFAULT 0,
    actual_departure TIMESTAMPTZ,
    actual_arrival TIMESTAMPTZ,
    notes TEXT,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','boarding','departed','completed','cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_occurrences_schedule ON booking_occurrences(schedule_id);
CREATE INDEX IF NOT EXISTS idx_booking_occurrences_date ON booking_occurrences(departure_date);

ALTER TABLE booking_occurrences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking_occurrences_all" ON booking_occurrences FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON booking_occurrences TO anon, authenticated, service_role, authenticator;

-- 3. Seats (optional seat map per schedule/event)
CREATE TABLE IF NOT EXISTS booking_seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES booking_schedules(id) ON DELETE CASCADE,
    section TEXT DEFAULT 'Main',
    seat_row TEXT,
    seat_number TEXT NOT NULL,
    class TEXT DEFAULT 'economy' CHECK (class IN ('economy','business','vip')),
    price_modifier NUMERIC(5,2) DEFAULT 1.0,
    status TEXT DEFAULT 'available' CHECK (status IN ('available','reserved','booked','blocked')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_seats_schedule ON booking_seats(schedule_id);

ALTER TABLE booking_seats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking_seats_all" ON booking_seats FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON booking_seats TO anon, authenticated, service_role, authenticator;

-- 4. Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default',
    booking_code TEXT NOT NULL,
    schedule_id UUID REFERENCES booking_schedules(id) ON DELETE SET NULL,
    occurrence_id UUID REFERENCES booking_occurrences(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    passenger_count INT DEFAULT 1,
    class TEXT DEFAULT 'economy',
    total_amount NUMERIC(14,2) DEFAULT 0,
    paid_amount NUMERIC(14,2) DEFAULT 0,
    qr_code TEXT,
    check_in_time TIMESTAMPTZ,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','checked_in','completed','cancelled','no_show')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_occurrence ON bookings(occurrence_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_code ON bookings(tenant_id, booking_code);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings_all" ON bookings FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON bookings TO anon, authenticated, service_role, authenticator;

-- 5. Passengers
CREATE TABLE IF NOT EXISTS booking_passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    id_number TEXT,
    nationality TEXT,
    seat_id UUID REFERENCES booking_seats(id) ON DELETE SET NULL,
    seat_label TEXT,
    class TEXT DEFAULT 'economy',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_passengers_booking ON booking_passengers(booking_id);

ALTER TABLE booking_passengers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking_passengers_all" ON booking_passengers FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON booking_passengers TO anon, authenticated, service_role, authenticator;

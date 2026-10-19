-- 001_initial_schema.sql: Core schema for Temple Seva Booking System
-- Temple associated with Sringeri Mutt

CREATE TABLE IF NOT EXISTS staff_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'booking_staff', 'poojari')),
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devotees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  gothra VARCHAR(100) NOT NULL,
  family_details TEXT,
  profile_status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (profile_status IN ('active', 'inactive', 'cleaned_up')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devotees_mobile ON devotees(mobile);
CREATE INDEX IF NOT EXISTS idx_devotees_gothra ON devotees(gothra);
CREATE INDEX IF NOT EXISTS idx_devotees_last_activity ON devotees(last_activity_at);

CREATE TABLE IF NOT EXISTS sevas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  telugu_name VARCHAR(255),
  description TEXT,
  category VARCHAR(100) NOT NULL DEFAULT 'Daily Pooja',
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_scheduled BOOLEAN NOT NULL DEFAULT false,
  scheduled_date DATE,
  timing VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sevas_active ON sevas(is_active);
CREATE INDEX IF NOT EXISTS idx_sevas_scheduled ON sevas(is_scheduled, scheduled_date);

CREATE TABLE IF NOT EXISTS poojari_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poojari_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  seva_id UUID NOT NULL REFERENCES sevas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(poojari_id, seva_id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number VARCHAR(50) UNIQUE NOT NULL,
  devotee_id UUID REFERENCES devotees(id) ON DELETE SET NULL,
  payer_name VARCHAR(255),
  payer_mobile VARCHAR(20),
  ritual_beneficiary_name VARCHAR(255) NOT NULL,
  gothra VARCHAR(100) NOT NULL,
  family_details TEXT,
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  booking_status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (booking_status IN ('completed', 'cancelled', 'corrected')),
  created_by UUID REFERENCES staff_users(id),
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES staff_users(id),
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_number ON bookings(booking_number);

CREATE TABLE IF NOT EXISTS booking_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  seva_id UUID NOT NULL REFERENCES sevas(id) ON DELETE RESTRICT,
  seva_name_snapshot VARCHAR(255) NOT NULL,
  seva_price_snapshot NUMERIC(10, 2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  item_total NUMERIC(10, 2) NOT NULL CHECK (item_total >= 0),
  scheduled_date_snapshot DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_items_booking_id ON booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_seva_id ON booking_items(seva_id);

CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(60) UNIQUE NOT NULL,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  booking_item_id UUID NOT NULL REFERENCES booking_items(id) ON DELETE RESTRICT,
  item_index INT NOT NULL,
  seva_name VARCHAR(255) NOT NULL,
  ritual_beneficiary_name VARCHAR(255) NOT NULL,
  gothra VARCHAR(100) NOT NULL,
  family_details TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'cancelled')),
  reprint_count INT NOT NULL DEFAULT 0,
  last_reprinted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_booking_id ON tickets(booking_id);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON tickets(ticket_number);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'upi')),
  payment_status VARCHAR(50) NOT NULL CHECK (payment_status IN ('confirmed', 'pending', 'refunded')),
  transaction_reference VARCHAR(100),
  verified_by UUID REFERENCES staff_users(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES staff_users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  details JSONB,
  reason TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS temple_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closure_date DATE UNIQUE NOT NULL,
  total_bookings INT NOT NULL DEFAULT 0,
  total_seva_items INT NOT NULL DEFAULT 0,
  booked_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  confirmed_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cash_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  upi_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  pending_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  refund_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  net_collected_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  closed_by UUID REFERENCES staff_users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS retention_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_by UUID REFERENCES staff_users(id),
  cutoff_date DATE NOT NULL,
  profiles_evaluated INT NOT NULL DEFAULT 0,
  profiles_cleaned INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


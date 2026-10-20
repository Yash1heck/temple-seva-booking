-- 004_create_devotee_booking_requests.sql
-- Table for public devotee self-service pooja booking requests.

CREATE TABLE IF NOT EXISTS devotee_booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number VARCHAR(60) UNIQUE NOT NULL,
  devotee_name VARCHAR(255) NOT NULL,
  gothra VARCHAR(100) NOT NULL,
  family_details TEXT,
  mobile VARCHAR(20) NOT NULL,
  items JSONB NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_booking_id UUID REFERENCES bookings(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS devotee_booking_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_devotee_requests_mobile ON devotee_booking_requests(mobile);
CREATE INDEX IF NOT EXISTS idx_devotee_requests_status ON devotee_booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_devotee_requests_created_at ON devotee_booking_requests(created_at);


-- 003_add_ticket_completion_stamp.sql
-- Adds completion timestamp and poojari reference to tickets for anti-fraud tracking.

ALTER TABLE tickets 
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES staff_users(id);

ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check CHECK (status IN ('issued', 'completed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_tickets_completed_at ON tickets(completed_at);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

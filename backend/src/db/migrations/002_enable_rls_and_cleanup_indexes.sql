-- 002_enable_rls_and_cleanup_indexes.sql
-- Enables Row Level Security (RLS) on all public tables and removes redundant/unused indexes.

-- 1. Enable RLS on all public tables
ALTER TABLE IF EXISTS staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS devotees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sevas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS poojari_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS temple_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS retention_runs ENABLE ROW LEVEL SECURITY;

-- 2. Drop duplicate and unused indexes flagged by Supabase advisor
-- bookings_booking_number_key already provides unique index on booking_number
DROP INDEX IF EXISTS idx_bookings_number;

-- tickets_ticket_number_key already provides unique index on ticket_number
DROP INDEX IF EXISTS idx_tickets_ticket_number;

-- Low-cardinality boolean indexes on tiny tables (not scanned by query planner)
DROP INDEX IF EXISTS idx_sevas_active;
DROP INDEX IF EXISTS idx_sevas_scheduled;

-- Devotee lookup queries mobile (idx_devotees_mobile), not gothra in isolation
DROP INDEX IF EXISTS idx_devotees_gothra;

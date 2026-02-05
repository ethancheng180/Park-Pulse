-- Migration: Add reputation and ban fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS appeal_status VARCHAR(20) DEFAULT 'none';
ALTER TABLE reputations ADD COLUMN IF NOT EXISTS false_report_strikes INTEGER DEFAULT 0;

-- Optional: ensure check constraints if needed (Postgres usually handles enum checks via CREATE TYPE or CHECK, but SQLAlchemy adds check constraints at app level. We can add SQL level too)
ALTER TABLE users ADD CONSTRAINT check_appeal_status CHECK (appeal_status IN ('none', 'pending', 'approved', 'rejected'));

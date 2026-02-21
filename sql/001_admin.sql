-- ═══════════════════════════════════════════
-- RemindMyBill Admin Panel — SQL Migration
-- ═══════════════════════════════════════════

-- Core admin columns on profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin        BOOLEAN     DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended    BOOLEAN     DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login      TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_failed  BOOLEAN     DEFAULT false;

-- Grant admin to owner account
UPDATE profiles SET is_admin = true WHERE email = 'antonis.nikolaides@gmail.com';

-- Cron job audit log table
CREATE TABLE IF NOT EXISTS cron_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name   TEXT        NOT NULL,
  last_run   TIMESTAMPTZ DEFAULT now(),
  status     TEXT        CHECK (status IN ('success','error','running')) DEFAULT 'success',
  result     TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed initial cron job rows
INSERT INTO cron_logs (job_name, status, result)
VALUES
  ('reminders',            'success', 'No prior run'),
  ('process-cancellations','success', 'No prior run'),
  ('reset-limits',         'success', 'No prior run')
ON CONFLICT DO NOTHING;

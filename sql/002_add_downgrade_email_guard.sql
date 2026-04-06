-- Migration: Add idempotency guard column for downgrade emails
-- Prevents the same downgrade email from being sent multiple times
-- when multiple Stripe webhook events fire for the same cancellation.

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS downgrade_email_sent_at timestamptz NULL;

COMMENT ON COLUMN profiles.downgrade_email_sent_at IS
  'Timestamp of the last downgrade email sent. Used as a 48-hour idempotency guard to prevent duplicate emails from concurrent Stripe webhook events.';

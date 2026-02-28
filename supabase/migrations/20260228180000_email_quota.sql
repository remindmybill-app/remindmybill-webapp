-- Create email_quota_log table
CREATE TABLE IF NOT EXISTS email_quota_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    email_type TEXT NOT NULL CHECK (email_type IN ('reminder', 'dunning', 'downgrade', 'system')),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    billing_period_start DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE email_quota_log ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_quota_log_user_period ON email_quota_log (user_id, billing_period_start, email_type);

-- RLS Policies
-- Profiles can see their own logs
CREATE POLICY "Users can view their own email logs"
ON email_quota_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- System/Admin logic (like Edge Functions) usually bypasses RLS via Service Role
-- But for explicit access if needed:
CREATE POLICY "Service role has full access"
ON email_quota_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

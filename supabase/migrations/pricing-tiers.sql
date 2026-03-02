-- ============================================================================
-- RemindMyBill: Pricing Tier Migration
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Add new tier columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS user_tier VARCHAR(20) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_interval VARCHAR(20),
ADD COLUMN IF NOT EXISTS sms_addon_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_alerts_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS email_alerts_limit INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS subscriptions_tracked INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS lifetime_purchase_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sms_subscription_expires TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tier_updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Migrate existing Pro users
UPDATE profiles
SET user_tier = 'pro'
WHERE is_pro = true AND user_tier = 'free';

-- 3. Update subscription_limit for free users from 3 → 7   
UPDATE profiles
SET subscription_limit = 7
WHERE user_tier = 'free' AND subscription_limit <= 3;

-- 4. Create subscription_events audit table
CREATE TABLE IF NOT EXISTS subscription_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_type VARCHAR(30) NOT NULL,
    from_tier VARCHAR(20),
    to_tier VARCHAR(20),
    stripe_event_id VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_user_tier ON profiles(user_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);

-- 6. RLS for subscription_events
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events"
ON subscription_events FOR SELECT
USING (auth.uid() = user_id);

-- Service role can insert (webhook handler)
CREATE POLICY "Service role can insert events"
ON subscription_events FOR INSERT
WITH CHECK (true);

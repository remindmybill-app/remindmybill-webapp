-- Add subscription tracking columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';

-- Add locking mechanism to subscriptions table (for free tier limits)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

-- Optional: Update existing profiles to have default values if null (though defaults handle new rows)
UPDATE profiles SET is_pro = FALSE WHERE is_pro IS NULL;
UPDATE profiles SET subscription_tier = 'free' WHERE subscription_tier IS NULL;
UPDATE subscriptions SET is_locked = FALSE WHERE is_locked IS NULL;

-- =============================================================================
-- SERVICE REQUESTS TABLE (Feedback Loop for Trust Center)
-- =============================================================================
CREATE TABLE IF NOT EXISTS service_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can insert their own requests
CREATE POLICY "Users can insert their own service requests"
    ON service_requests FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own requests (optional)
CREATE POLICY "Users can view their own service requests"
    ON service_requests FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

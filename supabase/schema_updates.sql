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

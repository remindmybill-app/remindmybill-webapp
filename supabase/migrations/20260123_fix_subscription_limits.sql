-- Fix Subscription Limits Migration
-- Created: 2026-01-23
-- Purpose: Ensure all users have correct subscription_limit based on their tier

-- Set correct limits for Free tier users
UPDATE profiles
SET subscription_limit = 3
WHERE subscription_tier = 'free' OR subscription_tier IS NULL;

-- Set correct limits for Premium/Pro tier users
UPDATE profiles
SET subscription_limit = 100
WHERE subscription_tier IN ('premium', 'pro');

-- Ensure no NULL values exist
UPDATE profiles
SET 
  subscription_tier = COALESCE(subscription_tier, 'free'),
  subscription_limit = COALESCE(subscription_limit, 3),
  current_usage = COALESCE(current_usage, 0)
WHERE subscription_limit IS NULL OR current_usage IS NULL OR subscription_tier IS NULL;

-- Add NOT NULL constraints with defaults (optional but recommended)
ALTER TABLE profiles
ALTER COLUMN subscription_tier SET DEFAULT 'free',
ALTER COLUMN subscription_limit SET DEFAULT 3,
ALTER COLUMN current_usage SET DEFAULT 0;

-- Update NOT NULL constraints
DO $$ 
BEGIN
  -- Only add constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_subscription_tier_not_null' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles 
    ALTER COLUMN subscription_tier SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_subscription_limit_not_null' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles 
    ALTER COLUMN subscription_limit SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_current_usage_not_null' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles 
    ALTER COLUMN current_usage SET NOT NULL;
  END IF;
END $$;

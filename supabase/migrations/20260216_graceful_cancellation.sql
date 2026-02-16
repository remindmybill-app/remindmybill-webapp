-- Add cancellation grace period tracking
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS cancellation_scheduled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cancellation_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancellation_feedback JSONB,
ADD COLUMN IF NOT EXISTS previous_tier VARCHAR(20),
ADD COLUMN IF NOT EXISTS cancel_reactivation_token VARCHAR(255);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_cancellation_date 
ON profiles(cancellation_date) 
WHERE cancellation_scheduled = true;

-- Create cancellation_surveys table
CREATE TABLE IF NOT EXISTS cancellation_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Q1: Required - Main reason
  reason VARCHAR(50) NOT NULL, 
  -- Options: 'too_expensive', 'not_using', 'missing_features', 'found_alternative', 'other'
  
  -- Q2: Required only if Q1 = 'other'
  reason_other TEXT,
  
  -- Q3: Optional - General feedback
  general_feedback TEXT,
  
  -- Metadata
  tier_at_cancellation VARCHAR(20),
  days_as_subscriber INTEGER,
  subscription_value_paid DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cancellation_surveys_user_id ON cancellation_surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_surveys_reason ON cancellation_surveys(reason);

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL, -- Push subscription object from browser
  device_name TEXT, -- User agent info
  endpoint TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_active ON push_subscriptions(user_id, is_active);

-- Create contact_submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  user_tier VARCHAR(20), -- Captured at submission time
  status VARCHAR(20) DEFAULT 'new', -- 'new', 'in_progress', 'resolved'
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_user_id ON contact_submissions(user_id);

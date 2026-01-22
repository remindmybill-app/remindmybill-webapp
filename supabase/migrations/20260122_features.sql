-- Feature 2: Subscription Upgrade System (Profiles & RLS)

-- 1. Update profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_limit INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS current_usage INTEGER DEFAULT 0;

-- 2. Create function to check subscription limit
CREATE OR REPLACE FUNCTION can_user_add_subscription()
RETURNS BOOLEAN AS $$
DECLARE
  user_limit INTEGER;
  user_count INTEGER;
BEGIN
  -- Get user's limit
  SELECT subscription_limit INTO user_limit
  FROM profiles
  WHERE id = auth.uid();

  -- Get current count of subscriptions
  SELECT COUNT(*) INTO user_count
  FROM subscriptions
  WHERE user_id = auth.uid();

  -- Allow if count is strictly less than limit
  RETURN COALESCE(user_count < user_limit, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create RLS Policy for subscriptions table
-- Note: You might need to drop existing policy if it conflicts or is too broad.
-- Assuming 'subscriptions' table exists.
DROP POLICY IF EXISTS "Users can only insert if under limit" ON subscriptions;

CREATE POLICY "Users can only insert if under limit"
ON subscriptions
FOR INSERT
TO authenticated
WITH CHECK (can_user_add_subscription());


-- Feature 1: Trust Center Search (Platform Directory)

-- 4. Create platform_directory table
CREATE TABLE IF NOT EXISTS platform_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  average_cost NUMERIC,
  cancellation_difficulty TEXT,
  cancellation_url TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Read only for authenticated users usually, or public?)
-- User said "Users can search...", implies public or auth read.
ALTER TABLE platform_directory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
ON platform_directory
FOR SELECT
TO authenticated, anon
USING (true);

-- 5. Seed Data (Top 50+ Popular Services)
INSERT INTO platform_directory (name, category, average_cost, cancellation_difficulty, cancellation_url) VALUES
('Netflix', 'Streaming', 15.49, 'Easy', 'https://www.netflix.com/cancel'),
('Spotify', 'Music', 10.99, 'Easy', 'https://www.spotify.com/account/subscription'),
('Adobe Creative Cloud', 'Software', 54.99, 'Hard', 'https://account.adobe.com/plans'),
('Canva', 'Design', 12.99, 'Medium', 'https://www.canva.com/settings/billing'),
('ChatGPT Plus', 'AI', 20.00, 'Easy', 'https://chat.openai.com/#/settings/DataControls'),
('GitHub Copilot', 'Dev Tools', 10.00, 'Easy', 'https://github.com/settings/copilot'),
('Amazon Prime', 'Shopping', 14.99, 'Easy', 'https://www.amazon.com/mc/pipeline/cancellation'),
('Disney+', 'Streaming', 13.99, 'Easy', 'https://www.disneyplus.com/account/cancel-subscription'),
('Hulu', 'Streaming', 17.99, 'Medium', 'https://secure.hulu.com/account'),
('HBO Max', 'Streaming', 15.99, 'Easy', 'https://auth.max.com/subscription'),
('YouTube Premium', 'Streaming', 13.99, 'Easy', 'https://www.youtube.com/paid_memberships'),
('Apple Music', 'Music', 10.99, 'Easy', 'https://music.apple.com/account'),
('Twitch', 'Streaming', 4.99, 'Easy', 'https://www.twitch.tv/subscriptions'),
('Xbox Game Pass', 'Gaming', 16.99, 'Medium', 'https://account.microsoft.com/services'),
('PlayStation Plus', 'Gaming', 9.99, 'Medium', 'https://store.playstation.com/subscriptions'),
('Nintendo Switch Online', 'Gaming', 3.99, 'Easy', 'https://ec.nintendo.com/my/membership'),
('Microsoft 365', 'Software', 6.99, 'Medium', 'https://account.microsoft.com/services'),
('Dropbox', 'Cloud Storage', 11.99, 'Medium', 'https://www.dropbox.com/account/plan'),
('Google One', 'Cloud Storage', 1.99, 'Easy', 'https://one.google.com/settings'),
('iCloud+', 'Cloud Storage', 0.99, 'Easy', 'https://support.apple.com/en-us/HT202039'),
('Slack', 'Productivity', 8.75, 'Medium', 'https://my.slack.com/admin/billing'),
('Zoom', 'Productivity', 15.99, 'Hard', 'https://zoom.us/billing/subscription'),
('Notion', 'Productivity', 10.00, 'Easy', 'https://www.notion.so/settings/billing'),
('Figma', 'Design', 15.00, 'Medium', 'https://www.figma.com/settings/billing'),
('Trello', 'Productivity', 6.00, 'Easy', 'https://trello.com/your/billing'),
('Asana', 'Productivity', 13.49, 'Medium', 'https://app.asana.com/-/billing'),
('Monday.com', 'Productivity', 12.00, 'Hard', 'https://monday.com/admin/billing'),
('Linear', 'Productivity', 10.00, 'Easy', 'https://linear.app/settings/billing'),
('Vercel', 'Dev Tools', 20.00, 'Medium', 'https://vercel.com/dashboard/billing'),
('Heroku', 'Dev Tools', 7.00, 'Medium', 'https://dashboard.heroku.com/account/billing'),
('DigitalOcean', 'Dev Tools', 6.00, 'Easy', 'https://cloud.digitalocean.com/settings/billing'),
('AWS', 'Cloud', 0.00, 'Hard', 'https://console.aws.amazon.com/billing/home'),
('New York Times', 'News', 17.00, 'Hard', 'https://myaccount.nytimes.com/seg/cancel'),
('Wall Street Journal', 'News', 38.99, 'Hard', 'https://customercenter.wsj.com/cancel'),
('Audible', 'Books', 14.95, 'Medium', 'https://www.audible.com/account/overview'),
('Kindle Unlimited', 'Books', 11.99, 'Easy', 'https://www.amazon.com/kindle-dbs/ku/ku-central'),
('Scribd', 'Books', 11.99, 'Medium', 'https://www.scribd.com/account-settings'),
('MasterClass', 'Education', 15.00, 'Medium', 'https://www.masterclass.com/account/edit'),
('Coursera', 'Education', 39.00, 'Medium', 'https://www.coursera.org/my-purchases'),
('Duolingo Plus', 'Education', 6.99, 'Easy', 'https://www.duolingo.com/settings/plus'),
('Peloton', 'Fitness', 44.00, 'Medium', 'https://www.onepeloton.com/emembership'),
('Fitbit Premium', 'Fitness', 9.99, 'Easy', 'https://www.fitbit.com/settings/subscription'),
('Strava', 'Fitness', 11.99, 'Easy', 'https://www.strava.com/settings/billing'),
('Calm', 'Wellness', 14.99, 'Easy', 'https://www.calm.com/profile'),
('Headspace', 'Wellness', 12.99, 'Easy', 'https://www.headspace.com/subscription/manage'),
('HelloFresh', 'Food', 60.00, 'Medium', 'https://www.hellofresh.com/account-settings/plan-settings'),
('Blue Apron', 'Food', 60.00, 'Medium', 'https://www.blueapron.com/account/settings'),
('Uber One', 'Services', 9.99, 'Easy', 'https://m.uber.com/go/pass'),
('DashPass', 'Services', 9.99, 'Easy', 'https://www.doordash.com/consumer/payment/'),
('Instacart+', 'Services', 9.99, 'Easy', 'https://www.instacart.com/store/account/instacart_plus');

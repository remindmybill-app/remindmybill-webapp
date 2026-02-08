-- 1. Insert Trusted Services
INSERT INTO service_benchmarks (name, trust_score, difficulty_level, category, cancellation_method) VALUES
('Netflix', 95, 'Easy', 'Streaming', 'Online Button'),
('Spotify', 90, 'Easy', 'Music', 'Online Dashboard'),
('Amazon Prime', 88, 'Easy', 'Shopping', 'Online Settings'),
('Dropbox', 85, 'Medium', 'Cloud Storage', 'Online Settings'),
('Canva', 85, 'Medium', 'Design', 'Online Settings'),
('Google One', 92, 'Easy', 'Cloud Storage', 'Online Settings'),
('iCloud+', 90, 'Easy', 'Cloud Storage', 'System Settings'),
('YouTube Premium', 89, 'Easy', 'Streaming', 'Online Dashboard'),
('Disney+', 88, 'Easy', 'Streaming', 'Online Dashboard'),
('Slack', 85, 'Medium', 'Productivity', 'Admin Panel'),
('Zoom', 80, 'Medium', 'Productivity', 'Online Account'),
('GitHub', 95, 'Easy', 'Dev Tools', 'Settings'),
('Vercel', 92, 'Easy', 'Dev Tools', 'Dashboard'),
('Figma', 85, 'Medium', 'Design', 'Admin Settings'),
('Notion', 88, 'Easy', 'Productivity', 'Workspace Settings'),
('ChatGPT Plus', 90, 'Easy', 'AI', 'Settings Modal'),
('Claude', 90, 'Easy', 'AI', 'Profile Settings'),
('Steam', 95, 'Easy', 'Gaming', 'Support Ticket'),
('Discord Nitro', 92, 'Easy', 'Social', 'User Settings'),
('Apple Music', 90, 'Easy', 'Music', 'App Store Subscription')
ON CONFLICT DO NOTHING;

-- 2. Insert High Risk Services
INSERT INTO service_benchmarks (name, trust_score, difficulty_level, category, cancellation_method) VALUES
('Gym Membership', 10, 'Hard', 'Fitness', 'In-Person Only'),
('SiriusXM', 30, 'Hard', 'Entertainment', 'Phone Call Required'),
('Wall Street Journal', 40, 'Hard', 'News', 'Phone/Chat'),
('NY Times', 45, 'Hard', 'News', 'Chat/Call'),
('Planet Fitness', 15, 'Hard', 'Fitness', 'In-Person/Certified Mail'),
('Adobe', 20, 'Hard', 'Software', 'Early Term Fee'),
('HelloFresh', 50, 'Medium', 'Food', 'Online/Chat'),
('LA Fitness', 15, 'Hard', 'Fitness', 'In-Person/Mail'),
('Xfinity', 25, 'Hard', 'Utilities', 'Phone Call'),
('AT&T', 30, 'Hard', 'Utilities', 'Phone Call'),
('ExpressVPN', 60, 'Medium', 'Security', 'Live Chat'),
('NordVPN', 60, 'Medium', 'Security', 'Live Chat'),
('McAfee', 25, 'Hard', 'Security', 'Auto-Renewal Trap'),
('Norton', 25, 'Hard', 'Security', 'Auto-Renewal Trap'),
('DirecTV', 20, 'Hard', 'Utilities', 'Phone Call'),
('Sky TV', 30, 'Hard', 'Entertainment', 'Phone Call'),
('Beer52', 15, 'Hard', 'Food', 'Phone Call'),
('Fabletics', 40, 'Medium', 'Shopping', 'Skip Month/Call'),
('Savage X Fenty', 40, 'Medium', 'Shopping', 'Skip Month/Call'),
('Equinox', 10, 'Hard', 'Fitness', 'In-Person Only')
ON CONFLICT DO NOTHING;

-- 3. Fix RLS for review_requests (Ensure Anonymous Insert is allowed)
-- First, drop existing policy if it exists to clean up
DROP POLICY IF EXISTS "Allow public insert" ON review_requests;

-- Create a truly permissive policy for inserts
CREATE POLICY "Allow public insert"
ON review_requests
FOR INSERT
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;

-- Grant permissions to public/anon roles just in case
GRANT INSERT ON review_requests TO anon;
GRANT INSERT ON review_requests TO authenticated;
GRANT SELECT ON review_requests TO anon;
GRANT SELECT ON review_requests TO authenticated;

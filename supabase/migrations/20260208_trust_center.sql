-- Trust Center Tables

-- 1. service_benchmarks
CREATE TABLE IF NOT EXISTS service_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  difficulty_level TEXT CHECK (difficulty_level IN ('Easy', 'Medium', 'Hard', 'Impossible')),
  cancellation_method TEXT,
  trust_score INTEGER CHECK (trust_score >= 0 AND trust_score <= 100),
  category TEXT,
  website_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for service_benchmarks
ALTER TABLE service_benchmarks ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access"
ON service_benchmarks
FOR SELECT
USING (true);

-- Allow service role (admin) full access
CREATE POLICY "Allow service role full access"
ON service_benchmarks
USING (auth.role() = 'service_role');


-- 2. review_requests
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  user_ip TEXT, -- Stored specifically for rate limiting as per requirements
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for review_requests
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;

-- Allow public insert (with rate limiting handled in application logic)
CREATE POLICY "Allow public insert"
ON review_requests
FOR INSERT
WITH CHECK (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access on requests"
ON review_requests
USING (auth.role() = 'service_role');


-- 3. Search Index (Optional but good for search)
CREATE INDEX IF NOT EXISTS idx_service_benchmarks_name ON service_benchmarks USING gin(to_tsvector('english', name));


-- 4. Seed Data (Migrating and enhancing from platform_directory concept)
INSERT INTO service_benchmarks (name, difficulty_level, cancellation_method, trust_score, category) VALUES
('Netflix', 'Easy', 'Online Button', 95, 'Streaming'),
('Spotify', 'Easy', 'Online Dashboard', 90, 'Music'),
('Adobe Creative Cloud', 'Hard', 'Phone/Chat + Fee', 45, 'Software'),
('Canva', 'Medium', 'Online Settings', 85, 'Design'),
('Gym Membership', 'Impossible', 'In-Person/Certified Mail', 10, 'Fitness'),
('New York Times', 'Hard', 'Chat/Call', 50, 'News'),
('Amazon Prime', 'Easy', 'Online Structure', 88, 'Shopping'),
('Hulu', 'Medium', 'Online (Hidden)', 75, 'Streaming'),
('Dropbox', 'Medium', 'Online Settings', 80, 'Cloud Storage'),
('SiriusXM', 'Hard', 'Phone Call Required', 30, 'Entertainment');

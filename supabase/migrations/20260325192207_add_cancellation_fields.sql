-- Migration: Add cancellation fields and update cron logs

ALTER TABLE service_benchmarks
ADD COLUMN IF NOT EXISTS cancellation_steps text[] NULL,
ADD COLUMN IF NOT EXISTS cancellation_url text NULL;

-- High Risk Services
UPDATE service_benchmarks
SET 
  cancellation_steps = ARRAY['Log into your account', 'Go to "Account Settings" or "Membership"', 'Follow the prompts to "End Membership"', 'Wait for the confirmation email'],
  cancellation_url = 'https://www.example.com/cancel'
WHERE name = 'Gym Membership';

UPDATE service_benchmarks
SET 
  cancellation_steps = ARRAY['Call customer service during business hours', 'Navigate the automated phone tree to retention department', 'Decline offers to stay', 'Request written confirmation of cancellation'],
  cancellation_url = 'https://www.adt.com/help'
WHERE name = 'ADT Security';

UPDATE service_benchmarks
SET 
  cancellation_steps = ARRAY['Visit the club in person or send a certified letter', 'Provide 30 days notice as per standard contract', 'Pay any remaining balance or cancellation fees', 'Keep a copy of the cancellation receipt'],
  cancellation_url = 'https://www.goldsgym.com/contact-us/'
WHERE name = 'Gold''s Gym';

UPDATE service_benchmarks
SET 
  cancellation_steps = ARRAY['Log into your online account', 'Navigate to "Manage My Subscription"', 'Select "Cancel my subscription" and decline all offers', 'Or call their retention line at 1-866-635-2349'],
  cancellation_url = 'https://care.siriusxm.com/'
WHERE name = 'SiriusXM';

UPDATE service_benchmarks
SET 
  cancellation_steps = ARRAY['Go to Customer Center online', 'Select "Manage Subscriptions"', 'Click "Cancel Subscription"', 'Complete the cancellation flow or call customer service if prompted'],
  cancellation_url = 'https://customercenter.wsj.com/'
WHERE name = 'Wall Street Journal';

UPDATE service_benchmarks
SET 
  cancellation_steps = ARRAY['Log into your NYT account', 'Go to "Subscription Overview"', 'Click "Cancel your subscription"', 'Follow the steps to confirm cancellation'],
  cancellation_url = 'https://myaccount.nytimes.com/seg/hub'
WHERE name = 'NY Times';

UPDATE service_benchmarks
SET 
  cancellation_steps = ARRAY['Sign in to your Adobe account', 'Go to "Plans and payment"', 'Select your plan and click "Manage plan"', 'Click "Cancel your plan" and be aware of potential early termination fees'],
  cancellation_url = 'https://account.adobe.com/plans'
WHERE name = 'Adobe';

UPDATE service_benchmarks
SET 
  cancellation_steps = ARRAY['Log into your account', 'Go to "Account Settings"', 'Scroll down and click "Cancel Plan"', 'Follow the prompts until you receive a confirmation message'],
  cancellation_url = 'https://www.hellofresh.com/'
WHERE name = 'HelloFresh';

-- Rename cron_logs columns
ALTER TABLE cron_logs RENAME COLUMN last_run TO ran_at;
ALTER TABLE cron_logs RENAME COLUMN result TO message;

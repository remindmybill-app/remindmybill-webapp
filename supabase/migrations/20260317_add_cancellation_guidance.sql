-- Migration to add cancellation steps and URLs to service_benchmarks

-- Add new columns
ALTER TABLE service_benchmarks ADD COLUMN IF NOT EXISTS cancellation_steps TEXT[];
ALTER TABLE service_benchmarks ADD COLUMN IF NOT EXISTS cancellation_url TEXT;

-- Update High Risk Services (and some mediums) with steps and URLs
UPDATE service_benchmarks 
SET 
  cancellation_steps = ARRAY[
    'Visit your gym in person during staffed hours',
    'Request a cancellation form from the front desk',
    'Fill out the form and request a written confirmation receipt',
    'Follow up via certified mail if cancellation is not confirmed within 7 days',
    'Check your bank statement the following month to confirm billing stopped'
  ],
  cancellation_url = NULL
WHERE name IN ('Gym Membership', 'Planet Fitness', 'LA Fitness', 'Equinox');

UPDATE service_benchmarks
SET
  cancellation_steps = ARRAY[
    'Call the retention department (prepare for long hold times)',
    'Clearly state you want to cancel, do not accept the "pause" or "discount" offers',
    'Ask for a cancellation confirmation number before hanging up',
    'Verify you receive a confirmation email',
    'Monitor your credit card for unexpected charges the next month'
  ],
  cancellation_url = 'https://care.siriusxm.com/cancel'
WHERE name = 'SiriusXM';

UPDATE service_benchmarks
SET
  cancellation_steps = ARRAY[
    'Navigate to the Customer Center on the WSJ site',
    'Select "Manage Your Subscription"',
    'Often, the site will force you to call their customer service line or start a live chat',
    'If calling, clearly state you want to cancel and decline promotional offers',
    'Record the date, time, and name of the representative'
  ],
  cancellation_url = 'https://customercenter.wsj.com/'
WHERE name = 'Wall Street Journal';

UPDATE service_benchmarks
SET
  cancellation_steps = ARRAY[
    'Log into your NY Times account and go to Your Account/Subscription',
    'Click "Cancel subscription"',
    'You will likely be redirected to a live chat with a retention agent',
    'Politely but firmly state you need to cancel',
    'Save the chat transcript and ensure you receive a confirmation email'
  ],
  cancellation_url = 'https://myaccount.nytimes.com/seg/cancel'
WHERE name = 'NY Times';

UPDATE service_benchmarks
SET
  cancellation_steps = ARRAY[
    'Log into your Adobe account online',
    'Go to "Plans and payment" and select your active plan',
    'Click "Manage plan" and then "Cancel your plan"',
    'Review the final step carefully: depending on your contract, you may be charged an early termination fee (often 50% of the remaining contract obligation)',
    'Complete the cancellation steps until you see the confirmation screen'
  ],
  cancellation_url = 'https://account.adobe.com/plans'
WHERE name = 'Adobe';

UPDATE service_benchmarks
SET
  cancellation_steps = ARRAY[
    'Log in to your account at least 5 days before your next delivery',
    'Navigate to "Account Settings"',
    'Scroll all the way down and select "Cancel Plan"',
    'Follow the prompts to confirm your cancellation',
    'Wait for the confirmation screen and email'
  ],
  cancellation_url = 'https://www.hellofresh.com/my-account/settings'
WHERE name = 'HelloFresh';

UPDATE service_benchmarks
SET
  cancellation_steps = ARRAY[
    'You must call Xfinity retention at 1-800-XFINITY',
    'Navigate the phone tree and state you want to disconnect service',
    'Be prepared for aggressive retention attempts and alternative offers',
    'Request an email receipt of your cancellation and instructions for returning equipment',
    'Return equipment promptly to an Xfinity store and get a physical receipt'
  ],
  cancellation_url = 'https://www.xfinity.com/support/articles/cancel-my-xfinity-services'
WHERE name = 'Xfinity';

UPDATE service_benchmarks
SET
  cancellation_steps = ARRAY[
    'Log into your account or use the McAfee uninstaller',
    'To stop billing, go to "My Account" -> "Auto-Renewal Settings"',
    'Turn off auto-renewal immediately',
    'Follow up by removing the software and ensuring your payment method is removed if possible'
  ],
  cancellation_url = 'https://myaccount.mcafee.com/auto-renewal'
WHERE name = 'McAfee';

UPDATE service_benchmarks
SET
  cancellation_steps = ARRAY[
    'Log into your Norton account',
    'Go to "My Subscriptions" and turn off Automatic Renewal',
    'Confirm the cancellation of auto-renewal in the pop-up',
    'Check your email for the cancellation confirmation'
  ],
  cancellation_url = 'https://my.norton.com/extspa/account/subscriptions'
WHERE name = 'Norton';

UPDATE service_benchmarks
SET
  cancellation_steps = ARRAY[
    'Call customer service',
    'State clearly that you want to cancel the service entirely',
    'Decline any paused or discounted alternatives',
    'Ensure you get an email receipt and ask about the timeline for returning hardware'
  ],
  cancellation_url = NULL
WHERE name IN ('DirecTV', 'Sky TV', 'AT&T');

UPDATE service_benchmarks
SET
  cancellation_steps = ARRAY[
    'Call the Beer52 customer service number listed on their contact page',
    'They do not allow online cancellation',
    'Wait in the queue and inform the agent you wish to cancel',
    'Ensure you do this before the auto-renewal date, keeping track of the confirmation'
  ],
  cancellation_url = NULL
WHERE name = 'Beer52';

UPDATE service_benchmarks
SET
  cancellation_steps = ARRAY[
    'Call customer service or use the live chat',
    'If attempting online, they often require you to "skip the month" rather than fully cancel',
    'Demand a full account closure if that is your goal',
    'Keep a record of the chat or call'
  ],
  cancellation_url = NULL
WHERE name IN ('Fabletics', 'Savage X Fenty');

UPDATE service_benchmarks
SET
  cancellation_steps = ARRAY[
    'Log in to your account dashboard on the provider site',
    'Open the live chat feature to connect with an agent',
    'Request a cancellation of auto-renewal',
    'Keep a transcript of the chat'
  ],
  cancellation_url = NULL
WHERE name IN ('ExpressVPN', 'NordVPN');


-- Add direct cancellation URLs for Trusted Services where available
UPDATE service_benchmarks SET cancellation_url = 'https://www.netflix.com/cancelplan' WHERE name = 'Netflix';
UPDATE service_benchmarks SET cancellation_url = 'https://www.spotify.com/account/subscription/cancel/' WHERE name = 'Spotify';
UPDATE service_benchmarks SET cancellation_url = 'https://one.google.com/settings/cancel' WHERE name = 'Google One';
UPDATE service_benchmarks SET cancellation_url = 'https://www.amazon.com/mc/cc' WHERE name = 'Amazon Prime';
UPDATE service_benchmarks SET cancellation_url = 'https://www.dropbox.com/account/plan' WHERE name = 'Dropbox';
UPDATE service_benchmarks SET cancellation_url = 'https://www.canva.com/settings/billing' WHERE name = 'Canva';
UPDATE service_benchmarks SET cancellation_url = 'https://www.youtube.com/paid_memberships' WHERE name = 'YouTube Premium';
UPDATE service_benchmarks SET cancellation_url = 'https://www.disneyplus.com/account/subscription' WHERE name = 'Disney+';
UPDATE service_benchmarks SET cancellation_url = 'https://chat.openai.com/#settings/Billing' WHERE name = 'ChatGPT Plus';

-- Insert missing High Risk services mentioned in prompt
INSERT INTO service_benchmarks (name, trust_score, difficulty_level, category, cancellation_method)
VALUES 
('ADT Security', 10, 'Hard', 'Security', 'Phone/Written Notice'),
('Gold''s Gym', 15, 'Hard', 'Fitness', 'In-Person/Certified Mail')
ON CONFLICT (name) DO NOTHING;

-- Update ADT Security steps
UPDATE service_benchmarks
SET
  cancellation_steps = ARRAY[
    'Call ADT customer service and request the retention department',
    'Clearly state your intent to cancel and decline all counteroffers',
    'Verify if a signed written cancellation notice is required for your specific contract',
    'Request a cancellation confirmation number and a follow-up email',
    'Ensure you receive instructions for returning any leased equipment'
  ],
  cancellation_url = 'https://www.adt.com/help/faq/account-management/cancel-adt-service'
WHERE name = 'ADT Security';

-- Update Gold's Gym steps
UPDATE service_benchmarks
SET
  cancellation_steps = ARRAY[
    'Check your specific Gold''s Gym location for their 30-day notice policy',
    'Visit the gym in person or send a certified letter with return receipt requested',
    'Request a signed cancellation receipt from the front desk manager',
    'Double-check that all outstanding dues are paid to avoid collection agency handovers',
    'Monitor your bank statement 30 days after the notice to confirm charges have stopped'
  ],
  cancellation_url = NULL
WHERE name = 'Gold''s Gym';

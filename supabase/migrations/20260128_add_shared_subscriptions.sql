-- Migration to add shared_with_count to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS shared_with_count INTEGER DEFAULT 1;

-- Update existing records to have 1 (personal) by default
UPDATE subscriptions 
SET shared_with_count = 1 
WHERE shared_with_count IS NULL;

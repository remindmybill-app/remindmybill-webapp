-- Add new columns to subscriptions table for analytics intelligence
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS previous_cost NUMERIC,
ADD COLUMN IF NOT EXISTS last_price_change_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_accessed_date TIMESTAMPTZ;

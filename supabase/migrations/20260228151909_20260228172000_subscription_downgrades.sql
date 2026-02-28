-- Add is_enabled to subscriptions
ALTER TABLE public.subscriptions
ADD COLUMN is_enabled BOOLEAN DEFAULT true NOT NULL;

-- Add needs_subscription_review to profiles
ALTER TABLE public.profiles
ADD COLUMN needs_subscription_review BOOLEAN DEFAULT false NOT NULL;

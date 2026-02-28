-- Add notification preference columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_reminders_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_timing SMALLINT DEFAULT 3;

-- Add email preferences JSONB column to profiles
-- Allows users to opt out of specific notification types
-- Defaults to all notifications enabled

ALTER TABLE public.profiles
ADD COLUMN email_preferences JSONB DEFAULT '{"test_reminders": true, "approval_notifications": true}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.email_preferences IS 'User email notification preferences. JSON with keys: test_reminders, approval_notifications';

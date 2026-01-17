# Remind My Bill Supabase Setup Guide

This guide will help you set up Supabase for your Remind My Bill application.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A new Supabase project created

## Environment Variables

Add the following environment variables to your project:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

You can find these values in your Supabase project settings under **API**.

## Database Schema

Run the following SQL in your Supabase SQL Editor to create the required tables:

### Profiles Table

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  default_currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Subscriptions Table

```sql
-- Create subscriptions table
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  cost DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  trust_score INTEGER CHECK (trust_score >= 0 AND trust_score <= 100),
  renewal_date DATE NOT NULL,
  status TEXT CHECK (status IN ('active', 'cancelled', 'paused')) DEFAULT 'active',
  last_used_date DATE,
  auto_renewal BOOLEAN DEFAULT TRUE,
  cancellation_difficulty TEXT CHECK (cancellation_difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
  ON subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX subscriptions_user_id_idx ON subscriptions(user_id);
CREATE INDEX subscriptions_renewal_date_idx ON subscriptions(renewal_date);
```

### Trust Analysis Table

```sql
-- Create trust_analysis table
CREATE TABLE trust_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL UNIQUE,
  trust_score INTEGER CHECK (trust_score >= 0 AND trust_score <= 100),
  category TEXT NOT NULL,
  cancellation_difficulty TEXT CHECK (cancellation_difficulty IN ('easy', 'medium', 'hard')),
  dark_patterns TEXT[],
  positive_features TEXT[],
  risk_flags TEXT[],
  trend TEXT CHECK (trend IN ('rising', 'stable', 'falling')) DEFAULT 'stable',
  alert_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE trust_analysis ENABLE ROW LEVEL SECURITY;

-- Create policy (public read access)
CREATE POLICY "Anyone can view trust analysis"
  ON trust_analysis FOR SELECT
  TO authenticated
  USING (true);
```

### Notifications Table

```sql
-- Create notifications table
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('warning', 'alert', 'info', 'success')) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX notifications_user_id_idx ON notifications(user_id);
CREATE INDEX notifications_read_idx ON notifications(read);
```

## Google OAuth Setup

1. Go to your Supabase project **Authentication > Providers**
2. Enable **Google** provider
3. Configure Google OAuth:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs: `https://your-project-ref.supabase.co/auth/v1/callback`
   - Copy the Client ID and Client Secret to Supabase

4. **Important**: Add the Gmail scope to your OAuth configuration:
   - In Supabase, under the Google provider settings, add the scope: `https://www.googleapis.com/auth/gmail.readonly`

## Edge Functions (Optional)

To enable inbox scanning, you'll need to create a Supabase Edge Function:

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Create the scan-inbox function
supabase functions new scan-inbox
```

Create the function in `supabase/functions/scan-inbox/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { action } = await req.json()
    
    // TODO: Implement Gmail API scanning logic here
    // This would:
    // 1. Get user's OAuth token
    // 2. Call Gmail API to search for subscription emails
    // 3. Parse emails and extract subscription data
    // 4. Insert found subscriptions into the database
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Inbox scan initiated",
        subscriptions_found: 0 
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }
})
```

Deploy the function:

```bash
supabase functions deploy scan-inbox
```

## Testing

1. Start your development server: `npm run dev`
2. Navigate to the app and click "Sign In with Google"
3. Grant the requested permissions (including Gmail access)
4. You should be redirected back to the dashboard

## Troubleshooting

- **Authentication not working**: Check that your redirect URLs are correctly configured in both Google Cloud Console and Supabase
- **Database errors**: Ensure all tables are created and RLS policies are enabled
- **Edge Function errors**: Check the Supabase function logs in the dashboard

## Next Steps

- Implement the Gmail scanning logic in the Edge Function
- Add more trust analysis data for popular services
- Set up automated notifications for upcoming renewals

## Edge Function Webhook (Welcome Email)

To trigger the `send-email` function when a new user signs up, run this in SQL Editor:

```sql
-- Create a trigger function to call Edge Function
create or replace function public.handle_new_user_email() 
returns trigger as $$
begin
  perform net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/send-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <ANON_KEY>"}',
    body := json_build_object(
      'to', new.email,
      'subject', 'Welcome to Remind My Bill',
      'type', 'welcome',
      'data', json_build_object('name', new.raw_user_meta_data->>'full_name')
    )::jsonb
  );
  return new;
end;
$$ language plpgsql security definer;

-- Create the trigger
create trigger on_auth_user_created_email
  after insert on auth.users
  for each row execute procedure public.handle_new_user_email();
```

> **Note:** You need to enable the `net` extension in Supabase Dashboard -> Database -> Extensions.
> Replace `<PROJECT_REF>` and `<ANON_KEY>` with your actual project details.

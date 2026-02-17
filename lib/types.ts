// ─── Core Tier Type ─────────────────────────────────────────────────────────
export type UserTier = 'free' | 'pro' | 'lifetime'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Profile, "id" | "created_at">>
      }
      subscriptions: {
        Row: Subscription
        Insert: Omit<Subscription, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Subscription, "id" | "created_at">>
      }
      trust_analysis: {
        Row: TrustAnalysis
        Insert: Omit<TrustAnalysis, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<TrustAnalysis, "id" | "created_at">>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, "id" | "created_at">
        Update: Partial<Omit<Notification, "id" | "created_at">>
      }
      subscription_events: {
        Row: SubscriptionEvent
        Insert: Omit<SubscriptionEvent, "id" | "created_at">
        Update: Partial<Omit<SubscriptionEvent, "id" | "created_at">>
      }
    }
  }
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  default_currency?: string
  // Legacy fields (kept for backward compat)
  subscription_tier?: 'free' | 'pro' | 'premium'
  subscription_status?: string
  subscription_limit: number
  current_usage: number
  is_pro: boolean
  // New tier fields
  user_tier: UserTier
  subscription_interval?: 'monthly' | 'annual' | null
  sms_addon_enabled: boolean
  email_alerts_used: number
  email_alerts_limit: number
  subscriptions_tracked: number
  stripe_subscription_id?: string | null
  stripe_customer_id?: string | null
  lifetime_purchase_date?: string | null
  sms_subscription_expires?: string | null
  tier_updated_at?: string
  // Cancellation fields
  cancellation_scheduled: boolean
  cancellation_date: string | null
  cancellation_reason: string | null
  cancellation_feedback: any | null
  cancel_reactivation_token: string | null
  previous_tier?: UserTier | null
  created_at: string
  updated_at: string
}

// ─── Subscription Events (Audit Trail) ──────────────────────────────────────
export type SubscriptionEventType =
  | 'upgrade'
  | 'downgrade'
  | 'sms_added'
  | 'sms_removed'
  | 'renewal'
  | 'cancellation'
  | 'payment_failed'

export interface SubscriptionEvent {
  id: string
  user_id: string
  event_type: SubscriptionEventType
  from_tier?: UserTier | null
  to_tier?: UserTier | null
  stripe_event_id?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  name: string
  category: string
  cost: number
  currency: string
  frequency: string
  trust_score: number
  renewal_date: string
  status: "active" | "cancelled" | "paused"
  last_used_date: string | null
  auto_renewal: boolean
  cancellation_difficulty: "easy" | "medium" | "hard"
  shared_with_count: number
  is_locked: boolean
  previous_cost: number | null
  last_price_change_date: string | null
  last_accessed_date: string | null
  created_at: string
  updated_at: string
}

export interface TrustAnalysis {
  id: string
  service_name: string
  trust_score: number
  category: string
  cancellation_difficulty: "easy" | "medium" | "hard"
  dark_patterns: string[]
  positive_features: string[]
  risk_flags: string[]
  trend: "rising" | "stable" | "falling"
  alert_count: number
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: "warning" | "alert" | "info" | "success"
  title: string
  message: string
  subscription_id: string | null
  read: boolean
  created_at: string
}

export interface FinancialHealth {
  score: number
  optimization_level: "low" | "medium" | "high"
  total_monthly_spend: number
  active_subscriptions_count: number
  next_renewal: {
    name: string
    days_until: number
  } | null
}

export interface SavingsAlert {
  id: string
  subscription_id: string
  subscription_name: string
  category: string
  monthly_cost: number
  reason: string
  days_since_last_use: number | null
  potential_savings: number
}

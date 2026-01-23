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
    }
  }
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  default_currency?: string
  subscription_tier?: 'free' | 'pro' | 'premium'
  subscription_status?: string
  subscription_limit: number
  current_usage: number
  created_at: string
  updated_at: string
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

export type ProfileRow = {
  id: string
  full_name: string | null
  email?: string | null
  role?: string | null
  source_table?: "profiles" | "profile"
  user_subscriptions?: {
    id?: string
    status?: string | null
    plan_id?: string | null
    started_at?: string | null
    ends_at?: string | null
    current_period_start?: string | null
    current_period_end?: string | null
    created_at?: string | null
    updated_at?: string | null
    [key: string]: unknown
    subscription_plans?: {
      id?: string
      description?: string | null
      name?: string | null
    }[]
  }[]
}

export type SubscriptionPlanRow = {
  id: string
  name: string | null
  description?: string | null
  allow_trade?: boolean | null
  allow_investment?: boolean | null
  trade_limit_per_week?: number | null
}

export type BroadcastRow = {
  id: string
  title: string | null
  message: string
  audience: string | null
  broadcast_type?: string | null
  created_by?: string | null
  duration?: string | null
  expires_at?: string | null
  profiles?:
    | {
      full_name?: string | null
    }
    | {
      full_name?: string | null
    }[]
    | null
  created_at: string | null
}

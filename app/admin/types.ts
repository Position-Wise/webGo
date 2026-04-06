export type ProfileRow = {
  id: string
  full_name: string | null
  avatar_url?: string | null
  email?: string | null
  role?: string | null
  user_subscriptions?: {
    id?: string
    status?: string | null
    subscription_plan_id?: string | null
    payment_proof?: string | null
    submitted_at?: string | null
    started_at?: string | null
    ends_at?: string | null
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
  is_public?: boolean | null
  allow_trade?: boolean | null
  allow_investment?: boolean | null
  trade_limit_per_week?: number | null
  plan_type?: string | null
}

export type BroadcastRow = {
  id: string
  title: string | null
  message: string
  audience: string | null
  audience_type?: string | null
  target_user_ids?: string[] | null
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

export type InquiryRow = {
  id: string
  user_id: string
  type: string | null
  message: string
  metadata?: Record<string, unknown> | null
  status?: string | null
  created_at?: string | null
  profiles?:
    | {
        full_name?: string | null
        avatar_url?: string | null
      }
    | {
        full_name?: string | null
        avatar_url?: string | null
      }[]
    | null
}

export type MarketSymbolRow = {
  id: string
  symbol: string | null
  display_name: string | null
  is_active?: boolean | null
  sort_order?: number | null
  created_at?: string | null
  updated_at?: string | null
}

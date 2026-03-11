export type ProfileRow = {
  id: string
  full_name: string | null
  role?: string | null
  source_table?: "profiles" | "profile"
  user_subscriptions?: {
    status?: string | null
    subscription_plans?: {
      id?: string
      name?: string | null
    }[]
  }[]
}

export type SubscriptionPlanRow = {
  id: string
  name: string | null
}

export type BroadcastRow = {
  id: string
  title: string | null
  message: string
  audience: string | null
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

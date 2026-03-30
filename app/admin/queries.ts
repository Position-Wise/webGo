import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server"
import type {
  BroadcastRow,
  InquiryRow,
  MarketSymbolRow,
  ProfileRow,
  SubscriptionPlanRow,
} from "./types"

function toSubscriptionsArray(
  value: unknown
): NonNullable<ProfileRow["user_subscriptions"]> {
  if (Array.isArray(value)) {
    return value as NonNullable<ProfileRow["user_subscriptions"]>
  }

  if (value && typeof value === "object") {
    return [value as NonNullable<ProfileRow["user_subscriptions"]>[number]]
  }

  return []
}

function toSubscriptionPlansArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
  }

  if (value && typeof value === "object") {
    return [value]
  }

  return []
}

function normalizeProfileRow(profile: ProfileRow): ProfileRow {
  const subscriptions = toSubscriptionsArray(profile.user_subscriptions).map((subscription) => ({
    ...subscription,
    subscription_plans: toSubscriptionPlansArray(subscription.subscription_plans),
  }))

  return {
    ...profile,
    user_subscriptions: subscriptions.slice(0, 1),
  }
}

async function fetchAdminEmailsByUserId(profileIds: string[]) {
  const serviceRoleClient = createSupabaseServiceRoleClient()

  if (!serviceRoleClient || !profileIds.length) {
    return {} as Record<string, string | null>
  }

  const requestedIds = new Set(profileIds.map((id) => id.trim()).filter(Boolean))
  const emailsByUserId: Record<string, string | null> = {}
  const perPage = 1000

  for (let page = 1; requestedIds.size > 0; page += 1) {
    const { data, error } = await serviceRoleClient.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) {
      console.error("Admin auth users query failed:", error)
      return emailsByUserId
    }

    const users = data?.users ?? []
    if (!users.length) {
      break
    }

    for (const user of users) {
      const userId = (user.id ?? "").trim()
      if (!requestedIds.has(userId)) continue

      const email = typeof user.email === "string" ? user.email.trim() : ""
      emailsByUserId[userId] = email || null
      requestedIds.delete(userId)
    }

    if (users.length < perPage) {
      break
    }
  }

  return emailsByUserId
}

export async function fetchAdminProfiles() {
  const supabase = await createSupabaseServerClient()
  const [profilesResult, subscriptionsResult, plansResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,full_name,avatar_url,role")
      .order("full_name", { ascending: true }),
    supabase
      .from("user_subscriptions")
      .select(
        `
          id,
          user_id,
          status,
          subscription_plan_id,
          payment_proof,
          submitted_at,
          started_at,
          ends_at,
          created_at,
          updated_at
        `
      )
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("subscription_plans")
      .select("id,name,description"),
  ])

  if (profilesResult.error) {
    console.error("Profiles query failed:", profilesResult.error)
    return []
  }

  if (subscriptionsResult.error) {
    console.error("User subscriptions query failed:", subscriptionsResult.error)
  }

  if (plansResult.error) {
    console.error("Subscription plans query failed:", plansResult.error)
  }

  const profiles = (profilesResult.data as ProfileRow[] | null) ?? []
  const emailsByUserId = await fetchAdminEmailsByUserId(
    profiles.map((profile) => profile.id)
  )

  const plansById = (((plansResult.data as SubscriptionPlanRow[] | null) ?? [])).reduce<
    Record<string, { id?: string; name?: string | null; description?: string | null }>
  >((acc, plan) => {
    const id = (plan.id ?? "").trim()
    if (!id) return acc

    acc[id] = {
      id,
      name: plan.name ?? null,
      description: plan.description ?? null,
    }
    return acc
  }, {})

  const subscriptionsByUserId = new Map<
    string,
    NonNullable<ProfileRow["user_subscriptions"]>[number]
  >()

  for (const subscription of ((subscriptionsResult.data as {
    id?: string | null
    user_id?: string | null
    status?: string | null
    subscription_plan_id?: string | null
    payment_proof?: string | null
    submitted_at?: string | null
    started_at?: string | null
    ends_at?: string | null
    created_at?: string | null
    updated_at?: string | null
  }[] | null) ?? [])) {
    const userId = (subscription.user_id ?? "").trim()
    if (!userId || subscriptionsByUserId.has(userId)) continue

    const planId = (subscription.subscription_plan_id ?? "").trim()
    const plan = planId ? plansById[planId] ?? null : null

    subscriptionsByUserId.set(userId, {
      id: subscription.id ?? undefined,
      status: subscription.status ?? null,
      subscription_plan_id: subscription.subscription_plan_id ?? null,
      payment_proof: subscription.payment_proof ?? null,
      submitted_at: subscription.submitted_at ?? null,
      started_at: subscription.started_at ?? null,
      ends_at: subscription.ends_at ?? null,
      created_at: subscription.created_at ?? null,
      updated_at: subscription.updated_at ?? null,
      subscription_plans: plan ? [plan] : [],
    })
  }

  return profiles.map((profile) =>
    normalizeProfileRow({
      ...profile,
      email: emailsByUserId[profile.id] ?? null,
      user_subscriptions: subscriptionsByUserId.has(profile.id)
        ? [subscriptionsByUserId.get(profile.id)!]
        : [],
    })
  )
}

export async function fetchAdminSubscriptionPlans() {
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from("subscription_plans")
    .select("id,name,is_public")
    .order("name", { ascending: true })

  return ((data as SubscriptionPlanRow[] | null) ?? []).filter((plan) => {
    const normalized = (plan.name ?? "").trim().toLowerCase()
    return Boolean(normalized)
  })
}

export async function fetchAdminPlanSettings() {
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from("subscription_plans")
    .select("*")
    .order("name", { ascending: true })

  return ((data as SubscriptionPlanRow[] | null) ?? []).filter((plan) => {
    const normalized = (plan.name ?? "").trim().toLowerCase()
    return Boolean(normalized)
  })
}

export async function fetchAdminBroadcasts(limit = 20) {
  const supabase = await createSupabaseServerClient()
  const nowIso = new Date().toISOString()
  const broadcastSelect = `
      id,
      title,
      message,
      audience,
      broadcast_type,
      created_by,
      duration,
      expires_at,
      created_at,
      profiles:created_by (
        full_name
      )
    `

  const { data, error } = await supabase
    .from("admin_broadcasts")
    .select(broadcastSelect)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    const { data: fallbackRows } = await supabase
      .from("admin_broadcasts")
      .select(
        `
          id,
          title,
          message,
          audience,
          broadcast_type,
          created_by,
          duration,
          expires_at,
          created_at
        `
      )
      .order("created_at", { ascending: false })
      .limit(limit)

    return (fallbackRows as BroadcastRow[] | null) ?? []
  }

  return ((data as BroadcastRow[] | null) ?? []).filter((row) => {
    if (!row.expires_at) return true
    return row.expires_at > nowIso
  })
}

export async function fetchAdminInquiries() {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from("inquiries")
    .select(
      `
        id,
        user_id,
        type,
        message,
        metadata,
        status,
        created_at,
        profiles (
          full_name,
          avatar_url
        )
      `
    )
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Inquiries query failed:", error)
    return []
  }

  return (data as InquiryRow[] | null) ?? []
}

export async function fetchAdminMarketSymbols() {
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from("market_symbols")
    .select("id,symbol,display_name,is_active,sort_order,created_at,updated_at")
    .order("sort_order", { ascending: true })
    .order("display_name", { ascending: true })

  return ((data as MarketSymbolRow[] | null) ?? []).filter((row) => {
    const symbol = (row.symbol ?? "").trim()
    return Boolean(symbol)
  })
}

export async function fetchBroadcastFeedbackSummary(broadcastIds?: string[]) {
  const supabase = await createSupabaseServerClient()
  const normalizedIds = (broadcastIds ?? []).map((id) => id.trim()).filter(Boolean)

  let query = supabase.from("broadcast_feedback").select("broadcast_id,outcome")

  if (normalizedIds.length) {
    query = query.in("broadcast_id", normalizedIds)
  }

  const { data, error } = await query
  if (error) {
    console.error("Broadcast feedback summary query failed:", error)
    return {}
  }

  const summary: Record<
    string,
    {
      profit: number
      loss: number
      total: number
      efficiency: number
    }
  > = {}

  for (const row of (data as { broadcast_id?: string | null; outcome?: string | null }[] | null) ?? []) {
    const broadcastId = (row.broadcast_id ?? "").trim()
    if (!broadcastId) continue

    if (!summary[broadcastId]) {
      summary[broadcastId] = {
        profit: 0,
        loss: 0,
        total: 0,
        efficiency: 0,
      }
    }

    const outcome = (row.outcome ?? "").trim().toLowerCase()
    if (outcome === "profit") {
      summary[broadcastId].profit += 1
      summary[broadcastId].total += 1
      continue
    }

    if (outcome === "loss") {
      summary[broadcastId].loss += 1
      summary[broadcastId].total += 1
    }
  }

  Object.keys(summary).forEach((broadcastId) => {
    const total = summary[broadcastId].total
    summary[broadcastId].efficiency =
      total > 0 ? Math.round((summary[broadcastId].profit / total) * 100) : 0
  })

  return summary
}

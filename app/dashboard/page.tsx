import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getBroadcastAuthorName } from "@/app/admin/helpers"
import DashboardTabView, {
  type DashboardBroadcast,
} from "@/components/dashboard/dashboard-tab-view"

export const dynamic = "force-dynamic"

type ProfileRow = {
  role?: string | null
  user_subscriptions?: {
    status?: string | null
    plan_id?: string | null
    subscription_plans?: {
      id?: string
      name?: string | null
    }[]
  }[]
}

type PlanFeatureRow = {
  id?: string
  name?: string | null
  allow_trade?: boolean | null
  allow_investment?: boolean | null
  trade_limit_per_week?: number | null
}

type BroadcastRow = {
  id: string
  title: string | null
  message: string
  audience: string | null
  broadcast_type?: string | null
  created_by?: string | null
  profiles?:
    | {
      full_name?: string | null
    }
    | {
      full_name?: string | null
    }[]
    | null
  expires_at?: string | null
  created_at: string | null
}

function normalizePlanName(value: string | null | undefined) {
  const normalized = (value ?? "basic").toLowerCase()
  if (normalized === "growth" || normalized === "elite") return normalized
  return "basic"
}

function normalizeBroadcastType(
  value: string | null | undefined
): "trade" | "investment" | "announcement" {
  const normalized = (value ?? "investment").toLowerCase()
  if (normalized === "trade" || normalized === "announcement") return normalized
  return "investment"
}

function getDefaultTradeAccess(planName: string) {
  return planName === "growth" || planName === "elite"
}

function getDefaultInvestmentAccess() {
  return true
}

function getDefaultTradeLimit(planName: string) {
  if (planName === "growth") return 2
  if (planName === "basic") return 0
  return null
}

function getStartOfWeekIso() {
  const now = new Date()
  const dayOfWeek = now.getUTCDay()
  const mondayOffset = (dayOfWeek + 6) % 7
  now.setUTCDate(now.getUTCDate() - mondayOffset)
  now.setUTCHours(0, 0, 0, 0)
  return now.toISOString()
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null // layout should already redirect
  }

  const profileSelect = `
      role,
      user_subscriptions (
        status,
        plan_id,
        subscription_plans (
          id,
          name
        )
      )
    `

  const { data: profileById } = await supabase
    .from("profiles")
    .select(profileSelect)
    .eq("id", user.id)
    .maybeSingle()

  const profile = profileById ?? (
    await supabase
      .from("profiles")
      .select(profileSelect)
      .eq("user_id", user.id)
      .maybeSingle()
  ).data

  const subscription = (profile as ProfileRow | null)?.user_subscriptions?.[0]
  const fallbackPlanName = subscription?.subscription_plans?.[0]?.name ?? "basic"
  const userPlanId =
    subscription?.plan_id ??
    (subscription?.subscription_plans?.[0]?.id
      ? String(subscription.subscription_plans?.[0]?.id)
      : null)
  const status = subscription?.status ?? null
  let planRow: PlanFeatureRow | null = null

  if (userPlanId) {
    const { data } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", userPlanId)
      .maybeSingle()
    planRow = (data as PlanFeatureRow | null) ?? null
  }

  if (!planRow) {
    const { data } = await supabase
      .from("subscription_plans")
      .select("*")
      .ilike("name", fallbackPlanName)
      .maybeSingle()
    planRow = (data as PlanFeatureRow | null) ?? null
  }

  const normalizedPlan = normalizePlanName(planRow?.name ?? fallbackPlanName)
  const allowTrade =
    typeof planRow?.allow_trade === "boolean"
      ? planRow.allow_trade
      : getDefaultTradeAccess(normalizedPlan)
  const allowInvestment =
    typeof planRow?.allow_investment === "boolean"
      ? planRow.allow_investment
      : getDefaultInvestmentAccess()
  const tradeLimitPerWeek =
    typeof planRow?.trade_limit_per_week === "number"
      ? Math.max(0, Math.floor(planRow.trade_limit_per_week))
      : getDefaultTradeLimit(normalizedPlan)

  let hasReachedTradeLimit = false

  if (allowTrade && typeof tradeLimitPerWeek === "number") {
    const startOfWeek = getStartOfWeekIso()
    const { count } = await supabase
      .from("trade_usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfWeek)

    hasReachedTradeLimit = (count ?? 0) >= tradeLimitPerWeek
  }

  const nowIso = new Date().toISOString()
  const broadcastSelect = `
      id,
      title,
      message,
      audience,
      broadcast_type,
      created_by,
      expires_at,
      created_at,
      profiles:created_by (
        full_name
      )
    `

  const { data: broadcastRowsWithMeta, error: broadcastRowsWithMetaError } = await supabase
    .from("admin_broadcasts")
    .select(broadcastSelect)
    .or(`audience.is.null,audience.eq.all,audience.eq.${normalizedPlan},audience.eq.invest,audience.eq.trade`)
    .order("created_at", { ascending: false })
    .limit(60)

  const broadcastRows = broadcastRowsWithMetaError
    ? (
      await supabase
        .from("admin_broadcasts")
        .select(`
          id,
          title,
          message,
          audience,
          expires_at,
          created_at
        `)
        .order("created_at", { ascending: false })
        .limit(60)
    ).data
    : broadcastRowsWithMeta

  const broadcasts: DashboardBroadcast[] = ((broadcastRows as BroadcastRow[] | null) ?? [])
    .filter((row) => {
      if (!row.message) return false
      const audience = (row.audience ?? "all").toLowerCase()
      if (
        audience !== "all" &&
        audience !== "invest" &&
        audience !== "trade" &&
        audience !== normalizedPlan
      ) {
        return false
      }
      const broadcastType = normalizeBroadcastType(row.broadcast_type)
      if (broadcastType === "trade" && (!allowTrade || hasReachedTradeLimit)) {
        return false
      }
      if (broadcastType === "investment" && !allowInvestment) {
        return false
      }

      if (!row.expires_at) return true
      if (row.expires_at <= nowIso) return false

      return true
    })
    .map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      audience: row.audience,
      broadcast_type: normalizeBroadcastType(row.broadcast_type),
      posted_by_name: getBroadcastAuthorName(row.profiles),
      created_at: row.created_at,
    }))

  return (
    <main className="min-h-screen bg-background text-foreground pt-24 pb-20 px-6">
      <section className="max-w-5xl mx-auto space-y-8">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Member Dashboard
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold">
            Invest and Trade workspace
          </h1>
          <p className="text-sm text-muted-foreground">
            Switch tabs to view focused content, and read the latest admin
            broadcasts for each segment.
          </p>
        </div>

        <div className="grid gap-4 rounded-xl border border-border bg-card p-6 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Email
            </p>
            <p className="mt-1 text-sm font-medium">
              {user.email}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Membership tier
            </p>
            <p className="mt-1 text-sm font-medium capitalize">
              {planRow?.name ?? fallbackPlanName}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Access status
            </p>
            <p className="mt-1 text-sm font-medium">
              {status === "active" ? "Active" : "Pending"}
            </p>
          </div>
        </div>

        <div>
          <DashboardTabView broadcasts={broadcasts} />
        </div>
      </section>
    </main>
  )
}

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getBroadcastAuthorName } from "@/app/admin/helpers"
import DashboardTabView, {
  type DashboardBroadcast,
} from "@/components/dashboard/dashboard-tab-view"
import AskAdminDialog from "@/components/inquiries/ask-admin-dialog"
import LiveMarketBoard from "@/components/dashboard/live-market-board"
import { getCurrentUserAccessState } from "@/lib/subscription-access"
import { getAccessStateLabel } from "@/lib/subscription-status"
import {
  normalizeBroadcastType,
  normalizePlanAudienceKey,
  resolveMemberBroadcastTab,
} from "@/lib/broadcast-audience"

export const dynamic = "force-dynamic"

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

type BroadcastFeedbackRow = {
  broadcast_id?: string | null
  user_id?: string | null
  outcome?: string | null
}

type TradeUsageRow = {
  broadcast_id?: string | null
}

type MarketSymbolRow = {
  symbol?: string | null
  display_name?: string | null
}

const PLAN_FEATURES_SELECT = "id,name,allow_trade,allow_investment,trade_limit_per_week"

function defaultAllowTrade(planName: string) {
  return planName === "pro" || planName === "premium" || planName === "admin"
}

function defaultAllowInvestment(planName: string) {
  return planName !== "new"
}

function getStartOfWeekIso() {
  const current = new Date()
  const currentDay = current.getUTCDay()
  const daysSinceMonday = (currentDay + 6) % 7
  current.setUTCDate(current.getUTCDate() - daysSinceMonday)
  current.setUTCHours(0, 0, 0, 0)
  return current.toISOString()
}

function defaultTradeLimitPerWeek(planName: string) {
  if (planName === "new" || planName === "basic") return 0
  if (planName === "pro") return 2
  if (planName === "premium" || planName === "admin") return 99
  return 0
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const access = await getCurrentUserAccessState(supabase)
  const user = access.user

  if (!user) {
    return null
  }

  const fallbackPlanName = normalizePlanAudienceKey(
    access.planName ?? (access.isAdmin ? "admin" : "basic")
  )
  const userPlanId = access.planId
  let planRow: PlanFeatureRow | null = null

  if (userPlanId) {
    const { data } = await supabase
      .from("subscription_plans")
      .select(PLAN_FEATURES_SELECT)
      .eq("id", userPlanId)
      .maybeSingle()
    planRow = (data as PlanFeatureRow | null) ?? null
  }

  if (!planRow) {
    const { data } = await supabase
      .from("subscription_plans")
      .select(PLAN_FEATURES_SELECT)
      .ilike("name", fallbackPlanName)
      .maybeSingle()
    planRow = (data as PlanFeatureRow | null) ?? null
  }

  const normalizedPlan = normalizePlanAudienceKey(planRow?.name ?? fallbackPlanName)
  const isApprovedAccess = access.accessState === "approved"
  const baseAllowTrade =
    typeof planRow?.allow_trade === "boolean"
      ? planRow.allow_trade
      : defaultAllowTrade(normalizedPlan)
  const baseAllowInvestment =
    typeof planRow?.allow_investment === "boolean"
      ? planRow.allow_investment
      : defaultAllowInvestment(normalizedPlan)
  const planTradeLimit =
    typeof planRow?.trade_limit_per_week === "number"
      ? Math.max(0, Math.floor(planRow.trade_limit_per_week))
      : defaultTradeLimitPerWeek(normalizedPlan)
  const allowTrade = isApprovedAccess ? baseAllowTrade : false
  const allowInvestment = isApprovedAccess ? baseAllowInvestment : false
  const tradeLimitPerWeek = allowTrade ? planTradeLimit : 0

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
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("created_at", { ascending: false })
    .limit(60)

  const broadcastRows = broadcastRowsWithMetaError
    ? (
      await supabase
        .from("admin_broadcasts")
        .select(
          `
            id,
            title,
            message,
            audience,
            broadcast_type,
            expires_at,
            created_at
          `
        )
        .order("created_at", { ascending: false })
        .limit(60)
    ).data
    : broadcastRowsWithMeta

  const broadcasts = ((broadcastRows as BroadcastRow[] | null) ?? []).reduce<
    DashboardBroadcast[]
  >((acc, row) => {
      if (!row.message) return acc
      if (row.expires_at && row.expires_at <= nowIso) return acc

      const dashboardTab = resolveMemberBroadcastTab({
        audience: row.audience,
        broadcastType: row.broadcast_type,
        isAdmin: access.isAdmin,
        planName: normalizedPlan,
        allowTrade,
        allowInvestment,
      })

      if (!dashboardTab) return acc

      acc.push({
        id: row.id,
        title: row.title,
        message: row.message,
        audience: row.audience,
        broadcast_type: normalizeBroadcastType(row.broadcast_type),
        dashboard_tab: dashboardTab,
        posted_by_name: getBroadcastAuthorName(row.profiles),
        created_at: row.created_at,
        user_feedback: null,
      })

      return acc
    }, [])

  const broadcastIds = broadcasts.map((broadcast) => broadcast.id)
  const feedbackByBroadcast: Record<string, "profit" | "loss"> = {}

  if (broadcastIds.length && !access.isAdmin) {
    const { data: feedbackRows } = await supabase
      .from("broadcast_feedback")
      .select("*")
      .eq("user_id", user.id)
      .in("broadcast_id", broadcastIds)

    for (const row of (feedbackRows as BroadcastFeedbackRow[] | null) ?? []) {
      const broadcastId = (row.broadcast_id ?? "").trim()
      const outcome = (row.outcome ?? "").trim().toLowerCase()

      if (!broadcastId) continue
      if (outcome !== "profit" && outcome !== "loss") continue

      feedbackByBroadcast[broadcastId] = outcome
    }
  }

  const broadcastsWithFeedback = broadcasts.map((broadcast) => ({
    ...broadcast,
    user_feedback: feedbackByBroadcast[broadcast.id] ?? null,
  }))

  const consumedTradeBroadcastIds: string[] = []
  let tradeConsumedThisWeek = 0

  if (tradeLimitPerWeek > 0) {
    const { data: usageRows } = await supabase
      .from("trade_usage")
      .select("broadcast_id")
      .eq("user_id", user.id)
      .gte("created_at", getStartOfWeekIso())

    const consumedSet = new Set<string>()
    for (const row of (usageRows as TradeUsageRow[] | null) ?? []) {
      const broadcastId = (row.broadcast_id ?? "").trim()
      if (!broadcastId) continue
      consumedSet.add(broadcastId)
    }

    consumedTradeBroadcastIds.push(...consumedSet)
    tradeConsumedThisWeek = consumedSet.size
  }

  const { data: marketSymbolRows } = await supabase
    .from("market_symbols")
    .select("symbol,display_name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("display_name", { ascending: true })

  const availableSymbols = ((marketSymbolRows as MarketSymbolRow[] | null) ?? [])
    .map((row) => ({
      symbol: (row.symbol ?? "").trim().toUpperCase(),
      label: (row.display_name ?? row.symbol ?? "").trim(),
    }))
    .filter((row) => row.symbol.length > 0)

  return (
    <main className="min-h-screen bg-background text-foreground pt-24 pb-20 px-6">
      <section className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
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

          <AskAdminDialog />
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
              {normalizedPlan}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Access status
            </p>
            <p className="mt-1 text-sm font-medium">
              {getAccessStateLabel(access.accessState)}
            </p>
          </div>
        </div>

        <LiveMarketBoard availableSymbols={availableSymbols} />

        <div>
          <DashboardTabView
            broadcasts={broadcastsWithFeedback}
            allowTrade={allowTrade}
            allowInvestment={allowInvestment}
            tradeLimitPerWeek={tradeLimitPerWeek}
            tradeConsumedThisWeek={tradeConsumedThisWeek}
            consumedTradeBroadcastIds={consumedTradeBroadcastIds}
            allowFeedback={!access.isAdmin}
          />
        </div>
      </section>
    </main>
  )
}

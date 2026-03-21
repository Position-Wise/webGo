import { createSupabaseServerClient } from "@/lib/supabase/server"
import { isAdminRole } from "@/lib/roles"
import { getBroadcastAuthorName } from "@/app/admin/helpers"
import DashboardTabView, {
  type DashboardBroadcast,
} from "@/components/dashboard/dashboard-tab-view"
import LiveMarketBoard from "@/components/dashboard/live-market-board"
import { getCurrentUserAccessState } from "@/lib/subscription-access"
import { getAccessStateLabel } from "@/lib/subscription-status"
import type { MarketSymbolOption } from "@/lib/market-symbols"

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

type MarketSymbolRow = {
  symbol?: string | null
  display_name?: string | null
  is_active?: boolean | null
}

type BroadcastFeedbackRow = {
  broadcast_id?: string | null
  outcome?: string | null
}

function normalizePlanName(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase()
  if (normalized === "pro" || normalized === "growth") return "pro"
  if (normalized === "premium" || normalized === "elite") return "premium"
  if (normalized === "master_admin") return "admin"
  return normalized || "basic"
}

function getPlanAudienceKeys(planName: string) {
  if (planName === "admin") {
    return ["basic", "pro", "premium", "growth", "elite", "admin"]
  }
  if (planName === "pro") return ["pro", "growth"]
  if (planName === "premium") return ["premium", "elite"]
  return [planName]
}

function defaultAllowTrade(planName: string) {
  return planName === "pro" || planName === "premium" || planName === "admin"
}

function defaultAllowInvestment(planName: string) {
  return planName !== "new"
}

function normalizeBroadcastType(
  value: string | null | undefined
): "trade" | "investment" | "announcement" {
  const normalized = (value ?? "investment").toLowerCase()
  if (normalized === "trade" || normalized === "announcement") return normalized
  return "investment"
}

function normalizeMarketSymbol(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toUpperCase()
  if (!normalized) return null
  if (normalized.length > 20) return null
  if (!/^[A-Za-z0-9^.\-=&]+$/.test(normalized)) return null
  return normalized
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const access = await getCurrentUserAccessState(supabase)
  const user = access.user

  if (!user) {
    return null // layout should already redirect
  }

  const fallbackPlanName = normalizePlanName(
    access.planName ?? (isAdminRole(access.role) ? "admin" : "basic")
  )
  const userPlanId = access.planId
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
      : defaultAllowTrade(normalizedPlan)
  const allowInvestment =
    typeof planRow?.allow_investment === "boolean"
      ? planRow.allow_investment
      : defaultAllowInvestment(normalizedPlan)
  const audienceKeys = getPlanAudienceKeys(normalizedPlan)

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
  const audienceFilter = [
    "audience.is.null",
    "audience.eq.all",
    "audience.eq.invest",
    "audience.eq.trade",
    ...audienceKeys.map((audience) => `audience.eq.${audience}`),
  ].join(",")

  const { data: broadcastRowsWithMeta, error: broadcastRowsWithMetaError } = await supabase
    .from("admin_broadcasts")
    .select(broadcastSelect)
    .or(audienceFilter)
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
          broadcast_type,
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
        !audienceKeys.includes(audience)
      ) {
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
      user_feedback: null,
    }))

  const broadcastIds = broadcasts.map((broadcast) => broadcast.id)
  const feedbackByBroadcast: Record<string, "profit" | "loss"> = {}

  if (broadcastIds.length) {
    const { data: feedbackRows } = await supabase
      .from("broadcast_feedback")
      .select("broadcast_id,outcome")
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

  const { data: marketRows } = await supabase
    .from("market_symbols")
    .select("symbol,display_name,is_active,sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("display_name", { ascending: true })
    .limit(120)

  const availableMarketSymbols: MarketSymbolOption[] = Array.from(
    new Map(
      (((marketRows as MarketSymbolRow[] | null) ?? [])
        .map((row) => {
          const symbol = normalizeMarketSymbol(row.symbol)
          if (!symbol) return null

          return {
            symbol,
            label: (row.display_name ?? "").trim() || symbol,
          }
        })
        .filter(
          (row): row is MarketSymbolOption => row !== null
        )).map((row) => [row.symbol, row])
    ).values()
  )

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

        <LiveMarketBoard availableSymbols={availableMarketSymbols} />

        <div>
          <DashboardTabView
            broadcasts={broadcastsWithFeedback}
            allowTrade={allowTrade}
            allowInvestment={allowInvestment}
          />
        </div>
      </section>
    </main>
  )
}


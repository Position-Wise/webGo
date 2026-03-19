import { createSupabaseServerClient } from "@/lib/supabase/server"
import { isAdminRole } from "@/lib/roles"
import { getBroadcastAuthorName } from "@/app/admin/helpers"
import DashboardTabView, {
  type DashboardBroadcast,
} from "@/components/dashboard/dashboard-tab-view"
import { getCurrentUserAccessState } from "@/lib/subscription-access"
import { getAccessStateLabel } from "@/lib/subscription-status"

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

function normalizeBroadcastType(
  value: string | null | undefined
): "trade" | "investment" | "announcement" {
  const normalized = (value ?? "investment").toLowerCase()
  if (normalized === "trade" || normalized === "announcement") return normalized
  return "investment"
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

        <div>
          <DashboardTabView broadcasts={broadcasts} />
        </div>
      </section>
    </main>
  )
}


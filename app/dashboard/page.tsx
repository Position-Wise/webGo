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
    subscription_plans?: {
      name?: string | null
    }[]
  }[]
}

type BroadcastRow = {
  id: string
  title: string | null
  message: string
  audience: string | null
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
        subscription_plans (
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
  const plan = subscription?.subscription_plans?.[0]?.name ?? "basic"
  const status = subscription?.status ?? null
  const normalizedPlan = (() => {
    const value = (plan ?? "basic").toLowerCase()
    if (value === "growth" || value === "elite") return value
    return "basic"
  })()

  const nowIso = new Date().toISOString()
  const broadcastSelect = `
      id,
      title,
      message,
      audience,
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
          created_by,
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
      if (!row.expires_at) return true
      return row.expires_at > nowIso
    })
    .map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      audience: row.audience,
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
              {plan}
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

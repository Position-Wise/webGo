import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

function normalizePlanName(plan: string | null) {
  const p = (plan ?? "").toLowerCase()
  if (p === "elite") return "elite"
  if (p === "growth") return "growth"
  // treat anything else as basic/foundation
  return "foundation"
}

export default async function TipsPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // layout should already redirect, but keep a guard
    return null
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      role,
      user_subscriptions (
        status,
        subscription_plans (
          name
        )
      )
    `)
    .eq("id", user.id)
    .maybeSingle()

  const subscription = (profile as any)?.user_subscriptions?.[0]
  const planName = subscription?.subscription_plans?.[0]?.name ?? null
  const tier = normalizePlanName(planName)

  const canSeeGrowth = tier === "growth" || tier === "elite"
  const canSeeElite = tier === "elite"

  return (
    <main className="min-h-screen bg-background text-foreground pt-24 pb-20 px-6">
      <section className="max-w-5xl mx-auto space-y-4">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground/80">
          Member Tips
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold">
          Strategy tips aligned to your tier.
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
          You are currently on the{" "}
          <span className="font-medium text-foreground">
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </span>{" "}
          plan. These modules are a simple demo of how content and access can
          scale with membership.
        </p>
      </section>

      <section className="max-w-5xl mx-auto mt-10 grid gap-6 md:grid-cols-3">
        {/* Foundation tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Foundation: Core Discipline
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Define a maximum portfolio drawdown you are willing to accept.</p>
            <p>• Separate long-term allocations from short-term experiments.</p>
            <p>• Review positions on a fixed schedule, not on headlines.</p>
          </CardContent>
        </Card>

        {/* Growth tips (locked if below Growth) */}
        <Card className={!canSeeGrowth ? "opacity-60" : ""}>
          <CardHeader>
            <CardTitle className="text-base">
              Growth: Playbook Structuring
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            {canSeeGrowth ? (
              <>
                <p>• Map each strategy to clear regime conditions.</p>
                <p>• Use risk buckets (core / satellite / opportunistic).</p>
                <p>• Size entries by volatility, not comfort level.</p>
              </>
            ) : (
              <p>
                Upgrade to the <span className="font-medium">Growth</span> tier
                to unlock structured strategy templates and risk buckets.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Elite tips (locked if below Elite) */}
        <Card className={!canSeeElite ? "opacity-60" : ""}>
          <CardHeader>
            <CardTitle className="text-base">
              Elite: Institutional Overlay
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            {canSeeElite ? (
              <>
                <p>• Align reporting with institutional-style risk committees.</p>
                <p>• Run scenario analysis for funding and liquidity shocks.</p>
                <p>• Maintain a live playbook for de-risking and re-risking.</p>
              </>
            ) : (
              <p>
                Elite content demonstrates how deeper strategy, oversight, and
                committee-ready reporting can be layered onto your portfolio.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function InsightsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground pt-24 pb-16 px-6">
      <section className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl sm:text-4xl font-semibold">
          Structured Market Insights
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
          Position Wise Advisory focuses on turning noisy markets into
          testable, repeatable frameworks. This space outlines how we think
          about risk, time, and capital positioning.
        </p>

        <div className="grid gap-6 md:grid-cols-2 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Market Architecture
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                We prioritise structure first: regimes, liquidity, and
                positioning, before narratives. Every view is mapped to a
                clear hypothesis and invalidation level.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Risk as a First-Class Input
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Position sizing, drawdown bands, and capital buckets are
                defined before entries. Strategy comes with explicit risk
                budgets, not soft guidelines.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}


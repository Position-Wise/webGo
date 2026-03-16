import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* =============== HERO =============== */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 grid gap-12 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-center">
        {/* Left copy */}
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-secondary/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-secondary-foreground">
            Position Wise Advisory
          </p>

          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight">
            Secure Your
            <span className="block text-accent mt-2">
              Financial Future
            </span>
          </h1>

          <p className="mt-5 text-sm sm:text-base text-muted-foreground max-w-xl">
            Experience institutional-grade wealth frameworks, precision risk controls,
            and structured market intelligence built for investors who value
            discipline over noise.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Button size="lg">
              Start Now
            </Button>
            <Button size="lg" variant="outline">
              View Demo
            </Button>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3 text-sm text-muted-foreground">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                Verified Capital Tracked
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                $43.9M+
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                Active Strategies
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                24
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                Advisory Tenure
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                18+ yrs
              </p>
            </div>
          </div>
        </div>

        {/* Right hero card */}
        <Card className="relative overflow-hidden border border-border/70 bg-card/80 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>Portfolio Snapshot</span>
              <span className="rounded-full bg-accent/15 px-3 py-1 text-[11px] font-semibold text-accent-foreground">
                Live Overview
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 text-sm">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                  Managed Balance
                </p>
                <p className="mt-1 text-3xl font-semibold">
                  $429,240
                </p>
                <p className="mt-1 text-xs text-emerald-500">
                  +14.8% this quarter
                </p>
              </div>
              <div className="h-20 w-32 rounded-lg bg-gradient-to-tr from-emerald-500/15 via-accent/10 to-primary/10 relative overflow-hidden">
                <div className="absolute inset-x-3 bottom-3 flex items-end gap-1">
                  {[30, 50, 40, 65, 55, 80].map((h, idx) => (
                    <div
                      key={idx}
                      className="w-[6px] rounded-full bg-emerald-500/70"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border/70 bg-background/40 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
                  Drawdown Control
                </p>
                <p className="mt-1 text-sm font-semibold">
                  &lt; 6.2%
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/40 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
                  Active Positions
                </p>
                <p className="mt-1 text-sm font-semibold">
                  31
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/40 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
                  Target Horizon
                </p>
                <p className="mt-1 text-sm font-semibold">
                  3–7 yrs
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* =============== PRECISION TOOLS =============== */}
      <section className="border-y border-border/70 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground/80">
              Precision Wealth Tools
            </p>
            <h2 className="mt-3 text-2xl sm:text-3xl font-semibold">
              Structure every decision with disciplined, testable frameworks.
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              From macro posture to single-position sizing, every layer of your
              capital stack is mapped to repeatable rules, not headlines.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Smart Indexing
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  Dynamic allocation overlays built on institutional index
                  construction, not retail heuristics.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Tax Optimization
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  Embedded tax-aware rebalancing and harvesting logic aligned
                  to your specific jurisdiction and time horizon.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Legacy Protocols
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  Documentation-ready portfolio records designed for seamless
                  transition planning and fiduciary oversight.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* =============== TRANSPARENT TIERS =============== */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground/80">
            Transparent Tiers
          </p>
          <h2 className="mt-3 text-3xl font-semibold">
            Choose the structure that fits your capital.
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            Each tier unlocks a clearly defined level of intelligence, reporting,
            and advisory access—no hidden schedules or surprise lockups.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {/* Foundation */}
          <Card className="relative">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                Foundation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <span className="text-3xl font-semibold text-foreground">$0</span>
                <span className="ml-1 text-xs text-muted-foreground">/ month</span>
              </div>
              <ul className="space-y-2">
                <li>• Weekly market briefing</li>
                <li>• Core risk dashboards</li>
                <li>• Access to tactical notes</li>
              </ul>
              <Button className="w-full mt-4" variant="outline">
                Start Free
              </Button>
            </CardContent>
          </Card>

          {/* Growth - highlighted */}
          <Card className="relative border-2 border-accent shadow-lg shadow-accent/20 bg-accent/5">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent-foreground">
              Most Popular
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold tracking-wide uppercase text-accent-foreground">
                Growth
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <span className="text-3xl font-semibold text-foreground">$49</span>
                <span className="ml-1 text-xs text-muted-foreground">/ month</span>
              </div>
              <ul className="space-y-2">
                <li>• Full intelligence suite access</li>
                <li>• Quarterly strategy reviews</li>
                <li>• Priority update distribution</li>
              </ul>
              <Button className="w-full mt-4 bg-accent text-accent-foreground hover:opacity-90">
                Get Precision
              </Button>
            </CardContent>
          </Card>

          {/* Elite */}
          <Card className="relative">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                Elite
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <span className="text-3xl font-semibold text-foreground">$189</span>
                <span className="ml-1 text-xs text-muted-foreground">/ month</span>
              </div>
              <ul className="space-y-2">
                <li>• Direct advisory channel</li>
                <li>• Bespoke portfolio mapping</li>
                <li>• Institutional-level reporting</li>
              </ul>
              <Button className="w-full mt-4">
                Contact Team
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* =============== CTA BAND =============== */}
      <section className="bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto px-6 py-14 flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <h3 className="text-2xl font-semibold">
              Ready to structure your next decade of decisions?
            </h3>
            <p className="mt-2 text-sm opacity-90">
              Request verified access and receive an initial framework overview
              tailored to your current capital posture.
            </p>
          </div>
          <Button
            size="lg"
            className="bg-accent text-accent-foreground hover:opacity-90"
          >
            Request Verified Access
          </Button>
        </div>
      </section>

      {/* =============== FOOTER =============== */}
      <footer className="border-t border-border/70 py-10 px-6 text-center text-xs text-muted-foreground">
        <p className="font-medium text-foreground text-sm">
          Position Wise Advisory
        </p>
        <p className="mt-2">
          Structured financial intelligence for investors who take capital
          stewardship seriously.
        </p>
        <p className="mt-4">
          © {new Date().getFullYear()} Position Wise Advisory. All rights reserved.
        </p>
      </footer>
    </main>
  )
}

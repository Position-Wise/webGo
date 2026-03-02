import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">

      {/* ================= HERO ================= */}
      <section className="max-w-6xl mx-auto px-6 pt-28 pb-24 text-center">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          Position Wise Advisory
        </p>

        <h1 className="mt-6 text-5xl md:text-6xl font-semibold leading-tight">
          Structured Intelligence
          <span className="block text-accent mt-4">
            for Disciplined Capital Positioning
          </span>
        </h1>

        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Position Wise Advisory delivers tiered market intelligence,
          strategic updates, and verified advisory insights designed
          for long-term capital clarity.
        </p>

        <div className="mt-10 flex justify-center gap-4">
          <Button size="lg">
            Request Verified Access
          </Button>

          <Button size="lg" variant="outline">
            View Membership Structure
          </Button>
        </div>
      </section>

      {/* ================= INTELLIGENCE PREVIEW ================= */}
      <section className="py-20 px-6 border-y border-border bg-muted/30">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-semibold">
            Strategic Intelligence Modules
          </h2>

          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Access structured frameworks and analytical models curated
            for verified members.
          </p>

          <div className="grid md:grid-cols-3 gap-8 mt-14">
            <Card>
              <CardHeader>
                <CardTitle>Market Structure Analysis</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Framework-driven evaluation of macro and sector-level
                positioning strategies.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Allocation Framework</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Structured capital protection modeling designed for
                disciplined exposure management.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Capital Positioning Models</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Data-backed allocation strategies aligned with long-term
                growth discipline.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ================= MEMBERSHIP TIERS ================= */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-semibold text-center">
            Membership Structure
          </h2>

          <p className="text-center text-muted-foreground mt-4 max-w-xl mx-auto">
            Access levels are structured based on intelligence depth
            and advisory engagement.
          </p>

          <div className="grid md:grid-cols-3 gap-8 mt-16">

            {/* Essential */}
            <Card>
              <CardHeader>
                <CardTitle>Essential</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>• Core Market Briefings</p>
                <p>• Monthly Strategic Updates</p>
                <p>• Foundational Intelligence Access</p>

                <Button className="w-full mt-6">
                  Request Access
                </Button>
              </CardContent>
            </Card>

            {/* Strategic (Highlighted) */}
            <Card className="border-2 border-accent shadow-md">
              <CardHeader>
                <CardTitle className="text-accent">
                  Strategic
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>• Advanced Strategy Reports</p>
                <p>• Risk Allocation Insights</p>
                <p>• Priority Intelligence Delivery</p>

                <Button className="w-full mt-6 bg-accent text-accent-foreground hover:opacity-90">
                  Request Access
                </Button>
              </CardContent>
            </Card>

            {/* Executive */}
            <Card>
              <CardHeader>
                <CardTitle>Executive</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>• Private Advisory Sessions</p>
                <p>• Portfolio Intelligence Support</p>
                <p>• Dedicated Strategic Oversight</p>

                <Button className="w-full mt-6">
                  Contact Advisory Desk
                </Button>
              </CardContent>
            </Card>

          </div>
        </div>
      </section>

      {/* ================= VERIFIED ONLY SECTION ================= */}
      <section className="py-24 px-6 border-t border-border text-center">
        <h3 className="text-3xl font-semibold">
          Advanced Strategy Reports
        </h3>

        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          In-depth analytical briefings and structured advisory notes
          are accessible exclusively to verified members.
        </p>

        <div className="mt-12 max-w-3xl mx-auto p-12 rounded-xl border border-dashed border-accent bg-card">
          <p className="text-accent font-medium tracking-wide">
            Verified Members Only
          </p>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-border py-12 px-6 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">
          Position Wise Advisory
        </p>

        <p className="mt-2">
          Strategic Financial Intelligence. Structured for Long-Term Clarity.
        </p>

        <p className="mt-6 text-xs">
          © {new Date().getFullYear()} Position Wise Advisory. All rights reserved.
        </p>
      </footer>

    </main>
  )
}
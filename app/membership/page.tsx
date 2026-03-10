import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function MembershipPage() {
  return (
    <main className="min-h-screen bg-background text-foreground pt-24 pb-20 px-6">
      <section className="max-w-5xl mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl font-semibold">
          Membership Structure
        </h1>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
          Three clear tiers, no hidden schedules. Choose the level of
          intelligence and access that fits your capital commitments today,
          knowing you can scale when your posture changes.
        </p>
      </section>

      <section className="max-w-5xl mx-auto mt-14 grid gap-6 md:grid-cols-3">
        {/* Foundation */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Foundation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <span className="text-3xl font-semibold text-foreground">$0</span>
              <span className="ml-1 text-xs text-muted-foreground">/ month</span>
            </div>
            <ul className="space-y-1.5">
              <li>• Weekly market scaffolding brief</li>
              <li>• Core risk dashboards</li>
              <li>• Email-only distribution</li>
            </ul>
            <Button className="w-full mt-4" variant="outline">
              Start Free
            </Button>
          </CardContent>
        </Card>

        {/* Growth */}
        <Card className="relative border-2 border-accent bg-accent/5 shadow-lg shadow-accent/20">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent-foreground">
            Most Popular
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-accent-foreground">
              Growth
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <span className="text-3xl font-semibold text-foreground">$49</span>
              <span className="ml-1 text-xs text-muted-foreground">/ month</span>
            </div>
            <ul className="space-y-1.5">
              <li>• Full intelligence library</li>
              <li>• Quarterly strategy calls</li>
              <li>• Priority briefing window</li>
            </ul>
            <Button className="w-full mt-4 bg-accent text-accent-foreground hover:opacity-90">
              Get Precision
            </Button>
          </CardContent>
        </Card>

        {/* Elite */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Elite
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <span className="text-3xl font-semibold text-foreground">$189</span>
              <span className="ml-1 text-xs text-muted-foreground">/ month</span>
            </div>
            <ul className="space-y-1.5">
              <li>• Direct advisory channel</li>
              <li>• Bespoke portfolio mapping</li>
              <li>• Institutional-style reporting pack</li>
            </ul>
            <Button className="w-full mt-4">
              Talk to Advisory
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BadgeCheck,
  Building2,
  ChartArea,
  Check,
  CheckCircle2,
  Rocket,
  ShieldCheck,
  X,
} from "lucide-react";

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
            <span className="block text-accent mt-2">Financial Future</span>
          </h1>

          <p className="mt-5 text-sm sm:text-base text-muted-foreground max-w-xl">
            Experience institutional-grade wealth frameworks, precision risk
            controls, and structured market intelligence built for investors who
            value discipline over noise.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Button size="lg">Start Now</Button>
            <Button size="lg" variant="outline">
              View Demo
            </Button>
          </div>

          {/* <div className="mt-10 grid gap-6 sm:grid-cols-3 text-sm text-muted-foreground">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                Verified Capital Tracked
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                ₹43.9M+
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                Active Strategies
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">24</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                Advisory Tenure
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                18+ yrs
              </p>
            </div>
          </div> */}
        </div>

        {/* Right hero card */}

        <div className="relative flex justify-center">
          {/* Glow Background */}
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-emerald-400/20 blur-3xl rounded-full" />
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-blue-400/20 blur-3xl rounded-full" />

          {/* Card */}
          <Card className="relative w-lg rounded-3xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center text-xs font-medium text-muted-foreground">
                <span className="uppercase tracking-wide">
                  Active Portfolio
                </span>

                <span className="flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Live Market
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Amount */}
              <div className="flex items-end justify-between gap-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                    Managed Balance
                  </p>
                  <p className="text-3xl font-semibold">₹1,24,500</p>
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

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/50 p-3 text-center">
                  <p className="text-[10px] uppercase text-muted-foreground">
                    Growth
                  </p>
                  <p className="text-emerald-600 font-semibold">+12.4%</p>
                </div>

                <div className="rounded-xl bg-muted/50 p-3 text-center">
                  <p className="text-[10px] uppercase text-muted-foreground">
                    Positions
                  </p>
                  <p className="font-semibold">14 Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* =============== PRECISION TOOLS =============== */}
      <section className="border-y border-border/70 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-xl">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-accent">
              Engineered for Success
            </p>
            <h2 className="mt-3 text-2xl sm:text-3xl font-semibold">
              Structure every decision with disciplined, testable frameworks.
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              From macro posture to single-position sizing, every layer of your
              capital stack is mapped to repeatable rules, not headlines. Our
              platform integrates three core pillars to give you a definitive
              edge in volatile markets.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {/* ========== Trading Signals ========== */}
            <Card className="rounded-3xl p-6 shadow-sm">
              <CardContent className="p-0">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-5">
                  <Rocket className="text-secondary-foreground" />
                </div>

                <h3 className="text-lg font-semibold">Trading Signals</h3>

                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  High-conviction entries and exits powered by multi-factor
                  algorithmic confirmation. No noise, just execution.
                </p>

                <div className="mt-5 space-y-2 text-sm">
                  <p className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 /> Momentum Scalps
                  </p>
                  <p className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 /> Positional Breakouts
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* ========== Market Insights (Highlighted) ========== */}
            <Card className="rounded-3xl p-6 bg-[#2A4064] text-primary-foreground shadow-xl">
              <CardContent className="p-0">
                <div className="w-12 h-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center mb-5">
                  <ChartArea className="text-primary-foreground" />
                </div>

                <h3 className="text-lg font-semibold">Market Insights</h3>

                <p className="text-sm mt-2 opacity-80 leading-relaxed">
                  Deep-dive technical and fundamental analysis across sectors.
                  Understand the "why" behind market moves.
                </p>

                <div className="mt-5 space-y-2 text-sm">
                  <p className="flex items-center gap-2 text-emerald-500">
                    <CheckCircle2 />
                    Context before conviction
                  </p>
                  <p className="flex items-center gap-2 text-emerald-500">
                    <CheckCircle2 />
                    See the structure behind every move
                  </p>
                </div>

                {/* Report Card */}
                {/* <div className="mt-6 p-4 rounded-xl bg-white/10 border border-white/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-white/20" />
                    <div>
                      <p className="text-[10px] uppercase opacity-70">
                        Today’s Report
                      </p>
                      <p className="text-sm font-medium">
                        Sector Rotation Alpha
                      </p>
                    </div>
                  </div>

                  <Button className="w-full bg-accent text-accent-foreground">
                    Download PDF
                  </Button>
                </div> */}
              </CardContent>
            </Card>

            {/* ========== Bespoke Guidance ========== */}
            <Card className="rounded-3xl p-6 shadow-sm">
              <CardContent className="p-0">
                <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center mb-5">
                  <Building2 className="text-secondary-foreground" />
                </div>

                <h3 className="text-lg font-semibold">Bespoke Guidance</h3>

                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Personalized advisory for long-term wealth creation. We tailor
                  strategies to your risk profile and goals.
                </p>

                <div className="mt-5 space-y-2 text-sm">
                  <p className="flex items-center gap-2 text-emerald-500">
                    <CheckCircle2 /> You stay in control, we bring clarity.
                  </p>
                  <p className="flex items-center gap-2 text-emerald-500">
                    <CheckCircle2 /> Built around your risk, not generic advice
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* =============== TRANSPARENT TIERS =============== */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground/80">
            Transparent Tiers
          </p>

          <h2 className="mt-3 text-3xl font-semibold">
            Choose the structure that fits your capital.
          </h2>

          <p className="mt-4 text-sm text-muted-foreground">
            Each tier unlocks a clearly defined level of intelligence,
            reporting, and advisory access no hidden schedules.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {/* ========== FOUNDATION ========== */}
          <Card className="rounded-3xl border bg-card shadow-sm p-6">
            <CardHeader className="p-0">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                Explorer
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0 mt-4 space-y-5">
              <div>
                <span className="text-3xl font-semibold">₹0</span>
                <span className="text-xs text-muted-foreground ml-1">
                  / month
                </span>
              </div>

              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2 items-center">
                  <Check className="w-5 h-5 text-accent" /> Weekly market
                  briefing
                </li>
                <li className="flex gap-2 items-center">
                  <Check className="w-5 h-5 text-accent" /> Basic dashboards
                </li>
                <li className="flex gap-2 items-center">
                  <X className="w-5 h-5 text-muted-foreground" /> Signal access
                </li>
              </ul>

              <Button variant="outline" className="w-full rounded-xl">
                Start Free
              </Button>
            </CardContent>
          </Card>

          {/* ========== GROWTH (HIGHLIGHT) ========== */}
          <Card className="rounded-3xl border-2 border-accent bg-accent/5 shadow-xl p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] px-3 py-1 rounded-full bg-accent text-accent-foreground font-semibold">
              Most Popular
            </div>

            <CardHeader className="p-0">
              <CardTitle className="text-xs uppercase tracking-wide text-accent">
                Active Plan
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0 mt-4 space-y-5">
              <div>
                <span className="text-3xl font-semibold">₹299</span>
                <span className="text-xs text-muted-foreground ml-1">
                  / month
                </span>
              </div>

              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2 items-center">
                  <Check className="w-5 h-5 text-accent" /> Daily signals
                </li>
                <li className="flex gap-2 items-center">
                  <Check className="w-5 h-5 text-accent" /> Entry / SL / Target
                </li>
                <li className="flex gap-2 items-center">
                  <Check className="w-5 h-5 text-accent" /> Priority updates
                </li>
              </ul>

              <Button className="w-full rounded-xl bg-accent text-accent-foreground hover:opacity-90">
                Go Basic
              </Button>
            </CardContent>
          </Card>

          {/* ========== ELITE ========== */}
          <Card className="rounded-3xl border bg-card shadow-sm p-6">
            <CardHeader className="p-0">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                Elite Advisory
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0 mt-4 space-y-5">
              <div>
                <span className="text-3xl font-semibold">₹999</span>
                <span className="text-xs text-muted-foreground ml-1">
                  / month
                </span>
              </div>

              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2 items-center">
                  <Check className="w-5 h-5 text-accent" /> All signals
                </li>
                <li className="flex gap-2 items-center">
                  <Check className="w-5 h-5 text-accent" /> Detailed reports
                </li>
                <li className="flex gap-2 items-center">
                  <Check className="w-5 h-5 text-accent" /> Personalized
                  guidance
                </li>
              </ul>

              <Button className="w-full rounded-xl">Contact Team</Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="px-6 py-20 bg-[#2a4064]">
        <div className="max-w-xl mx-auto space-y-8">
          {/* Image */}
          {/* <div className="rounded-3xl overflow-hidden shadow-lg">
            <img
              src="/vision-image.jpg" // replace with your asset
              alt="Vision"
              className="w-full h-full object-cover"
            />
          </div> */}

          {/* Content */}
          <div>
            <p className="text-md tracking-[0.3em] text-emerald-400 uppercase font-black">
              The Vision
            </p>

            <h2 className="mt-3 text-3xl text-accent-foreground font-semibold leading-tight">
              Architecture & Discipline
            </h2>

            <p className="mt-4 text-sm text-accent-foreground/80 leading-relaxed">
              Position Wise Advisory was founded on a singular premise: the
              retail trader lacks an architectural approach to markets. We don't
              just provide tips; we provide a framework.
            </p>
          </div>

          {/* Points */}
          <div className="space-y-5 text-accent-foreground">
            <div className="flex gap-4 items-center">
              <div className="w-10 h-10 rounded-full bg-accent-foreground flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-medium">Risk-First Framework</p>
                <p className="text-sm text-accent-foreground/80">
                  Every position is calculated against survival first, profit
                  second.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <div className="w-10 h-10 rounded-full bg-accent-foreground flex items-center justify-center">
                <BadgeCheck className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-medium">Absolute Transparency</p>
                <p className="text-sm text-accent-foreground/80">
                  No hindsight bias. Every insight is time-stamped and verified.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =============== CTA BAND =============== */}
      <section className="px-6 py-24">
        <div className="max-w-xl mx-auto relative">
          {/* Glow Background */}
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-emerald-400/50 blur-3xl rounded-full" />
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-blue-400/50 blur-3xl rounded-full" />

          {/* Card */}
          <div className="relative border-none rounded-3xl bg-gradient-to-b from-[#2a4064] from-70% to-emerald-500 text-primary-foreground p-8 text-center shadow-2xl border border-white/10 backdrop-blur-xl">
            <h3 className="text-2xl font-semibold leading-tight">
              Ready to secure your position?
            </h3>

            <p className="mt-4 text-sm opacity-80 leading-relaxed">
              Join over 5,000 active members using the vault to navigate the
              Indian markets with precision.
            </p>

            <div className="mt-8 space-y-4">
              <Button className="w-full bg-emerald-500 text-accent-foreground text-base py-6 rounded-xl shadow-md hover:shadow-lg transition-all">
                Join The Vault
              </Button>

              <Button
                variant="outline"
                className="w-full border-white/20 text-primary-foreground bg-white/10 hover:bg-white/20 rounded-xl py-6 backdrop-blur"
              >
                Talk to an Advisor
              </Button>
            </div>
          </div>
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
          © {new Date().getFullYear()} Position Wise Advisory. All rights
          reserved.
        </p>
      </footer>
    </main>
  );
}

import Link from "next/link"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUserAccessState } from "@/lib/subscription-access"
import { getMemberHomePathForState } from "@/lib/subscription-status"

export const dynamic = "force-dynamic"

function formatDate(value: string | null | undefined) {
  if (!value) return null

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function normalizePlanLabel(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase()
  if (normalized === "growth") return "pro"
  if (normalized === "elite") return "premium"
  return normalized || null
}

export default async function WaitingPage() {
  const access = await getCurrentUserAccessState()

  if (!access.user) {
    redirect("/sign-in")
  }

  if (access.accessState === "approved") {
    redirect("/dashboard")
  }

  if (access.accessState !== "waiting") {
    redirect(getMemberHomePathForState(access.accessState))
  }

  const submittedAt = formatDate(access.subscription?.submitted_at ?? null)
  const planLabel = normalizePlanLabel(access.planName)

  return (
    <main className="min-h-screen bg-background text-foreground pt-24 pb-20 px-6">
      <section className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Subscription Review
            </p>
            <CardTitle className="text-3xl leading-tight">
              Your payment is waiting for admin approval
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm text-muted-foreground">
            <p>
              We found an active submission for{" "}
              <span className="font-medium text-foreground">
                {planLabel ?? "your selected plan"}
              </span>.
              Access to the dashboard will unlock automatically after approval.
            </p>

            <div className="grid gap-4 rounded-xl border border-border/70 bg-muted/30 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Account
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {access.user.email}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Submitted at
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {submittedAt ?? "Just now"}
                </p>
              </div>
            </div>

            {access.subscription?.payment_proof ? (
              <p>
                Proof link:{" "}
                <Link
                  className="text-primary underline-offset-4 hover:underline"
                  href={access.subscription.payment_proof}
                  rel="noreferrer"
                  target="_blank"
                >
                  View submitted screenshot
                </Link>
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button asChild size="sm">
                <Link href="/profile">View profile</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/subscribe?mode=edit">Edit submission</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
import Link from "next/link"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import AskAdminDialog from "@/components/inquiries/ask-admin-dialog"
import { Button } from "@/components/ui/button"
import { getCurrentUserAccessState } from "@/lib/subscription-access"
import {
  getAccessStateLabel,
  getMemberHomePathForState,
} from "@/lib/subscription-status"

export const dynamic = "force-dynamic"

function normalizePlanLabel(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase()
  if (normalized === "growth") return "pro"
  if (normalized === "elite") return "premium"
  return normalized || null
}

export default async function ProfilePage() {
  const access = await getCurrentUserAccessState()
  const user = access.user

  if (!user) return null

  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture

  const plan = normalizePlanLabel(access.planName)
  const proof = access.subscription?.payment_proof ?? null
  const submittedAt = access.subscription?.submitted_at
  const memberHomePath = getMemberHomePathForState(access.accessState)

  const formattedSubmittedAt = submittedAt
    ? new Date(submittedAt).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    })
    : null

  return (
    <div className="min-h-screen bg-background p-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-semibold">
          Profile
        </h1>

        <div className="rounded-xl border border-border bg-card p-8 space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback>
                {user.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div>
              <p className="text-lg font-medium">
                {user.user_metadata?.full_name || "Member"}
              </p>
              <p className="text-muted-foreground text-sm">
                {user.email}
              </p>
            </div>
          </div>

          <div className="grid gap-4 text-sm">
            <div className="flex justify-between border-b border-border pb-3">
              <span className="text-muted-foreground">Tier</span>
              <span className="font-medium capitalize">
                {plan || "Not selected"}
              </span>
            </div>

            <div className="flex justify-between border-b border-border pb-3">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium">
                {getAccessStateLabel(access.accessState)}
              </span>
            </div>

            <div className="flex justify-between border-b border-border pb-3">
              <span className="text-muted-foreground">Submitted</span>
              <span className="font-medium">
                {formattedSubmittedAt || "Not submitted"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Payment proof</span>
              {proof ? (
                <Link
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  href={proof}
                  rel="noreferrer"
                  target="_blank"
                >
                  View proof
                </Link>
              ) : (
                <span className="font-medium">
                  Not uploaded
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
              <Button asChild>
                <Link href={memberHomePath}>
                  {access.accessState === "approved"
                    ? "Go to dashboard"
                    : access.accessState === "waiting"
                      ? "View approval status"
                      : access.accessState === "blocked"
                        ? "Resubmit subscription"
                        : "Complete subscription"}
                </Link>
              </Button>

              <AskAdminDialog />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

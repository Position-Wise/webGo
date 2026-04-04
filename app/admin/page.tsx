import Link from "next/link"
import { publishQuickUpdate } from "./actions"
import {
  formatBroadcastDate,
  getBroadcastAuthorName,
  toBroadcastAudienceLabel,
  toTitleCase,
} from "./helpers"
import BroadcastFormFields from "./_components/broadcast-form-fields"
import { fetchAdminBroadcasts, fetchAdminProfiles } from "./queries"
import {
  getSubscriptionStatusLabel,
  normalizeSubscriptionStatus,
} from "@/lib/subscription-status"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import LoadingSubmitButton from "@/components/ui/loading-submit-button"
import { isBroadcastExpired } from "@/lib/broadcast-audience"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const [profiles, broadcasts] = await Promise.all([
    fetchAdminProfiles(),
    fetchAdminBroadcasts(12),
  ])
  const userOptions = profiles.map((profile) => ({
    id: profile.id,
    label:
      profile.full_name?.trim() ||
      profile.email?.trim() ||
      `User ${profile.id.slice(0, 8)}`,
  }))

  const getProfileStatus = (profile: (typeof profiles)[number]) =>
    normalizeSubscriptionStatus(profile.user_subscriptions?.[0]?.status ?? null)

  const totalMembers = profiles.length
  const pendingCount = profiles.filter((profile) => getProfileStatus(profile) === "pending").length
  const activeCount = profiles.filter((profile) => getProfileStatus(profile) === "active").length
  const cancelledCount = profiles.filter(
    (profile) => getProfileStatus(profile) === "cancelled"
  ).length
  const expiredCount = profiles.filter((profile) => getProfileStatus(profile) === "expired").length

  const memberPreview = profiles.slice(0, 5)

  const planBreakdown = profiles.reduce<Record<string, number>>((acc, profile) => {
    const plan = (
      profile.user_subscriptions?.[0]?.subscription_plans?.[0]?.name ?? "unassigned"
    ).toLowerCase()
    acc[plan] = (acc[plan] ?? 0) + 1
    return acc
  }, {})

  return (
    <section className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total members" value={totalMembers} />
        <MetricCard label="Pending" value={pendingCount} />
        <MetricCard label="Active" value={activeCount} />
        <MetricCard label="Cancelled" value={cancelledCount} />
        <MetricCard label="Expired" value={expiredCount} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Quick Update Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={publishQuickUpdate} className="space-y-4">
              <BroadcastFormFields userOptions={userOptions} />

              <LoadingSubmitButton type="submit" size="sm" pendingText="Posting...">
                Post update
              </LoadingSubmitButton>
            </form>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Latest broadcasts
              </p>

              {!broadcasts.length ? (
                <p className="text-sm text-muted-foreground">
                  No broadcast has been published yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {broadcasts.slice(0, 4).map((broadcast) => (
                    <article
                      key={broadcast.id}
                      className="rounded-lg border border-border/70 bg-muted/30 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {toBroadcastAudienceLabel({
                            audience: broadcast.audience,
                            audience_type: broadcast.audience_type ?? null,
                            target_user_ids: broadcast.target_user_ids ?? null,
                          })}
                        </p>
                        {broadcast.expires_at && isBroadcastExpired(broadcast.expires_at) ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                            Expired
                          </span>
                        ) : null}
                        <span className="text-xs text-muted-foreground/70">
                          {formatBroadcastDate(broadcast.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold">
                        {broadcast.title || "Broadcast"}
                      </p>
                      <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                        {broadcast.message}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Posted by {getBroadcastAuthorName(broadcast.profiles) || "Admin"}
                      </p>
                    </article>
                  ))}
                </div>
              )}

              <Button asChild variant="outline" size="sm">
                <Link href="/admin/broadcast">Manage all broadcasts</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              User Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Plan distribution
              </p>
              {!Object.keys(planBreakdown).length ? (
                <p className="text-sm text-muted-foreground">
                  No member plans available.
                </p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(planBreakdown).map(([plan, count]) => (
                    <div
                      key={plan}
                      className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2"
                    >
                      <p className="text-sm">
                        {toTitleCase(plan)}
                      </p>
                      <p className="text-sm font-medium">
                        {count}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Members preview (max 5)
              </p>
              {!memberPreview.length ? (
                <p className="text-sm text-muted-foreground">
                  No members found.
                </p>
              ) : (
                <div className="space-y-2">
                  {memberPreview.map((profile) => {
                    const status = getSubscriptionStatusLabel(
                      normalizeSubscriptionStatus(profile.user_subscriptions?.[0]?.status ?? null)
                    )
                    const plan = (
                      profile.user_subscriptions?.[0]?.subscription_plans?.[0]?.name ??
                      "unassigned"
                    ).toLowerCase()

                    return (
                      <div
                        key={profile.id}
                        className="rounded-md border border-border/70 px-3 py-2"
                      >
                        <p className="text-sm font-medium">
                          {profile.full_name || "Unnamed member"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {toTitleCase(plan)} - {status}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/subscriptions">Review subscriptions</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/users">Manage users</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 text-3xl font-semibold">
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

import Link from "next/link"
import { publishQuickUpdate } from "./actions"
import {
  BROADCAST_AUDIENCES,
  BROADCAST_DURATIONS,
  BROADCAST_TYPES,
  formatBroadcastDate,
  getBroadcastAuthorName,
  toAudienceLabel,
  toBroadcastTypeLabel,
  toDurationLabel,
  toTitleCase,
} from "./helpers"
import { fetchAdminBroadcasts, fetchAdminProfiles } from "./queries"
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/server"
import {
  getAccessStateFromStatus,
  getAccessStateLabel,
} from "@/lib/subscription-status"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import LoadingSubmitButton from "@/components/ui/loading-submit-button"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const [profiles, broadcasts] = await Promise.all([
    fetchAdminProfiles(),
    fetchAdminBroadcasts(12),
  ])
  const hasServiceRole = isSupabaseServiceRoleConfigured()
  const shouldShowPermissionHint = !hasServiceRole && profiles.length <= 1

  const totalMembers = profiles.length
  const activeCount = profiles.filter((profile) => {
    const status = profile.user_subscriptions?.[0]?.status ?? null
    return getAccessStateFromStatus(status) === "approved"
  }).length
  const waitingCount = profiles.filter((profile) => {
    const status = profile.user_subscriptions?.[0]?.status ?? null
    return getAccessStateFromStatus(status) === "waiting"
  }).length
  const newUserCount = profiles.filter((profile) => {
    const status = profile.user_subscriptions?.[0]?.status ?? null
    return getAccessStateFromStatus(status) === "new_user"
  }).length

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
      {shouldShowPermissionHint ? (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Admin data is permission-limited right now. Add
          ` SUPABASE_SERVICE_ROLE_KEY ` in `.env` or verify your Supabase RLS
          policies allow admin users to view all members.
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total members" value={totalMembers} />
        <MetricCard label="New users" value={newUserCount} />
        <MetricCard label="Pending review" value={waitingCount} />
        <MetricCard label="Active access" value={activeCount} />
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
              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Target audience
                  </label>
                  <select
                    name="audience"
                    defaultValue="all"
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {BROADCAST_AUDIENCES.map((audience) => (
                      <option key={audience} value={audience}>
                        {toAudienceLabel(audience)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Broadcast type
                  </label>
                  <select
                    name="broadcastType"
                    defaultValue="investment"
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {BROADCAST_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {toBroadcastTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Title (optional)
                  </label>
                  <Input
                    name="title"
                    placeholder="Example: Weekly risk update"
                    maxLength={120}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Display duration
                  </label>
                  <select
                    name="duration"
                    defaultValue="forever"
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {BROADCAST_DURATIONS.map((duration) => (
                      <option key={duration} value={duration}>
                        {toDurationLabel(duration)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Message
                </label>
                <textarea
                  name="message"
                  required
                  rows={4}
                  maxLength={1000}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  placeholder="Share quick update for members."
                />
              </div>

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
                          {toAudienceLabel(broadcast.audience)}
                        </p>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
                          {toBroadcastTypeLabel(broadcast.broadcast_type ?? null)}
                        </p>
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
                    const status = getAccessStateLabel(
                      getAccessStateFromStatus(profile.user_subscriptions?.[0]?.status ?? null)
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

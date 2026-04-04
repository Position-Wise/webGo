import { publishBroadcast } from "../actions"
import {
  formatBroadcastDate,
  getBroadcastAuthorName,
  toBroadcastAudienceLabel,
  toDurationLabel,
} from "../helpers"
import { fetchAdminBroadcasts, fetchAdminProfiles, fetchBroadcastFeedbackSummary } from "../queries"
import BroadcastFormFields from "../_components/broadcast-form-fields"
import BroadcastCardActions from "./broadcast-card-actions"
import BroadcastFeedbackLiveRefresh from "./broadcast-feedback-live-refresh"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import LoadingSubmitButton from "@/components/ui/loading-submit-button"
import { isBroadcastExpired, resolveExpiryOptionFromDuration } from "@/lib/broadcast-audience"

export const dynamic = "force-dynamic"

export default async function AdminBroadcastPage() {
  const [broadcasts, profiles] = await Promise.all([
    fetchAdminBroadcasts(30),
    fetchAdminProfiles(),
  ])
  const feedbackSummary = await fetchBroadcastFeedbackSummary(
    broadcasts.map((broadcast) => broadcast.id)
  )
  const userOptions = profiles.map((profile) => ({
    id: profile.id,
    label:
      profile.full_name?.trim() ||
      profile.email?.trim() ||
      `User ${profile.id.slice(0, 8)}`,
  }))

  return (
    <section className="space-y-6">
      <BroadcastFeedbackLiveRefresh />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Publish Broadcast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={publishBroadcast} className="space-y-4">
            <BroadcastFormFields userOptions={userOptions} />

            <LoadingSubmitButton type="submit" size="sm" pendingText="Publishing...">
              Publish broadcast
            </LoadingSubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Recent Broadcasts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!broadcasts.length ? (
            <p className="text-sm text-muted-foreground">
              No broadcast has been published yet.
            </p>
          ) : (
            broadcasts.map((broadcast) => (
              <article
                key={broadcast.id}
                className="rounded-lg border border-border/70 bg-muted/30 p-4"
              >
                {(() => {
                  const stats = feedbackSummary[broadcast.id] ?? {
                    profit: 0,
                    loss: 0,
                    total: 0,
                    efficiency: 0,
                  }

                  return (
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                        Profit: {stats.profit}
                      </span>
                      <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700">
                        Loss: {stats.loss}
                      </span>
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                        Efficiency: {stats.efficiency}%
                      </span>
                    </div>
                  )
                })()}

                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {toBroadcastAudienceLabel({
                      audience: broadcast.audience,
                      audience_type: broadcast.audience_type ?? null,
                      target_user_ids: broadcast.target_user_ids ?? null,
                    })}
                  </p>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
                    {toDurationLabel(broadcast.duration ?? null)}
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
                <BroadcastCardActions
                  broadcast={{
                    id: broadcast.id,
                    audience: broadcast.audience,
                    audience_type: broadcast.audience_type ?? null,
                    target_user_ids: broadcast.target_user_ids ?? null,
                    broadcast_type: broadcast.broadcast_type ?? "investment",
                    duration: broadcast.duration ?? "forever",
                    expiry_option: resolveExpiryOptionFromDuration(
                      broadcast.duration ?? "forever"
                    ),
                    title: broadcast.title,
                    message: broadcast.message,
                  }}
                  userOptions={userOptions}
                />
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  )
}

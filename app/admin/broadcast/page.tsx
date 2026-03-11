import { publishBroadcast } from "../actions"
import {
  BROADCAST_AUDIENCES,
  BROADCAST_DURATIONS,
  formatBroadcastDate,
  getBroadcastAuthorName,
  toAudienceLabel,
  toDurationLabel,
} from "../helpers"
import { fetchAdminBroadcasts } from "../queries"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export const dynamic = "force-dynamic"

export default async function AdminBroadcastPage() {
  const broadcasts = await fetchAdminBroadcasts(30)

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Publish Broadcast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={publishBroadcast} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
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
                rows={5}
                maxLength={1000}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                placeholder="Write the broadcast shown to users in the selected audience."
              />
            </div>

            <Button type="submit" size="sm">
              Publish broadcast
            </Button>
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
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {toAudienceLabel(broadcast.audience)}
                  </p>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
                    {toDurationLabel(broadcast.duration ?? null)}
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
            ))
          )}
        </CardContent>
      </Card>
    </section>
  )
}

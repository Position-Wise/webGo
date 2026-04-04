import { notFound } from "next/navigation"
import {
  formatBroadcastDate,
  toAudienceLabel,
  toBroadcastTypeLabel,
} from "@/app/admin/helpers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { isShareableBroadcastId } from "@/lib/broadcast-share"
import {
  isBroadcastExpired,
  isPrivateBroadcastAudienceType,
} from "@/lib/broadcast-audience"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type BroadcastPageProps = {
  params: Promise<{ broadcastId: string }>
}

type SharedBroadcast = {
  id: string
  title: string | null
  message: string
  audience: string | null
  audience_type: string | null
  broadcast_type: string | null
  created_at: string | null
  expires_at: string | null
}

function toNullableString(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function toSharedBroadcast(row: Record<string, unknown> | null): SharedBroadcast | null {
  if (!row) return null

  const id = toNullableString(row.id)
  const message = toNullableString(row.message)

  if (!id || !message) return null

  return {
    id,
    title: toNullableString(row.title),
    message,
    audience: toNullableString(row.audience),
    audience_type: toNullableString(row.audience_type),
    broadcast_type: toNullableString(row.broadcast_type),
    created_at: toNullableString(row.created_at),
    expires_at: toNullableString(row.expires_at),
  }
}

async function fetchShareableBroadcast(
  broadcastId: string
): Promise<SharedBroadcast | null> {
  const db = await createSupabaseServerClient()
  const { data } = await db
    .from("admin_broadcasts")
    .select("id,title,message,audience,audience_type,broadcast_type,created_at,expires_at")
    .eq("id", broadcastId)
    .maybeSingle()

  const broadcast = toSharedBroadcast(data as Record<string, unknown> | null)
  if (!broadcast) return null
  if (isPrivateBroadcastAudienceType(broadcast.audience_type)) return null
  if (isBroadcastExpired(broadcast.expires_at)) return null
  return broadcast
}

export default async function BroadcastSharePage({ params }: BroadcastPageProps) {
  const { broadcastId } = await params
  const normalizedBroadcastId = broadcastId.trim()

  if (!isShareableBroadcastId(normalizedBroadcastId)) {
    notFound()
  }

  const broadcast = await fetchShareableBroadcast(normalizedBroadcastId)

  if (!broadcast) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-16">
      <section className="mx-auto max-w-3xl space-y-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Shared Broadcast
        </p>

        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl leading-tight">
              {broadcast.title || "Broadcast"}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{toAudienceLabel(broadcast.audience)}</span>
              <span>{toBroadcastTypeLabel(broadcast.broadcast_type)}</span>
              <span>{formatBroadcastDate(broadcast.created_at)}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {broadcast.message}
            </p>
            {broadcast.expires_at ? (
              <p className="text-xs text-muted-foreground">
                Expires: {formatBroadcastDate(broadcast.expires_at)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

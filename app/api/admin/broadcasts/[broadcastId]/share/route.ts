import { NextResponse } from "next/server"
import { resolveRoleForUser, type MinimalDbClient } from "@/app/admin/access"
import { isAdminRole } from "@/lib/roles"
import { getBroadcastSharePath, isShareableBroadcastId } from "@/lib/broadcast-share"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

function toNullableString(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function toShareableBroadcast(row: Record<string, unknown> | null) {
  if (!row) return null

  const id = toNullableString(row.id)
  const message = toNullableString(row.message)
  if (!id || !message) return null

  return {
    id,
    title: toNullableString(row.title),
    message,
    audience: toNullableString(row.audience),
    broadcast_type: toNullableString(row.broadcast_type),
    created_at: toNullableString(row.created_at),
    expires_at: toNullableString(row.expires_at),
  }
}

function isExpired(value: string | null) {
  if (!value) return false
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed.getTime() <= Date.now()
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ broadcastId: string }> }
) {
  const { broadcastId } = await params
  const normalizedBroadcastId = broadcastId.trim()

  if (!isShareableBroadcastId(normalizedBroadcastId)) {
    return NextResponse.json({ error: "Invalid broadcast id." }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const callerRole = await resolveRoleForUser(
    user.id,
    supabase as unknown as MinimalDbClient
  )

  if (!isAdminRole(callerRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const db = supabase
  const { data } = await db
    .from("admin_broadcasts")
    .select("id,title,message,audience,broadcast_type,created_at,expires_at")
    .eq("id", normalizedBroadcastId)
    .maybeSingle()

  const broadcast = toShareableBroadcast(data as Record<string, unknown> | null)

  if (!broadcast || isExpired(broadcast.expires_at)) {
    return NextResponse.json({ error: "Broadcast not available for sharing." }, { status: 404 })
  }

  const sharePath = getBroadcastSharePath(broadcast.id)
  const origin = new URL(request.url).origin

  return NextResponse.json({
    sharePath,
    shareUrl: `${origin}${sharePath}`,
    broadcast,
  })
}

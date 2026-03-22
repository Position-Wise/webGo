import { NextResponse } from "next/server"
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server"

type TradeUsagePayload = {
  broadcastIds?: unknown
}

type TradeUsageRow = {
  broadcast_id?: string | null
}

function getStartOfMonthIso() {
  const date = new Date()
  date.setUTCDate(1)
  date.setUTCHours(0, 0, 0, 0)
  return date.toISOString()
}

function normalizeBroadcastIds(value: unknown) {
  if (!Array.isArray(value)) return []

  const deduped = new Set<string>()
  for (const item of value) {
    if (typeof item !== "string") continue
    const normalized = item.trim()
    if (!normalized) continue
    if (normalized.length > 100) continue
    deduped.add(normalized)
    if (deduped.size >= 50) break
  }

  return Array.from(deduped)
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let payload: TradeUsagePayload = {}
  try {
    payload = (await request.json()) as TradeUsagePayload
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 })
  }

  const broadcastIds = normalizeBroadcastIds(payload.broadcastIds)
  if (!broadcastIds.length) {
    return NextResponse.json({ ok: true, inserted: 0 })
  }

  const db = createSupabaseServiceRoleClient() ?? supabase
  const monthStartIso = getStartOfMonthIso()

  const { data: existingRows, error: existingError } = await db
    .from("trade_usage")
    .select("broadcast_id")
    .eq("user_id", user.id)
    .gte("created_at", monthStartIso)
    .in("broadcast_id", broadcastIds)

  if (existingError) {
    return NextResponse.json({ error: "Unable to check trade usage." }, { status: 500 })
  }

  const existingSet = new Set<string>()
  for (const row of (existingRows as TradeUsageRow[] | null) ?? []) {
    const broadcastId = (row.broadcast_id ?? "").trim()
    if (!broadcastId) continue
    existingSet.add(broadcastId)
  }

  const rowsToInsert = broadcastIds
    .filter((broadcastId) => !existingSet.has(broadcastId))
    .map((broadcastId) => ({
      user_id: user.id,
      broadcast_id: broadcastId,
    }))

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await db.from("trade_usage").insert(rowsToInsert)
    if (insertError) {
      return NextResponse.json({ error: "Unable to update trade usage." }, { status: 500 })
    }
  }

  return NextResponse.json({
    ok: true,
    inserted: rowsToInsert.length,
  })
}

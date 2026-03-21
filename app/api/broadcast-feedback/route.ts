import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type FeedbackPayload = {
  broadcastId?: unknown
  outcome?: unknown
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let payload: FeedbackPayload = {}

  try {
    payload = (await request.json()) as FeedbackPayload
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 })
  }

  const broadcastId = String(payload.broadcastId ?? "").trim()
  const outcome = String(payload.outcome ?? "")
    .trim()
    .toLowerCase()

  if (!broadcastId) {
    return NextResponse.json({ error: "Missing broadcast id." }, { status: 400 })
  }

  if (outcome !== "profit" && outcome !== "loss") {
    return NextResponse.json({ error: "Invalid outcome." }, { status: 400 })
  }

  const { error } = await supabase
    .from("broadcast_feedback")
    .upsert(
      {
        broadcast_id: broadcastId,
        user_id: user.id,
        outcome,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "broadcast_id,user_id" }
    )

  if (error) {
    return NextResponse.json({ error: "Unable to save feedback." }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    broadcast_id: broadcastId,
    outcome,
  })
}

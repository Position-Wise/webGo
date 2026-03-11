"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function updateUserAccess(formData: FormData): Promise<void> {
  const userId = formData.get("userId") as string | null
  const targetRole = (formData.get("role") as string | null) ?? "user"
  const plan = (formData.get("plan") as string | null) ?? "basic"
  const status = (formData.get("status") as string | null) ?? "pending"

  if (!userId) return

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  const callerRole = (profile as { role?: string } | null)?.role

  if ((callerRole ?? "").toLowerCase() !== "admin") return

  await supabase
    .from("profiles")
    .update({ role: targetRole })
    .eq("id", userId)

  const { data: planRow } = await supabase
    .from("subscription_plans")
    .select("id")
    .eq("name", plan)
    .maybeSingle()

  const planId = (planRow as { id?: string } | null)?.id

  if (planId) {
    await supabase
      .from("user_subscriptions")
      .upsert(
        {
          user_id: userId,
          plan_id: planId,
          status,
        },
        { onConflict: "user_id" }
      )
  }

  revalidatePath("/admin")
}
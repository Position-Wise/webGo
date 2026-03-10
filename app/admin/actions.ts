"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function updateUserAccess(formData: FormData) {
  const userId = formData.get("userId") as string | null
  const tier = (formData.get("tier") as string | null) ?? undefined
  const verified = formData.get("verified") === "on"

  if (!userId) {
    return
  }

  const supabase = await createSupabaseServerClient()

  // Optional: basic server-side check that caller is admin
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  const role = (profile as { role?: string } | null)?.role

  if ((role ?? "").toLowerCase() !== "admin") {
    return
  }

  await supabase
    .from("profiles")
    .update({ tier, verified })
    .eq("id", userId)

  revalidatePath("/admin")
}


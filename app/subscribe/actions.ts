"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const ROUTES_TO_REVALIDATE = [
  "/subscribe",
  "/waiting",
  "/dashboard",
  "/tips",
  "/profile",
  "/admin",
  "/admin/users",
  "/admin/subscriptions",
] as const

type SubmitSubscriptionRequestInput = {
  planId: string
  paymentProof: string
}

type PlanLookupRow = {
  id: string
  name?: string | null
  is_public?: boolean | null
}

export async function submitSubscriptionRequest(
  input: SubmitSubscriptionRequestInput
) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: "Please sign in again before submitting your payment proof.",
    }
  }

  const planId = input.planId.trim()
  const paymentProof = input.paymentProof.trim()

  if (!planId || !paymentProof) {
    return {
      error: "Select a plan and upload or paste a payment proof URL.",
    }
  }

  const publicPlanQuery = await supabase
    .from("subscription_plans")
    .select("id,name,is_public")
    .eq("id", planId)
    .eq("is_public", true)
    .maybeSingle()

  const planRow = publicPlanQuery.error
    ? (
      await supabase
        .from("subscription_plans")
        .select("id,name,is_public")
        .eq("id", planId)
        .maybeSingle()
    ).data
    : publicPlanQuery.data

  const normalizedPlanName = ((planRow as PlanLookupRow | null)?.name ?? "")
    .trim()
    .toLowerCase()

  if (
    !planRow ||
    (planRow as PlanLookupRow).is_public === false ||
    normalizedPlanName === "new" ||
    normalizedPlanName === "admin"
  ) {
    return {
      error: "The selected public plan could not be found.",
    }
  }

  const submittedAt = new Date().toISOString()
  const basePayload = {
    user_id: user.id,
    payment_proof: paymentProof,
    status: "pending",
    submitted_at: submittedAt,
  }

  let writeResult = await supabase
    .from("user_subscriptions")
    .upsert(
      {
        ...basePayload,
        plan_id: planId,
      },
      { onConflict: "user_id" }
    )

  if (writeResult.error) {
    writeResult = await supabase
      .from("user_subscriptions")
      .upsert(
        {
          ...basePayload,
          subscription_plan_id: planId,
        },
        { onConflict: "user_id" }
      )
  }

  if (writeResult.error) {
    return {
      error: writeResult.error.message,
    }
  }

  ROUTES_TO_REVALIDATE.forEach((path) => revalidatePath(path))

  return {
    error: null,
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ROUTES_TO_REVALIDATE = [
  "/subscribe",
  "/waiting",
  "/dashboard",
  "/tips",
  "/profile",
  "/admin",
  "/admin/users",
  "/admin/subscriptions",
] as const;

type SubmitSubscriptionRequestInput = {
  planId: string;
  paymentProof: string;
};

type PlanLookupRow = {
  id: string;
  name?: string | null;
  is_public?: boolean | null;
};

export async function submitSubscriptionRequest(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const planId = formData.get("planId") as string;
  const file = formData.get("payment_proof") as File;

  if (!file) {
    return { error: "Payment proof required" };
  }

  const fileExt = file.name.split(".").pop();

  const filePath = `${user.id}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("payment-proofs")
    .upload(filePath, file);

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data } = supabase.storage
    .from("payment-proofs")
    .getPublicUrl(filePath);

  const paymentProofUrl = data.publicUrl;

  const { error: dbError } = await supabase.from("user_subscriptions").upsert(
    {
      user_id: user.id,
      subscription_plan_id: planId,
      payment_proof: paymentProofUrl,
      status: "pending",
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (dbError) {
    console.error("Subscription DB error:", dbError);
    return { error: dbError.message };
  }

  ROUTES_TO_REVALIDATE.forEach((path) => revalidatePath(path));

  return { error: null };
}

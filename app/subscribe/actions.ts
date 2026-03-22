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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function submitSubscriptionRequest(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const planIdRaw = formData.get("planId");
  const planId = isNonEmptyString(planIdRaw) ? planIdRaw.trim() : "";

  if (!planId) {
    return { error: "Please select a plan." };
  }

  const fileInput = formData.get("payment_proof");
  const proofFile = fileInput instanceof File ? fileInput : null;
  const hasNewProofFile = Boolean(proofFile && proofFile.size > 0);
  const reuseExistingProof =
    ((formData.get("reuseExistingProof") as string | null) ?? "").trim().toLowerCase() ===
    "true";

  let paymentProofUrl: string | null = null;

  if (hasNewProofFile && proofFile) {
    const fileExt = proofFile.name.split(".").pop() || "png";
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(filePath, proofFile);

    if (uploadError) {
      return { error: uploadError.message };
    }

    const { data } = supabase.storage.from("payment-proofs").getPublicUrl(filePath);
    paymentProofUrl = data.publicUrl;
  } else if (reuseExistingProof) {
    const { data: existingSubmission } = await supabase
      .from("user_subscriptions")
      .select("payment_proof")
      .eq("user_id", user.id)
      .maybeSingle();

    const existingProofUrl = (existingSubmission?.payment_proof ?? "").trim();
    if (!existingProofUrl) {
      return { error: "No existing payment proof found. Please upload a screenshot." };
    }

    paymentProofUrl = existingProofUrl;
  } else {
    return { error: "Payment proof required" };
  }

  const { error: dbError } = await supabase.from("user_subscriptions").upsert(
    {
      user_id: user.id,
      subscription_plan_id: planId,
      payment_proof: paymentProofUrl,
      status: "pending",
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (dbError) {
    console.error("Subscription DB error:", dbError);
    return { error: dbError.message };
  }

  ROUTES_TO_REVALIDATE.forEach((path) => revalidatePath(path));

  return { error: null };
}

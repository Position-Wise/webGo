import { redirect } from "next/navigation"
import SubscriptionOnboardingFlow from "@/components/subscribe/subscription-onboarding-flow"
import { getCurrentUserAccessState } from "@/lib/subscription-access"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type PlanRow = {
  id: string
  name: string | null
  description?: string | null
  is_public?: boolean | null
  price?: number | null
}

type SubscribePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const PLAN_ORDER = ["basic", "pro", "premium"] as const

function normalizePlanKey(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase()
  if (normalized === "pro" || normalized === "growth") return "pro"
  if (normalized === "premium" || normalized === "elite") return "premium"
  return "basic"
}

function sortPlans(plans: PlanRow[]) {
  return [...plans].sort((left, right) => {
    const leftIndex = PLAN_ORDER.indexOf(normalizePlanKey(left.name))
    const rightIndex = PLAN_ORDER.indexOf(normalizePlanKey(right.name))
    return leftIndex - rightIndex
  })
}

function formatDate(value: string | null | undefined) {
  if (!value) return null

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export default async function SubscribePage({ searchParams }: SubscribePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const modeRaw = resolvedSearchParams.mode
  const mode = Array.isArray(modeRaw) ? modeRaw[0] : modeRaw
  const flowMode = mode === "edit" ? "edit" : "new"

  const access = await getCurrentUserAccessState()

  if (!access.user) {
    redirect("/sign-in")
  }

  if (access.accessState === "approved") {
    redirect("/dashboard")
  }

  const db = await createSupabaseServerClient()
  const withPriceQuery = await db
    .from("subscription_plans")
    .select("id,name,description,is_public,price")
    .eq("is_public", true)
    .order("name", { ascending: true })

  const planRows = withPriceQuery.error
    ? (
        await db
          .from("subscription_plans")
          .select("id,name,description,is_public")
          .order("name", { ascending: true })
      ).data
    : withPriceQuery.data

  const plans = sortPlans(
    ((planRows as PlanRow[] | null) ?? []).filter((plan) => {
      const normalized = (plan.name ?? "").trim().toLowerCase()
      if (!normalized) return false
      if (plan.is_public === false) return false
      return normalized !== "new" && normalized !== "admin"
    })
  ).map((plan) => ({
    id: plan.id,
    name: plan.name ?? "Plan",
    description: plan.description ?? null,
    price: typeof plan.price === "number" ? plan.price : null,
  }))

  const currentPlanId = plans.some((plan) => plan.id === access.planId)
    ? (access.planId ?? "")
    : (plans[0]?.id ?? "")

  const currentPlanLabel =
    plans.find((plan) => plan.id === access.planId)?.name ??
    (access.planName ? String(access.planName) : null)

  const userName =
    access.user.user_metadata?.full_name ||
    access.user.user_metadata?.name ||
    access.user.email ||
    "Member"

  const avatarUrl =
    access.user.user_metadata?.avatar_url ||
    access.user.user_metadata?.picture ||
    null

  const paymentQrUrl = process.env.NEXT_PUBLIC_PAYMENT_QR_URL ?? null

  return (
    <main className="min-h-screen bg-background text-foreground pt-24 pb-20 px-6">
      <SubscriptionOnboardingFlow
        mode={flowMode}
        userId={access.user.id}
        userName={String(userName)}
        userEmail={access.user.email ?? ""}
        avatarUrl={avatarUrl ? String(avatarUrl) : null}
        plans={plans}
        initialPlanId={currentPlanId}
        accessState={access.accessState}
        isRejected={access.accessState === "rejected"}
        currentPlanLabel={currentPlanLabel}
        currentProofUrl={access.subscription?.payment_proof ?? null}
        lastSubmittedAt={formatDate(access.subscription?.submitted_at ?? null)}
        paymentQrUrl={paymentQrUrl}
      />
    </main>
  )
}

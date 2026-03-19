import type { User } from "@supabase/supabase-js"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { isAdminRole } from "@/lib/roles"
import {
  getAccessStateFromStatus,
  normalizeSubscriptionStatus,
  type AccessState,
  type SubscriptionStatus,
} from "@/lib/subscription-status"

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

type SubscriptionPlanInfo = {
  id: string | null
  name: string | null
  description: string | null
}

export type CurrentUserSubscription = {
  status: SubscriptionStatus
  plan_id: string | null
  payment_proof: string | null
  submitted_at: string | null
  started_at: string | null
  ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  created_at: string | null
  updated_at: string | null
  subscription_plans: SubscriptionPlanInfo[]
}

export type CurrentUserAccessState = {
  user: User | null
  role: string | null
  status: SubscriptionStatus
  accessState: AccessState
  planId: string | null
  planName: string | null
  subscription: CurrentUserSubscription | null
}

type LegacyProfileRow = {
  role?: unknown
  status?: unknown
  access_status?: unknown
  subscription_status?: unknown
  plan?: unknown
  tier?: unknown
  subscription_plan?: unknown
  membership_plan?: unknown
}

function toNullableString(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function toPlanInfo(value: unknown): SubscriptionPlanInfo[] {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? [value]
      : []

  return list
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const row = item as Record<string, unknown>

      return {
        id: toNullableString(row.id),
        name: toNullableString(row.name),
        description: toNullableString(row.description),
      }
    })
    .filter((item): item is SubscriptionPlanInfo => item !== null)
}

function toSubscription(value: unknown): CurrentUserSubscription | null {
  if (!value || typeof value !== "object") return null

  const row = value as Record<string, unknown>

  return {
    status: normalizeSubscriptionStatus(toNullableString(row.status)),
    plan_id: toNullableString(row.plan_id ?? row.subscription_plan_id),
    payment_proof: toNullableString(row.payment_proof),
    submitted_at: toNullableString(row.submitted_at),
    started_at: toNullableString(row.started_at),
    ends_at: toNullableString(row.ends_at),
    current_period_start: toNullableString(row.current_period_start),
    current_period_end: toNullableString(row.current_period_end),
    created_at: toNullableString(row.created_at),
    updated_at: toNullableString(row.updated_at),
    subscription_plans: toPlanInfo(row.subscription_plans),
  }
}

function getEmptyAccessState(user: User | null): CurrentUserAccessState {
  return {
    user,
    role: null,
    status: null,
    accessState: "new_user",
    planId: null,
    planName: null,
    subscription: null,
  }
}

function getAdminSubscriptionOverride(
  subscription: CurrentUserSubscription | null
): CurrentUserSubscription {
  const currentPlan = subscription?.subscription_plans[0] ?? null
  const currentPlanName = toNullableString(currentPlan?.name)?.toLowerCase() ?? null
  const hasAdminPlan = currentPlanName === "admin"

  return {
    status: "active",
    plan_id: hasAdminPlan ? subscription?.plan_id ?? currentPlan?.id ?? null : null,
    payment_proof: subscription?.payment_proof ?? null,
    submitted_at: subscription?.submitted_at ?? null,
    started_at: subscription?.started_at ?? null,
    ends_at: subscription?.ends_at ?? null,
    current_period_start: subscription?.current_period_start ?? null,
    current_period_end: subscription?.current_period_end ?? null,
    created_at: subscription?.created_at ?? null,
    updated_at: subscription?.updated_at ?? null,
    subscription_plans: [
      {
        id: hasAdminPlan ? currentPlan?.id ?? subscription?.plan_id ?? null : null,
        name: "admin",
        description: currentPlan?.description ?? "Internal admin access",
      },
    ],
  }
}

async function fetchProfileRoleFromProfilesTable(
  supabase: SupabaseServerClient,
  userId: string
) {
  const byId = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle()

  const roleFromId = toNullableString(byId.data?.role)
  if (roleFromId) return roleFromId

  const byUserId = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle()

  return toNullableString(byUserId.data?.role)
}

async function fetchLegacyProfileRow(
  supabase: SupabaseServerClient,
  userId: string
) {
  const byId = await supabase
    .from("profile")
    .select(
      "role,status,access_status,subscription_status,plan,tier,subscription_plan,membership_plan"
    )
    .eq("id", userId)
    .maybeSingle()

  if (byId.data) {
    return byId.data as LegacyProfileRow
  }

  const byUserId = await supabase
    .from("profile")
    .select(
      "role,status,access_status,subscription_status,plan,tier,subscription_plan,membership_plan"
    )
    .eq("user_id", userId)
    .maybeSingle()

  return (byUserId.data as LegacyProfileRow | null) ?? null
}

async function fetchCurrentSubscription(
  supabase: SupabaseServerClient,
  userId: string
) {
  const { data } = await supabase
    .from("user_subscriptions")
    .select(
      `
        *,
        subscription_plans (
          id,
          name,
          description
        )
      `
    )
    .eq("user_id", userId)
    .maybeSingle()

  return toSubscription(data)
}

function toAccessStateFromLegacyProfile(
  user: User,
  legacyProfile: LegacyProfileRow | null
): CurrentUserAccessState {
  if (!legacyProfile) {
    return getEmptyAccessState(user)
  }

  const role = toNullableString(legacyProfile.role)
  const rawStatus = toNullableString(
    legacyProfile.status ??
      legacyProfile.access_status ??
      legacyProfile.subscription_status
  )
  const status = normalizeSubscriptionStatus(rawStatus)
  const planName = toNullableString(
    legacyProfile.plan ??
      legacyProfile.tier ??
      legacyProfile.subscription_plan ??
      legacyProfile.membership_plan
  )

  return {
    user,
    role,
    status,
    accessState: getAccessStateFromStatus(rawStatus),
    planId: null,
    planName,
    subscription: planName || status
      ? {
          status,
          plan_id: null,
          payment_proof: null,
          submitted_at: null,
          started_at: null,
          ends_at: null,
          current_period_start: null,
          current_period_end: null,
          created_at: null,
          updated_at: null,
          subscription_plans: planName
            ? [{ id: null, name: planName, description: null }]
            : [],
        }
      : null,
  }
}

export async function getCurrentUserAccessState(
  providedSupabase?: SupabaseServerClient
): Promise<CurrentUserAccessState> {
  const supabase = providedSupabase ?? (await createSupabaseServerClient())
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return getEmptyAccessState(null)
  }

  const [roleFromProfiles, subscription, legacyProfile] = await Promise.all([
    fetchProfileRoleFromProfilesTable(supabase, user.id),
    fetchCurrentSubscription(supabase, user.id),
    fetchLegacyProfileRow(supabase, user.id),
  ])

  const role = roleFromProfiles ?? toNullableString(legacyProfile?.role)

  if (isAdminRole(role)) {
    const adminSubscription = getAdminSubscriptionOverride(subscription)

    return {
      user,
      role,
      status: "active",
      accessState: "approved",
      planId: adminSubscription.plan_id,
      planName: "admin",
      subscription: adminSubscription,
    }
  }

  if (subscription) {
    const status = subscription.status
    const planId = subscription.plan_id
    const planName = subscription.subscription_plans[0]?.name ?? null

    return {
      user,
      role,
      status,
      accessState: getAccessStateFromStatus(status),
      planId,
      planName,
      subscription,
    }
  }

  return toAccessStateFromLegacyProfile(user, legacyProfile)
}

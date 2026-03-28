import type { User } from "@supabase/supabase-js"
import { isAdminRole, normalizeRole } from "@/lib/roles"
import {
  getAccessStateFromStatus,
  normalizeSubscriptionStatus,
  type AccessState,
  type SubscriptionStatus,
} from "@/lib/subscription-status"

type PostgrestLikeError = {
  code?: string
  message?: string
  details?: string | null
}

type AccessQueryResult = Promise<{
  data: unknown
  error: PostgrestLikeError | null
}>

type AccessQueryBuilder = {
  select: (columns: string) => AccessQueryBuilder
  eq: (column: string, value: string) => AccessQueryBuilder
  maybeSingle: () => AccessQueryResult
  single: () => AccessQueryResult
}

export type AccessQueryClient = {
  from: (table: string) => AccessQueryBuilder
  rpc: (
    fn: string
  ) => Promise<{ data: unknown; error: PostgrestLikeError | null }>
}

type AdminResolutionSource = "rpc" | "profiles_fallback"

type SubscriptionPlanInfo = {
  id: string | null
  name: string | null
  description: string | null
}

export type CurrentUserSubscription = {
  status: SubscriptionStatus
  subscription_plan_id: string | null
  payment_proof: string | null
  submitted_at: string | null
  started_at: string | null
  ends_at: string | null
  created_at: string | null
  updated_at: string | null
  subscription_plans: SubscriptionPlanInfo[]
}

export type CurrentUserAccessState = {
  user: User | null
  role: string | null
  isAdmin: boolean
  adminResolutionSource: AdminResolutionSource | null
  status: SubscriptionStatus
  accessState: AccessState
  planId: string | null
  planName: string | null
  subscription: CurrentUserSubscription | null
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

function isNoRowsError(error: PostgrestLikeError | null) {
  if (!error) return false

  if (error.code === "PGRST116") {
    return true
  }

  const details = (error.details ?? "").toLowerCase()
  const message = (error.message ?? "").toLowerCase()
  const combined = `${message} ${details}`

  return combined.includes("0 rows")
}

function toRpcBoolean(value: unknown) {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "true") return true
    if (normalized === "false") return false
  }

  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>
    for (const candidate of Object.values(row)) {
      if (typeof candidate === "boolean") {
        return candidate
      }
    }
  }

  return false
}

export function getEmptyCurrentUserAccessState(
  user: User | null
): CurrentUserAccessState {
  return {
    user,
    role: null,
    isAdmin: false,
    adminResolutionSource: null,
    status: null,
    accessState: "new_user",
    planId: null,
    planName: null,
    subscription: null,
  }
}

export function toCurrentUserSubscription(
  value: unknown
): CurrentUserSubscription | null {
  if (!value || typeof value !== "object") return null

  const row = value as Record<string, unknown>

  return {
    status: normalizeSubscriptionStatus(toNullableString(row.status)),
    subscription_plan_id: toNullableString(row.subscription_plan_id),
    payment_proof: toNullableString(row.payment_proof),
    submitted_at: toNullableString(row.submitted_at),
    started_at: toNullableString(row.started_at),
    ends_at: toNullableString(row.ends_at),
    created_at: toNullableString(row.created_at),
    updated_at: toNullableString(row.updated_at),
    subscription_plans: toPlanInfo(row.subscription_plans),
  }
}

export async function fetchProfileRole(
  supabase: AccessQueryClient,
  userId: string
) {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle()

  return normalizeRole((data as { role?: string | null } | null)?.role ?? null)
}

export async function resolveCurrentUserAdminState(
  supabase: AccessQueryClient,
  userId: string
) {
  const rolePromise = fetchProfileRole(supabase, userId)

  try {
    const { data, error } = await supabase.rpc("is_admin")
    const role = await rolePromise
    const fallbackIsAdmin = isAdminRole(role)

    if (error) {
      return {
        isAdmin: fallbackIsAdmin,
        role,
        source: "profiles_fallback" as const,
      }
    }

    const isAdmin = toRpcBoolean(data)

    return {
      isAdmin,
      role,
      source: "rpc" as const,
    }
  } catch (error) {
    const role = await rolePromise
    const isAdmin = isAdminRole(role)

    return {
      isAdmin,
      role,
      source: "profiles_fallback" as const,
    }
  }
}

export async function fetchCurrentUserSubscription(
  supabase: AccessQueryClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select(
      `
        status,
        subscription_plan_id,
        payment_proof,
        submitted_at,
        started_at,
        ends_at,
        created_at,
        updated_at
      `
    )
    .eq("user_id", userId)
    .single()

  if (error) {
    if (isNoRowsError(error)) {
      return null
    }

    throw new Error(error.message ?? "Failed to load user subscription.")
  }

  const subscription = toCurrentUserSubscription(data)
  if (!subscription) return null

  const planId = subscription.subscription_plan_id
  if (!planId) {
    return subscription
  }

  const { data: planData } = await supabase
    .from("subscription_plans")
    .select("id,name,description")
    .eq("id", planId)
    .maybeSingle()

  return {
    ...subscription,
    subscription_plans: toPlanInfo(planData),
  }
}

export function deriveCurrentUserAccessState(params: {
  user: User
  role: string | null
  isAdmin: boolean
  adminResolutionSource: AdminResolutionSource
  subscription: CurrentUserSubscription | null
}): CurrentUserAccessState {
  const { user, role, isAdmin, adminResolutionSource, subscription } = params

  if (isAdmin) {
    const planId =
      subscription?.subscription_plan_id ?? subscription?.subscription_plans[0]?.id ?? null
    const planName = subscription?.subscription_plans[0]?.name ?? null

    return {
      user,
      role,
      isAdmin: true,
      adminResolutionSource,
      status: "active",
      accessState: "approved",
      planId,
      planName,
      subscription,
    }
  }

  if (!subscription) {
    return {
      ...getEmptyCurrentUserAccessState(user),
      role,
    }
  }

  const planId =
    subscription.subscription_plan_id ?? subscription.subscription_plans[0]?.id ?? null
  const planName = subscription.subscription_plans[0]?.name ?? null

  return {
    user,
    role,
    isAdmin: false,
    adminResolutionSource,
    status: subscription.status,
    accessState: getAccessStateFromStatus(subscription.status),
    planId,
    planName,
    subscription,
  }
}

"use server"

import { revalidatePath } from "next/cache"
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server"
import {
  BROADCAST_AUDIENCES,
  BROADCAST_DURATIONS,
  ROLES,
  STATUSES,
} from "./helpers"
import { resolveRoleForUser, type MinimalDbClient } from "./access"

const ADMIN_ROUTES_TO_REVALIDATE = [
  "/admin",
  "/admin/broadcast",
  "/admin/users",
  "/dashboard",
]

function normalizeAudience(value: string | null) {
  const normalized = (value ?? "").trim().toLowerCase()
  if (BROADCAST_AUDIENCES.includes(normalized as (typeof BROADCAST_AUDIENCES)[number])) {
    return normalized
  }
  return "all"
}

function normalizeDuration(value: string | null) {
  const normalized = (value ?? "").trim().toLowerCase()
  if (BROADCAST_DURATIONS.includes(normalized as (typeof BROADCAST_DURATIONS)[number])) {
    return normalized
  }
  return "forever"
}

function calculateExpiration(duration: string) {
  const now = new Date()

  switch (duration) {
    case "24h":
      now.setHours(now.getHours() + 24)
      return now
    case "week":
      now.setDate(now.getDate() + 7)
      return now
    case "month":
      now.setMonth(now.getMonth() + 1)
      return now
    default:
      return null
  }
}

async function getCallerRole() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, callerRole: null as string | null, userId: null as string | null }
  }

  const callerRole =
    (await resolveRoleForUser(
      user.id,
      supabase as unknown as MinimalDbClient
    )) ?? null

  return { supabase, callerRole, userId: user.id }
}

function getPrivilegedClient(fallbackClient: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  return createSupabaseServiceRoleClient() ?? fallbackClient
}

function hasColumn(row: Record<string, unknown>, column: string) {
  return Object.prototype.hasOwnProperty.call(row, column)
}

async function syncProfileTableAccess(
  db: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  targetRole: string,
  plan: string,
  status: string
) {
  const byIdQuery = await db
    .from("profile")
    .select("*")
    .eq("id", userId)
    .maybeSingle()

  let profileRow = (byIdQuery.data as Record<string, unknown> | null) ?? null
  let idColumn: "id" | "user_id" | null = profileRow ? "id" : null

  if (!profileRow) {
    const byUserIdQuery = await db
      .from("profile")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    profileRow = (byUserIdQuery.data as Record<string, unknown> | null) ?? null
    idColumn = profileRow ? "user_id" : null
  }

  if (!profileRow || !idColumn) return

  const payload: Record<string, string> = {}

  if (hasColumn(profileRow, "role")) payload.role = targetRole
  if (hasColumn(profileRow, "status")) payload.status = status
  if (hasColumn(profileRow, "plan")) payload.plan = plan
  if (hasColumn(profileRow, "subscription_status")) payload.subscription_status = status
  if (hasColumn(profileRow, "subscription_plan")) payload.subscription_plan = plan
  if (hasColumn(profileRow, "membership_plan")) payload.membership_plan = plan

  if (!Object.keys(payload).length) return

  await db
    .from("profile")
    .update(payload)
    .eq(idColumn, userId)
}

function normalizeRole(value: string | null) {
  const normalized = (value ?? "").trim().toLowerCase()
  if (ROLES.includes(normalized as (typeof ROLES)[number])) {
    return normalized
  }
  return "user"
}

function normalizeStatus(value: string | null) {
  const normalized = (value ?? "").trim().toLowerCase()
  if (STATUSES.includes(normalized as (typeof STATUSES)[number])) {
    return normalized
  }
  return "pending"
}

function revalidateAdminRoutes() {
  ADMIN_ROUTES_TO_REVALIDATE.forEach((path) => revalidatePath(path))
}

export async function updateUserAccess(formData: FormData): Promise<void> {
  const userId = formData.get("userId") as string | null
  const targetRole = normalizeRole(formData.get("role") as string | null)
  const status = normalizeStatus(formData.get("status") as string | null)
  const requestedPlanIdRaw = ((formData.get("planId") as string | null) ?? "").trim()
  const requestedPlanId = requestedPlanIdRaw && requestedPlanIdRaw !== "__current__"
    ? requestedPlanIdRaw
    : null
  const currentPlanName = ((formData.get("currentPlanName") as string | null) ?? "basic")
    .trim()
    .toLowerCase()

  if (!userId) return

  const { supabase, callerRole } = await getCallerRole()

  if ((callerRole ?? "").toLowerCase() !== "admin") return

  const db = getPrivilegedClient(supabase)

  await db
    .from("profiles")
    .update({ role: targetRole })
    .eq("id", userId)

  let selectedPlanName: string | null = null
  let selectedPlanId: string | null = null

  if (requestedPlanId) {
    const { data: selectedPlanRow } = await db
      .from("subscription_plans")
      .select("id,name")
      .eq("id", requestedPlanId)
      .maybeSingle()

    selectedPlanId = (selectedPlanRow as { id?: string } | null)?.id ?? null
    selectedPlanName = (selectedPlanRow as { name?: string | null } | null)?.name ?? null
  } else {
    const legacyPlanName = ((formData.get("plan") as string | null) ?? "").trim()
    if (legacyPlanName) {
      const { data: selectedPlanRow } = await db
        .from("subscription_plans")
        .select("id,name")
        .eq("name", legacyPlanName)
        .maybeSingle()

      selectedPlanId = (selectedPlanRow as { id?: string } | null)?.id ?? null
      selectedPlanName = (selectedPlanRow as { name?: string | null } | null)?.name ?? null
    }
  }

  const { data: subscriptionRows } = await db
    .from("user_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .limit(1)

  const existingSubscriptionId =
    ((subscriptionRows as { id?: string }[] | null)?.[0]?.id ?? null)

  if (existingSubscriptionId) {
    const updatePayload: {
      status: string
      plan_id?: string
    } = { status }

    if (selectedPlanId) {
      updatePayload.plan_id = selectedPlanId
    }

    await db
      .from("user_subscriptions")
      .update(updatePayload)
      .eq("id", existingSubscriptionId)
  } else if (selectedPlanId) {
    await db
      .from("user_subscriptions")
      .insert({
        user_id: userId,
        plan_id: selectedPlanId,
        status,
      })
  }

  const planForProfile = (selectedPlanName?.trim() || currentPlanName || "basic").toLowerCase()

  await syncProfileTableAccess(db, userId, targetRole, planForProfile, status)

  revalidateAdminRoutes()
}

export async function publishBroadcast(formData: FormData): Promise<void> {
  const title = (formData.get("title") as string | null)?.trim() ?? ""
  const message = (formData.get("message") as string | null)?.trim() ?? ""
  const audience = normalizeAudience(formData.get("audience") as string | null)
  const duration = normalizeDuration(formData.get("duration") as string | null)

  if (!message) return

  const { supabase, callerRole, userId } = await getCallerRole()

  if ((callerRole ?? "").toLowerCase() !== "admin" || !userId) return

  const db = getPrivilegedClient(supabase)
  const expiresAt = calculateExpiration(duration)

  const { error } = await db.from("admin_broadcasts").insert({
    title: title || null,
    message,
    audience,
    duration,
    expires_at: expiresAt?.toISOString() ?? null,
    created_by: userId,
  })

  // Backward compatibility when created_by column is not present yet.
  if (error) {
    await db.from("admin_broadcasts").insert({
      title: title || null,
      message,
      audience,
      duration,
      expires_at: expiresAt?.toISOString() ?? null,
    })
  }

  revalidateAdminRoutes()
}

export async function publishQuickUpdate(formData: FormData): Promise<void> {
  const proxyFormData = new FormData()

  proxyFormData.set("title", (formData.get("title") as string | null) ?? "")
  proxyFormData.set("message", (formData.get("message") as string | null) ?? "")
  proxyFormData.set("audience", (formData.get("audience") as string | null) ?? "all")
  proxyFormData.set("duration", (formData.get("duration") as string | null) ?? "forever")

  await publishBroadcast(proxyFormData)
}

"use server"

import { revalidatePath } from "next/cache"
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server"
import {
  BROADCAST_AUDIENCES,
  BROADCAST_DURATIONS,
  BROADCAST_TYPES,
  ROLES,
  STATUSES,
} from "./helpers"
import { resolveRoleForUser, type MinimalDbClient } from "./access"

const ADMIN_ROUTES_TO_REVALIDATE = [
  "/admin",
  "/admin/broadcast",
  "/admin/plans",
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

function normalizeBroadcastType(value: string | null) {
  const normalized = (value ?? "").trim().toLowerCase()
  if (BROADCAST_TYPES.includes(normalized as (typeof BROADCAST_TYPES)[number])) {
    return normalized
  }
  return "investment"
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
  console.log("updateUserAccess triggered", {formData})
  
  const userId = formData.get("userId") as string | null
  const targetRole = normalizeRole(formData.get("role") as string | null)
  const status = normalizeStatus(formData.get("status") as string | null)

  const requestedPlanIdRaw = (
    ((formData.get("planId") as string | null) ??
      (formData.get("plan") as string | null) ??
      "")
  ).trim()
  const requestedPlanId =
    requestedPlanIdRaw && requestedPlanIdRaw !== "__current__"
      ? requestedPlanIdRaw
      : null

  const currentPlanName = ((formData.get("currentPlanName") as string | null) ?? "basic")
    .trim()
    .toLowerCase()

  if (!userId) return

  const { supabase, callerRole } = await getCallerRole()

  if ((callerRole ?? "").toLowerCase() !== "admin") return

  const db = getPrivilegedClient(supabase)

  const { error: roleError } = await db
    .from("profiles")
    .update({ role: targetRole })
    .eq("id", userId)

  if (roleError) {
    console.error("Role update error:", roleError)
  }

  let selectedPlanName: string | null = null

  if (requestedPlanId) {
    const { data: planRow } = await db
      .from("subscription_plans")
      .select("id,name")
      .eq("id", requestedPlanId)
      .maybeSingle()

    selectedPlanName = (planRow as { name?: string | null } | null)?.name ?? null
  }

  const subscriptionPayload: {
    user_id: string
    status: string
    plan_id?: string
  } = {
    user_id: userId,
    status,
  }

  if (requestedPlanId) {
    subscriptionPayload.plan_id = requestedPlanId
  }

  await db
    .from("user_subscriptions")
    .upsert(subscriptionPayload, { onConflict: "user_id" })

  const planForProfile =
    (selectedPlanName?.trim() || currentPlanName || "basic").toLowerCase()

  await syncProfileTableAccess(db, userId, targetRole, planForProfile, status)

  revalidateAdminRoutes()
}

export async function publishBroadcast(formData: FormData): Promise<void> {
  const title = (formData.get("title") as string | null)?.trim() ?? ""
  const message = (formData.get("message") as string | null)?.trim() ?? ""
  const audience = normalizeAudience(formData.get("audience") as string | null)
  const broadcastType = normalizeBroadcastType(
    ((formData.get("broadcastType") as string | null) ?? "investment")
  )
  const duration = normalizeDuration(formData.get("duration") as string | null)

  if (!message) return

  const { supabase, callerRole, userId } = await getCallerRole()

  if ((callerRole ?? "").toLowerCase() !== "admin" || !userId) return

  const db = getPrivilegedClient(supabase)
  const expiresAt = calculateExpiration(duration)

  const insertPayload = {
    title: title || null,
    message,
    audience,
    broadcast_type: broadcastType,
    duration,
    expires_at: expiresAt?.toISOString() ?? null,
    created_by: userId,
  }

  const { error } = await db.from("admin_broadcasts").insert(insertPayload)

  // Backward compatibility when created_by and/or broadcast_type are not present yet.
  if (error) {
    const { error: fallbackError } = await db.from("admin_broadcasts").insert({
      title: title || null,
      message,
      audience,
      broadcast_type: broadcastType,
      duration,
      expires_at: expiresAt?.toISOString() ?? null,
    })

    if (fallbackError) {
      await db.from("admin_broadcasts").insert({
        title: title || null,
        message,
        audience,
        duration,
        expires_at: expiresAt?.toISOString() ?? null,
      })
    }
  }

  revalidateAdminRoutes()
}

export async function publishQuickUpdate(formData: FormData): Promise<void> {
  const proxyFormData = new FormData()

  proxyFormData.set("title", (formData.get("title") as string | null) ?? "")
  proxyFormData.set("message", (formData.get("message") as string | null) ?? "")
  proxyFormData.set("audience", (formData.get("audience") as string | null) ?? "all")
  proxyFormData.set(
    "broadcastType",
    (formData.get("broadcastType") as string | null) ?? "investment"
  )
  proxyFormData.set("duration", (formData.get("duration") as string | null) ?? "forever")

  await publishBroadcast(proxyFormData)
}

function normalizeBoolean(value: string | null) {
  return (value ?? "").toLowerCase() === "true"
}

function normalizeTradeLimit(value: string | null) {
  const normalized = (value ?? "").trim().toLowerCase()
  if (!normalized || normalized === "unlimited") return null

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.floor(parsed))
}

async function updatePlanPermissions(params: {
  planId: string
  allowTrade: boolean
  allowInvestment: boolean
  tradeLimitPerWeek: number | null
  description?: string | null
}) {
  const { supabase, callerRole } = await getCallerRole()

  if ((callerRole ?? "").toLowerCase() !== "admin") return

  const db = getPrivilegedClient(supabase)
  const updatePayload: Record<string, unknown> = {
    allow_trade: params.allowTrade,
    allow_investment: params.allowInvestment,
    trade_limit_per_week: params.tradeLimitPerWeek,
  }

  if (typeof params.description === "string") {
    updatePayload.description = params.description || null
  }

  const { error } = await db
    .from("subscription_plans")
    .update(updatePayload)
    .eq("id", params.planId)

  if (error) {
    const { error: fallbackError } = await db
      .from("subscription_plans")
      .update({
        allow_trade: params.allowTrade,
        trade_limit_per_week: params.tradeLimitPerWeek,
      })
      .eq("id", params.planId)

    if (fallbackError) {
      console.error("Plan permission update error:", fallbackError)
    }
  }

  revalidateAdminRoutes()
}

export async function updateSubscriptionPlanPermissions(formData: FormData): Promise<void> {
  const planId = (formData.get("planId") as string | null)?.trim() ?? ""

  if (!planId) return

  const allowTrade = normalizeBoolean(formData.get("allowTrade") as string | null)
  const allowInvestment = normalizeBoolean(formData.get("allowInvestment") as string | null)
  const tradeLimitPerWeek = normalizeTradeLimit(formData.get("tradeLimitPerWeek") as string | null)

  await updatePlanPermissions({
    planId,
    allowTrade,
    allowInvestment,
    tradeLimitPerWeek,
  })
}

export async function updatePlan(formData: FormData): Promise<void> {
  const planId = (formData.get("planId") as string | null)?.trim() ?? ""

  if (!planId) return

  const allowTrade = normalizeBoolean(formData.get("allowTrade") as string | null)
  const allowInvestment = normalizeBoolean(formData.get("allowInvestment") as string | null)
  const tradeLimitPerWeek = normalizeTradeLimit(
    (formData.get("tradeLimit") as string | null) ??
      (formData.get("tradeLimitPerWeek") as string | null)
  )
  const description = ((formData.get("description") as string | null) ?? "").trim()

  await updatePlanPermissions({
    planId,
    allowTrade,
    allowInvestment,
    tradeLimitPerWeek,
    description,
  })
}

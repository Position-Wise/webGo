"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { isAdminRole } from "@/lib/roles"
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
  "/admin/market-data",
  "/admin/subscriptions",
  "/admin/plans",
  "/admin/users",
  "/subscribe",
  "/waiting",
  "/dashboard",
  "/tips",
  "/profile",
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

function hasColumn(row: Record<string, unknown>, column: string) {
  return Object.prototype.hasOwnProperty.call(row, column)
}

async function syncProfileTableAccess(
  db: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  targetRole: string | null,
  plan: string | null,
  status: string | null
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

  const payload: Record<string, string | null> = {}

  if (targetRole && hasColumn(profileRow, "role")) payload.role = targetRole
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
  let normalized = (value ?? "").trim().toLowerCase()
  if (normalized === "user") {
    normalized = "customer"
  }
  if (
    !normalized ||
    normalized === "none" ||
    normalized === "null" ||
    normalized === "__current__"
  ) {
    return null
  }
  if (ROLES.includes(normalized as (typeof ROLES)[number])) {
    return normalized
  }
  if (normalized === "master_admin") {
    return normalized
  }
  return null
}

function normalizeStatus(value: string | null) {
  const normalized = (value ?? "").trim().toLowerCase()
  if (!normalized || normalized === "none" || normalized === "null") {
    return null
  }
  if (STATUSES.includes(normalized as (typeof STATUSES)[number])) {
    return normalized
  }
  return "pending"
}

function revalidateAdminRoutes() {
  ADMIN_ROUTES_TO_REVALIDATE.forEach((path) => revalidatePath(path))
}

function normalizeDateInput(value: string | null) {
  const normalized = (value ?? "").trim()
  if (!normalized) return null

  const parsed = new Date(`${normalized}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function normalizeMarketSymbol(value: string | null) {
  const normalized = (value ?? "").trim().toUpperCase()
  if (!normalized) return null
  if (normalized.length > 20) return null
  if (!/^[A-Za-z0-9^.\-=&]+$/.test(normalized)) return null
  return normalized
}

function normalizeSortOrder(value: string | null) {
  const parsed = Number((value ?? "").trim())
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.floor(parsed))
}

type UpdateUserAccessResult =
  | { ok: true }
  | {
      ok: false
      error: string
    }

type DeleteUserResult =
  | { ok: true }
  | {
      ok: false
      error: string
    }

async function updateUserAccessInternal(formData: FormData): Promise<UpdateUserAccessResult> {
  const userId = formData.get("userId") as string | null
  const targetRole = normalizeRole(formData.get("role") as string | null)
  const status = normalizeStatus(formData.get("status") as string | null)
  const subscriptionEndDateRaw = (
    (formData.get("subscriptionEndDate") as string | null) ?? ""
  ).trim()
  const subscriptionEndDate = normalizeDateInput(subscriptionEndDateRaw)

  const requestedPlanIdRaw = (
    ((formData.get("planId") as string | null) ??
      (formData.get("plan") as string | null) ??
      "")
  ).trim()
  const requestedPlanId =
    requestedPlanIdRaw && requestedPlanIdRaw !== "__current__"
      ? requestedPlanIdRaw
      : null

  const currentPlanName = ((formData.get("currentPlanName") as string | null) ?? "")
    .trim()
    .toLowerCase()

  if (!userId) {
    return { ok: false, error: "Missing user id." }
  }

  if (subscriptionEndDateRaw && !subscriptionEndDate) {
    return { ok: false, error: "Invalid subscription end date." }
  }

  const { supabase, callerRole } = await getCallerRole()

  if (!isAdminRole(callerRole)) {
    return { ok: false, error: "Only admins can update users." }
  }

  const db = supabase

  if (targetRole) {
    const { error: roleError } = await db
      .from("profiles")
      .update({ role: targetRole })
      .eq("id", userId)

    if (roleError) {
      console.error("Role update error:", roleError)
      return { ok: false, error: roleError.message ?? "Failed to update role." }
    }
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

  const subscriptionPayload: Record<string, string | null> = {
    user_id: userId,
    status,
  }

  if (requestedPlanId) {
    subscriptionPayload.plan_id = requestedPlanId
  }

  if (subscriptionEndDate) {
    subscriptionPayload.ends_at = subscriptionEndDate
    subscriptionPayload.current_period_end = subscriptionEndDate
  }

  let subscriptionWrite = await db
    .from("user_subscriptions")
    .upsert(subscriptionPayload, { onConflict: "user_id" })

  if (subscriptionWrite.error && requestedPlanId) {
    subscriptionWrite = await db
      .from("user_subscriptions")
      .upsert(
        {
          user_id: userId,
          status,
          subscription_plan_id: requestedPlanId,
        },
        { onConflict: "user_id" }
      )
  }

  if (subscriptionWrite.error) {
    console.error("Subscription update error:", subscriptionWrite.error)
    return {
      ok: false,
      error: subscriptionWrite.error.message ?? "Failed to update subscription.",
    }
  }

  const rawPlanForProfile = selectedPlanName?.trim() || currentPlanName || null
  const planForProfile = rawPlanForProfile ? rawPlanForProfile.toLowerCase() : null

  try {
    await syncProfileTableAccess(db, userId, targetRole, planForProfile, status)
  } catch (profileSyncError) {
    console.error("Profile sync error:", profileSyncError)
    return { ok: false, error: "Subscription updated, but profile sync failed." }
  }

  revalidateAdminRoutes()
  return { ok: true }
}

export async function updateUserAccess(formData: FormData): Promise<void> {
  await updateUserAccessInternal(formData)
}

export async function updateUserAccessWithResult(
  formData: FormData
): Promise<UpdateUserAccessResult> {
  return updateUserAccessInternal(formData)
}

type UserDeleteCleanupStep = {
  table: string
  column: string
}

const USER_DELETE_CLEANUP_STEPS: UserDeleteCleanupStep[] = [
  { table: "trade_usage", column: "user_id" },
  { table: "broadcast_feedback", column: "user_id" },
  { table: "user_subscriptions", column: "user_id" },
  { table: "profiles", column: "id" },
  { table: "profiles", column: "user_id" },
  { table: "profile", column: "id" },
  { table: "profile", column: "user_id" },
]

function normalizeUserId(value: string | null | undefined) {
  return (value ?? "").trim()
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === "string" && message.trim()) {
      return message
    }
  }
  return fallback
}

function isMissingSchemaError(error: unknown) {
  const message = getErrorMessage(error, "").toLowerCase()
  return (
    (message.includes("relation") && message.includes("does not exist")) ||
    (message.includes("table") && message.includes("not found")) ||
    (message.includes("column") && message.includes("does not exist")) ||
    (message.includes("bucket") && message.includes("not found"))
  )
}

async function deletePaymentProofObjectsForUser(
  db: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string
): Promise<DeleteUserResult> {
  const bucket = db.storage.from("payment-proofs")
  const limit = 100
  let offset = 0
  const objectPaths: string[] = []

  while (offset <= 5000) {
    const { data, error } = await bucket.list(userId, {
      limit,
      offset,
    })

    if (error) {
      if (isMissingSchemaError(error)) {
        return { ok: true }
      }
      return {
        ok: false,
        error: getErrorMessage(error, "Failed to load user payment proof files."),
      }
    }

    const rows = Array.isArray(data) ? data : []
    if (!rows.length) {
      break
    }

    rows.forEach((row) => {
      const name = typeof row.name === "string" ? row.name.trim() : ""
      if (!name) return
      objectPaths.push(`${userId}/${name}`)
    })

    if (rows.length < limit) {
      break
    }

    offset += limit
  }

  if (!objectPaths.length) {
    return { ok: true }
  }

  for (let index = 0; index < objectPaths.length; index += 100) {
    const batch = objectPaths.slice(index, index + 100)
    const { error } = await bucket.remove(batch)

    if (error) {
      if (isMissingSchemaError(error)) {
        continue
      }
      return {
        ok: false,
        error: getErrorMessage(error, "Failed to delete user payment proof files."),
      }
    }
  }

  return { ok: true }
}

async function deleteRowsByUserReference(
  db: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  step: UserDeleteCleanupStep,
  userId: string
): Promise<DeleteUserResult> {
  const { error } = await db
    .from(step.table)
    .delete()
    .eq(step.column, userId)

  if (error) {
    if (isMissingSchemaError(error)) {
      return { ok: true }
    }
    return {
      ok: false,
      error: getErrorMessage(
        error,
        `Failed to delete user data from ${step.table}.`
      ),
    }
  }

  return { ok: true }
}

export async function deleteUserWithResult(userId: string): Promise<DeleteUserResult> {
  const targetUserId = normalizeUserId(userId)
  if (!targetUserId) {
    return { ok: false, error: "Missing user id." }
  }

  const { supabase, callerRole, userId: callerUserId } = await getCallerRole()
  if (!isAdminRole(callerRole)) {
    return { ok: false, error: "Only admins can remove users." }
  }

  if (callerUserId && callerUserId === targetUserId) {
    return { ok: false, error: "You cannot remove your own account." }
  }

  const db = supabase

  const targetRole = await resolveRoleForUser(
    targetUserId,
    db as unknown as MinimalDbClient
  )

  if (isAdminRole(targetRole)) {
    return {
      ok: false,
      error: "Removing admin accounts is blocked from this panel.",
    }
  }

  const storageDeleteResult = await deletePaymentProofObjectsForUser(
    db as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    targetUserId
  )
  if (!storageDeleteResult.ok) {
    return storageDeleteResult
  }

  for (const step of USER_DELETE_CLEANUP_STEPS) {
    const cleanupResult = await deleteRowsByUserReference(
      db as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
      step,
      targetUserId
    )
    if (!cleanupResult.ok) {
      return cleanupResult
    }
  }

  const { error: authDeleteError } = await db.auth.admin.deleteUser(targetUserId)
  if (authDeleteError) {
    console.warn(
      "Auth account deletion skipped. Remove user manually from Supabase Auth:",
      getErrorMessage(authDeleteError, "Insufficient permissions.")
    )
  }

  revalidateAdminRoutes()
  return { ok: true }
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

  if (!isAdminRole(callerRole) || !userId) return

  const db = supabase
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

export async function updateBroadcast(formData: FormData): Promise<void> {
  const broadcastId = (formData.get("broadcastId") as string | null)?.trim() ?? ""
  const title = (formData.get("title") as string | null)?.trim() ?? ""
  const message = (formData.get("message") as string | null)?.trim() ?? ""
  const audience = normalizeAudience(formData.get("audience") as string | null)
  const broadcastType = normalizeBroadcastType(
    (formData.get("broadcastType") as string | null) ?? "investment"
  )
  const duration = normalizeDuration(formData.get("duration") as string | null)

  if (!broadcastId || !message) return

  const { supabase, callerRole } = await getCallerRole()
  if (!isAdminRole(callerRole)) return

  const db = supabase
  const expiresAt = calculateExpiration(duration)?.toISOString() ?? null

  const { error } = await db
    .from("admin_broadcasts")
    .update({
      title: title || null,
      message,
      audience,
      broadcast_type: broadcastType,
      duration,
      expires_at: expiresAt,
    })
    .eq("id", broadcastId)

  if (error) {
    const { error: fallbackError } = await db
      .from("admin_broadcasts")
      .update({
        title: title || null,
        message,
        audience,
        duration,
        expires_at: expiresAt,
      })
      .eq("id", broadcastId)

    if (fallbackError) {
      await db
        .from("admin_broadcasts")
        .update({
          title: title || null,
          message,
          audience,
        })
        .eq("id", broadcastId)
    }
  }

  revalidateAdminRoutes()
}

export async function deleteBroadcast(formData: FormData): Promise<void> {
  const broadcastId = (formData.get("broadcastId") as string | null)?.trim() ?? ""
  if (!broadcastId) return

  const { supabase, callerRole } = await getCallerRole()
  if (!isAdminRole(callerRole)) return

  const db = supabase
  await db.from("admin_broadcasts").delete().eq("id", broadcastId)

  revalidateAdminRoutes()
}

export async function createMarketSymbol(formData: FormData): Promise<void> {
  const symbol = normalizeMarketSymbol(formData.get("symbol") as string | null)
  const displayName = ((formData.get("displayName") as string | null) ?? "").trim()
  const sortOrder = normalizeSortOrder(formData.get("sortOrder") as string | null)
  const isActive = normalizeBoolean(formData.get("isActive") as string | null)

  if (!symbol) return

  const { supabase, callerRole, userId } = await getCallerRole()
  if (!isAdminRole(callerRole) || !userId) return

  const db = supabase
  await db.from("market_symbols").insert({
    symbol,
    display_name: displayName || symbol,
    sort_order: sortOrder,
    is_active: isActive,
    created_by: userId,
    updated_by: userId,
  })

  revalidateAdminRoutes()
}

export async function updateMarketSymbol(formData: FormData): Promise<void> {
  const id = ((formData.get("id") as string | null) ?? "").trim()
  const symbol = normalizeMarketSymbol(formData.get("symbol") as string | null)
  const displayName = ((formData.get("displayName") as string | null) ?? "").trim()
  const sortOrder = normalizeSortOrder(formData.get("sortOrder") as string | null)
  const isActive = normalizeBoolean(formData.get("isActive") as string | null)

  if (!id || !symbol) return

  const { supabase, callerRole, userId } = await getCallerRole()
  if (!isAdminRole(callerRole) || !userId) return

  const db = supabase
  await db
    .from("market_symbols")
    .update({
      symbol,
      display_name: displayName || symbol,
      sort_order: sortOrder,
      is_active: isActive,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  revalidateAdminRoutes()
}

export async function deleteMarketSymbol(formData: FormData): Promise<void> {
  const id = ((formData.get("id") as string | null) ?? "").trim()
  if (!id) return

  const { supabase, callerRole } = await getCallerRole()
  if (!isAdminRole(callerRole)) return

  const db = supabase
  await db.from("market_symbols").delete().eq("id", id)

  revalidateAdminRoutes()
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

  if (!isAdminRole(callerRole)) return

  const db = supabase
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




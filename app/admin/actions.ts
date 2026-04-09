"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  calculateBroadcastExpiration,
  normalizeBroadcastAudienceType,
  normalizeBroadcastExpiryOption,
  normalizeTargetUserIds,
  resolveLegacyBroadcastFieldsFromAudienceType,
  resolveLegacyDurationFromExpiryOption,
} from "@/lib/broadcast-audience"
import { isAdminRole } from "@/lib/roles"
import {
  BROADCAST_AUDIENCES,
  BROADCAST_DURATIONS,
  BROADCAST_TYPES,
  ROLES,
  STATUSES,
} from "./helpers"
import {
  resolveCurrentUserIsAdmin,
  resolveRoleForUser,
  type MinimalDbClient,
} from "./access"

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

function normalizeBroadcastType(
  value: string | null
): "trade" | "investment" | "announcement" {
  const normalized = (value ?? "").trim().toLowerCase()
  if (BROADCAST_TYPES.includes(normalized as (typeof BROADCAST_TYPES)[number])) {
    return normalized as "trade" | "investment" | "announcement"
  }
  return "investment"
}

async function getCallerAccess() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      supabase,
      callerRole: null as string | null,
      isAdmin: false,
      userId: null as string | null,
    }
  }

  const { role, isAdmin } = await resolveCurrentUserIsAdmin(
    user.id,
    supabase as unknown as MinimalDbClient
  )

  return { supabase, callerRole: role ?? null, isAdmin, userId: user.id }
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
  if (
    !normalized ||
    normalized === "none" ||
    normalized === "null" ||
    normalized === "__current__"
  ) {
    return null
  }
  if (STATUSES.includes(normalized as (typeof STATUSES)[number])) {
    return normalized
  }
  return null
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

type ResolvedBroadcastInput = {
  title: string | null
  message: string
  audienceType: "trader" | "investor" | "users" | null
  targetUserIds: string[] | null
  audience: string
  broadcastType: "trade" | "investment" | "announcement"
  duration: string
  expiresAt: string | null
}

function resolveBroadcastInput(formData: FormData): ResolvedBroadcastInput | null {
  const title = (formData.get("title") as string | null)?.trim() ?? ""
  const message = (formData.get("message") as string | null)?.trim() ?? ""

  if (!message) {
    return null
  }

  const rawAudienceType = formData.get("audienceType") as string | null
  const hasNewTargetingFields =
    rawAudienceType !== null ||
    formData.has("expiryOption") ||
    formData.getAll("targetUserIds").length > 0

  if (hasNewTargetingFields) {
    const audienceType = normalizeBroadcastAudienceType(rawAudienceType)
    if (!audienceType) {
      return null
    }

    const legacyFields = resolveLegacyBroadcastFieldsFromAudienceType(audienceType)
    if (!legacyFields) {
      return null
    }

    const expiryOption =
      normalizeBroadcastExpiryOption(formData.get("expiryOption") as string | null) ?? "none"
    const targetUserIds =
      audienceType === "users"
        ? normalizeTargetUserIds(formData.getAll("targetUserIds"))
        : []

    if (audienceType === "users" && !targetUserIds.length) {
      return null
    }

    return {
      title: title || null,
      message,
      audienceType,
      targetUserIds: audienceType === "users" ? targetUserIds : null,
      audience: legacyFields.audience,
      broadcastType: legacyFields.broadcastType,
      duration: resolveLegacyDurationFromExpiryOption(expiryOption),
      expiresAt: calculateBroadcastExpiration(expiryOption)?.toISOString() ?? null,
    }
  }

  const audience = normalizeAudience(formData.get("audience") as string | null)
  const broadcastType = normalizeBroadcastType(
    ((formData.get("broadcastType") as string | null) ?? "investment")
  )
  const duration = normalizeDuration(formData.get("duration") as string | null)

  return {
    title: title || null,
    message,
    audienceType: null,
    targetUserIds: null,
    audience,
    broadcastType,
    duration,
    expiresAt: calculateBroadcastExpiration(
      duration === "week"
        ? "1w"
        : duration === "month"
          ? "1m"
          : duration === "year"
            ? "1y"
            : duration === "24h"
              ? "24h"
              : "none"
    )?.toISOString() ?? null,
  }
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

  if (!userId) {
    return { ok: false, error: "Missing user id." }
  }

  if (!status) {
    return { ok: false, error: "Missing subscription status." }
  }

  if (subscriptionEndDateRaw && !subscriptionEndDate) {
    return { ok: false, error: "Invalid subscription end date." }
  }

  const { supabase, isAdmin } = await getCallerAccess()

  if (!isAdmin) {
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

  const subscriptionPayload: Record<string, string | null> = {
    user_id: userId,
    status,
  }

  if (requestedPlanId) {
    subscriptionPayload.subscription_plan_id = requestedPlanId
  }

  if (subscriptionEndDate) {
    subscriptionPayload.ends_at = subscriptionEndDate
  }

  const subscriptionWrite = await db
    .from("user_subscriptions")
    .upsert(subscriptionPayload, { onConflict: "user_id" })

  if (subscriptionWrite.error) {
    console.error("Subscription update error:", subscriptionWrite.error)
    return {
      ok: false,
      error: subscriptionWrite.error.message ?? "Failed to update subscription.",
    }
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

  const { supabase, isAdmin, userId: callerUserId } = await getCallerAccess()
  if (!isAdmin) {
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
  const resolvedInput = resolveBroadcastInput(formData)
  if (!resolvedInput) return

  const { supabase, isAdmin, userId } = await getCallerAccess()

  if (!isAdmin || !userId) return

  const db = supabase

  const insertPayload = {
    title: resolvedInput.title,
    message: resolvedInput.message,
    audience: resolvedInput.audience,
    audience_type: resolvedInput.audienceType,
    target_user_ids: resolvedInput.targetUserIds,
    broadcast_type: resolvedInput.broadcastType,
    duration: resolvedInput.duration,
    expires_at: resolvedInput.expiresAt,
    created_by: userId,
  }

  const { error } = await db.from("admin_broadcasts").insert(insertPayload)

  // Backward compatibility when created_by and/or broadcast_type are not present yet.
  if (error) {
    const { error: fallbackError } = await db.from("admin_broadcasts").insert({
      title: resolvedInput.title,
      message: resolvedInput.message,
      audience: resolvedInput.audience,
      audience_type: resolvedInput.audienceType,
      target_user_ids: resolvedInput.targetUserIds,
      broadcast_type: resolvedInput.broadcastType,
      duration: resolvedInput.duration,
      expires_at: resolvedInput.expiresAt,
    })

    if (fallbackError) {
      await db.from("admin_broadcasts").insert({
        title: resolvedInput.title,
        message: resolvedInput.message,
        audience: resolvedInput.audience,
        audience_type: resolvedInput.audienceType,
        target_user_ids: resolvedInput.targetUserIds,
        duration: resolvedInput.duration,
        expires_at: resolvedInput.expiresAt,
      })
    }
  }

  revalidateAdminRoutes()
}

export async function publishQuickUpdate(formData: FormData): Promise<void> {
  const proxyFormData = new FormData()

  proxyFormData.set("title", (formData.get("title") as string | null) ?? "")
  proxyFormData.set("message", (formData.get("message") as string | null) ?? "")
  proxyFormData.set("audienceType", (formData.get("audienceType") as string | null) ?? "")
  proxyFormData.set("expiryOption", (formData.get("expiryOption") as string | null) ?? "none")

  for (const userId of formData.getAll("targetUserIds")) {
    if (typeof userId !== "string") continue
    proxyFormData.append("targetUserIds", userId)
  }

  await publishBroadcast(proxyFormData)
}

export async function updateBroadcast(formData: FormData): Promise<void> {
  const broadcastId = (formData.get("broadcastId") as string | null)?.trim() ?? ""
  const resolvedInput = resolveBroadcastInput(formData)

  if (!broadcastId || !resolvedInput) return

  const { supabase, isAdmin } = await getCallerAccess()
  if (!isAdmin) return

  const db = supabase

  const { error } = await db
    .from("admin_broadcasts")
    .update({
      title: resolvedInput.title,
      message: resolvedInput.message,
      audience: resolvedInput.audience,
      audience_type: resolvedInput.audienceType,
      target_user_ids: resolvedInput.targetUserIds,
      broadcast_type: resolvedInput.broadcastType,
      duration: resolvedInput.duration,
      expires_at: resolvedInput.expiresAt,
    })
    .eq("id", broadcastId)

  if (error) {
    const { error: fallbackError } = await db
      .from("admin_broadcasts")
      .update({
        title: resolvedInput.title,
        message: resolvedInput.message,
        audience: resolvedInput.audience,
        audience_type: resolvedInput.audienceType,
        target_user_ids: resolvedInput.targetUserIds,
        duration: resolvedInput.duration,
        expires_at: resolvedInput.expiresAt,
      })
      .eq("id", broadcastId)

    if (fallbackError) {
      await db
        .from("admin_broadcasts")
        .update({
          title: resolvedInput.title,
          message: resolvedInput.message,
          audience: resolvedInput.audience,
          audience_type: resolvedInput.audienceType,
          target_user_ids: resolvedInput.targetUserIds,
        })
        .eq("id", broadcastId)
    }
  }

  revalidateAdminRoutes()
}

export async function deleteBroadcast(formData: FormData): Promise<void> {
  const broadcastId = (formData.get("broadcastId") as string | null)?.trim() ?? ""
  if (!broadcastId) return

  const { supabase, isAdmin } = await getCallerAccess()
  if (!isAdmin) return

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

  const { supabase, isAdmin, userId } = await getCallerAccess()
  if (!isAdmin || !userId) return

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

  const { supabase, isAdmin, userId } = await getCallerAccess()
  if (!isAdmin || !userId) return

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

  const { supabase, isAdmin } = await getCallerAccess()
  if (!isAdmin) return

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
  const { supabase, isAdmin } = await getCallerAccess()

  if (!isAdmin) return

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

async function createPlan(params: {
  name: string
  description?: string | null
  planType: "trader" | "investor" | "both"
  allowTrade: boolean
  allowInvestment: boolean
  tradeLimitPerWeek: number
}) {
  const { supabase, isAdmin } = await getCallerAccess()

  if (!isAdmin) return

  const name = params.name.trim()
  if (!name) return

  const insertPayload = {
    name,
    description: params.description || null,
    plan_type: params.planType,

    allow_trade: params.allowTrade,
    allow_investment: params.allowInvestment,
    trade_limit_per_week: params.tradeLimitPerWeek,

    is_public: true,
    // is_active: true,
  }

  const { error } = await supabase
    .from("subscription_plans")
    .insert(insertPayload)

  if (error) {
    console.error("Create plan error:", error)
  }

  revalidateAdminRoutes()
}

export async function addPlan(formData: FormData): Promise<void> {
  const name = (formData.get("name") as string | null)?.trim() ?? ""
  const description = (formData.get("description") as string | null) ?? null

  const allowTrade =
    (formData.get("allowTrade") as string | null) === "true"

  const allowInvestment =
    (formData.get("allowInvestment") as string | null) === "true"

  const tradeLimitRaw = formData.get("tradeLimit") as string | null
  const tradeLimitPerWeek = tradeLimitRaw ? Number(tradeLimitRaw) : 0

  if (!name) return

  // derive planType from switches
  let planType: "trader" | "investor" | "both"

  if (allowTrade && allowInvestment) {
    planType = "both"
  } else if (allowInvestment) {
    planType = "investor"
  } else {
    planType = "trader"
  }

  await createPlan({
    name,
    description,
    planType,
    tradeLimitPerWeek,
    allowTrade,
    allowInvestment,
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




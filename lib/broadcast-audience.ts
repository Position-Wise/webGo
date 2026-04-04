function normalizeKey(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase()
}

export type MemberBroadcastTab = "invest" | "trade" | "announcement"
export type BroadcastAudienceType = "trader" | "investor" | "users"
export type BroadcastExpiryOption = "24h" | "1w" | "1m" | "1y" | "none"
export type DashboardBroadcastPlacement =
  | {
      kind: "feed"
      tab: MemberBroadcastTab
    }
  | {
      kind: "suggestion"
    }

export const BROADCAST_AUDIENCE_TYPES = ["trader", "investor", "users"] as const
export const BROADCAST_EXPIRY_OPTIONS = ["24h", "1w", "1m", "1y", "none"] as const

export function normalizeBroadcastAudienceType(
  value: string | null | undefined
): BroadcastAudienceType | null {
  const normalized = normalizeKey(value)

  if (
    BROADCAST_AUDIENCE_TYPES.includes(
      normalized as (typeof BROADCAST_AUDIENCE_TYPES)[number]
    )
  ) {
    return normalized as BroadcastAudienceType
  }

  return null
}

export function normalizeBroadcastExpiryOption(
  value: string | null | undefined
): BroadcastExpiryOption | null {
  const normalized = normalizeKey(value)

  if (
    BROADCAST_EXPIRY_OPTIONS.includes(
      normalized as (typeof BROADCAST_EXPIRY_OPTIONS)[number]
    )
  ) {
    return normalized as BroadcastExpiryOption
  }

  return null
}

export function normalizeTargetUserIds(value: unknown) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : []
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const entry of values) {
    if (typeof entry !== "string") continue
    const trimmed = entry.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    normalized.push(trimmed)
  }

  return normalized
}

export function isPrivateBroadcastAudienceType(value: string | null | undefined) {
  return normalizeBroadcastAudienceType(value) === "users"
}

export function resolveLegacyBroadcastFieldsFromAudienceType(
  value: string | null | undefined
) {
  const audienceType = normalizeBroadcastAudienceType(value)

  if (audienceType === "trader") {
    return {
      audience: "trade",
      broadcastType: "trade" as const,
    }
  }

  if (audienceType === "users") {
    return {
      audience: "admin",
      broadcastType: "announcement" as const,
    }
  }

  if (audienceType === "investor") {
    return {
      audience: "invest",
      broadcastType: "investment" as const,
    }
  }

  return null
}

export function resolveLegacyDurationFromExpiryOption(
  value: string | null | undefined
) {
  const expiryOption = normalizeBroadcastExpiryOption(value)

  if (expiryOption === "24h") return "24h"
  if (expiryOption === "1w") return "week"
  if (expiryOption === "1m") return "month"
  if (expiryOption === "1y") return "year"
  return "forever"
}

export function resolveExpiryOptionFromDuration(
  value: string | null | undefined
): BroadcastExpiryOption {
  const normalized = normalizeKey(value)

  if (normalized === "24h") return "24h"
  if (normalized === "week") return "1w"
  if (normalized === "month") return "1m"
  if (normalized === "year") return "1y"
  return "none"
}

export function calculateBroadcastExpiration(
  value: string | null | undefined,
  now = new Date()
) {
  const expiryOption = normalizeBroadcastExpiryOption(value) ?? "none"

  if (expiryOption === "none") {
    return null
  }

  const expiresAt = new Date(now)

  if (expiryOption === "24h") {
    expiresAt.setHours(expiresAt.getHours() + 24)
    return expiresAt
  }

  if (expiryOption === "1w") {
    expiresAt.setDate(expiresAt.getDate() + 7)
    return expiresAt
  }

  if (expiryOption === "1m") {
    expiresAt.setMonth(expiresAt.getMonth() + 1)
    return expiresAt
  }

  expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  return expiresAt
}

export function isBroadcastExpired(
  value: string | null | undefined,
  now = new Date()
) {
  if (!value) return false

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return false

  return parsed.getTime() <= now.getTime()
}

export function normalizePlanAudienceKey(value: string | null | undefined) {
  const normalized = normalizeKey(value)

  if (normalized === "growth") return "pro"
  if (normalized === "elite") return "premium"
  if (normalized === "master_admin") return "admin"

  return normalized || "basic"
}

export function getPlanAudienceKeys(planName: string | null | undefined) {
  const normalizedPlan = normalizePlanAudienceKey(planName)

  if (normalizedPlan === "admin") {
    return ["basic", "pro", "premium", "growth", "elite", "admin"]
  }

  if (normalizedPlan === "pro") {
    return ["pro", "growth"]
  }

  if (normalizedPlan === "premium") {
    return ["premium", "elite"]
  }

  return [normalizedPlan]
}

export function canAccessBroadcastAudience(params: {
  audience: string | null | undefined
  isAdmin: boolean
  planName: string | null | undefined
  allowTrade: boolean
  allowInvestment: boolean
}) {
  const { audience, isAdmin, planName, allowTrade, allowInvestment } = params

  if (isAdmin) return true

  const normalizedAudience = normalizeKey(audience) || "all"

  if (normalizedAudience === "all") return true
  if (normalizedAudience === "trade") return allowTrade
  if (normalizedAudience === "invest") return allowInvestment

  return getPlanAudienceKeys(planName).includes(normalizedAudience)
}

export function normalizeBroadcastType(
  value: string | null | undefined
): "trade" | "investment" | "announcement" {
  const normalized = normalizeKey(value)

  if (normalized === "trade" || normalized === "announcement") {
    return normalized
  }

  return "investment"
}

export function resolveBroadcastAudienceTypeForEditor(params: {
  audienceType: string | null | undefined
  audience: string | null | undefined
}) {
  const normalizedAudienceType = normalizeBroadcastAudienceType(params.audienceType)
  if (normalizedAudienceType) return normalizedAudienceType

  const normalizedAudience = normalizeKey(params.audience)
  if (normalizedAudience === "trade") return "trader"
  if (normalizedAudience === "invest") return "investor"
  return null
}

export function requiresBroadcastAudienceTypeConversion(params: {
  audienceType: string | null | undefined
  audience: string | null | undefined
}) {
  if (normalizeBroadcastAudienceType(params.audienceType)) {
    return false
  }

  const normalizedAudience = normalizeKey(params.audience)
  return normalizedAudience !== "trade" && normalizedAudience !== "invest"
}

export function resolveMemberBroadcastTab(params: {
  audience: string | null | undefined
  broadcastType: string | null | undefined
  isAdmin: boolean
  planName: string | null | undefined
  allowTrade: boolean
  allowInvestment: boolean
}): MemberBroadcastTab | null {
  const {
    audience,
    broadcastType,
    isAdmin,
    planName,
    allowTrade,
    allowInvestment,
  } = params

  if (
    !canAccessBroadcastAudience({
      audience,
      isAdmin,
      planName,
      allowTrade,
      allowInvestment,
    })
  ) {
    return null
  }

  const normalizedType = normalizeBroadcastType(broadcastType)
  if (normalizedType === "announcement") {
    return "announcement"
  }

  const normalizedAudience = normalizeKey(audience) || "all"

  if (normalizedAudience === "trade") {
    return isAdmin || allowTrade ? "trade" : null
  }

  if (normalizedAudience === "invest") {
    return isAdmin || allowInvestment ? "invest" : null
  }

  if (!isAdmin && normalizedType === "trade" && !allowTrade) {
    return null
  }

  if (!isAdmin && normalizedType === "investment" && !allowInvestment) {
    return null
  }

  return normalizedType === "trade" ? "trade" : "invest"
}

export function resolveDashboardBroadcastPlacement(params: {
  audience: string | null | undefined
  audienceType: string | null | undefined
  targetUserIds: unknown
  broadcastType: string | null | undefined
  isAdmin: boolean
  planName: string | null | undefined
  allowTrade: boolean
  allowInvestment: boolean
  userId?: string | null | undefined
}): DashboardBroadcastPlacement | null {
  const audienceType = normalizeBroadcastAudienceType(params.audienceType)

  if (audienceType === "users") {
    if (params.isAdmin) {
      return { kind: "suggestion" }
    }

    const normalizedUserId = (params.userId ?? "").trim()
    if (!normalizedUserId) return null

    const targetUserIds = normalizeTargetUserIds(params.targetUserIds)
    if (!targetUserIds.includes(normalizedUserId)) {
      return null
    }

    return { kind: "suggestion" }
  }

  if (audienceType === "trader") {
    if (!params.isAdmin && !params.allowTrade) {
      return null
    }

    return {
      kind: "feed",
      tab: "trade",
    }
  }

  if (audienceType === "investor") {
    if (!params.isAdmin && !params.allowInvestment) {
      return null
    }

    return {
      kind: "feed",
      tab: "invest",
    }
  }

  const tab = resolveMemberBroadcastTab({
    audience: params.audience,
    broadcastType: params.broadcastType,
    isAdmin: params.isAdmin,
    planName: params.planName,
    allowTrade: params.allowTrade,
    allowInvestment: params.allowInvestment,
  })

  if (!tab) return null

  return {
    kind: "feed",
    tab,
  }
}

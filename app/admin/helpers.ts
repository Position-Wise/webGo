import {
  BROADCAST_AUDIENCE_TYPES,
  BROADCAST_EXPIRY_OPTIONS,
  normalizeBroadcastAudienceType,
  normalizeTargetUserIds,
} from "@/lib/broadcast-audience"

export const ROLES = [
  "customer",
  "trader",
  "investor",
  "admin",
  "master_admin",
] as const
export const STATUSES = ["pending", "active", "cancelled", "expired"] as const
export const BROADCAST_AUDIENCES = [
  "all",
  "invest",
  "trade",
  "basic",
  "pro",
  "premium",
  "admin",
] as const
export const BROADCAST_DURATIONS = ["24h", "week", "month", "year", "forever"] as const
export const BROADCAST_TYPES = ["trade", "investment", "announcement"] as const
export { BROADCAST_AUDIENCE_TYPES, BROADCAST_EXPIRY_OPTIONS }

export function toAudienceLabel(audience: string | null) {
  const key = (audience ?? "all").toLowerCase()
  if (key === "invest") return "Invest"
  if (key === "trade") return "Trade"
  if (key === "basic") return "Basic Members"
  if (key === "pro" || key === "growth") return "Pro Members"
  if (key === "premium" || key === "elite") return "Premium Members"
  return "All Members"
}

export function toAudienceTypeLabel(audienceType: string | null) {
  const normalized = normalizeBroadcastAudienceType(audienceType)

  if (normalized === "trader") return "Trader"
  if (normalized === "investor") return "Investor"
  if (normalized === "users") return "Specific Users"
  return "Audience Type"
}

export function toBroadcastAudienceLabel(params: {
  audience: string | null
  audience_type?: string | null
  target_user_ids?: string[] | null
}) {
  const audienceType = normalizeBroadcastAudienceType(params.audience_type)
  if (audienceType === "users") {
    const targetCount = normalizeTargetUserIds(params.target_user_ids).length
    return targetCount > 0 ? `Specific Users (${targetCount})` : "Specific Users"
  }

  if (audienceType) {
    return toAudienceTypeLabel(audienceType)
  }

  return toAudienceLabel(params.audience)
}

export function formatBroadcastDate(value: string | null) {
  if (!value) return "Date unavailable"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "Date unavailable"

  return parsed.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function toTitleCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function toDurationLabel(duration: string | null) {
  const normalized = (duration ?? "forever").toLowerCase()
  if (normalized === "24h") return "24 Hours"
  if (normalized === "week") return "1 Week"
  if (normalized === "month") return "1 Month"
  if (normalized === "year") return "1 Year"
  return "Forever"
}

export function toExpiryOptionLabel(option: string | null) {
  const normalized = (option ?? "none").toLowerCase()
  if (normalized === "24h") return "24 Hours"
  if (normalized === "1w") return "1 Week"
  if (normalized === "1m") return "1 Month"
  if (normalized === "1y") return "1 Year"
  return "No Expiry"
}

export function toBroadcastTypeLabel(type: string | null) {
  const normalized = (type ?? "investment").toLowerCase()
  if (normalized === "trade") return "Trade Signal"
  if (normalized === "announcement") return "Announcement"
  return "Investment"
}

export function getBroadcastAuthorName(profiles: unknown) {
  if (!profiles) return null
  if (Array.isArray(profiles)) {
    const first = profiles[0]
    if (!first || typeof first !== "object") return null
    const fullName = (first as { full_name?: unknown }).full_name
    return typeof fullName === "string" && fullName.trim() ? fullName.trim() : null
  }

  if (typeof profiles !== "object") return null

  const fullName = (profiles as { full_name?: unknown }).full_name
  return typeof fullName === "string" && fullName.trim() ? fullName.trim() : null
}

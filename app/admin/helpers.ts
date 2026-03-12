export const ROLES = ["user", "admin"] as const
export const PLANS = ["basic", "growth", "elite"] as const
export const STATUSES = ["pending", "active"] as const
export const BROADCAST_AUDIENCES = [
  "all",
  "invest",
  "trade",
  "basic",
  "growth",
  "elite",
] as const
export const BROADCAST_DURATIONS = ["24h", "week", "month", "forever"] as const
export const BROADCAST_TYPES = ["trade", "investment", "announcement"] as const

export function toAudienceLabel(audience: string | null) {
  const key = (audience ?? "all").toLowerCase()
  if (key === "invest") return "Invest"
  if (key === "trade") return "Trade"
  if (key === "basic") return "Basic Members"
  if (key === "growth") return "Growth Members"
  if (key === "elite") return "Elite Members"
  return "All Members"
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
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function toDurationLabel(duration: string | null) {
  const normalized = (duration ?? "forever").toLowerCase()
  if (normalized === "24h") return "24 Hours"
  if (normalized === "week") return "1 Week"
  if (normalized === "month") return "1 Month"
  return "Forever"
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

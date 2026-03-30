function normalizeKey(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase()
}

export type MemberBroadcastTab = "invest" | "trade" | "announcement"

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

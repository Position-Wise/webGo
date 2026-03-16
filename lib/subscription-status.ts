export type SubscriptionStatus = "pending" | "active" | "rejected" | null

export type AccessState = "new_user" | "waiting" | "approved" | "rejected"

function normalizeKey(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase()
}

export function normalizeSubscriptionStatus(
  value: string | null | undefined
): SubscriptionStatus {
  const normalized = normalizeKey(value)

  if (!normalized || normalized === "none" || normalized === "null") {
    return null
  }

  if (
    normalized === "pending" ||
    normalized === "waiting" ||
    normalized === "submitted" ||
    normalized === "in_review"
  ) {
    return "pending"
  }

  if (
    normalized === "active" ||
    normalized === "approved" ||
    normalized === "paid"
  ) {
    return "active"
  }

  if (
    normalized === "rejected" ||
    normalized === "declined" ||
    normalized === "denied"
  ) {
    return "rejected"
  }

  return null
}

export function getAccessStateFromStatus(
  value: string | null | undefined
): AccessState {
  const normalized = normalizeKey(value)

  if (!normalized || normalized === "none" || normalized === "null" || normalized === "new_user") {
    return "new_user"
  }

  if (normalized === "waiting") {
    return "waiting"
  }

  if (normalized === "approved") {
    return "approved"
  }

  const status = normalizeSubscriptionStatus(normalized)

  if (status === "active") return "approved"
  if (status === "pending") return "waiting"
  if (status === "rejected") return "rejected"

  return "new_user"
}

export function getAccessStateLabel(state: AccessState) {
  if (state === "approved") return "Approved"
  if (state === "waiting") return "Pending Approval"
  if (state === "rejected") return "Rejected"
  return "Not Submitted"
}

export function getMemberHomePathForState(state: AccessState) {
  if (state === "approved") return "/dashboard"
  if (state === "waiting") return "/waiting"
  return "/subscribe"
}

export function getProtectedRouteRedirectPath(value: string | null | undefined) {
  const accessState = getAccessStateFromStatus(value)
  if (accessState === "approved") return null
  return getMemberHomePathForState(accessState)
}

export function getPostLoginRedirectPathForState(state: AccessState) {
  return getMemberHomePathForState(state)
}

export function getPostLoginRedirectPathForStatus(
  value: string | null | undefined
) {
  return getPostLoginRedirectPathForState(getAccessStateFromStatus(value))
}

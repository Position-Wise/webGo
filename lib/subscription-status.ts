export type SubscriptionStatus =
  | "pending"
  | "active"
  | "cancelled"
  | "expired"
  | null

export type AccessState = "new_user" | "waiting" | "approved" | "blocked"

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
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "rejected" ||
    normalized === "declined" ||
    normalized === "denied" ||
    normalized === "blocked"
  ) {
    return "cancelled"
  }

  if (normalized === "expired" || normalized === "lapsed") {
    return "expired"
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

  if (normalized === "blocked") {
    return "blocked"
  }

  const status = normalizeSubscriptionStatus(normalized)

  if (status === "active") return "approved"
  if (status === "pending") return "waiting"
  if (status === "cancelled" || status === "expired") return "blocked"

  return "new_user"
}

export function getAccessStateLabel(state: AccessState) {
  if (state === "approved") return "Approved"
  if (state === "waiting") return "Pending Approval"
  if (state === "blocked") return "Blocked"
  return "Not Submitted"
}

export function getSubscriptionStatusLabel(value: string | null | undefined) {
  const status = normalizeSubscriptionStatus(value)

  if (status === "pending") return "Pending"
  if (status === "active") return "Active"
  if (status === "cancelled") return "Cancelled"
  if (status === "expired") return "Expired"
  return "No Subscription"
}

export function getMemberHomePathForState(state: AccessState) {
  if (state === "approved") return "/dashboard"
  if (state === "waiting") return "/waiting"
  if (state === "blocked") return "/subscribe?mode=edit"
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

export const CUSTOM_PLAN_OPTION_ID = "__custom_plan__"
export const CUSTOM_PLAN_OPTION_NAME = "Custom"

export type InquiryType = "support" | "custom_plan"

export function isCustomPlanOptionId(value: string | null | undefined) {
  return (value ?? "").trim() === CUSTOM_PLAN_OPTION_ID
}

function normalizeValue(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase()
}

function toTitleCase(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function toInquiryTypeLabel(value: string | null | undefined) {
  const normalized = normalizeValue(value)

  if (normalized === "custom_plan") return "Custom plan"
  if (normalized === "support") return "Support"

  return normalized ? toTitleCase(normalized) : "Inquiry"
}

export function normalizeInquiryStatus(value: string | null | undefined) {
  return normalizeValue(value) || "open"
}

export function isResolvedInquiryStatus(value: string | null | undefined) {
  return normalizeInquiryStatus(value) === "resolved"
}

export function toInquiryStatusLabel(value: string | null | undefined) {
  const normalized = normalizeInquiryStatus(value)

  if (normalized === "open") return "Open"
  if (normalized === "pending") return "Pending"
  if (normalized === "resolved") return "Resolved"

  return toTitleCase(normalized)
}

export function readInquiryMetadataValue(
  metadata: unknown,
  key: "budget" | "preference"
) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null
  }

  const value = (metadata as Record<string, unknown>)[key]
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  return trimmed || null
}

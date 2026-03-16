export function normalizeRole(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase()
  return normalized || null
}

export function isAdminRole(value: string | null | undefined) {
  const normalized = normalizeRole(value)
  return normalized === "admin" || normalized === "master_admin"
}

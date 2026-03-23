const BROADCAST_SHARE_BASE_PATH = "/broadcast"

function normalizeId(value: string) {
  return value.trim()
}

export function isShareableBroadcastId(value: string | null | undefined) {
  const normalized = normalizeId(value ?? "")
  if (!normalized) return false
  if (normalized.length > 120) return false
  return /^[a-zA-Z0-9-]+$/.test(normalized)
}

export function getBroadcastSharePath(broadcastId: string) {
  const normalized = normalizeId(broadcastId)
  return `${BROADCAST_SHARE_BASE_PATH}/${normalized}`
}

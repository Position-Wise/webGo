import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server"

export type MinimalDbClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>
      }
    }
  }
}

function normalizeRole(value: unknown) {
  if (typeof value !== "string") return null
  const normalized = value.trim().toLowerCase()
  return normalized || null
}

async function fetchRoleFromProfilesTable(client: MinimalDbClient, userId: string) {
  const byId = await client
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle()

  const roleFromId = normalizeRole(byId.data?.role)
  if (roleFromId) return roleFromId

  const byUserId = await client
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle()

  return normalizeRole(byUserId.data?.role)
}

async function fetchRoleFromProfileTable(client: MinimalDbClient, userId: string) {
  const byId = await client
    .from("profile")
    .select("role")
    .eq("id", userId)
    .maybeSingle()

  const roleFromId = normalizeRole(byId.data?.role)
  if (roleFromId) return roleFromId

  const byUserId = await client
    .from("profile")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle()

  return normalizeRole(byUserId.data?.role)
}

export async function resolveRoleForUser(
  userId: string,
  fallbackClient?: MinimalDbClient
) {
  const clients: MinimalDbClient[] = []

  if (fallbackClient) {
    clients.push(fallbackClient)
  } else {
    clients.push((await createSupabaseServerClient()) as unknown as MinimalDbClient)
  }

  const serviceRoleClient = createSupabaseServiceRoleClient()
  if (serviceRoleClient) {
    clients.push(serviceRoleClient as unknown as MinimalDbClient)
  }

  for (const client of clients) {
    const profilesRole = await fetchRoleFromProfilesTable(client, userId)
    if (profilesRole) return profilesRole

    const profileRole = await fetchRoleFromProfileTable(client, userId)
    if (profileRole) return profileRole
  }

  return null
}

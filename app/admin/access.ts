import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  fetchProfileRole,
  resolveCurrentUserAdminState,
  type AccessQueryClient,
} from "@/lib/current-user-access"

export type MinimalDbClient = AccessQueryClient

export async function resolveRoleForUser(
  userId: string,
  fallbackClient?: MinimalDbClient
) {
  const client = fallbackClient
    ? fallbackClient
    : ((await createSupabaseServerClient()) as unknown as MinimalDbClient)

  return fetchProfileRole(client, userId)
}

export async function resolveCurrentUserIsAdmin(
  userId: string,
  fallbackClient?: MinimalDbClient
) {
  const client = fallbackClient
    ? fallbackClient
    : ((await createSupabaseServerClient()) as unknown as MinimalDbClient)

  return resolveCurrentUserAdminState(client, userId)
}

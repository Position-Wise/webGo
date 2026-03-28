import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  deriveCurrentUserAccessState,
  fetchCurrentUserSubscription,
  getEmptyCurrentUserAccessState,
  resolveCurrentUserAdminState,
  type AccessQueryClient,
  type CurrentUserAccessState,
} from "@/lib/current-user-access"

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

export async function getCurrentUserAccessState(
  providedSupabase?: SupabaseServerClient
): Promise<CurrentUserAccessState> {
  const supabase = providedSupabase ?? (await createSupabaseServerClient())
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return getEmptyCurrentUserAccessState(null)
  }

  const [{ isAdmin, role, source }, subscription] = await Promise.all([
    resolveCurrentUserAdminState(supabase as unknown as AccessQueryClient, user.id),
    fetchCurrentUserSubscription(supabase as unknown as AccessQueryClient, user.id),
  ])

  return deriveCurrentUserAccessState({
    user,
    role,
    isAdmin,
    adminResolutionSource: source,
    subscription,
  })
}

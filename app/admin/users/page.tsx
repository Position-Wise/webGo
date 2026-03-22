import type { ProfileRow } from "../types"
import { fetchAdminProfiles, fetchAdminSubscriptionPlans } from "../queries"
import UsersTableView from "./users-table-view"
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

function getStartOfMonthIso() {
  const now = new Date()
  now.setUTCDate(1)
  now.setUTCHours(0, 0, 0, 0)
  return now.toISOString()
}

async function fetchUsageByUser(profiles: ProfileRow[]) {
  const userIds = profiles
    .map((profile) => profile.id)
    .filter((id): id is string => Boolean(id))

  if (!userIds.length) return {} as Record<string, { tradesUsedThisMonth: number; broadcastsSeen: number }>

  const db = createSupabaseServiceRoleClient() ?? (await createSupabaseServerClient())
  const startOfMonth = getStartOfMonthIso()
  const { data, error } = await db
    .from("trade_usage")
    .select("user_id,broadcast_id,created_at")
    .in("user_id", userIds)
    .gte("created_at", startOfMonth)

  if (error || !data?.length) {
    return {} as Record<string, { tradesUsedThisMonth: number; broadcastsSeen: number }>
  }

  const usageByUser: Record<string, { tradesUsedThisMonth: number; broadcastsSeen: number }> = {}
  const seenByUser: Record<string, Set<string>> = {}

  for (const row of data as { user_id?: string | null; broadcast_id?: string | null }[]) {
    const userId = row.user_id ?? ""
    if (!userId) continue

    if (!usageByUser[userId]) {
      usageByUser[userId] = {
        tradesUsedThisMonth: 0,
        broadcastsSeen: 0,
      }
      seenByUser[userId] = new Set<string>()
    }

    if (row.broadcast_id) {
      seenByUser[userId].add(row.broadcast_id)
      const uniqueCount = seenByUser[userId].size
      usageByUser[userId].tradesUsedThisMonth = uniqueCount
      usageByUser[userId].broadcastsSeen = uniqueCount
    }
  }

  return usageByUser
}

export default async function AdminUsersPage() {
  const [profiles, plans] = await Promise.all([
    fetchAdminProfiles(),
    fetchAdminSubscriptionPlans(),
  ])
  const usageByUser = await fetchUsageByUser(profiles)
  const hasServiceRole = isSupabaseServiceRoleConfigured()
  const shouldShowPermissionHint = !hasServiceRole && profiles.length <= 1

  return (
    <section className="space-y-4">
      {shouldShowPermissionHint ? (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Admin list is currently permission-limited. Add
          ` SUPABASE_SERVICE_ROLE_KEY ` in `.env` or verify your Supabase RLS
          policies allow admin users to view and edit all users.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!profiles.length ? (
            <p className="text-sm text-muted-foreground">
              No profiles found yet.
            </p>
          ) : (
            <UsersTableView profiles={profiles} plans={plans} usageByUser={usageByUser} />
          )}
        </CardContent>
      </Card>
    </section>
  )
}

import type { ProfileRow } from "../types"
import { fetchAdminProfiles, fetchAdminSubscriptionPlans } from "../queries"
import UsersTableView from "./users-table-view"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

function getStartOfWeekIso() {
  const now = new Date()
  const currentDay = now.getUTCDay()
  const daysSinceMonday = (currentDay + 6) % 7
  now.setUTCDate(now.getUTCDate() - daysSinceMonday)
  now.setUTCHours(0, 0, 0, 0)
  return now.toISOString()
}

async function fetchUsageByUser(profiles: ProfileRow[]) {
  const userIds = profiles
    .map((profile) => profile.id)
    .filter((id): id is string => Boolean(id))

  if (!userIds.length) return {} as Record<string, { tradesUsedThisWeek: number; broadcastsSeen: number }>

  const db = await createSupabaseServerClient()
  const startOfWeek = getStartOfWeekIso()
  const { data, error } = await db
    .from("trade_usage")
    .select("user_id,broadcast_id,created_at")
    .in("user_id", userIds)
    .gte("created_at", startOfWeek)

  if (error || !data?.length) {
    return {} as Record<string, { tradesUsedThisWeek: number; broadcastsSeen: number }>
  }

  const usageByUser: Record<string, { tradesUsedThisWeek: number; broadcastsSeen: number }> = {}
  const seenByUser: Record<string, Set<string>> = {}

  for (const row of data as { user_id?: string | null; broadcast_id?: string | null }[]) {
    const userId = row.user_id ?? ""
    if (!userId) continue

    if (!usageByUser[userId]) {
      usageByUser[userId] = {
        tradesUsedThisWeek: 0,
        broadcastsSeen: 0,
      }
      seenByUser[userId] = new Set<string>()
    }

    if (row.broadcast_id) {
      seenByUser[userId].add(row.broadcast_id)
      const uniqueCount = seenByUser[userId].size
      usageByUser[userId].tradesUsedThisWeek = uniqueCount
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

  return (
    <section className="space-y-4">
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

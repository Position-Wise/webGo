import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server"
import type { BroadcastRow, ProfileRow, SubscriptionPlanRow } from "./types"

function toNullableString(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function toProfileRowFromProfileTable(raw: Record<string, unknown>): ProfileRow | null {
  const idCandidate = raw.id ?? raw.user_id ?? raw.uid
  const id = idCandidate == null ? "" : String(idCandidate).trim()

  if (!id) return null

  const fullName = toNullableString(raw.full_name ?? raw.name ?? raw.display_name)
  const role = toNullableString(raw.role)
  const status = toNullableString(
    raw.status ?? raw.access_status ?? raw.subscription_status
  )
  const plan = toNullableString(
    raw.plan ?? raw.tier ?? raw.subscription_plan ?? raw.membership_plan
  )

  return {
    id,
    full_name: fullName,
    email: toNullableString(raw.email),
    role,
    source_table: "profile",
    user_subscriptions: [
      {
        status,
        subscription_plans: [{ name: plan }],
      },
    ],
  }
}

async function fetchProfilesFromProfilesTable(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
) {
  const { data } = await supabase
    .from("profiles")
    .select(`
      *,
      user_subscriptions (
        *,
        subscription_plans (
          id,
          name,
          description
        )
      )
    `)
    .order("full_name", { ascending: true })

  return ((data as ProfileRow[] | null) ?? []).map((row) => ({
    ...row,
    source_table: "profiles" as const,
  }))
}

async function fetchProfilesFromProfileTable(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
) {
  const { data, error } = await supabase
    .from("profile")
    .select("*")

  if (error || !data?.length) return []

  return (data as Record<string, unknown>[])
    .map(toProfileRowFromProfileTable)
    .filter((row): row is ProfileRow => row !== null)
    .sort((a, b) => {
      const left = (a.full_name ?? a.id).toLowerCase()
      const right = (b.full_name ?? b.id).toLowerCase()
      return left.localeCompare(right)
    })
}

export async function fetchAdminProfiles() {
  const supabase = createSupabaseServiceRoleClient() ?? (await createSupabaseServerClient())

  const profilesTableRows = await fetchProfilesFromProfilesTable(supabase)

  if (profilesTableRows.length > 1) {
    return profilesTableRows
  }

  const profileTableRows = await fetchProfilesFromProfileTable(supabase)

  if (profileTableRows.length) {
    return profileTableRows
  }

  return profilesTableRows
}

export async function fetchAdminSubscriptionPlans() {
  const supabase = createSupabaseServiceRoleClient() ?? (await createSupabaseServerClient())

  const { data } = await supabase
    .from("subscription_plans")
    .select("id,name,is_public")
    .order("name", { ascending: true })

  return ((data as SubscriptionPlanRow[] | null) ?? []).filter((plan) => {
    const normalized = (plan.name ?? "").trim().toLowerCase()
    return Boolean(normalized)
  })
}

export async function fetchAdminPlanSettings() {
  const supabase = createSupabaseServiceRoleClient() ?? (await createSupabaseServerClient())

  const { data } = await supabase
    .from("subscription_plans")
    .select("*")
    .order("name", { ascending: true })

  return ((data as SubscriptionPlanRow[] | null) ?? []).filter((plan) => {
    const normalized = (plan.name ?? "").trim().toLowerCase()
    return Boolean(normalized)
  })
}

export async function fetchAdminBroadcasts(limit = 20) {
  const supabase = createSupabaseServiceRoleClient() ?? (await createSupabaseServerClient())
  const nowIso = new Date().toISOString()
  const broadcastSelect = `
      id,
      title,
      message,
      audience,
      broadcast_type,
      created_by,
      duration,
      expires_at,
      created_at,
      profiles:created_by (
        full_name
      )
    `

  const { data, error } = await supabase
    .from("admin_broadcasts")
    .select(broadcastSelect)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    const { data: fallbackRows } = await supabase
      .from("admin_broadcasts")
      .select(`
        id,
        title,
        message,
        audience,
        duration,
        expires_at,
        created_at
      `)
      .order("created_at", { ascending: false })
      .limit(limit)

    return (fallbackRows as BroadcastRow[] | null) ?? []
  }

  return ((data as BroadcastRow[] | null) ?? []).filter((row) => {
    if (!row.expires_at) return true
    return row.expires_at > nowIso
  })
}

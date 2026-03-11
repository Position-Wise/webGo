import { createSupabaseServerClient } from "@/lib/supabase/server"
import { updateUserAccess } from "./actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

type ProfileRow = {
  id: string
  full_name: string | null
  role?: string | null
  user_subscriptions?: {
    status?: string | null
    subscription_plans?: {
      id?: string
      name?: string | null
    }[]
  }[]
}

const ROLES = ["user", "admin"]
const PLANS = ["basic", "growth", "elite"]
const STATUSES = ["pending", "active"]

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient()

  const { data: profiles } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      user_subscriptions (
        status,
        subscription_plans (
          id,
          name
        )
      )
    `)
    .order("full_name", { ascending: true })

  return (
    <main className="min-h-screen bg-background text-foreground pt-24 pb-20 px-6">
      <section className="max-w-5xl mx-auto space-y-4">
        <h1 className="text-3xl sm:text-4xl font-semibold">
          Admin · Member Access
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
          Review members, adjust their tier, and mark verification status.
          This is a demo interface that assumes appropriate Supabase policies
          are in place for admin writes.
        </p>
      </section>

      <section className="max-w-5xl mx-auto mt-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!profiles?.length ? (
              <p className="text-sm text-muted-foreground">
                No profiles found yet.
              </p>
            ) : (
              <div className="space-y-4">
                {profiles.map((profile) => (
                  <UserRow key={profile.id} profile={profile} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

function UserRow({ profile }: { profile: ProfileRow }) {
  const currentRole = (profile.role ?? "user").toLowerCase()
  const subscription = profile.user_subscriptions?.[0]
  const currentPlan = (subscription?.subscription_plans?.[0]?.name ?? "basic").toLowerCase() 
  const currentStatus = (subscription?.status ?? "pending").toLowerCase()

  return (
    <form
      action={updateUserAccess}
      className="grid gap-3 items-center border border-border/60 rounded-lg px-4 py-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_auto]"
    >
      <input type="hidden" name="userId" value={profile.id} />

      <div className="space-y-0.5">
        <p className="text-sm font-medium">
          {profile.full_name || "Unnamed member"}
        </p>
        <p className="text-xs text-muted-foreground">
          {profile.id}
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground uppercase tracking-wide">
          Role
        </label>
        <select
          name="role"
          defaultValue={currentRole}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:contents">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground uppercase tracking-wide">
            Plan
          </label>
          <select
            name="plan"
            defaultValue={currentPlan}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {PLANS.map((plan) => (
              <option key={plan} value={plan}>
                {plan.charAt(0).toUpperCase() + plan.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground uppercase tracking-wide">
            Status
          </label>
          <select
            name="status"
            defaultValue={currentStatus}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="justify-self-end">
        <Button type="submit" size="sm">
          Save
        </Button>
      </div>
    </form>
  )
}


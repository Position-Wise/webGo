import { createSupabaseServerClient } from "@/lib/supabase/server"
import { updateUserAccess } from "./actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
  tier: string | null
  verified: boolean | null
}

const TIERS = ["foundation", "growth", "elite"]

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient()

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, tier, verified")
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
  const currentTier = (profile.tier ?? "foundation").toLowerCase()

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
          {profile.email || "No email on record"}
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground uppercase tracking-wide">
          Tier
        </label>
        <select
          name="tier"
          defaultValue={currentTier}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground uppercase tracking-wide">
          Verified
        </label>
        <div className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="verified"
            defaultChecked={!!profile.verified}
            className="h-4 w-4 rounded border border-input"
          />
          <span>{profile.verified ? "Yes" : "No"}</span>
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


import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null // layout should already redirect
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, tier, verified")
    .eq("id", user.id)
    .single()

  return (
    <div className="min-h-screen bg-background p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <h1 className="text-3xl font-semibold">
          Dashboard
        </h1>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <p>
            <span className="text-muted-foreground">Email:</span>{" "}
            {user.email}
          </p>

          <p>
            <span className="text-muted-foreground">Tier:</span>{" "}
            {profile?.tier ?? "essential"}
          </p>

          <p>
            <span className="text-muted-foreground">Verified:</span>{" "}
            {profile?.verified ? "Yes" : "Pending"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-6">
          <p className="text-sm text-muted-foreground">
            This area will contain strategic intelligence modules
            based on membership tier.
          </p>
        </div>

      </div>
    </div>
  )
}
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      role,
      user_subscriptions (
        status,
        subscription_plans (
          name
        )
      )
    `)
    .eq("id", user.id)
    .single()

  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture

  const subscription = profile?.user_subscriptions?.[0]
  const plan = subscription?.subscription_plans?.[0]?.name
  const status = subscription?.status

  return (
    <div className="min-h-screen bg-background p-10">
      <div className="max-w-3xl mx-auto space-y-8">

        <h1 className="text-3xl font-semibold">
          Profile
        </h1>

        <div className="rounded-xl border border-border bg-card p-8 space-y-6">

          {/* Avatar */}
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback>
                {user.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div>
              <p className="text-lg font-medium">
                {user.user_metadata?.full_name || "Member"}
              </p>
              <p className="text-muted-foreground text-sm">
                {user.email}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="grid gap-4 text-sm">

            <div className="flex justify-between border-b border-border pb-3">
              <span className="text-muted-foreground">Tier</span>
              <span className="font-medium capitalize">
                {plan || "basic"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium">
                {status === "active" ? "Approved" : "Pending"}
              </span>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}
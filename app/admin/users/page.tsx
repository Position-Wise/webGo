import { updateUserAccess } from "../actions"
import { ROLES, STATUSES, toTitleCase } from "../helpers"
import { fetchAdminProfiles, fetchAdminSubscriptionPlans } from "../queries"
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function AdminUsersPage() {
  const [profiles, plans] = await Promise.all([
    fetchAdminProfiles(),
    fetchAdminSubscriptionPlans(),
  ])
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
            <div className="space-y-4">
              {profiles.map((profile) => {
                const currentRole = (profile.role ?? "user").toLowerCase()
                const subscription = profile.user_subscriptions?.[0]
                const currentPlanName = (
                  subscription?.subscription_plans?.[0]?.name ?? "basic"
                ).toLowerCase()
                const selectedPlanId =
                  plans.find((plan) => (plan.name ?? "").toLowerCase() === currentPlanName)?.id ??
                  "__current__"
                const currentStatus = (subscription?.status ?? "pending").toLowerCase()

                return (
                  <form
                    key={profile.id}
                    action={updateUserAccess}
                    className="grid gap-3 items-center border border-border/60 rounded-lg px-4 py-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_auto]"
                  >
                    <input type="hidden" name="userId" value={profile.id} />
                    <input type="hidden" name="currentPlanName" value={currentPlanName} />

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
                            {toTitleCase(role)}
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
                          name="planId"
                          defaultValue={selectedPlanId}
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        >
                          {selectedPlanId === "__current__" ? (
                            <option value="__current__">
                              {toTitleCase(currentPlanName)} (current)
                            </option>
                          ) : null}
                          {plans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name}
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
                              {toTitleCase(status)}
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
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

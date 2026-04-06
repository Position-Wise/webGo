import { fetchAdminPlanSettings } from "../queries"
import PlansTableView from "./plans-table-view"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AddPlanDrawer } from "./add-plan-drawer"

export const dynamic = "force-dynamic"

export default async function AdminPlansPage() {
  const plans = await fetchAdminPlanSettings()

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Plan Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!plans.length ? (
            <p className="text-sm text-muted-foreground">
              No subscription plans found.
            </p>
          ) : (
            <PlansTableView plans={plans} />
          )}
        </CardContent>
        <CardFooter>
          <AddPlanDrawer />
        </CardFooter>
      </Card>
    </section>
  )
}

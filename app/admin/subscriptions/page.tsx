import Link from "next/link"
import { updateUserAccess } from "../actions"
import { toTitleCase } from "../helpers"
import { fetchAdminProfiles } from "../queries"
import ProofPreviewDrawer from "./proof-preview-drawer"
import type { ProfileRow } from "../types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import LoadingSubmitButton from "@/components/ui/loading-submit-button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getSubscriptionStatusLabel,
  normalizeSubscriptionStatus,
} from "@/lib/subscription-status"

export const dynamic = "force-dynamic"

function getSubscription(profile: ProfileRow) {
  return profile.user_subscriptions?.[0] ?? null
}

function getPlanName(profile: ProfileRow) {
  const subscriptionPlans = getSubscription(profile)?.subscription_plans as unknown
  const firstPlan = Array.isArray(subscriptionPlans)
    ? subscriptionPlans[0]
    : subscriptionPlans && typeof subscriptionPlans === "object"
      ? subscriptionPlans
      : null
  const normalized = (((firstPlan as { name?: string | null } | null)?.name ?? "") as string)
    .trim()
    .toLowerCase()

  return normalized || null
}

function getPlanId(profile: ProfileRow) {
  return getSubscription(profile)?.subscription_plan_id ?? null
}

function getSubmittedAt(profile: ProfileRow) {
  return getSubscription(profile)?.submitted_at ?? null
}

function formatDate(value: string | null) {
  if (!value) return "Not submitted"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "Not submitted"

  return parsed.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function sortProfiles(profiles: ProfileRow[]) {
  return [...profiles].sort((left, right) => {
    const leftSubmittedAt = new Date(getSubmittedAt(left) ?? 0).getTime()
    const rightSubmittedAt = new Date(getSubmittedAt(right) ?? 0).getTime()

    if (rightSubmittedAt !== leftSubmittedAt) {
      return rightSubmittedAt - leftSubmittedAt
    }

    const leftName = (left.full_name ?? left.email ?? left.id).toLowerCase()
    const rightName = (right.full_name ?? right.email ?? right.id).toLowerCase()

    return leftName.localeCompare(rightName)
  })
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}

export default async function AdminSubscriptionsPage() {
  const profiles = sortProfiles(await fetchAdminProfiles())
  const pendingCount = profiles.filter(
    (profile) => normalizeSubscriptionStatus(getSubscription(profile)?.status ?? null) === "pending"
  ).length
  const activeCount = profiles.filter(
    (profile) => normalizeSubscriptionStatus(getSubscription(profile)?.status ?? null) === "active"
  ).length
  const cancelledCount = profiles.filter(
    (profile) => normalizeSubscriptionStatus(getSubscription(profile)?.status ?? null) === "cancelled"
  ).length
  const expiredCount = profiles.filter(
    (profile) => normalizeSubscriptionStatus(getSubscription(profile)?.status ?? null) === "expired"
  ).length

  return (
    <section className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pending" value={pendingCount} />
        <MetricCard label="Active" value={activeCount} />
        <MetricCard label="Cancelled" value={cancelledCount} />
        <MetricCard label="Expired" value={expiredCount} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {!profiles.length ? (
            <p className="text-sm text-muted-foreground">No users found yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Proof</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => {
                  const subscription = getSubscription(profile)
                  const status = normalizeSubscriptionStatus(subscription?.status ?? null)

                  const planName = getPlanName(profile)
                  const planId = getPlanId(profile)
                  const paymentProof = subscription?.payment_proof ?? null
                  const canApprove = Boolean(planId && paymentProof)

                  return (
                    <TableRow key={profile.id}>
                      <TableCell className="min-w-[220px]">
                        <p className="font-medium">{profile.full_name || "Unnamed member"}</p>
                        <p className="text-xs text-muted-foreground">
                          {profile.email || profile.id}
                        </p>
                      </TableCell>
                      <TableCell>
                        {planName ? toTitleCase(planName) : "Not selected"}
                      </TableCell>
                      <TableCell>{getSubscriptionStatusLabel(status)}</TableCell>
                      <TableCell>{formatDate(getSubmittedAt(profile))}</TableCell>
                      <TableCell>
                        {paymentProof ? (
                          <ProofPreviewDrawer
                            paymentProof={paymentProof}
                            memberLabel={profile.full_name || profile.email || "Member"}
                          />
                        ) : (
                          "Missing"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <form action={updateUserAccess}>
                            <input name="userId" type="hidden" value={profile.id} />
                            <input name="planId" type="hidden" value={planId ?? "__current__"} />
                            <input name="status" type="hidden" value="active" />
                            <LoadingSubmitButton
                              disabled={!canApprove || status === "active"}
                              size="sm"
                              type="submit"
                              pendingText="Approving..."
                            >
                              Approve
                            </LoadingSubmitButton>
                          </form>

                          <form action={updateUserAccess}>
                            <input name="userId" type="hidden" value={profile.id} />
                            <input name="planId" type="hidden" value={planId ?? "__current__"} />
                            <input name="status" type="hidden" value="cancelled" />
                            <LoadingSubmitButton
                              disabled={status === "cancelled" || status === "expired"}
                              size="sm"
                              type="submit"
                              variant="outline"
                              pendingText="Cancelling..."
                            >
                              Mark cancelled
                            </LoadingSubmitButton>
                          </form>

                          <Button asChild size="sm" variant="ghost">
                            <Link href="/admin/users">Open user</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
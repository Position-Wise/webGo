import Link from "next/link";
import { updateUserAccess } from "../actions";
import { toTitleCase } from "../helpers";
import { fetchAdminProfiles } from "../queries";
import ProofPreviewDrawer from "./proof-preview-drawer";
import type { ProfileRow } from "../types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAccessStateFromStatus,
  getAccessStateLabel,
  normalizeSubscriptionStatus,
} from "@/lib/subscription-status";

export const dynamic = "force-dynamic";

function getSubscription(profile: ProfileRow) {
  return profile.user_subscriptions?.[0] ?? null;
}

function getPlanName(profile: ProfileRow) {
  const subscriptionPlans = getSubscription(profile)?.subscription_plans as unknown;
  const firstPlan =
    Array.isArray(subscriptionPlans)
      ? subscriptionPlans[0]
      : subscriptionPlans && typeof subscriptionPlans === "object"
        ? subscriptionPlans
        : null;
  const normalized = (((firstPlan as { name?: string | null } | null)?.name ?? "") as string)
    .trim()
    .toLowerCase();

  return normalized || null;
}

function getPlanId(profile: ProfileRow) {
  const subscription = getSubscription(profile);
  return subscription?.plan_id ?? subscription?.subscription_plan_id ?? null;
}

function getSubmittedAt(profile: ProfileRow) {
  return getSubscription(profile)?.submitted_at ?? null;
}

function formatDate(value: string | null) {
  if (!value) return "Not submitted";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not submitted";

  return parsed.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function sortProfiles(profiles: ProfileRow[]) {
  return [...profiles].sort((left, right) => {
    const leftSubmittedAt = new Date(getSubmittedAt(left) ?? 0).getTime();
    const rightSubmittedAt = new Date(getSubmittedAt(right) ?? 0).getTime();

    if (rightSubmittedAt !== leftSubmittedAt) {
      return rightSubmittedAt - leftSubmittedAt;
    }

    const leftName = (left.full_name ?? left.email ?? left.id).toLowerCase();
    const rightName = (
      right.full_name ??
      right.email ??
      right.id
    ).toLowerCase();

    return leftName.localeCompare(rightName);
  });
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
  );
}

export default async function AdminSubscriptionsPage() {
  const profiles = sortProfiles(await fetchAdminProfiles());
  const newUserCount = profiles.filter(
    (profile) =>
      getAccessStateFromStatus(getSubscription(profile)?.status ?? null) ===
      "new_user",
  ).length;
  const waitingCount = profiles.filter(
    (profile) =>
      getAccessStateFromStatus(getSubscription(profile)?.status ?? null) ===
      "waiting",
  ).length;
  const approvedCount = profiles.filter(
    (profile) =>
      getAccessStateFromStatus(getSubscription(profile)?.status ?? null) ===
      "approved",
  ).length;
  const rejectedCount = profiles.filter(
    (profile) =>
      getAccessStateFromStatus(getSubscription(profile)?.status ?? null) ===
      "rejected",
  ).length;

  return (
    <section className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="New users" value={newUserCount} />
        <MetricCard label="Pending review" value={waitingCount} />
        <MetricCard label="Approved" value={approvedCount} />
        <MetricCard label="Rejected" value={rejectedCount} />
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
                  const subscription = getSubscription(profile);
                  const status = normalizeSubscriptionStatus(
                    subscription?.status ?? null,
                  );
                  const accessState = getAccessStateFromStatus(status);
                  const planName = getPlanName(profile);
                  const planId = getPlanId(profile);
                  const paymentProof = subscription?.payment_proof ?? null;
                  const canApprove = Boolean(planId && paymentProof);

                  return (
                    <TableRow key={profile.id}>
                      <TableCell className="min-w-[220px]">
                        <p className="font-medium">
                          {profile.full_name || "Unnamed member"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {profile.email || profile.id}
                        </p>
                      </TableCell>
                      <TableCell>
                        {planName ? toTitleCase(planName) : "Not selected"}
                      </TableCell>
                      <TableCell>{getAccessStateLabel(accessState)}</TableCell>
                      <TableCell>
                        {formatDate(getSubmittedAt(profile))}
                      </TableCell>
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
                            <input
                              name="userId"
                              type="hidden"
                              value={profile.id}
                            />
                            <input
                              name="currentPlanName"
                              type="hidden"
                              value={planName ?? ""}
                            />
                            <input
                              name="planId"
                              type="hidden"
                              value={planId ?? "__current__"}
                            />
                            <input name="status" type="hidden" value="active" />
                            <Button
                              disabled={
                                !canApprove || accessState === "approved"
                              }
                              size="sm"
                              type="submit"
                            >
                              Approve
                            </Button>
                          </form>

                          <form action={updateUserAccess}>
                            <input
                              name="userId"
                              type="hidden"
                              value={profile.id}
                            />
                            <input
                              name="currentPlanName"
                              type="hidden"
                              value={planName ?? ""}
                            />
                            <input
                              name="planId"
                              type="hidden"
                              value={planId ?? "__current__"}
                            />
                            <input
                              name="status"
                              type="hidden"
                              value="rejected"
                            />
                            <Button
                              disabled={accessState === "rejected"}
                              size="sm"
                              type="submit"
                              variant="outline"
                            >
                              Reject
                            </Button>
                          </form>

                          <Button asChild size="sm" variant="ghost">
                            <Link href="/admin/users">Open user</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}





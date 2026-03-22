"use client"

import { type FormEvent, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateUserAccessWithResult } from "../actions"
import { ROLES, STATUSES, toTitleCase } from "../helpers"
import type { ProfileRow, SubscriptionPlanRow } from "../types"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getAccessStateFromStatus,
  getAccessStateLabel,
  normalizeSubscriptionStatus,
} from "@/lib/subscription-status"
import { toast } from "sonner"

type UsageStats = {
  tradesUsedThisMonth: number
  broadcastsSeen: number
}

type UsersTableViewProps = {
  profiles: ProfileRow[]
  plans: SubscriptionPlanRow[]
  usageByUser: Record<string, UsageStats>
}

const STATUS_FILTER_OPTIONS = [
  { value: "new_user", label: "Not Submitted" },
  { value: "waiting", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const

function getSubscription(profile: ProfileRow) {
  const raw = profile.user_subscriptions as unknown
  if (Array.isArray(raw)) {
    return (raw[0] as NonNullable<ProfileRow["user_subscriptions"]>[number] | undefined) ?? null
  }
  if (raw && typeof raw === "object") {
    return raw as NonNullable<ProfileRow["user_subscriptions"]>[number]
  }
  return null
}

function getSubscriptionPlanName(profile: ProfileRow) {
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

function getPlanName(profile: ProfileRow, planNameById?: Record<string, string>) {
  const planName = getSubscriptionPlanName(profile)
  if (planName) return planName

  const planId = getStoredPlanId(profile)
  if (!planId || !planNameById) return null

  const fromId = (planNameById[planId] ?? "").trim().toLowerCase()
  return fromId || null
}

function getStoredPlanId(profile: ProfileRow) {
  const subscription = getSubscription(profile)
  return subscription?.plan_id ?? subscription?.subscription_plan_id ?? null
}

function getPlanId(
  profile: ProfileRow,
  plans: SubscriptionPlanRow[],
  planNameById?: Record<string, string>
) {
  const storedPlanId = getStoredPlanId(profile)
  if (storedPlanId) return storedPlanId

  const normalizedPlanName = getPlanName(profile, planNameById)
  if (!normalizedPlanName) return "__current__"

  return (
    plans.find((plan) => (plan.name ?? "").trim().toLowerCase() === normalizedPlanName)?.id ??
    "__current__"
  )
}

function getStatus(profile: ProfileRow) {
  return normalizeSubscriptionStatus(getSubscription(profile)?.status ?? null)
}

function getStatusFormValue(profile: ProfileRow) {
  return getStatus(profile) ?? "none"
}

function getStatusLabel(profile: ProfileRow) {
  return getAccessStateLabel(getAccessStateFromStatus(getStatus(profile)))
}

function getSince(profile: ProfileRow) {
  const subscription = getSubscription(profile)
  const candidate =
    subscription?.started_at ??
    subscription?.current_period_start ??
    subscription?.submitted_at ??
    subscription?.created_at ??
    subscription?.updated_at

  return typeof candidate === "string" ? candidate : null
}

function getSubscriptionEnd(profile: ProfileRow) {
  const subscription = getSubscription(profile)
  const candidate = subscription?.ends_at ?? subscription?.current_period_end
  return typeof candidate === "string" ? candidate : null
}

function toDateInputValue(value: string | null) {
  if (!value) return ""
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""
  return parsed.toISOString().slice(0, 10)
}

function formatDate(value: string | null) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleDateString("en-US", {
    dateStyle: "medium",
  })
}

function getUsage(usageByUser: Record<string, UsageStats>, userId: string) {
  return usageByUser[userId] ?? { tradesUsedThisMonth: 0, broadcastsSeen: 0 }
}

function UserEditDrawer({
  profile,
  plans,
  planNameById,
  usage,
}: {
  profile: ProfileRow
  plans: SubscriptionPlanRow[]
  planNameById: Record<string, string>
  usage: UsageStats
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSaving, startTransition] = useTransition()
  const currentPlanName = getPlanName(profile, planNameById) ?? ""
  const selectedPlan = getPlanId(profile, plans, planNameById)
  const status = getStatusFormValue(profile)
  const normalizedRole = (profile.role ?? "").trim().toLowerCase()
  const isKnownRole = ROLES.includes(normalizedRole as (typeof ROLES)[number])
  const roleFormValue = isKnownRole ? normalizedRole : "__current__"

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      try {
        const result = await updateUserAccessWithResult(formData)
        if (result.ok) {
          toast.success("User updated successfully")
          setOpen(false)
          router.refresh()
          return
        }

        toast.error(result.error ?? "Update failed")
      } catch {
        toast.error("Unexpected error while updating user")
      }
    })
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button size="sm">
          Edit
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            Edit User
          </DrawerTitle>
          <DrawerDescription>
            Update role, plan, and access status.
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="userId" value={profile.id} />
          <input type="hidden" name="currentPlanName" value={currentPlanName} />

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              Role
            </label>
            <select
              name="role"
              defaultValue={roleFormValue}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {!isKnownRole ? (
                <option value="__current__">
                  {normalizedRole ? toTitleCase(normalizedRole) : "Keep current role"} (current)
                </option>
              ) : null}
              {ROLES.map((item) => (
                <option key={item} value={item}>
                  {toTitleCase(item)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              Plan
            </label>
            <select
              name="plan"
              defaultValue={selectedPlan}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {selectedPlan === "__current__" ? (
                <option value="__current__">
                  {currentPlanName
                    ? `${toTitleCase(currentPlanName)} (current)`
                    : "No plan selected"}
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
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              Status
            </label>
            <select
              name="status"
              defaultValue={status}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="none">Not Submitted</option>
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {toTitleCase(item)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              Subscription end date
            </label>
            <Input
              name="subscriptionEndDate"
              type="date"
              defaultValue={toDateInputValue(getSubscriptionEnd(profile))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              Trade usage
            </label>
            <Input
              name="tradeUsage"
              type="number"
              defaultValue={usage.tradesUsedThisMonth}
              min={0}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              Notes
            </label>
            <textarea
              name="notes"
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              placeholder="Internal notes"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Role, plan, and status are saved by this action.
          </p>

          <Button type="submit" size="sm" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  )
}

function UserViewDrawer({
  profile,
  planNameById,
  usage,
}: {
  profile: ProfileRow
  planNameById: Record<string, string>
  usage: UsageStats
}) {
  const planName = getPlanName(profile, planNameById)
  const since = getSince(profile)
  const endDate = getSubscriptionEnd(profile)
  const email = profile.email ?? "Unavailable"

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm">
          View
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            User Details
          </DrawerTitle>
          <DrawerDescription>
            Read-only membership and activity insights.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 text-sm">
          <section className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              User
            </p>
            <p>
              Name: {profile.full_name || "Unnamed member"}
            </p>
            <p>
              Email: {email}
            </p>
            <p>
              Role: {toTitleCase((profile.role ?? "user").toLowerCase())}
            </p>
            <p>
              Plan: {planName ? toTitleCase(planName) : "Not selected"}
            </p>
            <p>
              Status: {getStatusLabel(profile)}
            </p>
          </section>

          <section className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Subscription
            </p>
            <p>
              Start date: {formatDate(since)}
            </p>
            <p>
              End date: {formatDate(endDate)}
            </p>
          </section>

          <section className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Activity
            </p>
            <p>
              Trades used this month: {usage.tradesUsedThisMonth}
            </p>
            <p>
              Broadcasts seen: {usage.broadcastsSeen}
            </p>
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default function UsersTableView({
  profiles,
  plans,
  usageByUser,
}: UsersTableViewProps) {
  const [searchValue, setSearchValue] = useState("")
  const [planFilter, setPlanFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const planNameById = useMemo<Record<string, string>>(() => {
    return plans.reduce<Record<string, string>>((acc, plan) => {
      const id = (plan.id ?? "").trim()
      const name = (plan.name ?? "").trim().toLowerCase()
      if (id && name) acc[id] = name
      return acc
    }, {})
  }, [plans])

  const filteredProfiles = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase()

    return profiles.filter((profile) => {
      const planName = getPlanName(profile, planNameById)
      const accessState = getAccessStateFromStatus(getStatus(profile))
      const email = (profile.email ?? "").toLowerCase()
      const fullName = (profile.full_name ?? "").toLowerCase()
      const profileId = profile.id.toLowerCase()

      const matchesSearch =
        !normalizedSearch ||
        fullName.includes(normalizedSearch) ||
        email.includes(normalizedSearch) ||
        profileId.includes(normalizedSearch)
      const matchesPlan = planFilter === "all" || planName === planFilter
      const matchesStatus = statusFilter === "all" || accessState === statusFilter

      return matchesSearch && matchesPlan && matchesStatus
    })
  }, [planFilter, planNameById, profiles, searchValue, statusFilter])

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search users..."
        />

        <select
          value={planFilter}
          onChange={(event) => setPlanFilter(event.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="all">All plans</option>
          {plans.map((plan) => {
            const normalized = (plan.name ?? "").trim().toLowerCase()
            if (!normalized) return null
            return (
              <option key={plan.id} value={normalized}>
                {toTitleCase(normalized)}
              </option>
            )
          })}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="all">All statuses</option>
          {STATUS_FILTER_OPTIONS.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      {!filteredProfiles.length ? (
        <p className="text-sm text-muted-foreground">
          No users match the current filters.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                User
              </TableHead>
              <TableHead>
                Plan
              </TableHead>
              <TableHead>
                Status
              </TableHead>
              <TableHead>
                End Date
              </TableHead>
              <TableHead>
                Since
              </TableHead>
              <TableHead className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProfiles.map((profile) => {
              const usage = getUsage(usageByUser, profile.id)
              const planName = getPlanName(profile, planNameById)
              const since = getSince(profile)
              const endDate = getSubscriptionEnd(profile)

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
                  <TableCell>
                    {getStatusLabel(profile)}
                  </TableCell>
                  <TableCell>
                    {formatDate(endDate)}
                  </TableCell>
                  <TableCell>
                    {formatDate(since)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <UserViewDrawer
                        profile={profile}
                        planNameById={planNameById}
                        usage={usage}
                      />
                      <UserEditDrawer
                        profile={profile}
                        plans={plans}
                        planNameById={planNameById}
                        usage={usage}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}


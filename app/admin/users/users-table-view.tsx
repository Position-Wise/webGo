"use client"

import { useMemo, useState } from "react"
import { updateUserAccess } from "../actions"
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

type UsageStats = {
  tradesUsedThisWeek: number
  broadcastsSeen: number
}

type UsersTableViewProps = {
  profiles: ProfileRow[]
  plans: SubscriptionPlanRow[]
  usageByUser: Record<string, UsageStats>
}

function getSubscription(profile: ProfileRow) {
  return profile.user_subscriptions?.[0] ?? null
}

function getPlanName(profile: ProfileRow) {
  return (getSubscription(profile)?.subscription_plans?.[0]?.name ?? "basic")
    .trim()
    .toLowerCase()
}

function getPlanId(profile: ProfileRow, plans: SubscriptionPlanRow[]) {
  const normalizedPlanName = getPlanName(profile)
  return (
    plans.find((plan) => (plan.name ?? "").trim().toLowerCase() === normalizedPlanName)?.id ??
    "__current__"
  )
}

function getStatus(profile: ProfileRow) {
  return (getSubscription(profile)?.status ?? "pending").trim().toLowerCase()
}

function getSince(profile: ProfileRow) {
  const subscription = getSubscription(profile)
  const candidate =
    subscription?.started_at ??
    subscription?.current_period_start ??
    subscription?.created_at

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
  return usageByUser[userId] ?? { tradesUsedThisWeek: 0, broadcastsSeen: 0 }
}

function UserEditDrawer({
  profile,
  plans,
  usage,
}: {
  profile: ProfileRow
  plans: SubscriptionPlanRow[]
  usage: UsageStats
}) {
  const currentPlanName = getPlanName(profile)
  const selectedPlan = getPlanId(profile, plans)
  const status = getStatus(profile)
  const role = (profile.role ?? "user").trim().toLowerCase()

  return (
    <Drawer>
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

        <form action={updateUserAccess} className="space-y-4">
          <input type="hidden" name="userId" value={profile.id} />
          <input type="hidden" name="currentPlanName" value={currentPlanName} />

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              Role
            </label>
            <select
              name="role"
              defaultValue={role}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
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
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              Status
            </label>
            <select
              name="status"
              defaultValue={status}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
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
              defaultValue={usage.tradesUsedThisWeek}
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

          <Button type="submit" size="sm">
            Save changes
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  )
}

function UserViewDrawer({
  profile,
  usage,
}: {
  profile: ProfileRow
  usage: UsageStats
}) {
  const planName = getPlanName(profile)
  const status = getStatus(profile)
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
              Plan: {toTitleCase(planName)}
            </p>
            <p>
              Status: {toTitleCase(status)}
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
              Trades used this week: {usage.tradesUsedThisWeek}
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

  const filteredProfiles = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase()

    return profiles.filter((profile) => {
      const planName = getPlanName(profile)
      const status = getStatus(profile)
      const email = (profile.email ?? "").toLowerCase()
      const fullName = (profile.full_name ?? "").toLowerCase()
      const profileId = profile.id.toLowerCase()

      const matchesSearch =
        !normalizedSearch ||
        fullName.includes(normalizedSearch) ||
        email.includes(normalizedSearch) ||
        profileId.includes(normalizedSearch)
      const matchesPlan = planFilter === "all" || planName === planFilter
      const matchesStatus = statusFilter === "all" || status === statusFilter

      return matchesSearch && matchesPlan && matchesStatus
    })
  }, [planFilter, profiles, searchValue, statusFilter])

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
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {toTitleCase(status)}
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
              const planName = getPlanName(profile)
              const status = getStatus(profile)
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
                    {toTitleCase(planName)}
                  </TableCell>
                  <TableCell>
                    {toTitleCase(status)}
                  </TableCell>
                  <TableCell>
                    {formatDate(endDate)}
                  </TableCell>
                  <TableCell>
                    {formatDate(since)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <UserViewDrawer profile={profile} usage={usage} />
                      <UserEditDrawer profile={profile} plans={plans} usage={usage} />
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

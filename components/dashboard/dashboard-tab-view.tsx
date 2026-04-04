"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

export type DashboardBroadcast = {
  id: string
  title: string | null
  message: string
  audience: string | null
  broadcast_type?: "trade" | "investment" | "announcement" | null
  dashboard_tab: DashboardTab
  posted_by_name?: string | null
  created_at: string | null
  user_feedback?: "profit" | "loss" | null
}

export type DashboardSuggestion = {
  id: string
  title: string | null
  message: string
  posted_by_name?: string | null
  created_at: string | null
}

const DASHBOARD_TABS = [
  {
    key: "invest",
    label: "Invest",
    helper: "Long-term allocations, watchlists, and portfolio discipline.",
  },
  {
    key: "trade",
    label: "Trade",
    helper: "Short-term setups, execution notes, and risk controls.",
  },
  {
    key: "announcement",
    label: "Announcement",
    helper: "Platform-wide admin updates and important notices.",
  },
] as const

type DashboardTab = (typeof DASHBOARD_TABS)[number]["key"]

function formatPublishedAt(createdAt: string | null) {
  if (!createdAt) return "Date unavailable"
  const parsed = new Date(createdAt)
  if (Number.isNaN(parsed.getTime())) return "Date unavailable"

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed)
}

export default function DashboardTabView({
  broadcasts,
  suggestions,
  allowTrade,
  allowInvestment,
  tradeLimitPerWeek,
  tradeConsumedThisWeek,
  consumedTradeBroadcastIds,
  allowFeedback,
}: {
  broadcasts: DashboardBroadcast[]
  suggestions: DashboardSuggestion[]
  allowTrade: boolean
  allowInvestment: boolean
  tradeLimitPerWeek: number
  tradeConsumedThisWeek: number
  consumedTradeBroadcastIds: string[]
  allowFeedback: boolean
}) {
  const router = useRouter()
  const [feedbackOverrides, setFeedbackOverrides] = useState<
    Record<string, "profit" | "loss" | null>
  >({})
  const [feedbackErrors, setFeedbackErrors] = useState<Record<string, string>>({})
  const [pendingFeedbackKey, setPendingFeedbackKey] = useState<string | null>(null)
  const [newlyConsumedTradeIds, setNewlyConsumedTradeIds] = useState<Record<string, true>>({})
  const [isTradeUsagePending, setIsTradeUsagePending] = useState(false)

  const initialFeedbackByBroadcast = useMemo(() => {
    return broadcasts.reduce<Record<string, "profit" | "loss" | null>>((acc, broadcast) => {
      acc[broadcast.id] = broadcast.user_feedback ?? null
      return acc
    }, {})
  }, [broadcasts])

  useEffect(() => {
    setFeedbackOverrides((current) => {
      let hasChanges = false
      const next = { ...current }

      for (const [broadcastId, value] of Object.entries(current)) {
        if (!Object.prototype.hasOwnProperty.call(initialFeedbackByBroadcast, broadcastId)) {
          delete next[broadcastId]
          hasChanges = true
          continue
        }

        if ((initialFeedbackByBroadcast[broadcastId] ?? null) === value) {
          delete next[broadcastId]
          hasChanges = true
        }
      }

      return hasChanges ? next : current
    })
  }, [initialFeedbackByBroadcast])

  const initialConsumedTradeSet = useMemo(() => {
    const set = new Set<string>()
    for (const value of consumedTradeBroadcastIds) {
      const normalized = value.trim()
      if (!normalized) continue
      set.add(normalized)
    }
    return set
  }, [consumedTradeBroadcastIds])

  const consumedTradeSet = useMemo(() => {
    const set = new Set(initialConsumedTradeSet)
    for (const value of Object.keys(newlyConsumedTradeIds)) {
      set.add(value)
    }
    return set
  }, [initialConsumedTradeSet, newlyConsumedTradeIds])

  const consumedTradeCount = useMemo(
    () => tradeConsumedThisWeek + Object.keys(newlyConsumedTradeIds).length,
    [newlyConsumedTradeIds, tradeConsumedThisWeek]
  )

  const effectiveTradeLimit = useMemo(
    () => Math.max(0, Math.floor(tradeLimitPerWeek)),
    [tradeLimitPerWeek]
  )

  const availableTabs = useMemo(() => {
    return DASHBOARD_TABS.filter((tab) => {
      if (tab.key === "invest") return allowInvestment
      if (tab.key === "trade") return allowTrade
      return true
    })
  }, [allowInvestment, allowTrade])
  const [selectedTab, setSelectedTab] = useState<DashboardTab>(
    allowInvestment ? "invest" : allowTrade ? "trade" : "announcement"
  )
  const activeTab = useMemo<DashboardTab>(() => {
    if (availableTabs.some((tab) => tab.key === selectedTab)) {
      return selectedTab
    }
    if (allowInvestment) return "invest"
    if (allowTrade) return "trade"
    return "announcement"
  }, [allowInvestment, allowTrade, availableTabs, selectedTab])

  const tabFilteredBroadcasts = useMemo(() => {
    if (!availableTabs.length) return []

    return broadcasts.filter((broadcast) => broadcast.dashboard_tab === activeTab)
  }, [activeTab, availableTabs.length, broadcasts])

  const tradeTabResult = useMemo(() => {
    if (activeTab !== "trade") {
      return {
        visible: tabFilteredBroadcasts,
        hiddenCount: 0,
        remainingSlots: Math.max(0, effectiveTradeLimit - consumedTradeCount),
        loggableIds: [] as string[],
      }
    }

    let remainingSlots = Math.max(0, effectiveTradeLimit - consumedTradeCount)
    let hiddenCount = 0
    const visible: DashboardBroadcast[] = []
    const loggableIds: string[] = []

    for (const broadcast of tabFilteredBroadcasts) {
      const alreadyConsumed = consumedTradeSet.has(broadcast.id)
      if (alreadyConsumed) {
        visible.push(broadcast)
        continue
      }

      if (remainingSlots > 0) {
        visible.push(broadcast)
        loggableIds.push(broadcast.id)
        remainingSlots -= 1
        continue
      }

      hiddenCount += 1
    }

    return {
      visible,
      hiddenCount,
      remainingSlots,
      loggableIds,
    }
  }, [
    activeTab,
    consumedTradeCount,
    consumedTradeSet,
    effectiveTradeLimit,
    tabFilteredBroadcasts,
  ])

  const visibleBroadcasts = useMemo(() => {
    return activeTab === "trade" ? tradeTabResult.visible : tabFilteredBroadcasts
  }, [activeTab, tabFilteredBroadcasts, tradeTabResult.visible])

  useEffect(() => {
    if (activeTab !== "trade") return
    if (!tradeTabResult.loggableIds.length) return

    let isActive = true
    setIsTradeUsagePending(true)

    void fetch("/api/trade-usage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        broadcastIds: tradeTabResult.loggableIds,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to update trade usage.")
        }

        if (!isActive) return

        setNewlyConsumedTradeIds((current) => {
          const next = { ...current }
          for (const id of tradeTabResult.loggableIds) {
            if (initialConsumedTradeSet.has(id)) continue
            next[id] = true
          }
          return next
        })
      })
      .catch((error) => {
        console.error("Trade usage tracking error:", error)
      })
      .finally(() => {
        if (isActive) {
          setIsTradeUsagePending(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [activeTab, initialConsumedTradeSet, tradeTabResult.loggableIds])

  async function submitFeedback(broadcastId: string, outcome: "profit" | "loss") {
    const pendingKey = `${broadcastId}:${outcome}`
    const previousFeedback =
      Object.prototype.hasOwnProperty.call(feedbackOverrides, broadcastId)
        ? feedbackOverrides[broadcastId] ?? null
        : initialFeedbackByBroadcast[broadcastId] ?? null

    setPendingFeedbackKey(pendingKey)
    setFeedbackOverrides((current) => ({
      ...current,
      [broadcastId]: outcome,
    }))
    setFeedbackErrors((current) => {
      const next = { ...current }
      delete next[broadcastId]
      return next
    })

    try {
      const response = await fetch("/api/broadcast-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          broadcastId,
          outcome,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(payload?.error || "Failed to save feedback.")
      }

      router.refresh()
    } catch (error) {
      console.error("Broadcast feedback error:", error)
      setFeedbackOverrides((current) => {
        const next = { ...current }
        if (previousFeedback === null) {
          delete next[broadcastId]
          return next
        }

        next[broadcastId] = previousFeedback
        return next
      })
      setFeedbackErrors((current) => ({
        ...current,
        [broadcastId]:
          error instanceof Error ? error.message : "Failed to save feedback.",
      }))
    } finally {
      setPendingFeedbackKey(null)
    }
  }

  useEffect(() => {
    const channel = supabase
      .channel("broadcasts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_broadcasts",
        },
        () => {
          router.refresh()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "admin_broadcasts",
        },
        () => {
          router.refresh()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "admin_broadcasts",
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [router])

  return (
    <section className="space-y-5">
      <Card>
        <CardHeader className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Dashboard View
            </p>
            <CardTitle className="mt-2 text-base">
              Admin broadcasts: {availableTabs.find((tab) => tab.key === activeTab)?.label}
            </CardTitle>
          </div>

          <div className="inline-flex rounded-lg border border-border bg-muted/50 p-1">
            {availableTabs.map((tab) => {
              const isActive = tab.key === activeTab
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedTab(tab.key)}
                  className={cn(
                    "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <p className="text-sm text-muted-foreground">
            {availableTabs.find((tab) => tab.key === activeTab)?.helper ??
              "Broadcast access is controlled by your assigned membership plan."}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeTab === "trade" && allowTrade ? (
            <div className="rounded-md border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
              <p>
                Trade calls used this week: {consumedTradeCount}/{effectiveTradeLimit}
              </p>
              {tradeTabResult.remainingSlots === 0 && tradeTabResult.hiddenCount > 0 ? (
                <p className="mt-1 text-destructive">
                  You have used your trade-call limit for this week. Upgrade your plan or
                  check again next week.
                </p>
              ) : null}
              {isTradeUsagePending ? (
                <p className="mt-1">
                  Updating usage...
                </p>
              ) : null}
            </div>
          ) : null}

          {!visibleBroadcasts.length ? (
            activeTab === "trade" &&
            allowTrade &&
            tradeTabResult.hiddenCount > 0 &&
            tradeTabResult.remainingSlots === 0 ? (
              <p className="text-sm text-muted-foreground">
                Trade-call limit reached for this week.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No admin broadcast available for this tab yet.
              </p>
            )
          ) : (
            visibleBroadcasts.map((broadcast) => (
              <article
                key={broadcast.id}
                className="rounded-lg border border-border/70 bg-muted/30 p-4"
              >
                {(() => {
                  const feedback =
                    feedbackOverrides[broadcast.id] ?? broadcast.user_feedback ?? null
                  const isProfitActive = feedback === "profit"
                  const isLossActive = feedback === "loss"
                  const isPending =
                    pendingFeedbackKey?.startsWith(`${broadcast.id}:`) ?? false
                  const showOutcomeButtons =
                    allowFeedback &&
                    (broadcast.broadcast_type ?? "investment") !== "announcement"

                  if (!showOutcomeButtons) return null

                  return (
                    <div className="mb-3 space-y-2">
                      <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => void submitFeedback(broadcast.id, "profit")}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          isProfitActive
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-border text-muted-foreground hover:text-foreground",
                          isPending && "opacity-70"
                        )}
                      >
                        {isPending && pendingFeedbackKey === `${broadcast.id}:profit`
                          ? "Saving..."
                          : "Profit"}
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => void submitFeedback(broadcast.id, "loss")}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          isLossActive
                            ? "border-red-300 bg-red-50 text-red-700"
                            : "border-border text-muted-foreground hover:text-foreground",
                          isPending && "opacity-70"
                        )}
                      >
                        {isPending && pendingFeedbackKey === `${broadcast.id}:loss`
                          ? "Saving..."
                          : "Loss"}
                      </button>
                      </div>
                      {feedbackErrors[broadcast.id] ? (
                        <p className="text-xs text-destructive">
                          {feedbackErrors[broadcast.id]}
                        </p>
                      ) : null}
                    </div>
                  )
                })()}

                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {formatPublishedAt(broadcast.created_at)}
                </p>
                <h3 className="mt-1 text-sm font-semibold">
                  {broadcast.title || "Broadcast"}
                </h3>
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                  {broadcast.message}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Posted by {broadcast.posted_by_name || "Admin"}
                </p>
              </article>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Private Updates
            </p>
            <CardTitle className="mt-2 text-base">
              Admin Suggestions
            </CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Suggestions sent directly to your account by the admin team.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {!suggestions.length ? (
            <p className="text-sm text-muted-foreground">
              No admin suggestions for you right now.
            </p>
          ) : (
            suggestions.map((broadcast) => (
              <article
                key={broadcast.id}
                className="rounded-lg border border-border/70 bg-muted/30 p-4"
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {formatPublishedAt(broadcast.created_at)}
                </p>
                <h3 className="mt-1 text-sm font-semibold">
                  {broadcast.title || "Admin Suggestion"}
                </h3>
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                  {broadcast.message}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Posted by {broadcast.posted_by_name || "Admin"}
                </p>
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  )
}

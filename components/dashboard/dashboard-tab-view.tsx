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
  posted_by_name?: string | null
  created_at: string | null
  user_feedback?: "profit" | "loss" | null
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
  allowTrade,
  allowInvestment,
}: {
  broadcasts: DashboardBroadcast[]
  allowTrade: boolean
  allowInvestment: boolean
}) {
  const router = useRouter()
  const [feedbackOverrides, setFeedbackOverrides] = useState<
    Record<string, "profit" | "loss">
  >({})
  const [pendingFeedbackKey, setPendingFeedbackKey] = useState<string | null>(null)
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

  const visibleBroadcasts = useMemo(() => {
    if (!availableTabs.length) return []

    return broadcasts.filter((broadcast) => {
      const audience = (broadcast.audience ?? "all").toLowerCase()
      const broadcastType = (broadcast.broadcast_type ?? "investment").toLowerCase()
      const matchesPlanAudience =
        audience === "all" ||
        audience === "basic" ||
        audience === "pro" ||
        audience === "premium" ||
        audience === "admin" ||
        audience === "growth" ||
        audience === "elite"

      if (audience === "invest" && !allowInvestment) return false
      if (audience === "trade" && !allowTrade) return false

      if (activeTab === "announcement") {
        return broadcastType === "announcement"
      }

      if (broadcastType === "announcement") {
        return false
      }

      if (audience === "invest" || audience === "trade") {
        return audience === activeTab
      }

      if (!matchesPlanAudience) return false

      if (activeTab === "trade") return broadcastType === "trade"
      return broadcastType === "investment"
    })
  }, [activeTab, allowInvestment, allowTrade, availableTabs.length, broadcasts])

  async function submitFeedback(broadcastId: string, outcome: "profit" | "loss") {
    const pendingKey = `${broadcastId}:${outcome}`
    setPendingFeedbackKey(pendingKey)

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
        throw new Error("Failed to save feedback.")
      }

      setFeedbackOverrides((current) => ({
        ...current,
        [broadcastId]: outcome,
      }))
    } catch (error) {
      console.error("Broadcast feedback error:", error)
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
          {!visibleBroadcasts.length ? (
            <p className="text-sm text-muted-foreground">
              No admin broadcast available for this tab yet.
            </p>
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

                  return (
                    <div className="mb-3 flex flex-wrap gap-2">
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
    </section>
  )
}

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
}: {
  broadcasts: DashboardBroadcast[]
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<DashboardTab>("invest")

  const visibleBroadcasts = useMemo(() => {
    return broadcasts.filter((broadcast) => {
      const audience = (broadcast.audience ?? "all").toLowerCase()
      const matchesAudience =
        audience === "all" ||
        audience === activeTab ||
        audience === "basic" ||
        audience === "pro" ||
        audience === "premium" ||
        audience === "growth" ||
        audience === "elite"

      if (!matchesAudience) return false

      const broadcastType = (broadcast.broadcast_type ?? "investment").toLowerCase()
      if (broadcastType === "announcement") return true
      if (activeTab === "trade") return broadcastType === "trade"
      return broadcastType === "investment"
    })
  }, [activeTab, broadcasts])

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
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Dashboard View
        </p>

        <div className="mt-4 inline-flex rounded-lg border border-border bg-muted/50 p-1">
          {DASHBOARD_TABS.map((tab) => {
            const isActive = tab.key === activeTab
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
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

        <p className="mt-3 text-sm text-muted-foreground">
          {DASHBOARD_TABS.find((tab) => tab.key === activeTab)?.helper}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Admin broadcasts for {activeTab === "invest" ? "Invest" : "Trade"}
          </CardTitle>
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

"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

export default function BroadcastFeedbackLiveRefresh() {
  const router = useRouter()

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | null = null
    let pollInterval: ReturnType<typeof setInterval> | null = null

    const scheduleRefresh = () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer)
      }

      refreshTimer = setTimeout(() => {
        router.refresh()
      }, 150)
    }

    const channel = supabase
      .channel("admin-broadcast-feedback")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "broadcast_feedback",
        },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "broadcast_feedback",
        },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "broadcast_feedback",
        },
        scheduleRefresh
      )
      .subscribe()

    // Fallback refresh when realtime replication is disabled or delayed.
    pollInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return
      }
      router.refresh()
    }, 15000)

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer)
      }
      if (pollInterval) {
        clearInterval(pollInterval)
      }
      void supabase.removeChannel(channel)
    }
  }, [router])

  return null
}

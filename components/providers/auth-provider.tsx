"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { isAdminRole } from "@/lib/roles"
import { normalizeSubscriptionStatus, type SubscriptionStatus } from "@/lib/subscription-status"
import type { AuthChangeEvent, User } from "@supabase/supabase-js"

type ProfileInfo = {
  role: string | null
  plan: string | null
  status: SubscriptionStatus
} | null

type ProfileQueryRow = {
  role?: string | null
  user_subscriptions?: {
    status?: string | null
    payment_proof?: string | null
    submitted_at?: string | null
    subscription_plans?: {
      name?: string | null
    }[]
  }[]
}

type AuthContextType = {
  user: User | null
  profile: ProfileInfo
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
})

function toProfileInfo(profileRow: ProfileQueryRow | null): ProfileInfo {
  if (!profileRow) return null

  const role = profileRow.role ?? null
  const subscription = profileRow.user_subscriptions?.[0]
  const plan = isAdminRole(role) ? "admin" : subscription?.subscription_plans?.[0]?.name ?? null
  const normalizedStatus = normalizeSubscriptionStatus(subscription?.status ?? null)
  const hasSubmissionEvidence = Boolean(
    (subscription?.payment_proof ?? "").trim() || (subscription?.submitted_at ?? "").trim()
  )
  const status = isAdminRole(role)
    ? "active"
    : normalizedStatus === "pending" && !hasSubmissionEvidence
      ? null
      : normalizedStatus

  return {
    role,
    plan,
    status,
  }
}

async function fetchProfileRowForUser(userId: string) {
  const profileSelect = `
      role,
      user_subscriptions (
        status,
        payment_proof,
        submitted_at,
        subscription_plans (
          name
        )
      )
    `

  const { data: profileById } = await supabase
    .from("profiles")
    .select(profileSelect)
    .eq("id", userId)
    .maybeSingle()

  if (profileById) {
    return profileById as ProfileQueryRow
  }

  const { data: profileByUserId } = await supabase
    .from("profiles")
    .select(profileSelect)
    .eq("user_id", userId)
    .maybeSingle()

  return (profileByUserId as ProfileQueryRow | null) ?? null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<ProfileInfo>(null)
  const [loading, setLoading] = useState(true)
  const activeUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const setSafeUser = (u: User | null) => {
      if (isMounted) setUser(u)
    }
    const setSafeProfile = (p: ProfileInfo) => {
      if (isMounted) setProfile(p)
    }
    const setSafeLoading = (v: boolean) => {
      if (isMounted) setLoading(v)
    }

    const syncProfile = async (nextUser: User | null, shouldLoad = false) => {
      activeUserIdRef.current = nextUser?.id ?? null
      setSafeUser(nextUser)

      if (!nextUser) {
        setSafeProfile(null)
        setSafeLoading(false)
        return
      }

      if (shouldLoad) {
        setSafeLoading(true)
      }

      const profileRow = await fetchProfileRowForUser(nextUser.id)
      if (activeUserIdRef.current !== nextUser.id) return

      setSafeProfile(toProfileInfo(profileRow))
      setSafeLoading(false)
    }

    const shouldRefreshProfile = (
      event: AuthChangeEvent,
      currentUserId: string | null,
      nextUserId: string | null
    ) => {
      if (!nextUserId) return false
      if (currentUserId !== nextUserId) return true
      return event === "SIGNED_IN" || event === "USER_UPDATED"
    }

    const getSessionAndProfile = async () => {
      const { data } = await supabase.auth.getSession()
      await syncProfile(data.session?.user ?? null)
    }

    void getSessionAndProfile()

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const nextUser = session?.user ?? null
        const currentUserId = activeUserIdRef.current
        const nextUserId = nextUser?.id ?? null

        if (!shouldRefreshProfile(event, currentUserId, nextUserId)) {
          activeUserIdRef.current = nextUserId
          setSafeUser(nextUser)
          if (!nextUser) {
            setSafeProfile(null)
          }
          setSafeLoading(false)
          return
        }

        await syncProfile(nextUser, currentUserId !== nextUserId)
      }
    )

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
    }),
    [loading, profile, user]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

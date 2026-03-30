"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import {
  deriveCurrentUserAccessState,
  fetchCurrentUserSubscription,
  resolveCurrentUserAdminState,
  type AccessQueryClient,
} from "@/lib/current-user-access"
import {
  type AccessState,
  type SubscriptionStatus,
} from "@/lib/subscription-status"
import type { AuthChangeEvent, User } from "@supabase/supabase-js"

type ProfileInfo = {
  role: string | null
  plan: string | null
  status: SubscriptionStatus
  accessState: AccessState
  isAdmin: boolean
} | null

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

function toProfileInfo(access: ReturnType<typeof deriveCurrentUserAccessState>): ProfileInfo {
  return {
    role: access.role,
    plan: access.planName ?? (access.isAdmin ? "admin" : null),
    status: access.status,
    accessState: access.accessState,
    isAdmin: access.isAdmin,
  }
}

async function fetchProfileInfoForUser(user: User) {
  const [{ isAdmin, role, source }, subscription] = await Promise.all([
    resolveCurrentUserAdminState(supabase as unknown as AccessQueryClient, user.id),
    fetchCurrentUserSubscription(supabase as unknown as AccessQueryClient, user.id),
  ])

  return toProfileInfo(
    deriveCurrentUserAccessState({
      user,
      role,
      isAdmin,
      adminResolutionSource: source,
      subscription,
    })
  )
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

      try {
        const nextProfile = await fetchProfileInfoForUser(nextUser)
        if (activeUserIdRef.current !== nextUser.id) return

        setSafeProfile(nextProfile)
      } catch (error) {
        console.error("Auth profile sync error:", error)
        if (activeUserIdRef.current !== nextUser.id) return
        setSafeProfile(null)
      } finally {
        setSafeLoading(false)
      }
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
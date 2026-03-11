"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

type ProfileInfo = {
  role: string | null
  plan: string | null
  status: string | null
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<ProfileInfo>(null)
  const [loading, setLoading] = useState(true)

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

    const getSessionAndProfile = async () => {
      const { data } = await supabase.auth.getSession()
      const nextUser = data.session?.user ?? null
      setSafeUser(nextUser)

      if (nextUser) {
        const { data: profileRow } = await supabase
          .from("profiles")
          .select(
            `
            role,
            user_subscriptions (
              status,
              subscription_plans (
                name
              )
            )
          `
          )
          .eq("id", nextUser.id)
          .maybeSingle()

        const subscription = (profileRow as any)?.user_subscriptions?.[0]
        const plan = subscription?.subscription_plans?.[0]?.name ?? null
        const status = subscription?.status ?? null

        setSafeProfile(
          profileRow
            ? {
                role: (profileRow as any).role ?? null,
                plan,
                status,
              }
            : null
        )
      } else {
        setSafeProfile(null)
      }

      setSafeLoading(false)
    }

    getSessionAndProfile()

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const nextUser = session?.user ?? null
        setSafeUser(nextUser)

        if (nextUser) {
          const { data: profileRow } = await supabase
            .from("profiles")
            .select(
              `
              role,
              user_subscriptions (
                status,
                subscription_plans (
                  name
                )
              )
            `
            )
            .eq("id", nextUser.id)
            .maybeSingle()

          const subscription = (profileRow as any)?.user_subscriptions?.[0]
          const plan = subscription?.subscription_plans?.[0]?.name ?? null
          const status = subscription?.status ?? null

          setSafeProfile(
            profileRow
              ? {
                  role: (profileRow as any).role ?? null,
                  plan,
                  status,
                }
              : null
          )
        } else {
          setSafeProfile(null)
        }
      }
    )

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

type ProfileInfo = {
  tier: string | null
  verified: boolean | null
  role: string | null
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
    const getSessionAndProfile = async () => {
      const { data } = await supabase.auth.getSession()
      const nextUser = data.session?.user ?? null
      setUser(nextUser)

      if (nextUser) {
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("tier, verified, role")
          .eq("id", nextUser.id)
          .maybeSingle()

        setProfile(
          profileRow
            ? {
                tier: (profileRow as any).tier ?? null,
                verified: (profileRow as any).verified ?? null,
                role: (profileRow as any).role ?? null,
              }
            : null
        )
      } else {
        setProfile(null)
      }

      setLoading(false)
    }

    getSessionAndProfile()

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const nextUser = session?.user ?? null
        setUser(nextUser)

        if (nextUser) {
          const { data: profileRow } = await supabase
            .from("profiles")
            .select("tier, verified, role")
            .eq("id", nextUser.id)
            .maybeSingle()

          setProfile(
            profileRow
              ? {
                  tier: (profileRow as any).tier ?? null,
                  verified: (profileRow as any).verified ?? null,
                  role: (profileRow as any).role ?? null,
                }
              : null
          )
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
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
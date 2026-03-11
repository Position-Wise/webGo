import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"

interface ProfileLayoutProps {
  children: ReactNode
}

export default async function ProfileLayout({
  children,
}: ProfileLayoutProps) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()

  if (!data.user) {
    redirect("/sign-in")
  }

  return <>{children}</>
}
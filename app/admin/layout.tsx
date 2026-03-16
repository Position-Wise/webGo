import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { isAdminRole } from "@/lib/roles"
import { resolveRoleForUser, type MinimalDbClient } from "./access"
import AdminNav from "./_components/admin-nav"

export const dynamic = "force-dynamic"

interface AdminLayoutProps {
  children: ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/sign-in")
  }

  const role = await resolveRoleForUser(
    user.id,
    supabase as unknown as MinimalDbClient
  )

  if (!isAdminRole(role)) {
    redirect("/")
  }

  return (
    <main className="min-h-screen bg-background text-foreground pt-24 pb-20 px-6">
      <section className="max-w-6xl mx-auto space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Admin
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold">
          Control Center
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Manage broadcasts, review members, and push quick updates that show up
          in user dashboards.
        </p>
        <AdminNav />
      </section>

      <section className="max-w-6xl mx-auto mt-8">
        {children}
      </section>
    </main>
  )
}


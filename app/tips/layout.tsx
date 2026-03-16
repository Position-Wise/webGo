import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { getCurrentUserAccessState } from "@/lib/subscription-access"
import { getProtectedRouteRedirectPath } from "@/lib/subscription-status"

export const dynamic = "force-dynamic"

interface TipsLayoutProps {
  children: ReactNode
}

export default async function TipsLayout({ children }: TipsLayoutProps) {
  const access = await getCurrentUserAccessState()

  if (!access.user) {
    redirect("/sign-in")
  }

  const redirectPath = getProtectedRouteRedirectPath(access.status)

  if (redirectPath) {
    redirect(redirectPath)
  }

  return <>{children}</>
}


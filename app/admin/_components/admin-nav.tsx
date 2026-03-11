"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/broadcast", label: "Broadcast" },
  { href: "/admin/users", label: "Users" },
] as const

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="inline-flex rounded-xl border border-border bg-card p-1.5">
      {ADMIN_NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/admin" && pathname.startsWith(`${item.href}/`))

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

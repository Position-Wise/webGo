"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Home, BarChart3, Layers, LogIn } from "lucide-react"

export default function Navbar() {
  const pathname = usePathname()

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Insights", href: "/insights", icon: BarChart3 },
    { name: "Membership", href: "/membership", icon: Layers },
    { name: "Login", href: "/sign-in", icon: LogIn },
  ]

  return (
    <>
      {/* ================= DESKTOP NAV ================= */}
      <header className="hidden md:flex fixed top-0 left-0 w-full z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto w-full px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold text-lg">
            Position Wise Advisory
          </Link>

          <nav className="flex items-center gap-8 text-sm">
            {navItems.slice(0, 3).map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-accent",
                  pathname === item.href && "text-accent"
                )}
              >
                {item.name}
              </Link>
            ))}

            <Link href="/login">
              <Button variant="outline" size="sm">
                Login
              </Button>
            </Link>

            <Link href="/apply">
              <Button size="sm">
                Request Access
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* ================= MOBILE TOP ================= */}
      <header className="md:hidden fixed top-0 left-0 w-full z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="px-6 py-4 flex justify-center">
          <Link href="/" className="font-semibold">
            Position Wise Advisory
          </Link>
        </div>
      </header>

      {/* ================= MOBILE BOTTOM PILL ================= */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-6 px-6 py-3 rounded-full border border-border bg-card/90 backdrop-blur-md shadow-lg">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-col items-center text-xs"
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive
                      ? "text-accent"
                      : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "mt-1",
                    isActive
                      ? "text-accent"
                      : "text-muted-foreground"
                  )}
                >
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
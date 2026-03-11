"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Home, BarChart3, Layers, LogIn, User, Lightbulb } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase/client";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Navbar() {
  const pathname = usePathname();
  const { user, profile } = useAuth();

  const isAdmin =
    !!user && !!profile && (profile.role ?? "").toLowerCase() === "admin";

  const baseNavItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Insights", href: "/insights", icon: BarChart3 },
    { name: "Membership", href: "/membership", icon: Layers },
  ];

  const authedNavItems = [
    ...baseNavItems,
    { name: "Tips", href: "/tips", icon: Lightbulb },
    ...(isAdmin ? [{ name: "Admin", href: "/admin", icon: User }] : []),
  ];

  const navItems = user ? authedNavItems : baseNavItems;

  return (
    <>
      {/* ================= DESKTOP NAV ================= */}
      <header className="hidden md:flex fixed top-0 left-0 w-full z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto w-full px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold text-lg">
            Position Wise Advisory
          </Link>

          <nav className="flex items-center gap-8 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-accent",
                  pathname === item.href && "text-accent",
                )}
              >
                {item.name}
              </Link>
            ))}

            {/* === AUTH SECTION === */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Avatar className="cursor-pointer h-8 w-8">
                    <AvatarImage
                      src={
                        user.user_metadata?.avatar_url ||
                        user.user_metadata?.picture
                      }
                      alt="User avatar"
                    />
                    <AvatarFallback>
                      {user.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">Admin</Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem asChild>
                    <Link href="/tips">Tips</Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link href="/profile">Profile</Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={async () => {
                      await supabase.auth.signOut();
                    }}
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="outline" size="sm">
                    Login
                  </Button>
                </Link>

                <Link href="/sign-up">
                  <Button size="sm">Request Access</Button>
                </Link>
              </>
            )}
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
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-col items-center text-xs"
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-accent" : "text-muted-foreground",
                  )}
                />
                <span
                  className={cn(
                    "mt-1",
                    isActive ? "text-accent" : "text-muted-foreground",
                  )}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}

          {/* === AUTH ITEM === */}
          {user ? (
            <Link
              href="/profile"
              className="flex flex-col items-center text-xs"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage
                  src={
                    user.user_metadata?.avatar_url ||
                    user.user_metadata?.picture
                  }
                />
                <AvatarFallback>
                  {user.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  "mt-1",
                  pathname === "/profile"
                    ? "text-accent"
                    : "text-muted-foreground",
                )}
              >
                Account
              </span>
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="flex flex-col items-center text-xs"
            >
              <LogIn
                className={cn(
                  "w-5 h-5 transition-colors",
                  pathname === "/sign-in"
                    ? "text-accent"
                    : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "mt-1",
                  pathname === "/sign-in"
                    ? "text-accent"
                    : "text-muted-foreground",
                )}
              >
                Login
              </span>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { signOut } from "@/lib/auth/actions"
import { createClient } from "@/lib/supabase/client"

const APPS = [
  { id: "taskmanager", label: "Task Manager", href: "/tasks" },
  { id: "focusloop", label: "FocusLoop", href: "/" },
]

export function AppSwitcher() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const current =
    APPS.find((a) => a.href !== "/" && pathname.startsWith(a.href)) ??
    APPS.find((a) => a.id === "focusloop")!

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase
        .from("profiles")
        .select("username")
        .eq("id", data.user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
          if (profile) setUsername(profile.username)
        })
    })
  }, [])

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0">
        {/* Persistent glow — independent of hover/animation state, always lit */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[-6px]"
          style={{
            background: "radial-gradient(circle, var(--primary), transparent 70%)",
            opacity: 0.35,
          }}
        />
        <Image
          src="/icon.svg"
          alt="TaskZen"
          width={32}
          height={32}
          className="relative h-9 w-9 sm:h-8 sm:w-8"
          priority
        />
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2.5 rounded-xl py-2 pl-3.5 pr-3.5 transition-colors hover:bg-secondary sm:py-1 sm:pl-3 sm:pr-3"
        >
          <div className="text-left leading-tight">
            <p className="font-nav text-sm font-medium uppercase tracking-wider text-foreground">
              {current.label}
            </p>
            <p className="hidden text-xs text-muted-foreground sm:block">{username ?? "…"}</p>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>

        {open && (
          <div className="absolute z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-popover p-1 shadow-xl">
            {APPS.map((app) => (
              <Link
                key={app.id}
                href={app.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-xl px-3 py-2 font-nav text-xs uppercase tracking-wider transition-colors hover:bg-secondary",
                  app.id === current.id
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {app.label}
              </Link>
            ))}
            <div className="my-1 border-t border-border" />
            <form action={signOut}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

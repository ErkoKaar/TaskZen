"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CheckSquare, ChevronDown, LogOut, Timer } from "lucide-react"
import { cn } from "@/lib/utils"
import { signOut } from "@/lib/auth/actions"
import { createClient } from "@/lib/supabase/client"

const APPS = [
  { id: "focusloop", label: "FocusLoop", href: "/", icon: Timer },
  { id: "taskmanager", label: "Task Manager", href: "/tasks", icon: CheckSquare },
]

export function AppSwitcher() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const current =
    APPS.find((a) => a.href !== "/" && pathname.startsWith(a.href)) ?? APPS[0]

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
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-xl py-1 pr-2 transition-colors hover:bg-secondary"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <current.icon className="h-5 w-5" />
        </div>
        <div className="text-left leading-tight">
          <p className="text-sm font-semibold text-foreground">{current.label}</p>
          <p className="text-xs text-muted-foreground">{username ?? "…"}</p>
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
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-secondary",
                app.id === current.id
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <app.icon className="h-4 w-4" />
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
  )
}

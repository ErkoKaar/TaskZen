"use client"

import { useEffect, useId, useRef, useState } from "react"
import { LogOut, RotateCcw, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { signOut } from "@/lib/auth/actions"
import { IS_DEMO } from "@/lib/demo/mode"
import { resetDemoData } from "@/lib/demo/client"
import { createClient } from "@/lib/supabase/client"

export function AccountMenu() {
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

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

  // Close on any press outside the menu, and on Escape (returning focus to
  // the button so keyboard users don't lose their place).
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Account"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface font-nav text-xs font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:w-8",
          open && "bg-secondary",
        )}
      >
        {username ? (
          username.charAt(0).toUpperCase()
        ) : (
          <User className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-popover p-1 shadow-xl"
        >
          {username && (
            <>
              <p className="truncate px-3 py-2 text-sm font-medium text-foreground">{username}</p>
              <div className="my-1 border-t border-border" />
            </>
          )}
          {IS_DEMO ? (
            <button
              type="button"
              onClick={() => {
                resetDemoData()
                window.location.reload()
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
              Reset demo data
            </button>
          ) : (
            <form action={signOut}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

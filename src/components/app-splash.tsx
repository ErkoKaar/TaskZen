"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

// Covers the gap between the JS bundle finishing load and the initial
// auth/session handshake resolving — otherwise a cold PWA start shows a
// blank or half-loaded page for a few seconds.
export function AppSplash() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    // Hide the splash even if the handshake fails, so it can never get stuck.
    createClient()
      .auth.getUser()
      .catch((err) => console.error("Failed to resolve auth session", err))
      .finally(() => {
        if (active) setReady(true)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div
      aria-hidden={ready}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-300",
        ready ? "pointer-events-none opacity-0" : "opacity-100",
      )}
    >
      <Image
        src="/icon.svg"
        alt=""
        width={64}
        height={64}
        className="h-16 w-16 motion-safe:animate-[splash-pulse_1.4s_ease-in-out_infinite]"
        priority
      />
    </div>
  )
}

"use client"

import Image from "next/image"
import { useFocusTimer } from "@/lib/focusloop/timer-store"
import { cn } from "@/lib/utils"

// Covers the gap between the JS bundle finishing load and the initial
// auth/session handshake resolving — otherwise a cold PWA start shows a
// blank or half-loaded page for a few seconds.
export function AppSplash() {
  const { ready } = useFocusTimer()

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

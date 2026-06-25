"use client"

import { useEffect } from "react"

// Registered unconditionally (not just when notifications are enabled) so
// every visitor gets the static-asset caching in public/sw.js, which is
// what makes repeat loads / reopening the installed PWA feel instant.
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service worker registration failed", err)
    })
  }, [])

  return null
}

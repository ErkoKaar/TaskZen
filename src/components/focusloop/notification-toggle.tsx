"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff } from "lucide-react"
import { subscribeUser, unsubscribeUser } from "@/lib/notifications/actions"
import { cn } from "@/lib/utils"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function NotificationToggle() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
    setSupported(true)
    // RegisterServiceWorker (in the root layout) handles registration.
    navigator.serviceWorker.ready.then(async (registration) => {
      const sub = await registration.pushManager.getSubscription()
      setSubscribed(!!sub)
    })
  }, [])

  async function enable() {
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") return

      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ),
      })
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      await subscribeUser({ endpoint: json.endpoint, keys: json.keys })
      setSubscribed(true)
    } catch (err) {
      console.error("Failed to enable notifications", err)
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        await unsubscribeUser(sub.endpoint)
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch (err) {
      console.error("Failed to disable notifications", err)
    } finally {
      setBusy(false)
    }
  }

  if (!supported) return null

  return (
    <button
      type="button"
      onClick={subscribed ? disable : enable}
      disabled={busy}
      aria-pressed={subscribed}
      className={cn(
        "flex min-h-11 w-full items-center justify-between text-base transition-opacity hover:opacity-80 disabled:opacity-60",
      )}
    >
      <span className="flex items-center gap-2 text-foreground">
        {subscribed ? (
          <Bell className="h-5 w-5 text-primary" />
        ) : (
          <BellOff className="h-5 w-5 text-muted-foreground" />
        )}
        Notify when timer ends
      </span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          subscribed ? "bg-primary" : "bg-border-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform",
            subscribed ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  )
}

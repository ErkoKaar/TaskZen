"use client"

import { useLayoutEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export type NavTabItem =
  | { key: string; label: string; href: string; onClick?: undefined }
  | { key: string; label: string; onClick: () => void; href?: undefined }

export function SiteNavTabs({
  items,
  activeKey,
}: {
  items: NavTabItem[]
  activeKey: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef(new Map<string, HTMLElement>())
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useLayoutEffect(() => {
    function recompute() {
      const container = containerRef.current
      const active = itemRefs.current.get(activeKey)
      if (!container || !active) return
      const containerRect = container.getBoundingClientRect()
      const activeRect = active.getBoundingClientRect()
      setIndicator({ left: activeRect.left - containerRect.left, width: activeRect.width })
    }
    recompute()
    window.addEventListener("resize", recompute)
    // Martian Mono swaps in after the fallback font paints; label widths can
    // shift once it loads, so recompute after fonts are actually ready.
    document.fonts?.ready.then(recompute)
    return () => window.removeEventListener("resize", recompute)
  }, [activeKey, items])

  const activeItem = items.find((item) => item.key === activeKey)

  return (
    <>
      {/* sm and up: sliding-indicator pill row */}
      <div
        ref={containerRef}
        className="relative hidden items-center gap-1 rounded-full border border-border bg-surface p-1 sm:flex"
      >
        {indicator && (
          <div
            aria-hidden
            className="absolute inset-y-1 rounded-full bg-primary shadow-[0_0_18px_-4px_var(--primary)] transition-[left,width] duration-300 ease-out"
            style={{ left: indicator.left, width: indicator.width }}
          />
        )}
        {items.map((item) => {
          const active = item.key === activeKey
          const className = cn(
            "relative z-10 whitespace-nowrap rounded-full px-3.5 py-1.5 font-nav text-[11px] font-medium uppercase tracking-wider transition-colors sm:px-4 sm:text-xs",
            active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )
          const setRef = (el: HTMLElement | null) => {
            if (el) itemRefs.current.set(item.key, el)
            else itemRefs.current.delete(item.key)
          }

          if (item.href) {
            return (
              <Link key={item.key} href={item.href} ref={setRef} className={className}>
                {item.label}
              </Link>
            )
          }
          return (
            <button key={item.key} ref={setRef} type="button" onClick={item.onClick} className={className}>
              {item.label}
            </button>
          )
        })}
      </div>

      {/* Below sm: current page + dropdown, too many items to fit as pills */}
      <div className="relative sm:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 font-nav text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-secondary"
        >
          {activeItem?.label}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform",
              mobileOpen && "rotate-180",
            )}
          />
        </button>

        {mobileOpen && (
          <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-2xl border border-border bg-popover p-1 shadow-xl">
            {items.map((item) => {
              const active = item.key === activeKey
              const className = cn(
                "block w-full rounded-xl px-3 py-2 text-left font-nav text-xs uppercase tracking-wider transition-colors hover:bg-secondary",
                active ? "font-medium text-foreground" : "text-muted-foreground",
              )

              if (item.href) {
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={className}
                  >
                    {item.label}
                  </Link>
                )
              }
              const onClick = item.onClick
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    onClick?.()
                    setMobileOpen(false)
                  }}
                  className={className}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

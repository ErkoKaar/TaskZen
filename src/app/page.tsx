"use client"

import { useState } from "react"
import Image from "next/image"
import { FocusTimer } from "@/components/focusloop/focus-timer"
import { StatisticsView } from "@/components/focusloop/statistics-view"
import { SiteHeader } from "@/components/site-header"
import { SiteNavTabs } from "@/components/site-nav-tabs"
import { cn } from "@/lib/utils"

type View = "timer" | "stats"

const NAV_ITEMS = [
  { key: "timer", label: "Timer" },
  { key: "stats", label: "Statistics" },
]

export default function Page() {
  const [view, setView] = useState<View>("timer")

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader>
        <SiteNavTabs
          items={NAV_ITEMS.map((item) => ({ ...item, onClick: () => setView(item.key as View) }))}
          activeKey={view}
        />
      </SiteHeader>

      <main
        className={cn(
          "mx-auto w-full flex-1",
          view === "timer"
            ? "max-w-[1680px] px-4 py-8 sm:px-6 sm:py-12 lg:px-10 xl:px-14"
            : "max-w-6xl px-4 py-8 sm:px-6 sm:py-12",
        )}
      >
        {view === "timer" ? (
          <FocusTimer />
        ) : (
          <div className="space-y-2">
            <div className="mb-8">
              <div className="flex items-center gap-3">
                <Image src="/icons/statistics.svg" alt="" width={32} height={32} className="h-8 w-8" />
                <h1 className="text-4xl font-semibold tracking-tight text-foreground">
                  Statistics
                </h1>
              </div>
              <p className="mt-1.5 text-lg text-muted-foreground text-pretty">
                Your focused time across activities, sorted by total time spent.
              </p>
            </div>
            <StatisticsView />
          </div>
        )}
      </main>
    </div>
  )
}

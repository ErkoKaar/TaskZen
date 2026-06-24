"use client"

import { useState } from "react"
import { BarChart3, Timer } from "lucide-react"
import { FocusTimer } from "@/components/focusloop/focus-timer"
import { StatisticsView } from "@/components/focusloop/statistics-view"
import { SiteHeader } from "@/components/site-header"
import { cn } from "@/lib/utils"

type View = "timer" | "stats"

export default function Page() {
  const [view, setView] = useState<View>("timer")

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader>
        <nav className="flex items-center gap-1 rounded-2xl border border-border bg-card p-1">
          <NavButton
            active={view === "timer"}
            onClick={() => setView("timer")}
            icon={Timer}
            label="Timer"
          />
          <NavButton
            active={view === "stats"}
            onClick={() => setView("stats")}
            icon={BarChart3}
            label="Statistics"
          />
        </nav>
      </SiteHeader>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {view === "timer" ? (
          <div className="space-y-2">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-semibold text-foreground text-balance sm:text-3xl">
                Where does your focus go?
              </h1>
              <p className="mt-1 text-muted-foreground text-pretty">
                Pick an activity, set your rounds, and start the timer.
              </p>
            </div>
            <FocusTimer />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Statistics
              </h1>
              <p className="mt-1 text-muted-foreground text-pretty">
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

function NavButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors sm:px-4",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

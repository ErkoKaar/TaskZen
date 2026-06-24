"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, CheckSquare, Flame } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/tasks/habits", label: "Habits", icon: Flame },
  { href: "/tasks/statistics", label: "Statistics", icon: BarChart3 },
]

export function TasksNavTabs() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1 rounded-2xl border border-border bg-card p-1">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors sm:px-4",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

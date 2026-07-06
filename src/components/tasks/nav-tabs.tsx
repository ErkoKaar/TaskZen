"use client"

import { usePathname } from "next/navigation"
import { SiteNavTabs } from "@/components/site-nav-tabs"

const NAV_ITEMS = [
  { key: "/tasks", label: "Tasks", href: "/tasks" },
  { key: "/tasks/projects", label: "Projects", href: "/tasks/projects" },
  { key: "/tasks/habits", label: "Habits", href: "/tasks/habits" },
  { key: "/tasks/statistics", label: "Statistics", href: "/tasks/statistics" },
]

export function TasksNavTabs() {
  const pathname = usePathname()
  const active = NAV_ITEMS.find((item) => item.href === pathname) ?? NAV_ITEMS[0]

  return <SiteNavTabs items={NAV_ITEMS} activeKey={active.key} />
}

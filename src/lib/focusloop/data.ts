export type TimeRange = "day" | "week" | "month" | "year" | "all"

export const TIME_RANGES: { id: TimeRange; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "all", label: "All time" },
]

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function formatDayLabel(dateStr: string, range: TimeRange): string {
  const d = new Date(`${dateStr}T00:00:00`)
  if (range === "year" || range === "all") {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }
  return d.toLocaleDateString("en-US", { weekday: "short" })
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

// Remembers the not-yet-started session config (activity + durations +
// rounds) across navigating away and back — local-only, since it's just a
// draft, not anything that needs to survive a session actually starting.
const DRAFT_KEY = "focusloop-draft-config"

export type DraftConfig = {
  activityId: string | null
  focusMin: number
  restMin: number
  rounds: number
}

export function loadDraftConfig(): Partial<DraftConfig> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveDraftConfig(draft: DraftConfig) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // ignore (e.g. private browsing storage restrictions)
  }
}

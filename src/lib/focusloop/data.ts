export type TimeRange = "day" | "week" | "month" | "year" | "all"

export const TIME_RANGES: { id: TimeRange; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "all", label: "All time" },
]

export type Activity = {
  id: string
  name: string
  color: string
}

// Shared, global activity list (as described in the spec)
export const ACTIVITIES: Activity[] = [
  { id: "deep-work", name: "Deep Work", color: "var(--chart-1)" },
  { id: "reading", name: "Reading", color: "var(--chart-2)" },
  { id: "studying", name: "Studying", color: "var(--chart-3)" },
  { id: "writing", name: "Writing", color: "var(--chart-4)" },
  { id: "coding", name: "Coding", color: "var(--chart-1)" },
  { id: "design", name: "Design", color: "var(--chart-2)" },
  { id: "music", name: "Music Practice", color: "var(--chart-3)" },
  { id: "language", name: "Language Learning", color: "var(--chart-4)" },
]

// Accumulated focus minutes per activity for each time range (prototype data)
type RangeStats = Record<string, number>

const STATS: Record<TimeRange, RangeStats> = {
  day: {
    "deep-work": 145,
    coding: 95,
    reading: 40,
    writing: 25,
    studying: 60,
    design: 15,
  },
  week: {
    "deep-work": 720,
    coding: 540,
    studying: 410,
    reading: 285,
    writing: 190,
    design: 150,
    music: 90,
    language: 120,
  },
  month: {
    "deep-work": 2980,
    coding: 2310,
    studying: 1640,
    reading: 1180,
    design: 870,
    writing: 760,
    language: 540,
    music: 410,
  },
  year: {
    "deep-work": 31200,
    coding: 26400,
    studying: 18900,
    reading: 14100,
    design: 9800,
    writing: 8200,
    language: 6400,
    music: 5100,
  },
  all: {
    "deep-work": 58400,
    coding: 49200,
    studying: 33100,
    reading: 26800,
    design: 18900,
    writing: 15400,
    language: 11200,
    music: 9300,
  },
}

export type ActivityStat = {
  activity: Activity
  minutes: number
}

export function getStats(range: TimeRange): ActivityStat[] {
  const data = STATS[range]
  return Object.entries(data)
    .map(([id, minutes]) => {
      const activity =
        ACTIVITIES.find((a) => a.id === id) ??
        ({ id, name: id, color: "var(--chart-5)" } as Activity)
      return { activity, minutes }
    })
    .sort((a, b) => b.minutes - a.minutes)
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

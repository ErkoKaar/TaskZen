"use client"

export type ViewKey = "week" | "month" | "year" | "all"

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "all", label: "All time" },
]

export function ViewTabs({
  value,
  onChange,
  views,
}: {
  value: ViewKey
  onChange: (v: ViewKey) => void
  views?: ViewKey[]
}) {
  const visible = views ? VIEWS.filter((v) => views.includes(v.key)) : VIEWS
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface p-1">
      {visible.map((v) => (
        <button
          key={v.key}
          onClick={() => onChange(v.key)}
          className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
            value === v.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  )
}

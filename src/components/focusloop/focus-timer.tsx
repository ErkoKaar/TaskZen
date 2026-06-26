"use client"

import { useEffect, useState } from "react"
import {
  Pause,
  Play,
  Plus,
  RotateCcw,
  Square,
  Check,
  ChevronDown,
  Pencil,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { TimerRing } from "@/components/focusloop/timer-ring"
import { NotificationToggle } from "@/components/focusloop/notification-toggle"
import { formatDuration, loadDraftConfig, saveDraftConfig } from "@/lib/focusloop/data"
import {
  listActivities,
  createActivity,
  deleteActivity,
  renameActivity,
  type Activity,
} from "@/lib/focusloop/activities"
import { useFocusTimer } from "@/lib/focusloop/timer-store"
import { cn } from "@/lib/utils"

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

export function FocusTimer() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [activity, setActivity] = useState<Activity | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [newActivity, setNewActivity] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")

  const [focusMin, setFocusMin] = useState(() => loadDraftConfig().focusMin ?? 25)
  const [restMin, setRestMin] = useState(() => loadDraftConfig().restMin ?? 5)
  const [rounds, setRounds] = useState(() => loadDraftConfig().rounds ?? 4)

  const {
    session,
    secondsLeft,
    start: startSession,
    pause,
    resume,
    cancel,
    dismissCompletion,
  } = useFocusTimer()

  useEffect(() => {
    listActivities()
      .then((loaded) => {
        setActivities(loaded)
        setActivity((current) => {
          if (current) return current
          const draftId = loadDraftConfig().activityId
          return loaded.find((a) => a.id === draftId) ?? loaded[0] ?? null
        })
      })
      .catch((err) => console.error("Failed to load activities", err))
  }, [])

  // Persist the draft (not-yet-started) config so it survives navigating
  // away and back — only matters while configuring; once a session starts,
  // its own persisted state takes over.
  useEffect(() => {
    if (!activity) return
    saveDraftConfig({ activityId: activity.id, focusMin, restMin, rounds })
  }, [activity, focusMin, restMin, rounds])

  const phase = session?.phase ?? "idle"
  const totalForPhase = session
    ? session.phase === "rest"
      ? session.restMin * 60
      : session.focusMin * 60
    : focusMin * 60
  const progress = !session ? 1 : secondsLeft / totalForPhase
  const displaySecondsLeft = session ? secondsLeft : focusMin * 60

  function start() {
    if (!activity) return
    startSession({ activityId: activity.id, focusMin, restMin, rounds }).catch((err) =>
      console.error("Failed to start focus session", err),
    )
  }

  function addActivity() {
    const name = newActivity.trim()
    if (!name) return
    const color = CHART_COLORS[activities.length % CHART_COLORS.length]
    createActivity({ name, color })
      .then((created) => {
        setActivities((prev) => [created, ...prev])
        setActivity(created)
        setNewActivity("")
        setPickerOpen(false)
      })
      .catch((err) => console.error("Failed to create activity", err))
  }

  function removeActivity(id: string) {
    const target = activities.find((a) => a.id === id)
    if (!target) return
    if (!window.confirm(`Delete "${target.name}"? Past sessions keep their recorded time.`)) return
    deleteActivity(id)
      .then(() => {
        setActivities((prev) => prev.filter((a) => a.id !== id))
        setActivity((current) =>
          current?.id === id ? activities.find((a) => a.id !== id) ?? null : current,
        )
      })
      .catch((err) => console.error("Failed to delete activity", err))
  }

  function startEditActivity(a: Activity) {
    setEditingId(a.id)
    setEditingName(a.name)
  }

  function saveEditActivity() {
    const id = editingId
    const name = editingName.trim()
    setEditingId(null)
    if (!id || !name) return
    renameActivity(id, name)
      .then(() => {
        setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, name } : a)))
        setActivity((current) => (current?.id === id ? { ...current, name } : current))
      })
      .catch((err) => console.error("Failed to rename activity", err))
  }

  if (!activity) {
    return (
      <p className="mx-auto text-center text-sm text-muted-foreground">
        Loading activities…
      </p>
    )
  }

  const configuring = !session
  const roundLabel = !session
    ? `${rounds} ${rounds === 1 ? "round" : "rounds"}`
    : phase === "done"
      ? "Session complete"
      : `Round ${session.currentRound} of ${session.rounds}`

  if (phase === "done") {
    const completedActivity = activities.find((a) => a.id === session?.activityId) ?? activity
    return (
      <CompletionCard
        activity={completedActivity}
        focusedSeconds={session?.focusedSecondsAccumulated ?? 0}
        rounds={session?.rounds ?? rounds}
        onReset={dismissCompletion}
      />
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-8">
      {/* Activity picker */}
      <div className="relative w-full">
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          disabled={!configuring}
          className={cn(
            "flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors",
            configuring ? "hover:bg-secondary" : "opacity-60",
          )}
        >
          <span className="flex items-center gap-3">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: activity.color }}
            />
            <span className="text-sm text-muted-foreground">Activity</span>
            <span className="font-medium text-foreground">{activity.name}</span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              pickerOpen && "rotate-180",
            )}
          />
        </button>

        {pickerOpen && configuring && (
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-popover shadow-xl">
            <div className="max-h-56 overflow-y-auto p-1">
              {activities.map((a) =>
                editingId === a.id ? (
                  <input
                    key={a.id}
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEditActivity()
                      if (e.key === "Escape") setEditingId(null)
                    }}
                    onBlur={saveEditActivity}
                    className="mb-0.5 h-9 w-full rounded-xl bg-secondary px-3 text-sm text-foreground outline-none ring-2 ring-ring"
                  />
                ) : (
                  <div
                    key={a.id}
                    className="group flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-secondary"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActivity(a)
                        setPickerOpen(false)
                      }}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: a.color }}
                      />
                      {a.name}
                    </button>
                    <div className="flex items-center gap-1">
                      {a.id === activity.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                      <button
                        type="button"
                        onClick={() => startEditActivity(a)}
                        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
                        aria-label={`Rename ${a.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {activities.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeActivity(a.id)}
                          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                          aria-label={`Delete ${a.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
            <div className="flex items-center gap-2 border-t border-border p-2">
              <input
                value={newActivity}
                onChange={(e) => setNewActivity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addActivity()}
                placeholder="New activity…"
                className="h-9 flex-1 rounded-lg bg-secondary px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button size="icon" className="h-9 w-9" onClick={addActivity}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <TimerRing
        progress={progress}
        secondsLeft={displaySecondsLeft}
        phase={phase}
        roundLabel={roundLabel}
      />

      {/* Controls */}
      <div className="flex w-full items-center justify-center gap-3">
        {configuring ? (
          <Button size="lg" className="h-12 flex-1 gap-2 text-base" onClick={start}>
            <Play className="h-5 w-5" />
            Start focus
          </Button>
        ) : (
          <>
            <Button
              size="lg"
              variant="secondary"
              className="h-12 flex-1 gap-2"
              onClick={session?.running ? pause : resume}
            >
              {session?.running ? (
                <>
                  <Pause className="h-5 w-5" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" /> Resume
                </>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={cancel}
            >
              <Square className="h-4 w-4" /> Cancel
            </Button>
          </>
        )}
      </div>

      {/* Settings */}
      {configuring && (
        <div className="w-full space-y-6 rounded-2xl border border-border bg-card p-5">
          <SliderRow
            label="Focus duration"
            value={focusMin}
            min={5}
            max={360}
            step={5}
            onChange={setFocusMin}
            display={formatDuration(focusMin)}
          />
          <SliderRow
            label="Rest duration"
            value={restMin}
            min={1}
            max={60}
            step={1}
            onChange={setRestMin}
            display={formatDuration(restMin)}
          />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Rounds</span>
            <Stepper value={rounds} min={1} max={12} onChange={setRounds} />
          </div>
          <NotificationToggle />
          <p className="text-xs leading-relaxed text-muted-foreground">
            The final round ends after focus — no rest. Only focused time is
            saved to your statistics.
          </p>
        </div>
      )}

      {!configuring && (
        <button
          onClick={cancel}
          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" /> Reset configuration
        </button>
      )}
    </div>
  )
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  display: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="font-mono text-sm tabular-nums text-primary">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4"
        style={{ accentColor: "var(--primary)" }}
      />
    </div>
  )
}

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-secondary p-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-foreground transition-colors hover:bg-card disabled:opacity-40"
        disabled={value <= min}
        aria-label="Decrease rounds"
      >
        −
      </button>
      <span className="w-8 text-center font-mono text-sm tabular-nums text-foreground">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-foreground transition-colors hover:bg-card disabled:opacity-40"
        disabled={value >= max}
        aria-label="Increase rounds"
      >
        +
      </button>
    </div>
  )
}

function CompletionCard({
  activity,
  focusedSeconds,
  rounds,
  onReset,
}: {
  activity: Activity
  focusedSeconds: number
  rounds: number
  onReset: () => void
}) {
  const minutes = Math.round(focusedSeconds / 60)
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 rounded-3xl border border-border bg-card p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Check className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-foreground text-balance">
          Session complete. Great focus!
        </h2>
        <p className="text-muted-foreground text-pretty">
          You completed {rounds} {rounds === 1 ? "round" : "rounds"} of{" "}
          <span className="font-medium text-foreground">{activity.name}</span>{" "}
          and stayed focused for {formatDuration(minutes)}.
        </p>
      </div>
      <Button size="lg" className="gap-2" onClick={onReset}>
        <RotateCcw className="h-4 w-4" /> New session
      </Button>
    </div>
  )
}

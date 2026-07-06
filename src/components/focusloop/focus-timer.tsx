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
  Clock,
  Sunrise,
  Repeat,
  Sparkles,
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

  // While a session is running, the right-hand pane reflects the session's
  // own locked-in config instead of the (still-editable) draft state.
  const displayFocusMin = session ? session.focusMin : focusMin
  const displayRestMin = session ? session.restMin : restMin
  const displayRounds = session ? session.rounds : rounds

  return (
    <div className="relative">
      {/* Ambient backdrop glow behind the timer half only, purely decorative */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 left-0 -z-10 h-[70%] w-[85%] rounded-full opacity-20 blur-[100px]"
        style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
      />

      <div className="lg:grid lg:grid-cols-2 lg:items-stretch">
        {/* Left half: the timer itself */}
        <div className="relative mx-auto flex w-full max-w-md flex-col items-center gap-6 lg:mx-0 lg:h-full lg:max-w-[560px] lg:justify-center lg:pr-8 xl:max-w-[640px] xl:pr-10">
          <TimerRing
            progress={progress}
            secondsLeft={displaySecondsLeft}
            phase={phase}
            roundLabel={roundLabel}
          />

          <RoundDots
            total={displayRounds}
            current={session ? session.currentRound : 0}
            color={phase === "rest" ? "var(--accent)" : "var(--primary)"}
          />
        </div>

        {/* Right half: activity, settings, and actions — a flowing list, no card/box */}
        <div className="mt-12 lg:mt-0 lg:flex lg:h-full lg:flex-col lg:justify-center lg:border-l lg:border-border lg:pl-16 xl:pl-20">
          <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-lg">
            <div className="divide-y divide-border">
              <div className="pb-5">
                <span className="flex items-center gap-2 text-base font-semibold uppercase tracking-wider text-muted-foreground/80">
                  <Sparkles className="h-5 w-5" />
                  {configuring ? "Session settings" : "Active configuration"}
                </span>
              </div>

              {/* Activity picker — first row, styled like the settings rows below */}
              <div className="relative py-5">
                <button
                  type="button"
                  onClick={() => setPickerOpen((o) => !o)}
                  disabled={!configuring}
                  className={cn(
                    "flex w-full items-center justify-between text-left transition-opacity",
                    configuring ? "hover:opacity-80" : "opacity-60",
                  )}
                >
                  <span className="flex items-center gap-2 text-base font-medium text-foreground">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: activity.color }}
                    />
                    Activity
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-base text-muted-foreground">{activity.name}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                        pickerOpen && "rotate-180",
                      )}
                    />
                  </span>
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
                            className={cn(
                              "group flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors hover:bg-secondary",
                              a.id === activity.id && "bg-secondary/60",
                            )}
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

              <div className="py-5">
                <SliderRow
                  icon={Clock}
                  label="Focus duration"
                  value={displayFocusMin}
                  min={5}
                  max={360}
                  step={5}
                  onChange={setFocusMin}
                  display={formatDuration(displayFocusMin)}
                  color="var(--primary)"
                  disabled={!configuring}
                />
              </div>
              <div className="py-5">
                <SliderRow
                  icon={Sunrise}
                  label="Rest duration"
                  value={displayRestMin}
                  min={1}
                  max={60}
                  step={1}
                  onChange={setRestMin}
                  display={formatDuration(displayRestMin)}
                  color="var(--accent)"
                  disabled={!configuring}
                />
              </div>
              <div className="flex items-center justify-between py-5">
                <span className="flex items-center gap-2 text-base font-medium text-foreground">
                  <Repeat className="h-5 w-5 text-muted-foreground" />
                  Rounds
                </span>
                <Stepper
                  value={displayRounds}
                  min={1}
                  max={12}
                  onChange={setRounds}
                  disabled={!configuring}
                />
              </div>
              <div className="py-5">
                <NotificationToggle />
              </div>
              <div className="py-5">
                <p className="text-base leading-relaxed text-muted-foreground/80">
                  The final round ends after focus — no rest. Only focused time is
                  saved to your statistics.
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="mt-8 flex flex-col items-center gap-3">
              <div className="flex w-full items-center justify-center gap-3">
                {configuring ? (
                  <Button
                    size="lg"
                    onClick={start}
                    className={cn(
                      "h-14 flex-1 gap-2 rounded-xl border-0 text-base font-semibold text-primary-foreground shadow-lg",
                      "transition-transform motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]",
                    )}
                    style={{
                      background: "linear-gradient(135deg, var(--primary), var(--accent))",
                      boxShadow: "0 8px 30px -8px color-mix(in oklch, var(--primary) 60%, transparent)",
                    }}
                  >
                    <Play className="h-5 w-5" />
                    Start focus
                  </Button>
                ) : (
                  <>
                    <Button
                      size="lg"
                      variant="secondary"
                      className="h-14 flex-1 gap-2 rounded-xl text-base font-medium"
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
                      className="h-14 gap-2 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={cancel}
                    >
                      <Square className="h-4 w-4" /> Cancel
                    </Button>
                  </>
                )}
              </div>

              {!configuring && (
                <button
                  onClick={cancel}
                  className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <RotateCcw className="h-4 w-4" /> Reset configuration
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RoundDots({
  total,
  current,
  color,
}: {
  total: number
  current: number
  color: string
}) {
  return (
    <div className="flex items-center justify-center gap-2.5">
      {Array.from({ length: total }, (_, i) => {
        const roundNumber = i + 1
        const completed = current > roundNumber
        const active = current === roundNumber
        return (
          <span
            key={roundNumber}
            className={cn(
              "rounded-full transition-all",
              active ? "h-3 w-3 motion-safe:animate-[pulse-glow_2s_ease-in-out_infinite]" : "h-2.5 w-2.5",
              !completed && !active && "bg-secondary",
            )}
            style={
              completed || active
                ? {
                    backgroundColor: color,
                    boxShadow: active
                      ? `0 0 8px 1px color-mix(in oklch, ${color} 60%, transparent)`
                      : undefined,
                  }
                : undefined
            }
          />
        )
      })}
    </div>
  )
}

function SliderRow({
  icon: Icon,
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  color,
  disabled = false,
}: {
  icon: React.ElementType
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  display: string
  color: string
  disabled?: boolean
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className={cn("space-y-2.5", disabled && "opacity-50")}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-base font-medium text-foreground">
          <Icon className="h-5 w-5 text-muted-foreground" />
          {label}
        </span>
        <span className="font-mono text-base tabular-nums" style={{ color }}>
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
        disabled={disabled}
        className={cn(
          "h-2.5 w-full cursor-pointer appearance-none rounded-full disabled:cursor-not-allowed disabled:pointer-events-none",
          "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none",
          "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background",
          "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background",
        )}
        style={{
          background: `linear-gradient(to right, ${color} ${pct}%, var(--secondary) ${pct}%)`,
          accentColor: color,
        }}
      />
    </div>
  )
}

function Stepper({
  value,
  min,
  max,
  onChange,
  disabled = false,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full border border-border bg-secondary p-1",
        disabled && "opacity-50",
      )}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-foreground transition-colors hover:bg-card disabled:pointer-events-none disabled:opacity-40"
        disabled={disabled || value <= min}
        aria-label="Decrease rounds"
      >
        −
      </button>
      <span className="w-9 text-center font-mono text-base tabular-nums text-foreground">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-foreground transition-colors hover:bg-card disabled:pointer-events-none disabled:opacity-40"
        disabled={disabled || value >= max}
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
    <div className="relative mx-auto flex w-full max-w-md flex-col items-center gap-6 p-8 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-3xl opacity-25 blur-2xl"
        style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
      />
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full text-primary-foreground shadow-lg motion-safe:animate-[pulse-glow_3s_ease-in-out_infinite]"
        style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
      >
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
      <Button
        size="lg"
        className="gap-2 rounded-full border-0 text-primary-foreground"
        style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
        onClick={onReset}
      >
        <RotateCcw className="h-4 w-4" /> New session
      </Button>
    </div>
  )
}

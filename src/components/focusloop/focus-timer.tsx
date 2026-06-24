"use client"

import { useEffect, useRef, useState } from "react"
import {
  Pause,
  Play,
  Plus,
  RotateCcw,
  Square,
  Check,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { TimerRing } from "@/components/focusloop/timer-ring"
import { formatDuration } from "@/lib/focusloop/data"
import { listActivities, createActivity, type Activity } from "@/lib/focusloop/activities"
import { recordSession } from "@/lib/focusloop/sessions"
import { cn } from "@/lib/utils"

type Phase = "idle" | "focus" | "rest" | "done"

export function FocusTimer() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [activity, setActivity] = useState<Activity | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [newActivity, setNewActivity] = useState("")

  const [focusMin, setFocusMin] = useState(25)
  const [restMin, setRestMin] = useState(5)
  const [rounds, setRounds] = useState(4)

  const [phase, setPhase] = useState<Phase>("idle")
  const [running, setRunning] = useState(false)
  const [currentRound, setCurrentRound] = useState(1)
  const [secondsLeft, setSecondsLeft] = useState(focusMin * 60)
  const [focusedSeconds, setFocusedSeconds] = useState(0)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionStartRef = useRef<Date | null>(null)
  const focusedSecondsRef = useRef(0)
  const finishedRef = useRef(false)

  useEffect(() => {
    listActivities()
      .then((loaded) => {
        setActivities(loaded)
        setActivity((current) => current ?? loaded[0] ?? null)
      })
      .catch((err) => console.error("Failed to load activities", err))
  }, [])

  const totalForPhase =
    phase === "rest" ? restMin * 60 : focusMin * 60
  const progress = phase === "idle" ? 1 : secondsLeft / totalForPhase

  // keep idle display in sync with the configured focus length
  useEffect(() => {
    if (phase === "idle") setSecondsLeft(focusMin * 60)
  }, [focusMin, phase])

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (phase === "focus") {
          focusedSecondsRef.current += 1
          setFocusedSeconds(focusedSecondsRef.current)
        }
        if (prev <= 1) {
          handlePhaseEnd()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase, currentRound])

  function handlePhaseEnd() {
    if (typeof window !== "undefined" && "Notification" in window) {
      // Real apps fire a Service Worker push here; prototype uses a local notice.
    }
    if (phase === "focus") {
      const isLastRound = currentRound >= rounds
      if (isLastRound) {
        finish()
      } else {
        setPhase("rest")
        setSecondsLeft(restMin * 60)
      }
    } else if (phase === "rest") {
      setCurrentRound((r) => r + 1)
      setPhase("focus")
      setSecondsLeft(focusMin * 60)
    }
  }

  function start() {
    sessionStartRef.current = new Date()
    focusedSecondsRef.current = 0
    finishedRef.current = false
    setPhase("focus")
    setRunning(true)
    setCurrentRound(1)
    setFocusedSeconds(0)
    setSecondsLeft(focusMin * 60)
  }

  function finish() {
    if (finishedRef.current) return
    finishedRef.current = true
    setRunning(false)
    setPhase("done")
    if (activity && sessionStartRef.current) {
      recordSession({
        activityId: activity.id,
        focusedSeconds: focusedSecondsRef.current,
        rounds: currentRound,
        startedAt: sessionStartRef.current,
      }).catch((err) => console.error("Failed to record session", err))
    }
  }

  function cancel() {
    setRunning(false)
    setPhase("idle")
    setCurrentRound(1)
    setSecondsLeft(focusMin * 60)
  }

  function reset() {
    setPhase("idle")
    setRunning(false)
    setCurrentRound(1)
    setFocusedSeconds(0)
    setSecondsLeft(focusMin * 60)
  }

  function addActivity() {
    const name = newActivity.trim()
    if (!name) return
    createActivity({ name, color: "var(--chart-3)" })
      .then((created) => {
        setActivities((prev) => [created, ...prev])
        setActivity(created)
        setNewActivity("")
        setPickerOpen(false)
      })
      .catch((err) => console.error("Failed to create activity", err))
  }

  if (!activity) {
    return (
      <p className="mx-auto text-center text-sm text-muted-foreground">
        Loading activities…
      </p>
    )
  }

  const configuring = phase === "idle"
  const roundLabel =
    phase === "idle"
      ? `${rounds} ${rounds === 1 ? "round" : "rounds"}`
      : phase === "done"
        ? "Session complete"
        : `Round ${currentRound} of ${rounds}`

  if (phase === "done") {
    return (
      <CompletionCard
        activity={activity}
        focusedSeconds={focusedSeconds}
        rounds={rounds}
        onReset={reset}
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
              {activities.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setActivity(a)
                    setPickerOpen(false)
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-secondary"
                >
                  <span className="flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: a.color }}
                    />
                    {a.name}
                  </span>
                  {a.id === activity.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
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
        secondsLeft={secondsLeft}
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
              onClick={() => setRunning((r) => !r)}
            >
              {running ? (
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
          <p className="text-xs leading-relaxed text-muted-foreground">
            The final round ends after focus — no rest. Only focused time is
            saved to your statistics.
          </p>
        </div>
      )}

      {!configuring && (
        <button
          onClick={reset}
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

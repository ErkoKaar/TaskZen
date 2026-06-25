export type ScheduleItem = { offsetSeconds: number; title: string; body: string }

// Replaces the user's pending scheduled notifications with `items` (computed
// from "now"). Pass [] to just clear pending ones (pause/cancel).
export function rescheduleNotifications(items: ScheduleItem[]) {
  fetch("/api/schedule-notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  }).catch((err) => console.error("Failed to schedule notifications", err))
}

type PhaseInput = {
  phase: "focus" | "rest"
  secondsLeft: number
  currentRound: number
  rounds: number
  focusMin: number
  restMin: number
}

// Computes every future phase-transition notification, as offsets (seconds
// from now), starting from the given live timer state. Used both for the
// initial full-session schedule and for re-scheduling on resume.
export function computeSchedule({
  phase,
  secondsLeft,
  currentRound,
  rounds,
  focusMin,
  restMin,
}: PhaseInput): ScheduleItem[] {
  const items: ScheduleItem[] = []
  let t = 0
  let round = currentRound
  let curPhase = phase
  let remaining = secondsLeft

  while (round <= rounds) {
    t += remaining
    if (curPhase === "focus") {
      if (round >= rounds) {
        items.push({
          offsetSeconds: t,
          title: "Session complete",
          body: "Great focus! Take a proper break.",
        })
        break
      }
      items.push({
        offsetSeconds: t,
        title: "Focus round done",
        body: "Time for a short rest.",
      })
      curPhase = "rest"
      remaining = restMin * 60
    } else {
      items.push({
        offsetSeconds: t,
        title: "Rest is over",
        body: "Back to focus.",
      })
      round += 1
      curPhase = "focus"
      remaining = focusMin * 60
    }
  }

  return items
}

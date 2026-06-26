"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { createClient } from "@/lib/supabase/client"
import { recordSession } from "@/lib/focusloop/sessions"
import { playFocusChime, playRestChime, playCompleteChime, unlockAudio } from "@/lib/focusloop/sound"
import { rescheduleNotifications, computeSchedule } from "@/lib/notifications/notify"

export type TimerPhase = "focus" | "rest" | "done"

export type ActiveSession = {
  activityId: string
  phase: TimerPhase
  running: boolean
  currentRound: number
  rounds: number
  focusMin: number
  restMin: number
  phaseStartedAt: number
  phaseSecondsLeft: number
  focusedSecondsAccumulated: number
  sessionStartedAt: number
}

type Row = {
  activity_id: string
  phase: TimerPhase
  running: boolean
  current_round: number
  rounds: number
  focus_min: number
  rest_min: number
  phase_started_at: string
  phase_seconds_left: number
  focused_seconds_accumulated: number
  session_started_at: string
}

function fromRow(row: Row): ActiveSession {
  return {
    activityId: row.activity_id,
    phase: row.phase,
    running: row.running,
    currentRound: row.current_round,
    rounds: row.rounds,
    focusMin: row.focus_min,
    restMin: row.rest_min,
    phaseStartedAt: new Date(row.phase_started_at).getTime(),
    phaseSecondsLeft: row.phase_seconds_left,
    focusedSecondsAccumulated: row.focused_seconds_accumulated,
    sessionStartedAt: new Date(row.session_started_at).getTime(),
  }
}

// The source of truth is always (phase_seconds_left, phase_started_at), never
// a ticked-down counter — so the correct value can be recomputed at any time,
// from any device, after any amount of time away.
export function liveSecondsLeft(session: ActiveSession, now: number = Date.now()): number {
  if (!session.running) return session.phaseSecondsLeft
  const elapsed = Math.floor((now - session.phaseStartedAt) / 1000)
  return Math.max(0, session.phaseSecondsLeft - elapsed)
}

type FocusTimerContextValue = {
  session: ActiveSession | null
  secondsLeft: number
  start: (input: { activityId: string; focusMin: number; restMin: number; rounds: number }) => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  cancel: () => Promise<void>
  dismissCompletion: () => Promise<void>
}

const FocusTimerContext = createContext<FocusTimerContextValue | null>(null)

export function useFocusTimer(): FocusTimerContextValue {
  const ctx = useContext(FocusTimerContext)
  if (!ctx) throw new Error("useFocusTimer must be used within FocusTimerProvider")
  return ctx
}

// Mounted once in the root layout (not inside the FocusLoop page), so the
// active session — and its countdown — keeps running no matter which route
// or tab is currently visible, and stays synced across every open device via
// Supabase Realtime.
export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ActiveSession | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const sessionRef = useRef<ActiveSession | null>(null)
  const uidRef = useRef<string | null>(null)
  const prevPhaseRef = useRef<TimerPhase | null>(null)
  const phaseInitializedRef = useRef(false)
  const advancingRef = useRef(false)

  sessionRef.current = session

  useEffect(() => {
    const supabase = createClient()
    let active = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function init() {
      const { data: userRes } = await supabase.auth.getUser()
      const uid = userRes.user?.id
      if (!uid || !active) return
      uidRef.current = uid

      const { data, error } = await supabase
        .from("focus_timer_state")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle()
      if (!active) return
      if (error) console.error("Failed to load focus timer state", error)
      else setSession(data ? fromRow(data as Row) : null)

      channel = supabase
        .channel("focus_timer_state_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "focus_timer_state", filter: `user_id=eq.${uid}` },
          (payload) => {
            if (payload.eventType === "DELETE") setSession(null)
            else setSession(fromRow(payload.new as Row))
          },
        )
        .subscribe()
    }

    init().catch((err) => console.error("Failed to init focus timer store", err))
    return () => {
      active = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  // Recompute the displayed countdown immediately whenever the session
  // reference changes (e.g. a realtime update from another device) instead
  // of waiting for the next 1s tick.
  useEffect(() => {
    setSecondsLeft(session ? liveSecondsLeft(session) : 0)
  }, [session])

  // Play the matching chime whenever the phase actually changes, regardless
  // of which device/tab triggered the underlying transition — but never on
  // the very first observation (e.g. opening a second device mid-session
  // shouldn't replay the chime for whatever phase it happens to be in).
  useEffect(() => {
    const phase = session?.phase ?? null
    if (!phaseInitializedRef.current) {
      phaseInitializedRef.current = true
      prevPhaseRef.current = phase
      return
    }
    const prev = prevPhaseRef.current
    if (phase !== prev) {
      if (phase === "rest") playRestChime()
      else if (phase === "focus" && prev === "rest") playFocusChime()
      else if (phase === "done") playCompleteChime()
      prevPhaseRef.current = phase
    }
  }, [session?.phase])

  // Single persistent 1s display tick + phase-end detection. Lives for the
  // app's whole lifetime (empty deps), independent of route/tab.
  useEffect(() => {
    const interval = setInterval(() => {
      const current = sessionRef.current
      if (!current) return
      const left = liveSecondsLeft(current)
      setSecondsLeft(left)
      if (current.running && left <= 0 && current.phase !== "done" && !advancingRef.current) {
        advancingRef.current = true
        advancePhase(current).finally(() => {
          advancingRef.current = false
        })
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Compare-and-swap on (phase, current_round): if another device already
  // advanced this same transition, our update affects zero rows and we just
  // skip — avoiding a duplicate focus_sessions record or notification
  // schedule when two devices are open at once.
  async function advancePhase(current: ActiveSession) {
    const uid = uidRef.current
    if (!uid) return
    const supabase = createClient()
    const now = new Date().toISOString()

    if (current.phase === "focus") {
      const newAccumulated = current.focusedSecondsAccumulated + current.focusMin * 60
      const isLastRound = current.currentRound >= current.rounds

      if (isLastRound) {
        const { data, error } = await supabase
          .from("focus_timer_state")
          .update({
            phase: "done",
            running: false,
            phase_seconds_left: 0,
            focused_seconds_accumulated: newAccumulated,
            updated_at: now,
          })
          .eq("user_id", uid)
          .eq("phase", "focus")
          .eq("current_round", current.currentRound)
          .select()
        if (error) return console.error("Failed to complete focus session", error)
        if (!data || data.length === 0) return
        setSession(fromRow(data[0] as Row))
        try {
          await recordSession({
            activityId: current.activityId,
            focusedSeconds: newAccumulated,
            rounds: current.rounds,
            startedAt: new Date(current.sessionStartedAt),
          })
        } catch (err) {
          console.error("Failed to record session", err)
        }
        await rescheduleNotifications([])
        return
      }

      const { data, error } = await supabase
        .from("focus_timer_state")
        .update({
          phase: "rest",
          phase_started_at: now,
          phase_seconds_left: current.restMin * 60,
          focused_seconds_accumulated: newAccumulated,
          updated_at: now,
        })
        .eq("user_id", uid)
        .eq("phase", "focus")
        .eq("current_round", current.currentRound)
        .select()
      if (error) return console.error("Failed to advance to rest", error)
      if (!data || data.length === 0) return
      setSession(fromRow(data[0] as Row))
      await rescheduleNotifications(
        computeSchedule({
          phase: "rest",
          secondsLeft: current.restMin * 60,
          currentRound: current.currentRound,
          rounds: current.rounds,
          focusMin: current.focusMin,
          restMin: current.restMin,
        }),
      )
      return
    }

    if (current.phase === "rest") {
      const nextRound = current.currentRound + 1
      const { data, error } = await supabase
        .from("focus_timer_state")
        .update({
          phase: "focus",
          current_round: nextRound,
          phase_started_at: now,
          phase_seconds_left: current.focusMin * 60,
          updated_at: now,
        })
        .eq("user_id", uid)
        .eq("phase", "rest")
        .eq("current_round", current.currentRound)
        .select()
      if (error) return console.error("Failed to advance to focus", error)
      if (!data || data.length === 0) return
      setSession(fromRow(data[0] as Row))
      await rescheduleNotifications(
        computeSchedule({
          phase: "focus",
          secondsLeft: current.focusMin * 60,
          currentRound: nextRound,
          rounds: current.rounds,
          focusMin: current.focusMin,
          restMin: current.restMin,
        }),
      )
    }
  }

  const start = useCallback(
    async (input: { activityId: string; focusMin: number; restMin: number; rounds: number }) => {
      const uid = uidRef.current
      if (!uid) return
      unlockAudio()
      const now = new Date().toISOString()
      const supabase = createClient()
      const { data, error } = await supabase
        .from("focus_timer_state")
        .upsert({
          user_id: uid,
          activity_id: input.activityId,
          phase: "focus",
          running: true,
          current_round: 1,
          rounds: input.rounds,
          focus_min: input.focusMin,
          rest_min: input.restMin,
          phase_started_at: now,
          phase_seconds_left: input.focusMin * 60,
          focused_seconds_accumulated: 0,
          session_started_at: now,
          updated_at: now,
        })
        .select()
        .single()
      if (error) return console.error("Failed to start focus session", error)
      setSession(fromRow(data as Row))
      await rescheduleNotifications(
        computeSchedule({
          phase: "focus",
          secondsLeft: input.focusMin * 60,
          currentRound: 1,
          rounds: input.rounds,
          focusMin: input.focusMin,
          restMin: input.restMin,
        }),
      )
    },
    [],
  )

  const pause = useCallback(async () => {
    const current = sessionRef.current
    const uid = uidRef.current
    if (!current || !uid || current.phase === "done" || !current.running) return
    const left = liveSecondsLeft(current)
    setSession({ ...current, running: false, phaseSecondsLeft: left })
    const supabase = createClient()
    await supabase
      .from("focus_timer_state")
      .update({ running: false, phase_seconds_left: left, updated_at: new Date().toISOString() })
      .eq("user_id", uid)
    await rescheduleNotifications([])
  }, [])

  const resume = useCallback(async () => {
    const current = sessionRef.current
    const uid = uidRef.current
    if (!current || !uid || current.phase === "done" || current.running) return
    const now = new Date().toISOString()
    setSession({ ...current, running: true, phaseStartedAt: new Date(now).getTime() })
    const supabase = createClient()
    await supabase
      .from("focus_timer_state")
      .update({ running: true, phase_started_at: now, updated_at: now })
      .eq("user_id", uid)
    await rescheduleNotifications(
      computeSchedule({
        phase: current.phase as "focus" | "rest",
        secondsLeft: current.phaseSecondsLeft,
        currentRound: current.currentRound,
        rounds: current.rounds,
        focusMin: current.focusMin,
        restMin: current.restMin,
      }),
    )
  }, [])

  const cancel = useCallback(async () => {
    const current = sessionRef.current
    const uid = uidRef.current
    if (!current || !uid) return

    if (current.phase !== "done") {
      const left = liveSecondsLeft(current)
      const partialFocusSeconds = current.phase === "focus" ? Math.max(0, current.focusMin * 60 - left) : 0
      const totalFocusedSeconds = current.focusedSecondsAccumulated + partialFocusSeconds
      const roundsCompleted = Math.max(current.phase === "rest" ? current.currentRound : current.currentRound - 1, 0)
      if (totalFocusedSeconds > 0) {
        try {
          await recordSession({
            activityId: current.activityId,
            focusedSeconds: totalFocusedSeconds,
            rounds: roundsCompleted,
            startedAt: new Date(current.sessionStartedAt),
          })
        } catch (err) {
          console.error("Failed to record partial session", err)
        }
      }
    }

    setSession(null)
    const supabase = createClient()
    await supabase.from("focus_timer_state").delete().eq("user_id", uid)
    await rescheduleNotifications([])
  }, [])

  const dismissCompletion = useCallback(async () => {
    const uid = uidRef.current
    if (!uid) return
    setSession(null)
    const supabase = createClient()
    await supabase.from("focus_timer_state").delete().eq("user_id", uid)
  }, [])

  return (
    <FocusTimerContext.Provider
      value={{ session, secondsLeft, start, pause, resume, cancel, dismissCompletion }}
    >
      {children}
    </FocusTimerContext.Provider>
  )
}

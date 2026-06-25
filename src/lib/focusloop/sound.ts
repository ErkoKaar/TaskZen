"use client"

let sharedContext: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!sharedContext) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    sharedContext = new Ctor()
  }
  return sharedContext
}

function beep(ctx: AudioContext, freq: number, startTime: number, duration: number) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = "sine"
  oscillator.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, startTime)
  gain.gain.exponentialRampToValueAtTime(0.2, startTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(startTime)
  oscillator.stop(startTime + duration)
}

// Two ascending notes — used when focus ends / rest starts.
export function playRestChime() {
  const ctx = getContext()
  if (!ctx) return
  const now = ctx.currentTime
  beep(ctx, 523.25, now, 0.18) // C5
  beep(ctx, 659.25, now + 0.16, 0.22) // E5
}

// Two descending notes — used when rest ends / focus resumes.
export function playFocusChime() {
  const ctx = getContext()
  if (!ctx) return
  const now = ctx.currentTime
  beep(ctx, 659.25, now, 0.18) // E5
  beep(ctx, 523.25, now + 0.16, 0.22) // C5
}

// Three-note flourish — used when the whole session completes.
export function playCompleteChime() {
  const ctx = getContext()
  if (!ctx) return
  const now = ctx.currentTime
  beep(ctx, 523.25, now, 0.16) // C5
  beep(ctx, 659.25, now + 0.14, 0.16) // E5
  beep(ctx, 783.99, now + 0.28, 0.3) // G5
}

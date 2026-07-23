"use client"

import { Check, Minus } from "lucide-react"

export function CheckBox({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`grid h-6 w-6 shrink-0 place-items-center rounded-[6px] border-2 transition-colors ${
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border-strong bg-background hover:border-foreground"
      }`}
      aria-pressed={checked}
    >
      {checked && <Check className="h-4 w-4" strokeWidth={3} />}
    </button>
  )
}

// Read-only, three-state indicator for a parent habit whose "done" state is
// derived from its sub-habits: empty (none done), partial (some done), full
// (all done). Not interactive — the user checks the children, not this.
export function DerivedCheckBox({ state }: { state: "empty" | "partial" | "full" }) {
  return (
    <span
      role="img"
      aria-label={
        state === "full" ? "All sub-habits done" : state === "partial" ? "Some sub-habits done" : "No sub-habits done"
      }
      className={`grid h-6 w-6 shrink-0 place-items-center rounded-[6px] border-2 ${
        state === "full"
          ? "border-primary bg-primary text-primary-foreground"
          : state === "partial"
            ? "border-primary bg-primary/15 text-primary"
            : "border-border-strong bg-background"
      }`}
    >
      {state === "full" && <Check className="h-4 w-4" strokeWidth={3} />}
      {state === "partial" && <Minus className="h-4 w-4" strokeWidth={3} />}
    </span>
  )
}

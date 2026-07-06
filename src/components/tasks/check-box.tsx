"use client"

import { Check } from "lucide-react"

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

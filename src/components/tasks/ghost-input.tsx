"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

// Inline "+ Add …" row that replaces the old boxed add-forms: always visible
// at the end of a list, submits on Enter, clears itself for the next entry.
export function GhostInput({
  placeholder,
  onSubmit,
  compact = false,
}: {
  placeholder: string
  onSubmit: (title: string) => void
  // compact: smaller row used for nested sub-habit entry.
  compact?: boolean
}) {
  const [value, setValue] = useState("")

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!value.trim()) return
        onSubmit(value.trim())
        setValue("")
      }}
      className={compact ? "flex items-center gap-3 py-2" : "flex items-center gap-4 py-5"}
    >
      <Plus
        className={compact ? "h-4 w-4 shrink-0 text-muted-foreground" : "h-5 w-5 shrink-0 text-primary"}
        strokeWidth={2.5}
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-transparent placeholder:text-muted-foreground/70 focus:outline-none ${
          compact ? "text-base" : "text-lg"
        }`}
      />
    </form>
  )
}

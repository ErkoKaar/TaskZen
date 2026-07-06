"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

// Inline "+ Add …" row that replaces the old boxed add-forms: always visible
// at the end of a list, submits on Enter, clears itself for the next entry.
export function GhostInput({
  placeholder,
  onSubmit,
}: {
  placeholder: string
  onSubmit: (title: string) => void
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
      className="flex items-center gap-4 py-5"
    >
      <Plus className="h-5 w-5 shrink-0 text-primary" strokeWidth={2.5} />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-lg placeholder:text-muted-foreground/70 focus:outline-none"
      />
    </form>
  )
}

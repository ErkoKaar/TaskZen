"use client"

import { useState } from "react"
import Image from "next/image"
import { Flame, GripVertical, Pencil, RotateCcw, Trash2 } from "lucide-react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  childrenOf,
  computeHabitStreak,
  fmtDate,
  isHabitDoneOn,
  useStore,
  type Habit,
  type HabitLog,
} from "@/lib/tasks/store"
import { SiteHeader } from "@/components/site-header"
import { TasksNavTabs } from "@/components/tasks/nav-tabs"
import { CheckBox, DerivedCheckBox } from "@/components/tasks/check-box"
import { GhostInput } from "@/components/tasks/ghost-input"
import { cn } from "@/lib/utils"

const DELETE_BTN_CLASS =
  "text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-60 hover:text-destructive"

const EDIT_BTN_CLASS =
  "shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-60 hover:text-foreground"

const HANDLE_CLASS =
  "shrink-0 cursor-grab touch-none text-muted-foreground/40 transition-opacity hover:text-muted-foreground focus-visible:opacity-100 active:cursor-grabbing opacity-0 group-hover/habit:opacity-100 pointer-coarse:opacity-60"

// Special droppable id: dropping a sub-habit here promotes it back to a
// standalone, top-level habit.
const TOP_LEVEL_ID = "__habit_top_level__"

export default function HabitsPage() {
  const {
    state,
    addHabit,
    archiveHabit,
    restoreHabit,
    deleteHabit,
    toggleHabit,
    setHabitParent,
    renameHabit,
  } = useStore()
  const [activeId, setActiveId] = useState<string | null>(null)

  const today = fmtDate(new Date())
  // Top-level active habits; children are rendered nested under their parent.
  const activeHabits = state.habits.filter((h) => !h.archivedAt && !h.parentId)
  // Archived top-level habits, plus children that were individually archived
  // while their parent is still active (so they aren't stranded with no way
  // to restore). When a whole parent is archived, its children are hidden
  // here and come back together via the parent's Restore.
  const archivedHabits = state.habits.filter((h) => {
    if (!h.archivedAt) return false
    if (!h.parentId) return true
    const parent = state.habits.find((p) => p.id === h.parentId)
    return parent ? !parent.archivedAt : false
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  )

  const activeHabit = activeId ? state.habits.find((h) => h.id === activeId) ?? null : null

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const habitId = String(active.id)
    const overId = String(over.id)
    if (overId === TOP_LEVEL_ID) {
      setHabitParent(habitId, null)
      return
    }
    if (overId === habitId) return
    // setHabitParent validates the rest (target must be top-level, dragged
    // habit must be a leaf, no self-nesting).
    setHabitParent(habitId, overId)
  }

  function deleteForever(id: string, habitName: string) {
    const confirmed = window.confirm(
      `Delete "${habitName}" forever? This also removes its history from your statistics. This can't be undone.`,
    )
    if (confirmed) deleteHabit(id)
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader>
        <TasksNavTabs />
      </SiteHeader>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-8 sm:py-16">
        <div className="flex items-center gap-3">
          <Image src="/icons/habits.svg" alt="" width={32} height={32} className="h-8 w-8" />
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">Habits</h1>
        </div>
        <p className="mt-2 text-lg text-muted-foreground">
          Daily habits show up automatically on every day in Tasks. Drag a habit onto another to
          make it a sub-habit.
        </p>

        <div className="mt-14 lg:grid lg:grid-cols-2 lg:items-start lg:gap-20">
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="divide-y divide-border">
              {activeHabits.length === 0 && (
                <p className="pb-1 pt-2 text-lg text-muted-foreground">
                  No habits yet. Add one below and it will appear every day.
                </p>
              )}
              {activeHabits.map((h) => (
                <HabitGroup
                  key={h.id}
                  habit={h}
                  kids={childrenOf(h.id, state.habits)}
                  today={today}
                  allHabits={state.habits}
                  logs={state.habitLogs}
                  onToggle={toggleHabit}
                  onArchive={archiveHabit}
                  onRename={renameHabit}
                  onAddChild={(name) => addHabit({ name, parentId: h.id })}
                />
              ))}
              <TopLevelDropZone />
              <GhostInput placeholder="Add a habit…" onSubmit={(name) => addHabit({ name })} />
            </div>

            <DragOverlay>
              {activeHabit ? (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 shadow-lg">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                  <span className="text-lg">{activeHabit.name}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {archivedHabits.length > 0 && (
            <div className="mt-14 lg:mt-0">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">
                Old habits
              </h2>
              <p className="mt-2 text-base text-muted-foreground">
                Deleted habits land here. Their past completions still count in your statistics,
                but they no longer show up on new days.
              </p>
              <div className="mt-4 divide-y divide-border">
                {archivedHabits.map((h) => {
                  const parentName = h.parentId
                    ? state.habits.find((p) => p.id === h.parentId)?.name
                    : null
                  return (
                    <div key={h.id} className="flex items-center gap-4 py-5">
                      <span className="flex-1 text-lg text-muted-foreground line-through">
                        {parentName ? `${parentName} · ${h.name}` : h.name}
                      </span>
                      <button
                        onClick={() => restoreHabit(h.id)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-base font-medium text-foreground hover:bg-secondary"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Restore
                      </button>
                      <button
                        onClick={() => deleteForever(h.id, h.name)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3.5 py-2 text-base font-medium text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete forever
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// A top-level habit and its nested sub-habits. The whole group is a drop
// target (drop another habit here to nest it); the parent row's grip is a
// drag source, but only for leaf habits — a habit that already has children
// can't itself become a sub-habit (one level of nesting).
function HabitGroup({
  habit,
  kids,
  today,
  allHabits,
  logs,
  onToggle,
  onArchive,
  onRename,
  onAddChild,
}: {
  habit: Habit
  kids: Habit[]
  today: string
  allHabits: Habit[]
  logs: HabitLog
  onToggle: (habitId: string, date: string) => void
  onArchive: (habitId: string) => void
  onRename: (habitId: string, name: string) => void
  onAddChild: (name: string) => void
}) {
  const isParent = kids.length > 0
  const streak = computeHabitStreak(habit, allHabits, logs)
  const doneToday = isHabitDoneOn(habit, allHabits, logs, today)
  const doneKids = kids.filter((c) => !!logs[`${c.id}:${today}`]).length

  const { setNodeRef: setDropRef, isOver, active } = useDroppable({ id: habit.id })
  const {
    setNodeRef: setDragRef,
    listeners,
    attributes,
    isDragging,
  } = useDraggable({
    id: habit.id,
    data: { parentId: habit.parentId },
    disabled: isParent,
  })

  const highlight = isOver && !!active && String(active.id) !== habit.id

  return (
    <div
      ref={setDropRef}
      className={cn(
        "group/habit rounded-lg py-2 transition-colors",
        highlight && "bg-primary/10 ring-2 ring-primary/40",
        isDragging && "opacity-40",
      )}
    >
      <div className="group flex items-center gap-2 py-3">
        {isParent ? (
          <span className="w-5 shrink-0" />
        ) : (
          <button
            ref={setDragRef}
            type="button"
            aria-label="Drag to nest under another habit"
            className={HANDLE_CLASS}
            {...listeners}
            {...attributes}
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}
        {isParent ? (
          <DerivedCheckBox
            state={doneKids === 0 ? "empty" : doneKids === kids.length ? "full" : "partial"}
          />
        ) : (
          <CheckBox checked={doneToday} onClick={() => onToggle(habit.id, today)} />
        )}
        <EditableName
          name={habit.name}
          onRename={(name) => onRename(habit.id, name)}
          displayClassName={cn("text-lg", doneToday && "text-muted-foreground line-through")}
        />
        <span className="flex items-center gap-1 text-sm tabular-nums text-muted-foreground">
          <Flame className="h-4 w-4 text-[color:var(--chart-1)]" />
          {streak} day{streak === 1 ? "" : "s"}
        </span>
        <button
          onClick={() => onArchive(habit.id)}
          className={DELETE_BTN_CLASS}
          aria-label="Delete habit"
          title="Delete — moves to Old habits, history is kept"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      <div className="ml-7 flex flex-col">
        {kids.map((c) => (
          <ChildRow
            key={c.id}
            child={c}
            done={!!logs[`${c.id}:${today}`]}
            onToggle={() => onToggle(c.id, today)}
            onArchive={() => onArchive(c.id)}
            onRename={(name) => onRename(c.id, name)}
          />
        ))}
        <div
          className={cn(
            "ml-6",
            !isParent && "hidden group-hover/habit:block focus-within:block pointer-coarse:block",
          )}
        >
          <GhostInput compact placeholder="Add a sub-habit…" onSubmit={onAddChild} />
        </div>
      </div>
    </div>
  )
}

// A sub-habit row. Draggable (it's a leaf) so it can be moved to a different
// parent or promoted back to top-level, but never a drop target itself.
function ChildRow({
  child,
  done,
  onToggle,
  onArchive,
  onRename,
}: {
  child: Habit
  done: boolean
  onToggle: () => void
  onArchive: () => void
  onRename: (name: string) => void
}) {
  const {
    setNodeRef: setDragRef,
    listeners,
    attributes,
    isDragging,
  } = useDraggable({ id: child.id, data: { parentId: child.parentId } })

  return (
    <div className={cn("group flex items-center gap-2 py-2", isDragging && "opacity-40")}>
      <button
        ref={setDragRef}
        type="button"
        aria-label="Drag to move or unnest sub-habit"
        className={HANDLE_CLASS}
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <CheckBox checked={done} onClick={onToggle} />
      <EditableName
        name={child.name}
        onRename={onRename}
        displayClassName={cn("text-base", done && "text-muted-foreground line-through")}
      />
      <button
        onClick={onArchive}
        className={DELETE_BTN_CLASS}
        aria-label="Delete sub-habit"
        title="Delete — history is kept"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

// The habit name: a display label with a hover pencil, swapping to a text
// input on click. Enter/blur commits, Escape cancels. Renaming updates the
// single habits row, so the new name shows everywhere it's read by id.
function EditableName({
  name,
  onRename,
  displayClassName,
}: {
  name: string
  onRename: (name: string) => void
  displayClassName?: string
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          setEditing(false)
          onRename(value)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            setEditing(false)
            onRename(value)
          } else if (e.key === "Escape") {
            e.preventDefault()
            setEditing(false)
            setValue(name)
          }
        }}
        className={cn(
          "min-w-0 flex-1 border-b border-primary bg-transparent focus:outline-none",
          displayClassName,
        )}
        aria-label="Habit name"
      />
    )
  }

  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span className={cn("truncate", displayClassName)}>{name}</span>
      <button
        type="button"
        onClick={() => {
          setValue(name)
          setEditing(true)
        }}
        className={EDIT_BTN_CLASS}
        aria-label="Rename"
        title="Rename"
      >
        <Pencil className="h-4 w-4" />
      </button>
    </span>
  )
}

// Drop target for promoting a sub-habit back to a standalone habit. Only shown
// while a sub-habit (a habit that currently has a parent) is being dragged.
function TopLevelDropZone() {
  const { setNodeRef, isOver, active } = useDroppable({ id: TOP_LEVEL_ID })
  const draggingChild = !!active && (active.data.current?.parentId ?? null) !== null
  if (!draggingChild) return null
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "my-2 rounded-lg border-2 border-dashed px-4 py-3 text-sm transition-colors",
        isOver ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
      )}
    >
      Drop here to make it a standalone habit
    </div>
  )
}

"use client"

import { useState } from "react"
import Image from "next/image"
import { Check, ChevronDown, GripVertical, Trash2 } from "lucide-react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  useProjectsStore,
  type Criticality,
  type Project,
  type ProjectTask,
} from "@/lib/tasks/projects-store"
import { SiteHeader } from "@/components/site-header"
import { TasksNavTabs } from "@/components/tasks/nav-tabs"
import { CriticalityPicker, CRITICALITY_COLORS } from "@/components/tasks/criticality-picker"
import { CheckBox } from "@/components/tasks/check-box"
import { GhostInput } from "@/components/tasks/ghost-input"
import { cn } from "@/lib/utils"

const DELETE_BTN_CLASS =
  "text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-60 hover:text-destructive"

// The project row's <section> is a *named* group (`group/project`, distinct
// from the plain `group` on each task row below it), so these need the
// matching `group-hover/project:` variant — plain `group-hover:` never
// matches a `group/project` ancestor and silently never fires.
const PROJECT_DELETE_BTN_CLASS =
  "text-muted-foreground opacity-0 transition-opacity group-hover/project:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-60 hover:text-destructive"

const PROJECT_DONE_BTN_CLASS =
  "text-muted-foreground opacity-0 transition-opacity group-hover/project:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-60 hover:text-[color:var(--chart-4)]"

export default function ProjectsPage() {
  const {
    state,
    addProject,
    setProjectCriticality,
    completeProject,
    deleteProject,
    reorderProjects,
    addProjectTask,
    setTaskCriticality,
    toggleTaskDone,
    deleteProjectTask,
  } = useProjectsStore()

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function toggleExpanded(id: string) {
    setExpanded((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function deleteProjectConfirm(project: Project) {
    const confirmed = window.confirm(
      `Delete "${project.title}" and all of its tasks? This can't be undone.`,
    )
    if (confirmed) deleteProject(project.id)
  }

  function completeProjectConfirm(project: Project) {
    const confirmed = window.confirm(
      `Mark "${project.title}" as done? It'll be removed from Projects and logged in your statistics.`,
    )
    if (confirmed) completeProject(project.id)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = state.projects.map((p) => p.id)
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    reorderProjects(arrayMove(ids, oldIndex, newIndex))
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader>
        <TasksNavTabs />
      </SiteHeader>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-8 sm:py-16">
        <div className="flex items-center gap-3">
          <Image src="/icons/projects.svg" alt="" width={32} height={32} className="h-8 w-8" />
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">Projects</h1>
        </div>
        <p className="mt-2 text-lg text-muted-foreground">
          Check off tasks as you go, then mark the project done or delete it.
        </p>

        <div className="mt-14 space-y-14">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={state.projects.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-14">
                {state.projects.map((project) => (
                  <ProjectSection
                    key={project.id}
                    project={project}
                    tasks={state.projectTasks.filter((t) => t.projectId === project.id)}
                    expanded={expanded.has(project.id)}
                    onToggleExpanded={() => toggleExpanded(project.id)}
                    onComplete={() => completeProjectConfirm(project)}
                    onSetCriticality={(c) => setProjectCriticality(project.id, c)}
                    onDelete={() => deleteProjectConfirm(project)}
                    onAddTask={(title) => addProjectTask(project.id, { title })}
                    onToggleTaskDone={toggleTaskDone}
                    onSetTaskCriticality={setTaskCriticality}
                    onDeleteTask={deleteProjectTask}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="border-l-4 border-transparent pl-5 sm:pl-6">
            {state.projects.length === 0 && (
              <p className="pb-1 pt-2 text-lg text-muted-foreground">No projects yet.</p>
            )}
            <GhostInput placeholder="Add a project…" onSubmit={(title) => addProject({ title })} />
          </div>
        </div>
      </main>
    </div>
  )
}

function ProjectSection({
  project,
  tasks,
  expanded,
  onToggleExpanded,
  onComplete,
  onSetCriticality,
  onDelete,
  onAddTask,
  onToggleTaskDone,
  onSetTaskCriticality,
  onDeleteTask,
}: {
  project: Project
  tasks: ProjectTask[]
  expanded: boolean
  onToggleExpanded: () => void
  onComplete: () => void
  onSetCriticality: (c: Criticality) => void
  onDelete: () => void
  onAddTask: (title: string) => void
  onToggleTaskDone: (id: string) => void
  onSetTaskCriticality: (id: string, c: Criticality) => void
  onDeleteTask: (id: string) => void
}) {
  const doneCount = tasks.filter((t) => t.completedAt !== null).length

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  })

  return (
    <section
      ref={setNodeRef}
      className={cn("group/project border-l-4 pl-5 sm:pl-6", isDragging && "z-10 opacity-70")}
      style={{
        borderColor: CRITICALITY_COLORS[project.criticality],
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        {/* Row 1 on mobile, unwrapped (display:contents) into the shared row from sm up */}
        <div className="flex min-w-0 items-center gap-3 sm:contents">
          <button
            type="button"
            aria-label="Drag to reorder"
            className="shrink-0 cursor-grab touch-none text-muted-foreground/40 transition-opacity hover:text-muted-foreground focus-visible:opacity-100 active:cursor-grabbing sm:opacity-0 sm:group-hover/project:opacity-100"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>
          <Image src="/icons/projects.svg" alt="" width={22} height={22} className="h-[22px] w-[22px] shrink-0" />
          <button
            type="button"
            onClick={onToggleExpanded}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            aria-expanded={expanded}
          >
            <span className="truncate text-xl font-semibold">{project.title}</span>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-muted-foreground/60 transition-transform",
                expanded && "rotate-180",
              )}
            />
          </button>
        </div>

        {/* Row 2 on mobile: status + criticality on the left, actions on the right */}
        <div className="flex items-center justify-between gap-3 pl-8 sm:contents sm:pl-0">
          <div className="flex items-center gap-3 sm:contents">
            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
              {doneCount}/{tasks.length}
            </span>
            {tasks.length > 0 && (
              <span className="hidden h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-surface-2 sm:block lg:w-32">
                <span
                  className="block h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.round((doneCount / tasks.length) * 100)}%` }}
                />
              </span>
            )}
            <CriticalityPicker value={project.criticality} onChange={onSetCriticality} />
          </div>
          <div className="flex items-center gap-1 sm:contents">
            <button onClick={onComplete} className={PROJECT_DONE_BTN_CLASS} aria-label="Mark project done">
              <Check className="h-5 w-5" />
            </button>
            <button onClick={onDelete} className={PROJECT_DELETE_BTN_CLASS} aria-label="Delete project">
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="ml-2 mt-2 divide-y divide-border sm:ml-8">
          {tasks.map((t) => {
            const taskDone = t.completedAt !== null
            return (
              <div key={t.id} className="group flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex min-w-0 items-start gap-4 sm:contents">
                  <CheckBox checked={taskDone} onClick={() => onToggleTaskDone(t.id)} />
                  <span
                    className={cn(
                      "min-w-0 flex-1 text-lg break-words",
                      taskDone && "text-muted-foreground line-through",
                    )}
                  >
                    {t.title}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 pl-3 sm:contents">
                  <CriticalityPicker value={t.criticality} onChange={(c) => onSetTaskCriticality(t.id, c)} />
                  <button onClick={() => onDeleteTask(t.id)} className={DELETE_BTN_CLASS} aria-label="Delete task">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )
          })}
          <GhostInput placeholder="Add a task…" onSubmit={onAddTask} />
        </div>
      )}
    </section>
  )
}

"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Check, ChevronDown, GripVertical, Trash2 } from "lucide-react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
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
  type ProjectSection,
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

const SECTIONS: { id: ProjectSection; title: string; description: string }[] = [
  {
    id: "projects",
    title: "Projects",
    description: "Check off tasks as you go, then mark the project done or delete it.",
  },
  {
    id: "personal",
    title: "Personal Projects",
    description: "The same, just kept separate from work.",
  },
]

// Droppable id for each section's card list, used so a project can be
// dropped into an empty section (which otherwise has no card to land on).
const COLUMN_DROPPABLE_ID: Record<ProjectSection, string> = {
  projects: "column:projects",
  personal: "column:personal",
}

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
    reorderProjectTasks,
    deleteProjectTask,
  } = useProjectsStore()

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [columns, setColumns] = useState<Record<ProjectSection, string[]>>({
    projects: [],
    personal: [],
  })

  useEffect(() => {
    setColumns({
      projects: state.projects
        .filter((p) => p.section === "projects")
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((p) => p.id),
      personal: state.projects
        .filter((p) => p.section === "personal")
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((p) => p.id),
    })
  }, [state.projects])

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

  function findColumn(id: string): ProjectSection | null {
    if (id === COLUMN_DROPPABLE_ID.projects) return "projects"
    if (id === COLUMN_DROPPABLE_ID.personal) return "personal"
    if (columns.projects.includes(id)) return "projects"
    if (columns.personal.includes(id)) return "personal"
    return null
  }

  // Moves the dragged card into the section it's currently hovering over so
  // the list visually reflows as you drag across the Projects / Personal
  // Projects boundary. Nothing is persisted here — see handleProjectDragEnd.
  function handleProjectDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    const activeCol = findColumn(activeId)
    const overCol = findColumn(overId)
    if (!activeCol || !overCol || activeCol === overCol) return

    setColumns((prev) => {
      const activeItems = prev[activeCol].filter((id) => id !== activeId)
      const overItems = [...prev[overCol]]
      const overIndex = overItems.indexOf(overId)
      const insertAt = overIndex >= 0 ? overIndex : overItems.length
      overItems.splice(insertAt, 0, activeId)
      return { ...prev, [activeCol]: activeItems, [overCol]: overItems }
    })
  }

  function handleProjectDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    const activeCol = findColumn(activeId)
    if (!activeCol) return

    setColumns((prev) => {
      const items = prev[activeCol]
      const oldIndex = items.indexOf(activeId)
      const overCol = findColumn(overId)
      const newIndex = overCol === activeCol && overId !== activeId ? items.indexOf(overId) : -1
      const finalItems =
        oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex
          ? arrayMove(items, oldIndex, newIndex)
          : items
      const next = { ...prev, [activeCol]: finalItems }
      reorderProjects("projects", next.projects)
      reorderProjects("personal", next.personal)
      return next
    })
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

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragOver={handleProjectDragOver}
          onDragEnd={handleProjectDragEnd}
        >
          <div className="mt-10 space-y-16">
            {SECTIONS.map((section) => (
              <SectionColumn
                key={section.id}
                id={section.id}
                title={section.title}
                description={section.description}
                projectIds={columns[section.id]}
                projects={state.projects}
                projectTasks={state.projectTasks}
                expanded={expanded}
                onToggleExpanded={toggleExpanded}
                onComplete={completeProjectConfirm}
                onSetCriticality={setProjectCriticality}
                onDelete={deleteProjectConfirm}
                onAddProject={(title) => addProject({ title, section: section.id })}
                onAddTask={addProjectTask}
                onToggleTaskDone={toggleTaskDone}
                onSetTaskCriticality={setTaskCriticality}
                onDeleteTask={deleteProjectTask}
                onReorderTasks={reorderProjectTasks}
              />
            ))}
          </div>
        </DndContext>
      </main>
    </div>
  )
}

function SectionColumn({
  id,
  title,
  description,
  projectIds,
  projects,
  projectTasks,
  expanded,
  onToggleExpanded,
  onComplete,
  onSetCriticality,
  onDelete,
  onAddProject,
  onAddTask,
  onToggleTaskDone,
  onSetTaskCriticality,
  onDeleteTask,
  onReorderTasks,
}: {
  id: ProjectSection
  title: string
  description: string
  projectIds: string[]
  projects: Project[]
  projectTasks: ProjectTask[]
  expanded: Set<string>
  onToggleExpanded: (id: string) => void
  onComplete: (project: Project) => void
  onSetCriticality: (id: string, c: Criticality) => void
  onDelete: (project: Project) => void
  onAddProject: (title: string) => void
  onAddTask: (projectId: string, input: { title: string }) => void
  onToggleTaskDone: (id: string) => void
  onSetTaskCriticality: (id: string, c: Criticality) => void
  onDeleteTask: (id: string) => void
  onReorderTasks: (orderedIds: string[]) => void
}) {
  const { setNodeRef } = useDroppable({ id: COLUMN_DROPPABLE_ID[id] })
  const byId = new Map(projects.map((p) => [p.id, p]))
  const sectionProjects = projectIds.map((pid) => byId.get(pid)).filter((p): p is Project => !!p)

  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-1 text-base text-muted-foreground">{description}</p>

      <div ref={setNodeRef} className="mt-8 min-h-14 space-y-14">
        <SortableContext items={projectIds} strategy={verticalListSortingStrategy}>
          {sectionProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              tasks={projectTasks.filter((t) => t.projectId === project.id)}
              expanded={expanded.has(project.id)}
              onToggleExpanded={() => onToggleExpanded(project.id)}
              onComplete={() => onComplete(project)}
              onSetCriticality={(c) => onSetCriticality(project.id, c)}
              onDelete={() => onDelete(project)}
              onAddTask={(title) => onAddTask(project.id, { title })}
              onToggleTaskDone={onToggleTaskDone}
              onSetTaskCriticality={onSetTaskCriticality}
              onDeleteTask={onDeleteTask}
              onReorderTasks={onReorderTasks}
            />
          ))}
        </SortableContext>
      </div>

      <div className="mt-6 border-l-4 border-transparent pl-5 sm:pl-6">
        {sectionProjects.length === 0 && (
          <p className="pb-1 pt-2 text-lg text-muted-foreground">No projects yet.</p>
        )}
        <GhostInput placeholder="Add a project…" onSubmit={onAddProject} />
      </div>
    </section>
  )
}

function ProjectCard({
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
  onReorderTasks,
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
  onReorderTasks: (orderedIds: string[]) => void
}) {
  const doneCount = tasks.filter((t) => t.completedAt !== null).length

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  })

  // Done tasks are shown first (in their own drag order), pending tasks
  // after (in their own drag order) — checking a task off moves it into the
  // done group automatically, without disturbing either group's order.
  const doneTasks = tasks
    .filter((t) => t.completedAt !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const pendingTasks = tasks
    .filter((t) => t.completedAt === null)
    .sort((a, b) => a.sortOrder - b.sortOrder)

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
        <div className="ml-2 mt-2 sm:ml-8">
          <TaskGroup
            tasks={doneTasks}
            onToggleTaskDone={onToggleTaskDone}
            onSetTaskCriticality={onSetTaskCriticality}
            onDeleteTask={onDeleteTask}
            onReorderTasks={onReorderTasks}
          />
          <TaskGroup
            tasks={pendingTasks}
            onToggleTaskDone={onToggleTaskDone}
            onSetTaskCriticality={onSetTaskCriticality}
            onDeleteTask={onDeleteTask}
            onReorderTasks={onReorderTasks}
          />
          <GhostInput placeholder="Add a task…" onSubmit={onAddTask} />
        </div>
      )}
    </section>
  )
}

function TaskGroup({
  tasks,
  onToggleTaskDone,
  onSetTaskCriticality,
  onDeleteTask,
  onReorderTasks,
}: {
  tasks: ProjectTask[]
  onToggleTaskDone: (id: string) => void
  onSetTaskCriticality: (id: string, c: Criticality) => void
  onDeleteTask: (id: string) => void
  onReorderTasks: (orderedIds: string[]) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (tasks.length === 0) return null

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = tasks.map((t) => t.id)
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    onReorderTasks(arrayMove(ids, oldIndex, newIndex))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="divide-y divide-border">
          {tasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              onToggleDone={() => onToggleTaskDone(t.id)}
              onSetCriticality={(c) => onSetTaskCriticality(t.id, c)}
              onDelete={() => onDeleteTask(t.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function TaskRow({
  task,
  onToggleDone,
  onSetCriticality,
  onDelete,
}: {
  task: ProjectTask
  onToggleDone: () => void
  onSetCriticality: (c: Criticality) => void
  onDelete: () => void
}) {
  const taskDone = task.completedAt !== null
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:gap-4",
        isDragging && "z-10 opacity-70",
      )}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="flex min-w-0 items-start gap-3 sm:contents">
        <button
          type="button"
          aria-label="Drag to reorder"
          className="shrink-0 cursor-grab touch-none text-muted-foreground/40 transition-opacity hover:text-muted-foreground focus-visible:opacity-100 active:cursor-grabbing sm:opacity-0 sm:group-hover:opacity-100"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <CheckBox checked={taskDone} onClick={onToggleDone} />
        <span
          className={cn(
            "min-w-0 flex-1 text-lg break-words",
            taskDone && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 pl-3 sm:contents">
        <CriticalityPicker value={task.criticality} onChange={onSetCriticality} />
        <button onClick={onDelete} className={DELETE_BTN_CLASS} aria-label="Delete task">
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

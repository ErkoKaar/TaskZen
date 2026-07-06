"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export type Criticality = "critical" | "warning" | "on_track"

export type Project = {
  id: string
  title: string
  criticality: Criticality
  createdAt: number
  completedAt: number | null
  sortOrder: number
}

export type ProjectTask = {
  id: string
  projectId: string
  title: string
  criticality: Criticality
  createdAt: number
  completedAt: number | null
}

export type ProjectCompletion = {
  id: string
  projectId: string | null
  title: string
  completedAt: number
}

export type ProjectsStoreState = {
  projects: Project[]
  projectTasks: ProjectTask[]
  completions: ProjectCompletion[]
}

const initialState: ProjectsStoreState = {
  projects: [],
  projectTasks: [],
  completions: [],
}

const SWEEP_INTERVAL_MS = 5 * 60 * 1000
const RETENTION_MS = 24 * 60 * 60 * 1000

export function useProjectsStore() {
  const [state, setState] = useState<ProjectsStoreState>(initialState)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    let active = true
    const supabase = createClient()

    // Deletes any of the user's rows completed more than 24h ago, and drops
    // them from local state (if present). Safe to call even when nothing is
    // actually stale — the .lt() filters just match zero rows.
    function sweep() {
      const cutoffIso = new Date(Date.now() - RETENTION_MS).toISOString()
      const cutoffMs = Date.now() - RETENTION_MS

      setState((s) => {
        const staleProjectIds = new Set(
          s.projects
            .filter((p) => p.completedAt !== null && p.completedAt < cutoffMs)
            .map((p) => p.id),
        )
        if (staleProjectIds.size === 0) {
          const staleTaskIds = s.projectTasks.some(
            (t) => t.completedAt !== null && t.completedAt < cutoffMs,
          )
          if (!staleTaskIds) return s
        }
        return {
          ...s,
          projects: s.projects.filter((p) => !staleProjectIds.has(p.id)),
          projectTasks: s.projectTasks.filter(
            (t) =>
              !staleProjectIds.has(t.projectId) &&
              !(t.completedAt !== null && t.completedAt < cutoffMs),
          ),
        }
      })

      supabase
        .from("projects")
        .delete()
        .lt("completed_at", cutoffIso)
        .then(({ error }) => {
          if (error) console.error("Failed to sweep stale projects", error)
        })
      supabase
        .from("project_tasks")
        .delete()
        .lt("completed_at", cutoffIso)
        .then(({ error }) => {
          if (error) console.error("Failed to sweep stale project tasks", error)
        })
    }

    async function load() {
      const [projectsRes, tasksRes, completionsRes] = await Promise.all([
        supabase
          .from("projects")
          .select("id, title, criticality, created_at, completed_at, sort_order")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("project_tasks")
          .select("id, project_id, title, criticality, created_at, completed_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("project_completions")
          .select("id, project_id, title, completed_at"),
      ])
      if (!active) return
      if (projectsRes.error) throw projectsRes.error
      if (tasksRes.error) throw tasksRes.error
      if (completionsRes.error) throw completionsRes.error

      const cutoff = Date.now() - RETENTION_MS
      const projects: Project[] = (projectsRes.data ?? [])
        .map((p) => ({
          id: p.id,
          title: p.title,
          criticality: p.criticality as Criticality,
          createdAt: new Date(p.created_at).getTime(),
          completedAt: p.completed_at ? new Date(p.completed_at).getTime() : null,
          sortOrder: p.sort_order,
        }))
        .filter((p) => p.completedAt === null || p.completedAt >= cutoff)
      const liveProjectIds = new Set(projects.map((p) => p.id))
      const projectTasks: ProjectTask[] = (tasksRes.data ?? [])
        .map((t) => ({
          id: t.id,
          projectId: t.project_id,
          title: t.title,
          criticality: t.criticality as Criticality,
          createdAt: new Date(t.created_at).getTime(),
          completedAt: t.completed_at ? new Date(t.completed_at).getTime() : null,
        }))
        .filter(
          (t) =>
            liveProjectIds.has(t.projectId) &&
            (t.completedAt === null || t.completedAt >= cutoff),
        )
      const completions: ProjectCompletion[] = (completionsRes.data ?? []).map((c) => ({
        id: c.id,
        projectId: c.project_id,
        title: c.title,
        completedAt: new Date(c.completed_at).getTime(),
      }))

      setState({ projects, projectTasks, completions })
    }

    load()
      .then(() => sweep())
      .catch((err) => console.error("Failed to load projects data", err))
    const interval = setInterval(sweep, SWEEP_INTERVAL_MS)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  const addProject = useCallback((input: { title: string; criticality?: Criticality }) => {
    const supabase = createClient()
    const maxOrder = stateRef.current.projects.reduce((max, p) => Math.max(max, p.sortOrder), -1)
    supabase
      .from("projects")
      .insert({
        title: input.title,
        criticality: input.criticality ?? "on_track",
        sort_order: maxOrder + 1,
      })
      .select("id, title, criticality, created_at, completed_at, sort_order")
      .single()
      .then(({ data, error }) => {
        if (error || !data) return console.error("Failed to add project", error)
        setState((s) => ({
          ...s,
          projects: [
            ...s.projects,
            {
              id: data.id,
              title: data.title,
              criticality: data.criticality as Criticality,
              createdAt: new Date(data.created_at).getTime(),
              completedAt: null,
              sortOrder: data.sort_order,
            },
          ],
        }))
      })
  }, [])

  const addProjectTask = useCallback(
    (projectId: string, input: { title: string; criticality?: Criticality }) => {
      const supabase = createClient()
      supabase
        .from("project_tasks")
        .insert({
          project_id: projectId,
          title: input.title,
          criticality: input.criticality ?? "on_track",
        })
        .select("id, project_id, title, criticality, created_at, completed_at")
        .single()
        .then(({ data, error }) => {
          if (error || !data) return console.error("Failed to add project task", error)
          setState((s) => ({
            ...s,
            projectTasks: [
              ...s.projectTasks,
              {
                id: data.id,
                projectId: data.project_id,
                title: data.title,
                criticality: data.criticality as Criticality,
                createdAt: new Date(data.created_at).getTime(),
                completedAt: null,
              },
            ],
          }))
        })
    },
    [],
  )

  const setProjectCriticality = useCallback((id: string, criticality: Criticality) => {
    const previous = stateRef.current.projects.find((p) => p.id === id)?.criticality
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) => (p.id === id ? { ...p, criticality } : p)),
    }))
    const supabase = createClient()
    supabase
      .from("projects")
      .update({ criticality })
      .eq("id", id)
      .then(({ error }) => {
        if (error && previous) {
          console.error("Failed to update project criticality", error)
          setState((s) => ({
            ...s,
            projects: s.projects.map((p) => (p.id === id ? { ...p, criticality: previous } : p)),
          }))
        }
      })
  }, [])

  const setTaskCriticality = useCallback((id: string, criticality: Criticality) => {
    const previous = stateRef.current.projectTasks.find((t) => t.id === id)?.criticality
    setState((s) => ({
      ...s,
      projectTasks: s.projectTasks.map((t) => (t.id === id ? { ...t, criticality } : t)),
    }))
    const supabase = createClient()
    supabase
      .from("project_tasks")
      .update({ criticality })
      .eq("id", id)
      .then(({ error }) => {
        if (error && previous) {
          console.error("Failed to update task criticality", error)
          setState((s) => ({
            ...s,
            projectTasks: s.projectTasks.map((t) =>
              t.id === id ? { ...t, criticality: previous } : t,
            ),
          }))
        }
      })
  }, [])

  // Marking a project done removes it from Projects immediately (no 24h
  // grace period like the old completed_at model) and logs it to
  // project_completions so it still counts in "Projects completed" stats.
  const completeProject = useCallback((id: string) => {
    const project = stateRef.current.projects.find((p) => p.id === id)
    if (!project) return
    const removedTasks = stateRef.current.projectTasks.filter((t) => t.projectId === id)
    const nowIso = new Date().toISOString()

    setState((s) => ({
      ...s,
      projects: s.projects.filter((p) => p.id !== id),
      projectTasks: s.projectTasks.filter((t) => t.projectId !== id),
    }))

    const supabase = createClient()
    supabase
      .from("project_completions")
      .insert({ project_id: id, title: project.title, completed_at: nowIso })
      .select("id, project_id, title, completed_at")
      .single()
      .then(({ data, error }) => {
        if (error || !data) return console.error("Failed to log project completion", error)
        setState((s) => ({
          ...s,
          completions: [
            ...s.completions,
            {
              id: data.id,
              projectId: data.project_id,
              title: data.title,
              completedAt: new Date(data.completed_at).getTime(),
            },
          ],
        }))
      })
    supabase
      .from("projects")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error("Failed to delete completed project", error)
          setState((s) => ({
            ...s,
            projects: [...s.projects, project],
            projectTasks: [...s.projectTasks, ...removedTasks],
          }))
        }
      })
  }, [])

  const toggleTaskDone = useCallback((id: string) => {
    const task = stateRef.current.projectTasks.find((t) => t.id === id)
    if (!task) return
    const nowMs = task.completedAt === null ? Date.now() : null
    const nowIso = nowMs !== null ? new Date(nowMs).toISOString() : null
    setState((s) => ({
      ...s,
      projectTasks: s.projectTasks.map((t) => (t.id === id ? { ...t, completedAt: nowMs } : t)),
    }))
    const supabase = createClient()
    supabase
      .from("project_tasks")
      .update({ completed_at: nowIso })
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error("Failed to update project task", error)
          setState((s) => ({
            ...s,
            projectTasks: s.projectTasks.map((t) =>
              t.id === id ? { ...t, completedAt: task.completedAt } : t,
            ),
          }))
        }
      })
  }, [])

  const reorderProjects = useCallback((orderedIds: string[]) => {
    const previous = stateRef.current.projects
    const byId = new Map(previous.map((p) => [p.id, p]))
    const reordered = orderedIds
      .map((id, index) => {
        const project = byId.get(id)
        return project ? { ...project, sortOrder: index } : null
      })
      .filter((p): p is Project => p !== null)

    setState((s) => ({ ...s, projects: reordered }))

    const supabase = createClient()
    Promise.all(
      reordered.map((p) => supabase.from("projects").update({ sort_order: p.sortOrder }).eq("id", p.id)),
    ).then((results) => {
      if (results.some((r) => r.error)) {
        console.error("Failed to save project order")
        setState((s) => ({ ...s, projects: previous }))
      }
    })
  }, [])

  const deleteProject = useCallback((id: string) => {
    const removedProject = stateRef.current.projects.find((p) => p.id === id)
    const removedTasks = stateRef.current.projectTasks.filter((t) => t.projectId === id)
    setState((s) => ({
      ...s,
      projects: s.projects.filter((p) => p.id !== id),
      projectTasks: s.projectTasks.filter((t) => t.projectId !== id),
    }))
    const supabase = createClient()
    supabase
      .from("projects")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error("Failed to delete project", error)
          if (removedProject) {
            setState((s) => ({
              ...s,
              projects: [...s.projects, removedProject],
              projectTasks: [...s.projectTasks, ...removedTasks],
            }))
          }
        }
      })
  }, [])

  const deleteProjectTask = useCallback((id: string) => {
    const removed = stateRef.current.projectTasks.find((t) => t.id === id)
    setState((s) => ({ ...s, projectTasks: s.projectTasks.filter((t) => t.id !== id) }))
    const supabase = createClient()
    supabase
      .from("project_tasks")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error("Failed to delete project task", error)
          if (removed) setState((s) => ({ ...s, projectTasks: [...s.projectTasks, removed] }))
        }
      })
  }, [])

  return {
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
  }
}

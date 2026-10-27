// In-browser stand-in for the Supabase client, used when the app is built
// with NEXT_PUBLIC_DEMO_MODE=1. It implements only the slice of the
// query-builder API the stores use, backed by localStorage: every visitor
// gets their own sandbox and nothing ever leaves the browser.

import { createSeed, DEMO_USER_ID, type Row, type Tables } from "./seed"

const STORAGE_KEY = "taskzen-demo-v1"

type DemoError = { message: string; code?: string }
type DemoResult = { data: unknown; error: DemoError | null }

let db: Tables | null = null

function getDb(): Tables {
  if (db) return db
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) db = JSON.parse(stored) as Tables
  } catch {
    // Unreadable or blocked storage: fall through to a fresh seed.
  }
  if (!db) {
    db = createSeed()
    save()
  }
  return db
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // Private mode / quota: the demo still works, it just won't persist.
  }
}

export function resetDemoData() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing stored to clear.
  }
  db = null
}

// Column defaults mirroring supabase/schema.sql.
const DEFAULTS: Record<string, Row> = {
  tasks: { done: false },
  habits: { archived_at: null, parent_id: null },
  projects: { criticality: "on_track", completed_at: null, sort_order: 0, section: "projects" },
  project_tasks: { criticality: "on_track", completed_at: null, sort_order: 0 },
  project_completions: { project_id: null },
}

// Mirrors the schema's foreign keys: deleting a habit removes its sub-habits
// and logs; deleting a project removes its tasks and detaches completions.
function cascadeDelete(tables: Tables, table: string, removed: Row[]) {
  const ids = new Set(removed.map((r) => r.id))
  if (ids.size === 0) return
  if (table === "habits") {
    const children = (tables.habits ?? []).filter((h) => ids.has(h.parent_id))
    children.forEach((c) => ids.add(c.id))
    tables.habits = (tables.habits ?? []).filter((h) => !ids.has(h.id))
    tables.habit_logs = (tables.habit_logs ?? []).filter((l) => !ids.has(l.habit_id))
  }
  if (table === "projects") {
    tables.project_tasks = (tables.project_tasks ?? []).filter((t) => !ids.has(t.project_id))
    for (const c of tables.project_completions ?? []) {
      if (ids.has(c.project_id)) c.project_id = null
    }
  }
}

// Parses PostgREST `or` filters of the form "col.eq.value,col.is.null".
function parseOrCondition(condition: string): (row: Row) => boolean {
  const [column, operator, ...rest] = condition.split(".")
  const value = rest.join(".")
  if (operator === "eq") return (row) => String(row[column]) === value
  if (operator === "is" && value === "null") return (row) => row[column] == null
  throw new Error(`Demo client: unsupported or() condition "${condition}"`)
}

class DemoQuery implements PromiseLike<DemoResult> {
  private action: "select" | "insert" | "update" | "delete" = "select"
  private values: Row[] = []
  private patch: Row = {}
  private filters: ((row: Row) => boolean)[] = []
  private orders: [string, boolean][] = []
  private returning = false
  private cardinality: "many" | "single" | "maybeSingle" = "many"

  constructor(private table: string) {}

  select() {
    if (this.action !== "select") this.returning = true
    return this
  }
  insert(values: Row | Row[]) {
    this.action = "insert"
    this.values = Array.isArray(values) ? values : [values]
    return this
  }
  update(patch: Row) {
    this.action = "update"
    this.patch = patch
    return this
  }
  delete() {
    this.action = "delete"
    return this
  }
  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value)
    return this
  }
  is(column: string, value: null) {
    this.filters.push((row) => (row[column] ?? null) === value)
    return this
  }
  // Like SQL, a null column never compares less than anything.
  lt(column: string, value: string) {
    this.filters.push((row) => row[column] != null && String(row[column]) < value)
    return this
  }
  or(expression: string) {
    const conditions = expression.split(",").map(parseOrCondition)
    this.filters.push((row) => conditions.some((matches) => matches(row)))
    return this
  }
  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push([column, options?.ascending ?? true])
    return this
  }
  single() {
    this.cardinality = "single"
    return this
  }
  maybeSingle() {
    this.cardinality = "maybeSingle"
    return this
  }

  then<TResult1 = DemoResult, TResult2 = never>(
    onfulfilled?: ((value: DemoResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    // Resolve asynchronously, like a network call, so callers' optimistic
    // updates run in the same order they do against Supabase.
    return Promise.resolve()
      .then(() => this.execute())
      .then(onfulfilled, onrejected)
  }

  private execute(): DemoResult {
    const tables = getDb()
    const rows = (tables[this.table] ??= [])
    const matches = (row: Row) => this.filters.every((f) => f(row))
    let result: Row[]

    if (this.action === "insert") {
      const now = new Date().toISOString()
      result = []
      for (const values of this.values) {
        const row: Row = { id: crypto.randomUUID(), created_at: now, ...DEFAULTS[this.table], ...values }
        if (
          this.table === "habit_logs" &&
          rows.some((r) => r.habit_id === row.habit_id && r.date === row.date)
        ) {
          return { data: null, error: { message: "duplicate key value", code: "23505" } }
        }
        if (this.table === "project_completions") row.completed_at ??= now
        rows.push(row)
        result.push(row)
      }
    } else if (this.action === "update") {
      result = rows.filter(matches)
      result.forEach((row) => Object.assign(row, this.patch))
    } else if (this.action === "delete") {
      result = rows.filter(matches)
      tables[this.table] = rows.filter((row) => !result.includes(row))
      cascadeDelete(tables, this.table, result)
    } else {
      result = rows.filter(matches)
    }

    if (this.action !== "select") save()
    if (this.action !== "select" && !this.returning) return { data: null, error: null }

    const sorted = [...result].sort((a, b) => {
      for (const [column, ascending] of this.orders) {
        const x = a[column] as string | number | null
        const y = b[column] as string | number | null
        if (x === y) continue
        // Postgres puts nulls last in ascending order.
        if (x == null) return ascending ? 1 : -1
        if (y == null) return ascending ? -1 : 1
        return (x < y ? -1 : 1) * (ascending ? 1 : -1)
      }
      return 0
    })
    const data = sorted.map((row) => ({ ...row }))

    if (this.cardinality === "many") return { data, error: null }
    if (data.length > 1 || (this.cardinality === "single" && data.length === 0)) {
      return { data: null, error: { message: `Expected a single row, got ${data.length}` } }
    }
    return { data: data[0] ?? null, error: null }
  }
}

export function createDemoClient() {
  return {
    from: (table: string) => new DemoQuery(table),
    auth: {
      getUser: async () => ({ data: { user: { id: DEMO_USER_ID } }, error: null }),
    },
  }
}

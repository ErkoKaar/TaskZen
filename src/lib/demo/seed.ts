// Sample data for the demo build, generated relative to today so the week
// view, habit streaks and statistics charts always look lived-in. A
// fixed-seed PRNG keeps it identical across visits (and README screenshots).

export type Row = Record<string, unknown>
export type Tables = Record<string, Row[]>

export const DEMO_USER_ID = "demo-user"

const HOUR_MS = 60 * 60 * 1000

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TASK_POOL = [
  "Answer emails",
  "Grocery run",
  "Gym session",
  "Fix flaky test",
  "Update dependencies",
  "Read research paper",
  "Laundry",
  "Water the plants",
  "Clean the desk",
  "Draft blog post",
  "Refactor auth module",
  "Send invoice",
  "Meal prep",
  "Call the bank",
  "Review budget",
  "Back up laptop",
  "Sketch logo ideas",
  "1:1 with mentor",
  "Renew bus pass",
  "Write unit tests",
]

export function createSeed(now = new Date()): Tables {
  const rand = mulberry32(20261027)
  let counter = 0
  const id = (prefix: string) => `${prefix}-${++counter}`

  // Calendar arithmetic via the Date constructor so DST shifts can't skip or
  // repeat a day.
  const day = (offset: number, hour = 9, minute = 0) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, minute)
  const dayKey = (offset: number) => {
    const d = day(offset)
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    return `${d.getFullYear()}-${m}-${dd}`
  }
  const hoursAgo = (h: number) => new Date(now.getTime() - h * HOUR_MS).toISOString()

  // Tasks: a busy past month, today's list, and a few upcoming ones.
  const tasks: Row[] = []
  const addTask = (offset: number, title: string, done: boolean, order: number) =>
    tasks.push({
      id: id("task"),
      title,
      date: dayKey(offset),
      done,
      // Planned the evening before, and never later than yesterday.
      created_at: day(Math.min(offset - 1, -1), 18, order).toISOString(),
    })

  for (let offset = -45; offset <= -1; offset++) {
    const count = 1 + Math.floor(rand() * 4)
    const doneChance = offset === -1 ? 1 : 0.85
    for (let i = 0; i < count; i++) {
      addTask(offset, TASK_POOL[Math.floor(rand() * TASK_POOL.length)], rand() < doneChance, i)
    }
  }
  const today: [string, boolean][] = [
    ["Review pull requests", true],
    ["Write the weekly update", true],
    ["Prepare slides for Thursday's demo", false],
    ["Book a dentist appointment", false],
  ]
  today.forEach(([title, done], i) => addTask(0, title, done, i))
  const upcoming: [number, string][] = [
    [1, "Team retro"],
    [2, "Pay rent"],
    [3, "Call grandma"],
    [4, "Submit expense report"],
    [5, "Plan weekend hike"],
  ]
  upcoming.forEach(([offset, title], i) => addTask(offset, title, false, i))

  // Habits: one parent with sub-habits, a few standalone ones and one archived
  // habit whose history still shows up in statistics.
  const habits: Row[] = []
  const habitLogs: Row[] = []
  const habitCreated = day(-120)
  const addHabit = (name: string, opts: { parentId?: string; archivedDaysAgo?: number } = {}) => {
    const habit = {
      id: id("habit"),
      name,
      created_at: new Date(habitCreated.getTime() + habits.length * 60_000).toISOString(),
      archived_at: opts.archivedDaysAgo ? day(-opts.archivedDaysAgo).toISOString() : null,
      parent_id: opts.parentId ?? null,
    }
    habits.push(habit)
    return habit.id
  }
  // History up to yesterday is random apart from an unbroken `streak` of
  // recent days; today is set explicitly so the visitor has some left to tick.
  const logHabit = (
    habitId: string,
    chance: number,
    opts: { streak?: number; doneToday?: boolean; untilDaysAgo?: number } = {},
  ) => {
    const { streak = 0, doneToday = false, untilDaysAgo = 1 } = opts
    for (let offset = -90; offset <= -untilDaysAgo; offset++) {
      if (offset >= -streak || rand() < chance) habitLogs.push({ habit_id: habitId, date: dayKey(offset) })
    }
    if (doneToday) habitLogs.push({ habit_id: habitId, date: dayKey(0) })
  }

  const morning = addHabit("Morning routine")
  logHabit(addHabit("Stretch for 10 minutes", { parentId: morning }), 0.85, { doneToday: true })
  logHabit(addHabit("Drink a glass of water", { parentId: morning }), 0.9, { streak: 14, doneToday: true })
  logHabit(addHabit("Journal", { parentId: morning }), 0.6)
  logHabit(addHabit("Read 20 pages"), 0.7, { streak: 6 })
  logHabit(addHabit("Workout"), 0.55, { doneToday: true })
  logHabit(addHabit("Learn Spanish"), 0.75, { streak: 9, doneToday: true })
  logHabit(addHabit("No phone after 22:00"), 0.5)
  logHabit(addHabit("Cold shower", { archivedDaysAgo: 25 }), 0.4, { untilDaysAgo: 25 })

  // Projects: done tasks are recent because the app sweeps anything completed
  // more than 24h ago.
  const projects: Row[] = []
  const projectTasks: Row[] = []
  const addProject = (
    section: "projects" | "personal",
    title: string,
    criticality: string,
    items: [string, string, number?][],
  ) => {
    const projectId = id("project")
    projects.push({
      id: projectId,
      title,
      criticality,
      created_at: day(-30 + projects.length).toISOString(),
      completed_at: null,
      sort_order: projects.filter((p) => p.section === section).length,
      section,
    })
    items.forEach(([taskTitle, taskCriticality, doneHoursAgo], i) =>
      projectTasks.push({
        id: id("ptask"),
        project_id: projectId,
        title: taskTitle,
        criticality: taskCriticality,
        created_at: day(-20 + i).toISOString(),
        completed_at: doneHoursAgo === undefined ? null : hoursAgo(doneHoursAgo),
        sort_order: i,
      }),
    )
  }

  addProject("projects", "TaskZen v2", "critical", [
    ["Ship demo mode", "on_track", 2],
    ["Rewrite the README", "critical"],
    ["Record a product walkthrough", "warning"],
    ["Add CSV export", "on_track"],
  ])
  addProject("projects", "Portfolio website", "on_track", [
    ["Pick a font pairing", "on_track", 5],
    ["Write case studies", "warning"],
    ["Set up analytics", "on_track"],
  ])
  addProject("projects", "Thesis: literature review", "warning", [
    ["Meet supervisor", "critical"],
    ["Summarise five core papers", "warning"],
    ["Update bibliography", "on_track"],
  ])
  addProject("personal", "Move apartment", "warning", [
    ["Order moving boxes", "on_track", 3],
    ["Cancel internet contract", "critical"],
    ["Book movers", "warning"],
  ])
  addProject("personal", "Lisbon trip in May", "on_track", [
    ["Compare flight prices", "on_track"],
    ["Find a place near Alfama", "on_track"],
  ])

  // Completion log behind the "Projects completed" statistic.
  const completed: [string, number][] = [
    ["Q3 report", 2],
    ["Garage cleanup", 6],
    ["Budget spreadsheet", 11],
    ["Landing page refresh", 19],
    ["Learn TypeScript generics", 33],
    ["Bike repair", 58],
    ["Tax return", 96],
    ["Photo album", 150],
    ["Conference talk", 210],
  ]
  const projectCompletions: Row[] = completed.map(([title, daysAgo]) => ({
    id: id("completion"),
    project_id: null,
    title,
    completed_at: day(-daysAgo, 17).toISOString(),
  }))

  return {
    profiles: [{ id: DEMO_USER_ID, username: "demo" }],
    tasks,
    habits,
    habit_logs: habitLogs,
    projects,
    project_tasks: projectTasks,
    project_completions: projectCompletions,
  }
}

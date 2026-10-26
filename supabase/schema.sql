-- User profiles: a username for each account, used to log in instead of an
-- email address. Looking up the email for a given username at login time
-- requires the service-role key (see src/lib/supabase/admin.ts), since this
-- happens before the user is authenticated.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users manage their own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Task Manager schema: tasks, habits, daily habit-completion logs.
-- Scoped per-user via auth.uid() — each user only sees their own data.

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  date date not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  -- Soft-delete: set when a habit is archived. While set, the habit is
  -- hidden from the active list and from future days, but its history
  -- (habit_logs, statistics) stays intact. Null = active.
  archived_at timestamptz,
  -- Sub-habits: a habit with parent_id set is a child of another habit.
  -- Parents are never logged directly — a parent's daily "done" state is
  -- derived (all its children logged that day). One level only: a child
  -- never has children of its own. on delete cascade so deleting a parent
  -- removes its children (and their habit_logs cascade in turn).
  parent_id uuid references habits(id) on delete cascade
);

-- Backfill for installs that ran this schema before sub-habits existed.
alter table habits add column if not exists parent_id uuid references habits(id) on delete cascade;
create index if not exists habits_parent_id_idx on habits (parent_id);

create table if not exists habit_logs (
  habit_id uuid not null references habits(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  primary key (habit_id, date)
);

alter table tasks enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;

create policy "Users manage their own tasks" on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own habits" on habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own habit_logs" on habit_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Push notification subscriptions for the focus timer.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "Users manage their own push subscriptions" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Server-scheduled notifications for the focus timer.
-- A Supabase Edge Function (send-due-notifications), run on a pg_cron schedule,
-- sends these via web-push once `send_at` has passed — independent of whether
-- the client is open, so it works even with a locked screen / closed app.

create table if not exists scheduled_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  send_at timestamptz not null,
  title text not null,
  body text not null,
  sent boolean not null default false,
  created_at timestamptz not null default now()
);

alter table scheduled_notifications enable row level security;

create policy "Users manage their own scheduled notifications" on scheduled_notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists scheduled_notifications_due_idx
  on scheduled_notifications (send_at)
  where not sent;

-- Projects schema: a separate, project-based task model — independent of
-- the date-based `tasks` table used by daily Tasks/Habits. Both projects
-- and their project_tasks carry an independent criticality marker and an
-- independent completed_at, which drives a 24h auto-delete sweep run from
-- the client (see src/lib/tasks/projects-store.ts). project_completions is
-- a permanent log that survives that deletion, so historical stats
-- ("Projects completed") aren't lost once the live row is gone.

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  criticality text not null default 'on_track'
    check (criticality in ('critical', 'warning', 'on_track')),
  created_at timestamptz not null default now(),
  -- null = not done. Set = done; row is hard-deleted ~24h after this is set
  -- (client-side sweep on load, see projects-store.ts).
  completed_at timestamptz,
  -- Drag-and-drop display order (see reorderProjects in projects-store.ts).
  sort_order integer not null default 0,
  -- Which top-level section the project is grouped under on the Projects
  -- page. Projects can be dragged between sections (see reorderProjects).
  section text not null default 'projects'
    check (section in ('projects', 'personal'))
);

create table if not exists project_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  criticality text not null default 'on_track'
    check (criticality in ('critical', 'warning', 'on_track')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  -- Drag-and-drop display order within a project (see reorderProjectTasks in
  -- projects-store.ts). Done/pending tasks are ordered independently within
  -- their own group, not against each other.
  sort_order integer not null default 0
);

-- Backfill for installs that ran this schema before these columns existed.
alter table projects add column if not exists section text not null default 'projects'
  check (section in ('projects', 'personal'));
alter table project_tasks add column if not exists sort_order integer not null default 0;

-- Permanent completion log for *projects* (not project_tasks). Written the
-- moment a project is ticked done, independent of the live `projects` row's
-- 24h lifecycle. This is the sole source of truth for the "Projects
-- completed" statistic once the live row is gone. project_id uses
-- on delete set null (not cascade) since the whole point is to outlive it.
create table if not exists project_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  title text not null, -- snapshot: survives the project row's deletion
  completed_at timestamptz not null default now()
);

alter table projects enable row level security;
alter table project_tasks enable row level security;
alter table project_completions enable row level security;

create policy "Users manage their own projects" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own project_tasks" on project_tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own project_completions" on project_completions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists project_tasks_project_id_idx on project_tasks (project_id);

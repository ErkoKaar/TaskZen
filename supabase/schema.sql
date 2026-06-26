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

-- FocusLoop schema: activities + completed focus sessions.
-- Scoped per-user via auth.uid() — each user only sees their own data.

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null default now(),
  -- Lets the client-side default-activity seeding use upsert+ignoreDuplicates,
  -- so a double-seed race (two tabs, Strict Mode double effect) is a no-op.
  unique (user_id, name)
);

create table if not exists focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  activity_id uuid references activities(id) on delete set null,
  focused_seconds integer not null,
  rounds integer not null,
  started_at timestamptz not null,
  completed_at timestamptz not null default now()
);

alter table activities enable row level security;
alter table focus_sessions enable row level security;

create policy "Users manage their own activities" on activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own focus_sessions" on focus_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No seed insert here — the app seeds each new user's 8 default activities
-- client-side the first time they load with an empty list (see
-- src/lib/focusloop/activities.ts), since rows now need a real auth.uid().

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
  archived_at timestamptz
);

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

-- Live FocusLoop session state — persisted (not just React state) so an
-- active session survives navigating elsewhere in the app or reloading the
-- page, and is synced in real time across every device signed into the same
-- account. A row only exists while a session is active; phase='done' is the
-- transient "session complete" card, shown until the user starts a new
-- session or dismisses it (both delete this row).
--
-- secondsLeft is derived client-side as
-- phase_seconds_left - (now() - phase_started_at) while running, or just
-- phase_seconds_left (frozen) while paused — never ticked/stored directly.

create table if not exists focus_timer_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  activity_id uuid references activities(id) on delete set null,
  phase text not null check (phase in ('focus', 'rest', 'done')),
  running boolean not null default true,
  current_round integer not null default 1,
  rounds integer not null,
  focus_min integer not null,
  rest_min integer not null,
  phase_started_at timestamptz not null default now(),
  phase_seconds_left integer not null,
  focused_seconds_accumulated integer not null default 0,
  session_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table focus_timer_state enable row level security;

create policy "Users manage their own timer state" on focus_timer_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Required for cross-device sync: Realtime only streams changes for tables
-- added to this publication. Guarded so re-running this file is a no-op.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'focus_timer_state'
  ) then
    alter publication supabase_realtime add table focus_timer_state;
  end if;
end $$;

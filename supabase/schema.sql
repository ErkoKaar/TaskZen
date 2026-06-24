-- FocusLoop schema: activities + completed focus sessions.
-- No auth yet, so all data is shared/public — tighten policies once login is added.

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  created_at timestamptz not null default now()
);

create table if not exists focus_sessions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references activities(id) on delete set null,
  focused_seconds integer not null,
  rounds integer not null,
  started_at timestamptz not null,
  completed_at timestamptz not null default now()
);

alter table activities enable row level security;
alter table focus_sessions enable row level security;

create policy "Public can read activities" on activities
  for select using (true);
create policy "Public can insert activities" on activities
  for insert with check (true);

create policy "Public can read focus_sessions" on focus_sessions
  for select using (true);
create policy "Public can insert focus_sessions" on focus_sessions
  for insert with check (true);

-- Run once, to seed the same defaults the prototype shipped with.
insert into activities (name, color) values
  ('Deep Work', 'var(--chart-1)'),
  ('Reading', 'var(--chart-2)'),
  ('Studying', 'var(--chart-3)'),
  ('Writing', 'var(--chart-4)'),
  ('Coding', 'var(--chart-1)'),
  ('Design', 'var(--chart-2)'),
  ('Music Practice', 'var(--chart-3)'),
  ('Language Learning', 'var(--chart-4)');

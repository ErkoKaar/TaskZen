<p align="center">
  <img src="public/taskzen_pulse_v3_transparent.png" alt="TaskZen logo" width="132">
</p>

<h1 align="center">TaskZen</h1>

<p align="center">
  Today's tasks, long-running projects and daily habits in one calm, installable app.
</p>

<p align="center">
  <a href="https://taskzen-demo.vercel.app"><img src="https://img.shields.io/badge/Try_the_live_demo-35c4dd?style=for-the-badge" alt="Try the live demo"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs" alt="Next.js 16">
  <img src="https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4">
  <img src="https://img.shields.io/badge/Supabase-Postgres_+_Auth-3ecf8e?style=flat-square&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/PWA-installable-5a0fc8?style=flat-square&logo=pwa&logoColor=white" alt="Installable PWA">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue?style=flat-square" alt="GPL-3.0 license">
</p>

<br>

<p align="center">
  <img src="docs/screenshots/tasks.png" alt="TaskZen Tasks view: today's habits and tasks with a weekly progress strip" width="100%">
</p>

> [!NOTE]
> The demo needs no account. It opens with a few weeks of sample data, and everything you change is saved in your own browser only. Reset it anytime from the account menu in the top right.

## What's inside

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="public/icons/tasks.svg" width="28" alt=""><br>
      <b>Tasks</b><br>
      A list per day with a week or month strip that shows how each day went. Your daily habits appear on every day next to the tasks, so the whole day is on one screen.
    </td>
    <td width="50%" valign="top">
      <img src="public/icons/projects.svg" width="28" alt=""><br>
      <b>Projects</b><br>
      Work and personal projects, each with its own subtasks and a red, yellow or green status. Drag to reorder or move a project between sections. Finished items clear themselves after 24 hours.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="public/icons/habits.svg" width="28" alt=""><br>
      <b>Habits</b><br>
      Streaks for every habit, and sub-habits: drag one habit onto another to group it, and the parent counts as done once all of its children are. Archived habits keep their history.
    </td>
    <td width="50%" valign="top">
      <img src="public/icons/statistics.svg" width="28" alt=""><br>
      <b>Statistics</b><br>
      Habit completion and tasks done per day for the week, month, year or all time, plus a permanent log of finished projects.
    </td>
  </tr>
</table>

It also installs as an app on phone or desktop (PWA), and you sign in with a username instead of an email address.

## Screenshots

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/projects.png" alt="Projects view with status dots and progress bars"></td>
    <td width="50%"><img src="docs/screenshots/habits.png" alt="Habits view with sub-habits, streaks and archived habits"></td>
  </tr>
  <tr>
    <td colspan="2"><img src="docs/screenshots/statistics.png" alt="Statistics view with habit completion and tasks-per-day charts"></td>
  </tr>
</table>

<p align="center">
  <img src="docs/screenshots/mobile-tasks.png" alt="Tasks on a phone" width="30%">
  &nbsp;
  <img src="docs/screenshots/mobile-projects.png" alt="Projects on a phone" width="30%">
  &nbsp;
  <img src="docs/screenshots/mobile-statistics.png" alt="Statistics on a phone" width="30%">
</p>

## How it works

There is no separate backend. The browser talks to Supabase directly, and Postgres Row Level Security decides what each user can read and write. Only login needs elevated rights, so it runs as a Next.js Server Action.

```mermaid
flowchart LR
  subgraph Browser["Browser / installed PWA"]
    UI["Pages + stores<br/>(optimistic updates)"]
  end
  subgraph Next["Next.js on Vercel"]
    SA["Server Action<br/>signIn / signUp"]
    PX["proxy.ts<br/>session refresh"]
  end
  subgraph Supabase
    AUTH["Auth"]
    DB[("Postgres<br/>+ RLS")]
  end
  UI -- "tasks, habits, projects" --> DB
  UI -- "username + password" --> SA
  SA -- "service role: username → email" --> DB
  SA -- "signInWithPassword" --> AUTH
  PX -- "refresh cookie" --> AUTH
```

- **Optimistic UI.** Ticking, editing, reordering and deleting update the screen first and are written to Supabase in the background. If a write fails, the change is rolled back.
- **Username login.** A `profiles` table maps usernames to accounts. The server looks up the email with the service-role key, which never reaches the browser, and then signs in through Supabase Auth.
- **Demo mode.** With `NEXT_PUBLIC_DEMO_MODE=1` the Supabase client is swapped for a small in-browser implementation backed by `localStorage` ([`src/lib/demo`](src/lib/demo)), seeded with sample data relative to today. Auth is skipped and no keys are needed, which is how the [live demo](https://taskzen-demo.vercel.app) runs.

## Tech stack

| Layer | Tools |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS 4, Base UI, lucide-react, Geist and Martian Mono |
| Interaction | dnd-kit for drag and drop, Recharts for charts |
| Data and auth | Supabase Postgres with Row Level Security, Supabase Auth via `@supabase/ssr` |
| Hosting | Vercel, with a custom service worker for the installable PWA |

## Getting started

1. Install dependencies and create your env file:

   ```bash
   npm install
   cp .env.local.example .env.local
   ```

2. Fill in `.env.local` from your Supabase project (Settings → API):

   | Variable | Used for |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser access, limited by RLS |
   | `SUPABASE_SERVICE_ROLE_KEY` | Server-only: username lookup at login and profile creation at sign-up |

3. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor. It creates every table and RLS policy.

4. Start the dev server and open [localhost:3102](http://localhost:3102):

   ```bash
   npm run dev
   ```

To try the app without Supabase, skip steps 2 and 3 and start it in demo mode:

```bash
NEXT_PUBLIC_DEMO_MODE=1 npm run dev
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3102 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

## Project structure

```
src/
  app/
    page.tsx               Redirects to /tasks
    tasks/                 Tasks, Projects, Habits and Statistics pages
    login/, register/      Username-based auth pages
    manifest.ts            PWA manifest
  components/
    site-header.tsx        Logo, page tabs and account menu
    site-nav-tabs.tsx      Sliding pill tabs on desktop, dropdown on mobile
    account-menu.tsx       Username and sign out (reset in the demo)
    app-splash.tsx         Splash screen until the session check resolves
    tasks/                 Checkbox, criticality picker, inline inputs, view tabs
  lib/
    tasks/store.ts         Tasks and habits state, synced with Supabase
    tasks/projects-store.ts  Projects state, drag-and-drop order, 24h cleanup
    auth/actions.ts        signIn, signUp and signOut server actions
    supabase/              Browser, server and service-role clients
    demo/                  Demo mode: in-browser client and sample data
  proxy.ts                 Session refresh and login redirect (Next.js 16's middleware)
supabase/schema.sql        Tables and RLS policies
public/sw.js               Service worker
```

## License

[GPL-3.0](LICENSE)

# Focus Timer

A circular focus-timer app (Pomodoro-style) that helps users track where their focused time goes. Ultimately a Progressive Web App (PWA), usable on both desktop and mobile.

## Problem / Idea

People want to measure the time they spend focusing and clearly see which activities they actually spend the most time on. The app provides a simple circular timer tied to a specific activity, and keeps long-term statistics broken down by activity.

## MVP Core Features

### 1. User Accounts
- A user creates an account with a username + password (no email confirmation required).
- On subsequent visits, the user logs in with username + password.
- **Usernames must be unique** in the system — if a name is already taken, an error message is shown.
- **Limit:** the system may have a maximum of **5 users** at any time (artificial MVP constraint).
  - On the 6th registration attempt, a message is shown that the user limit has been reached (registration fails; no existing user is deleted or replaced).
- This is not "real" authentication from a security standpoint (see [Technical Notes](#technical-notes) below) — the goal is user separation, not security.

### 2. Focus Timer
- A circular timer, duration selectable in the range of **5–360 minutes**.
- The user selects an **activity**:
  - from a list of existing activities (a shared/global list available to all users), or
  - by creating a new activity, which is added to that same shared list.
  - **Renaming** an activity applies retroactively (past statistics display under the new name).
  - **Deleting** an activity does not delete its related statistics — those remain fixed (e.g. under the old name/label).
- The user selects how many **rounds** of the activity to do.
  - 1 round = 1 focus period + 1 rest period.
  - **Exception:** the last round has no rest period — the session ends with the final focus period.
  - The rest period duration can be set by the user in advance (a value separate from focus duration).
- **Cancel** button:
  - Stops the current session (during either the focus or rest period).
  - **Only the focus time already elapsed is saved.** Rest time is never recorded in the statistics, regardless of whether the session was cancelled or completed normally.
- When a timer (focus or rest) reaches zero:
  - The user is shown a **notification** plus a **sound effect**.
  - The notification must work even in the background/on a locked screen (a real browser/push notification, not just an in-app alert).
- When the user completes a **full session** (all rounds through to the end, including the final focus period):
  - The app displays an encouraging/motivational message.

### 3. Statistics View
- A separate menu view for saved data.
- Time filters: **day / week / month / year / all-time**.
- Displays a list of activities, sorted in **descending order** by accumulated focus time (the activity with the most time spent is listed first).
- The **top 3 activities** are visually distinguished (e.g. larger font, separate cards, colors/medals).
- In addition to the list, a **visual chart** (e.g. a bar chart per activity) is shown, reflecting the selected time period (day/week/month/year/all-time).

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript |
| Backend | Spring Boot |
| Database | PostgreSQL (production), H2 optional for local development/testing |
| IDE | IntelliJ IDEA |
| Platform | PWA (offline support + push notifications) |

## Responsiveness (UI)

- The application's UI must work equally well on **both desktop and mobile phones** (responsive design).
- This is a separate requirement from PWA support: PWA makes the app installable/launchable on mobile, but the UI components (circular timer, statistics list, chart, menus) need to be designed flexibly for different screen sizes from the start, not bolted on afterward.
- In practice this means things like: flexbox/grid-based layout, relative sizing units (rem/%/vh), touch-friendly button sizes on mobile, and the timer circle scaling with screen width.

## Offline & Sync Behavior

- **The timer itself must work offline** (e.g. with no internet on a plane) — this is the main reason for using a PWA.
- If a session happens offline, data is saved locally on the device.
- **Statistics in the database update once the user is back online** (sync) — they don't need to update in real time while offline.

## Technical Notes

- **User accounts are not security-critical.** This is a simple username+password system for personal/small-group use (max 5 users), **not** a production-grade authentication system. JWT/OAuth/email verification are not needed for the MVP — a simple backend check is sufficient.
- **Push notifications** require a Service Worker and the browser Notification API — this is one of the more complex parts of the PWA and is worth a dedicated technical spike before main development.
- **Offline support** requires a Service Worker plus local storage (e.g. IndexedDB) for timer state and session data before syncing to the server.
- **Activity deletion** requires a "soft delete" approach (e.g. a `deleted` flag in the database) rather than actually removing the row — otherwise the statistics would lose their reference to the activity.

## Out of MVP Scope (v2+)

- OAuth/email-based authentication
- Native mobile app (Capacitor/Cordova) — stays a pure PWA for now
- Per-user personal activity lists (currently shared across all users)
- More than 5 users
- Social/sharing features

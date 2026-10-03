# NTM — Nook Task Manager

Mobile-first task manager. Add → Organize → Prioritize → Plan → Execute →
Complete → Analyze. No task wheel, no randomization — you decide what
happens next.

## Stack

- **Backend:** Node.js + Express, using Node's **built-in `node:sqlite`**
  module for storage (not the `sqlite3` or `better-sqlite3` npm packages).
  This matters for Termux: `node:sqlite` ships inside Node itself, so
  there's nothing for node-gyp to compile and no native-module install
  pain. It requires **Node >= 22.5**.
- **Frontend:** plain HTML/CSS/JS, no build step, no framework. Open the
  page and it runs — nothing to bundle from Termux.
- **Database file:** `data/ntm.sqlite` (created automatically on first
  run). This is the single source of truth; the browser never uses
  localStorage for task data.

## Running it on Termux

```bash
# check your Node version first — must be 22.5 or newer
node --version

# if you need a newer Node in Termux:
pkg update && pkg install nodejs

# from the ntm/ folder:
npm install       # installs Express only — pure JS, no compilation
npm start         # or: node server.js
```

Then open `http://localhost:3000` in the browser (Termux or otherwise,
same device).

Test the API directly with curl if useful:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/tasks
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Finish Nook UI","priority":"high","estimatedMinutes":90,"dueDate":"2026-09-04"}'
```

### If your Termux Node is older than 22.5

Either upgrade Node (`pkg install nodejs` usually gets you current), or
tell me and I'll swap `db/database.js` to use the `sqlite3` npm package
instead — it'll need Termux's build tools (`pkg install python make
clang`) since that one does compile a native module.

## Project layout

```
ntm/
├── server.js              Express app entrypoint
├── db/database.js         Schema, seeding, node:sqlite connection
├── routes/
│   ├── tasks.js            Task CRUD, filtering, complete/start actions
│   ├── categories.js       Category CRUD
│   ├── stats.js            Dashboard + statistics aggregation (real data)
│   └── settings.js         Profile name, export, reset
├── public/
│   ├── index.html          App shell: topbar, nav, modal/toast hosts
│   ├── css/style.css       Design tokens + all component styles
│   └── js/
│       ├── api.js          fetch wrapper for the backend
│       ├── charts.js       Dependency-free inline SVG charts
│       └── app.js          Router, page renders, task modal, events
└── data/ntm.sqlite         Created on first run — this is your data
```

## What's implemented (Phases 1–8 of the spec)

- **Database:** tasks, categories, settings tables with the full field
  set from the spec (status, priority, category, due date, scheduled
  time, estimated/actual duration, position, timestamps), seeded with
  the six default categories.
- **API:** full CRUD for tasks and categories, complete/start actions,
  filtering by when/status/priority/category, search, dashboard and
  statistics aggregation endpoints, export/reset.
- **Home:** greeting, today's progress (real percent from today's
  tasks), today's focus (highest-priority active task), quick stat
  cards with sparklines, upcoming list.
- **Tasks:** search, When/category pill filters, grouped-by-date task
  cards, tap-to-complete, tap-to-edit.
- **Add/Edit Task modal:** the central `+` button opens this — title,
  notes, priority, category, due date, schedule, estimate, delete.
- **Statistics:** completed/focus/rate summary cards, a productivity
  area chart, a focus-time bar chart, a category breakdown — all
  computed from SQLite, with real empty states when there's no data
  yet (never fake chart data).
- **Account:** display name, category management (add/delete), JSON
  export, "clear all tasks" with confirmation.
- **Theme:** near-black + dark olive surfaces + lime/yellow-green
  accent, exactly as specified — rounded cards, pill filters, elevated
  central Add button.

## Not yet built (later phases)

- **Planning/schedule timeline view** (Phase 7's `MY PLAN` vertical
  timeline with now/next markers) — the data model supports it
  (`scheduledTime` on every task), but there's no dedicated timeline
  screen yet. Currently, "today" ordering surfaces this on the Tasks
  and Home screens instead.
- Drag-to-reorder for the `position` field (currently set on create
  only).
- Weekly/monthly toggle only exists on the Statistics page; Home's
  sparklines are fixed to the last 7 days.

Tell me which of these to build next, or point me at anything that
doesn't feel right once you've run it on-device.

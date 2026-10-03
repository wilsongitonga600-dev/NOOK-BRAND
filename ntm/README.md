Nook Task Manager

NTM (Nook Task Manager) is a lightweight, mobile-first task management application built by NOOK.

The project is focused on helping users organize tasks, prioritize work, stay focused, and understand their progress through a simple interface.

✦ Features

- Task Management — Create, edit, complete, pause, start, and delete tasks.
- Priorities — Critical, High, Medium, and Low priority levels.
- Categories — Organize tasks by Work, Personal, Study, Project, Errands, and custom categories.
- Scheduling — Due dates, scheduled times, and estimated task durations.
- Focus Sessions — Track focused time spent working on tasks.
- Progress Statistics — Completion progress, focus time, trends, and task breakdowns.
- Search & Filtering — Find tasks by status, priority, category, date, or search term.
- Data Export — Export task and category data as JSON.
- Responsive UI — Designed primarily for mobile while adapting to larger screens.

⚙️ Tech Stack

Frontend

- HTML
- CSS
- Vanilla JavaScript

Backend

- Node.js
- Express

Current Database

- SQLite
- Node.js built-in "node:sqlite" API

Planned Cloud Backend

- Supabase
- PostgreSQL
- Supabase Auth
- Row Level Security (RLS)

Supabase is planned as the next backend stage, providing authentication, user-owned data, cloud persistence, and cross-device synchronization.

📁 Project Structure

ntm/
├── db/
│   └── database.js
├── public/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── api.js
│       ├── app.js
│       └── charts.js
├── routes/
│   ├── categories.js
│   ├── settings.js
│   ├── stats.js
│   └── tasks.js
├── data/
├── server.js
├── package.json
└── README.md

🚀 Run Locally

npm install
npm start

Then open:

http://localhost:3000

🗄️ Database Direction

The current development version uses a local SQLite database so NTM can run simply without a separate database server.

The planned Supabase architecture will introduce:

Supabase Auth
      │
      ▼
   Profiles
      │
 ┌────┼─────────────┐
 ▼    ▼             ▼
Tasks Categories  Settings
 │
 ▼
Focus Sessions

This will allow NTM to move from a local single-user application toward an authenticated, multi-user, cloud-backed application.

📌 Current Status

NTM is actively under development.

The current version provides the core task-management system, local persistence, focus sessions, statistics, categories, data export, and responsive interface.

The next major stage is the Supabase backend migration.

SQLite Note

The project has had SQLite-based development and experimentation, including the separate "sqlite3" package in earlier work. The current version, however, uses Node.js's built-in "node:sqlite" API rather than "sqlite3".

---

NOOK

NTM is part of the NOOK ecosystem — a collection of independent applications, games, tools, and experiments.

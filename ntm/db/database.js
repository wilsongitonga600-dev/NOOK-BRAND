// NTM database layer.
//
// Uses Node's built-in `node:sqlite` module (DatabaseSync) instead of the
// `sqlite3` or `better-sqlite3` npm packages. This is deliberate for the
// Termux/Android dev environment: node:sqlite ships inside Node itself
// (Node >= 22.5), so there is nothing to compile with node-gyp and no
// native-module install headaches. If the Termux Node version is older
// than 22.5, upgrade Node rather than swapping this module out.

const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'ntm.sqlite');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

// Pragmas: WAL is friendlier to a single local Node process that may be
// stopped/restarted a lot during development, and foreign_keys keeps
// category deletes honest.
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    color      TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    title             TEXT NOT NULL,
    description       TEXT,
    status            TEXT NOT NULL DEFAULT 'not_started'
                        CHECK (status IN ('not_started','in_progress','completed','paused')),
    priority          TEXT NOT NULL DEFAULT 'medium'
                        CHECK (priority IN ('critical','high','medium','low')),
    category_id       INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    due_date          TEXT,      -- ISO date, e.g. 2026-09-04
    scheduled_time    TEXT,      -- ISO datetime, e.g. 2026-09-04T09:00:00
    estimated_minutes INTEGER,
    actual_minutes    INTEGER,
    position          INTEGER NOT NULL DEFAULT 0,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at      TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Phase 10 (Execution): a focus session is one continuous start→pause
// (or start→complete) stretch of work on a task. actual_minutes on the
// task is derived by summing these, rather than being hand-entered —
// see routes/tasks.js focus/* handlers.
db.exec(`
  CREATE TABLE IF NOT EXISTS focus_sessions (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id           INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    started_at        TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at          TEXT,
    duration_minutes  INTEGER,
    created_at        TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);');
db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);');
db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_scheduled ON tasks(scheduled_time);');
db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category_id);');
db.exec('CREATE INDEX IF NOT EXISTS idx_focus_sessions_task ON focus_sessions(task_id);');

// Seed default categories exactly once.
const categoryCount = db.prepare('SELECT COUNT(*) AS n FROM categories').get().n;
if (categoryCount === 0) {
  const insertCategory = db.prepare('INSERT INTO categories (name) VALUES (?)');
  for (const name of ['Work', 'Personal', 'Study', 'Project', 'Errands', 'Other']) {
    insertCategory.run(name);
  }
}

// Seed default settings once.
const defaultSettings = {
  display_name: 'there',
};
const getSetting = db.prepare('SELECT value FROM settings WHERE key = ?');
const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(defaultSettings)) {
  if (!getSetting.get(key)) {
    insertSetting.run(key, value);
  }
}

module.exports = db;

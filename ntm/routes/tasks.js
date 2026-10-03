const express = require('express');
const db = require('../db/database');

const router = express.Router();

const VALID_STATUS = ['not_started', 'in_progress', 'completed', 'paused'];
const VALID_PRIORITY = ['critical', 'high', 'medium', 'low'];

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function serializeTask(row, activeSession) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    categoryId: row.category_id,
    categoryName: row.category_name || null,
    dueDate: row.due_date,
    scheduledTime: row.scheduled_time,
    estimatedMinutes: row.estimated_minutes,
    actualMinutes: row.actual_minutes,
    position: row.position,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    sessionCount: row.session_count || 0,
    activeSession: activeSession ? { id: activeSession.id, startedAt: activeSession.started_at } : null,
  };
}

function getActiveSession(taskId) {
  return db.prepare('SELECT * FROM focus_sessions WHERE task_id = ? AND ended_at IS NULL ORDER BY id DESC LIMIT 1').get(taskId);
}

// Closes whatever open session exists for a task (if any), recording
// its real duration from wall-clock time. Returns the duration in
// minutes, or null if there was nothing open to close.
function closeOpenSession(taskId) {
  const open = getActiveSession(taskId);
  if (!open) return null;
  const row = db.prepare("SELECT CAST(ROUND((julianday('now') - julianday(?)) * 24 * 60) AS INTEGER) AS mins").get(open.started_at);
  const duration = Math.max(row.mins || 0, 0);
  db.prepare("UPDATE focus_sessions SET ended_at = datetime('now'), duration_minutes = ? WHERE id = ?").run(duration, open.id);
  return duration;
}

function sumSessionMinutes(taskId) {
  const row = db.prepare('SELECT SUM(duration_minutes) AS total FROM focus_sessions WHERE task_id = ? AND duration_minutes IS NOT NULL').get(taskId);
  return row.total || 0;
}

const BASE_SELECT = `
  SELECT tasks.*, categories.name AS category_name, COALESCE(fs.session_count, 0) AS session_count
  FROM tasks
  LEFT JOIN categories ON categories.id = tasks.category_id
  LEFT JOIN (
    SELECT task_id, COUNT(*) AS session_count
    FROM focus_sessions
    WHERE duration_minutes IS NOT NULL
    GROUP BY task_id
  ) fs ON fs.task_id = tasks.id
`;

// GET /api/tasks
// Query params: when=today|upcoming|done|all, status, priority, categoryId, search
router.get('/', (req, res) => {
  const { when, status, priority, categoryId, search, day } = req.query;
  const clauses = [];
  const params = [];

  // `day` filters to one specific calendar date (any date, not just
  // today) — used by the Plan screen's date navigation. It takes
  // precedence over `when` when both are present.
  if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
    clauses.push("(date(due_date) = date(?) OR date(scheduled_time) = date(?))");
    params.push(day, day);
  } else if (when === 'today') {
    clauses.push("(date(due_date) = date(?) OR date(scheduled_time) = date(?))");
    params.push(todayISODate(), todayISODate());
  } else if (when === 'upcoming') {
    clauses.push("status != 'completed'");
    clauses.push("((due_date IS NOT NULL AND date(due_date) > date(?)) OR (scheduled_time IS NOT NULL AND date(scheduled_time) > date(?)))");
    params.push(todayISODate(), todayISODate());
  } else if (when === 'done') {
    clauses.push("status = 'completed'");
  }

  if (status && VALID_STATUS.includes(status)) {
    clauses.push('tasks.status = ?');
    params.push(status);
  }
  if (priority && VALID_PRIORITY.includes(priority)) {
    clauses.push('tasks.priority = ?');
    params.push(priority);
  }
  if (categoryId) {
    clauses.push('tasks.category_id = ?');
    params.push(Number(categoryId));
  }
  if (search) {
    clauses.push('(tasks.title LIKE ? OR tasks.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const order = `
    ORDER BY
      CASE tasks.status WHEN 'completed' THEN 1 ELSE 0 END,
      CASE tasks.priority
        WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3
      END,
      COALESCE(tasks.scheduled_time, tasks.due_date, tasks.created_at) ASC,
      tasks.position ASC
  `;

  const rows = db.prepare(`${BASE_SELECT} ${where} ${order}`).all(...params);
  res.json(rows.map(serializeTask));
});

// GET /api/tasks/:id
router.get('/:id', (req, res) => {
  const row = db.prepare(`${BASE_SELECT} WHERE tasks.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Task not found' });
  res.json(serializeTask(row, getActiveSession(req.params.id)));
});

// POST /api/tasks
router.post('/', (req, res) => {
  const {
    title, description, status, priority, categoryId,
    dueDate, scheduledTime, estimatedMinutes, position,
  } = req.body || {};

  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const finalStatus = VALID_STATUS.includes(status) ? status : 'not_started';
  const finalPriority = VALID_PRIORITY.includes(priority) ? priority : 'medium';

  try {
    const result = db.prepare(`
      INSERT INTO tasks
        (title, description, status, priority, category_id, due_date, scheduled_time, estimated_minutes, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      String(title).trim(),
      description || null,
      finalStatus,
      finalPriority,
      categoryId || null,
      dueDate || null,
      scheduledTime || null,
      estimatedMinutes || null,
      position || 0,
    );
    const row = db.prepare(`${BASE_SELECT} WHERE tasks.id = ?`).get(result.lastInsertRowid);
    res.status(201).json(serializeTask(row));
  } catch (err) {
    res.status(400).json({ error: 'Could not create task', detail: err.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const {
    title, description, status, priority, categoryId,
    dueDate, scheduledTime, estimatedMinutes, actualMinutes, position,
  } = req.body || {};

  if (title !== undefined && !String(title).trim()) {
    return res.status(400).json({ error: 'Title cannot be empty' });
  }
  if (status !== undefined && !VALID_STATUS.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  if (priority !== undefined && !VALID_PRIORITY.includes(priority)) {
    return res.status(400).json({ error: 'Invalid priority' });
  }

  const completedAt = status === 'completed'
    ? (existing.completed_at || new Date().toISOString())
    : (status !== undefined ? null : existing.completed_at);

  try {
    db.prepare(`
      UPDATE tasks SET
        title = ?, description = ?, status = ?, priority = ?, category_id = ?,
        due_date = ?, scheduled_time = ?, estimated_minutes = ?, actual_minutes = ?,
        position = ?, completed_at = ?
      WHERE id = ?
    `).run(
      title !== undefined ? String(title).trim() : existing.title,
      description !== undefined ? description : existing.description,
      status !== undefined ? status : existing.status,
      priority !== undefined ? priority : existing.priority,
      categoryId !== undefined ? categoryId : existing.category_id,
      dueDate !== undefined ? dueDate : existing.due_date,
      scheduledTime !== undefined ? scheduledTime : existing.scheduled_time,
      estimatedMinutes !== undefined ? estimatedMinutes : existing.estimated_minutes,
      actualMinutes !== undefined ? actualMinutes : existing.actual_minutes,
      position !== undefined ? position : existing.position,
      completedAt,
      req.params.id,
    );
    const row = db.prepare(`${BASE_SELECT} WHERE tasks.id = ?`).get(req.params.id);
    res.json(serializeTask(row));
  } catch (err) {
    res.status(400).json({ error: 'Could not update task', detail: err.message });
  }
});

// POST /api/tasks/:id/complete  { actualMinutes? }
router.post('/:id/complete', (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  const { actualMinutes } = req.body || {};

  // If a focus session was left running, close it out with real
  // elapsed time before completing — never lose that time.
  closeOpenSession(req.params.id);
  const sessionTotal = sumSessionMinutes(req.params.id);
  const finalActualMinutes = sessionTotal > 0
    ? sessionTotal
    : (actualMinutes !== undefined ? actualMinutes : existing.actual_minutes);

  db.prepare(`
    UPDATE tasks SET status = 'completed', completed_at = datetime('now'), actual_minutes = ?
    WHERE id = ?
  `).run(finalActualMinutes, req.params.id);

  const row = db.prepare(`${BASE_SELECT} WHERE tasks.id = ?`).get(req.params.id);
  res.json(serializeTask(row, null));
});

// POST /api/tasks/:id/focus/start — begins (or resumes) a focus
// session: opens a new focus_sessions row and marks the task
// in_progress. Idempotent — calling it while a session is already
// open just returns the current state rather than opening a second one.
router.post('/:id/focus/start', (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  if (existing.status === 'completed') return res.status(400).json({ error: 'This task is already completed' });

  if (!getActiveSession(req.params.id)) {
    db.prepare('INSERT INTO focus_sessions (task_id, started_at) VALUES (?, datetime(\'now\'))').run(req.params.id);
  }
  db.prepare("UPDATE tasks SET status = 'in_progress' WHERE id = ?").run(req.params.id);

  const row = db.prepare(`${BASE_SELECT} WHERE tasks.id = ?`).get(req.params.id);
  res.json(serializeTask(row, getActiveSession(req.params.id)));
});

// POST /api/tasks/:id/focus/pause — closes the open session (recording
// its real duration) and recomputes actual_minutes from all sessions
// so far, per Phase 10.3 ("actual time should become measurable").
router.post('/:id/focus/pause', (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  closeOpenSession(req.params.id);
  const actualMinutes = sumSessionMinutes(req.params.id);
  db.prepare("UPDATE tasks SET status = 'paused', actual_minutes = ? WHERE id = ?").run(actualMinutes, req.params.id);

  const row = db.prepare(`${BASE_SELECT} WHERE tasks.id = ?`).get(req.params.id);
  res.json(serializeTask(row, null));
});

// POST /api/tasks/:id/focus/resume — same transition as focus/start
// (open a new session, mark in_progress); a separate route name to
// match the START → PAUSE → RESUME state diagram in the spec.
router.post('/:id/focus/resume', (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  if (existing.status === 'completed') return res.status(400).json({ error: 'This task is already completed' });

  if (!getActiveSession(req.params.id)) {
    db.prepare('INSERT INTO focus_sessions (task_id, started_at) VALUES (?, datetime(\'now\'))').run(req.params.id);
  }
  db.prepare("UPDATE tasks SET status = 'in_progress' WHERE id = ?").run(req.params.id);

  const row = db.prepare(`${BASE_SELECT} WHERE tasks.id = ?`).get(req.params.id);
  res.json(serializeTask(row, getActiveSession(req.params.id)));
});

// POST /api/tasks/:id/start
router.post('/:id/start', (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  db.prepare("UPDATE tasks SET status = 'in_progress' WHERE id = ?").run(req.params.id);
  const row = db.prepare(`${BASE_SELECT} WHERE tasks.id = ?`).get(req.params.id);
  res.json(serializeTask(row));
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;

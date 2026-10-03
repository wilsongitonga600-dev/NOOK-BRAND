const express = require('express');
const db = require('../db/database');

const router = express.Router();

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function lastNDates(n) {
  const dates = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// GET /api/stats/dashboard — powers the Home screen
router.get('/dashboard', (req, res) => {
  const today = todayISODate();

  const todayRow = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status != 'completed' THEN 1 ELSE 0 END) AS remaining,
      COUNT(*) AS total
    FROM tasks
    WHERE date(due_date) = date(?) OR date(scheduled_time) = date(?)
  `).get(today, today);

  const completed = todayRow.completed || 0;
  const remaining = todayRow.remaining || 0;
  const total = todayRow.total || 0;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const focusTask = db.prepare(`
    SELECT tasks.*, categories.name AS category_name
    FROM tasks LEFT JOIN categories ON categories.id = tasks.category_id
    WHERE status IN ('in_progress', 'not_started')
      AND (date(due_date) <= date(?) OR date(scheduled_time) <= date(?) OR due_date IS NULL)
    ORDER BY
      CASE status WHEN 'in_progress' THEN 0 ELSE 1 END,
      CASE priority
        WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3
      END,
      COALESCE(tasks.scheduled_time, tasks.due_date, tasks.created_at) ASC
    LIMIT 1
  `).get(today, today);

  const upcoming = db.prepare(`
    SELECT tasks.*, categories.name AS category_name
    FROM tasks LEFT JOIN categories ON categories.id = tasks.category_id
    WHERE status != 'completed'
      AND ((due_date IS NOT NULL AND date(due_date) > date(?))
        OR (scheduled_time IS NOT NULL AND date(scheduled_time) > date(?)))
    ORDER BY COALESCE(scheduled_time, due_date) ASC
    LIMIT 5
  `).all(today, today);

  const days = lastNDates(7);
  const completedByDay = db.prepare(`
    SELECT date(completed_at) AS d, COUNT(*) AS n
    FROM tasks WHERE status = 'completed' AND date(completed_at) >= date(?)
    GROUP BY d
  `).all(days[0]);
  const focusByDay = db.prepare(`
    SELECT date(completed_at) AS d, SUM(COALESCE(actual_minutes, estimated_minutes, 0)) AS mins
    FROM tasks WHERE status = 'completed' AND date(completed_at) >= date(?)
    GROUP BY d
  `).all(days[0]);

  const completedMap = Object.fromEntries(completedByDay.map((r) => [r.d, r.n]));
  const focusMap = Object.fromEntries(focusByDay.map((r) => [r.d, r.mins]));
  const completedSpark = days.map((d) => completedMap[d] || 0);
  const focusSpark = days.map((d) => focusMap[d] || 0);

  const totals = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS totalCompleted,
      COUNT(*) AS totalAll,
      SUM(CASE WHEN status = 'completed' THEN COALESCE(actual_minutes, estimated_minutes, 0) ELSE 0 END) AS totalFocusMinutes
    FROM tasks
  `).get();

  const completionRate = totals.totalAll > 0
    ? Math.round((totals.totalCompleted / totals.totalAll) * 100)
    : 0;

  res.json({
    todayProgress: { percent, completed, remaining, total },
    focusTask: focusTask ? {
      id: focusTask.id,
      title: focusTask.title,
      priority: focusTask.priority,
      categoryName: focusTask.category_name,
      estimatedMinutes: focusTask.estimated_minutes,
      status: focusTask.status,
    } : null,
    upcoming: upcoming.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      categoryName: t.category_name,
      dueDate: t.due_date,
      scheduledTime: t.scheduled_time,
    })),
    quickStats: {
      totalCompleted: totals.totalCompleted || 0,
      totalFocusMinutes: totals.totalFocusMinutes || 0,
      completionRate,
      completedSparkline: completedSpark,
      focusSparkline: focusSpark,
    },
  });
});

// GET /api/stats/detail?range=week|month — powers the Statistics screen
router.get('/detail', (req, res) => {
  const range = req.query.range === 'month' ? 'month' : 'week';
  const n = range === 'month' ? 30 : 7;
  const days = lastNDates(n);

  const completedByDay = db.prepare(`
    SELECT date(completed_at) AS d, COUNT(*) AS n
    FROM tasks WHERE status = 'completed' AND date(completed_at) >= date(?)
    GROUP BY d
  `).all(days[0]);
  const focusByDay = db.prepare(`
    SELECT date(completed_at) AS d, SUM(COALESCE(actual_minutes, estimated_minutes, 0)) AS mins
    FROM tasks WHERE status = 'completed' AND date(completed_at) >= date(?)
    GROUP BY d
  `).all(days[0]);
  const createdByDay = db.prepare(`
    SELECT date(created_at) AS d, COUNT(*) AS n
    FROM tasks WHERE date(created_at) >= date(?)
    GROUP BY d
  `).all(days[0]);

  const completedMap = Object.fromEntries(completedByDay.map((r) => [r.d, r.n]));
  const focusMap = Object.fromEntries(focusByDay.map((r) => [r.d, r.mins]));
  const createdMap = Object.fromEntries(createdByDay.map((r) => [r.d, r.n]));

  const byCategory = db.prepare(`
    SELECT categories.name AS name, COUNT(*) AS n
    FROM tasks LEFT JOIN categories ON categories.id = tasks.category_id
    WHERE tasks.status = 'completed' AND date(tasks.completed_at) >= date(?)
    GROUP BY categories.name
    ORDER BY n DESC
  `).all(days[0]);

  const totals = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS totalCompleted,
      COUNT(*) AS totalAll,
      SUM(CASE WHEN status = 'completed' THEN COALESCE(actual_minutes, estimated_minutes, 0) ELSE 0 END) AS totalFocusMinutes
    FROM tasks
  `).get();
  const completionRate = totals.totalAll > 0
    ? Math.round((totals.totalCompleted / totals.totalAll) * 100)
    : 0;

  res.json({
    range,
    days,
    completedByDay: days.map((d) => completedMap[d] || 0),
    focusMinutesByDay: days.map((d) => focusMap[d] || 0),
    createdByDay: days.map((d) => createdMap[d] || 0),
    byCategory: byCategory.map((r) => ({ name: r.name || 'Uncategorized', count: r.n })),
    totals: {
      totalCompleted: totals.totalCompleted || 0,
      totalFocusMinutes: totals.totalFocusMinutes || 0,
      completionRate,
    },
  });
});

module.exports = router;

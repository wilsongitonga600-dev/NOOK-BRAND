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

function shiftIsoDate(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekdayLabels(days) {
  return days.map((d) => new Date(`${d}T00:00:00`).toLocaleDateString([], { weekday: 'narrow' }));
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

const PERIOD_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

function periodTotals(startDate) {
  const completedByDay = db.prepare(`
    SELECT date(completed_at) AS d, COUNT(*) AS n
    FROM tasks WHERE status = 'completed' AND date(completed_at) >= date(?)
    GROUP BY d
  `).all(startDate);
  const focusByDay = db.prepare(`
    SELECT date(completed_at) AS d, SUM(COALESCE(actual_minutes, estimated_minutes, 0)) AS mins
    FROM tasks WHERE status = 'completed' AND date(completed_at) >= date(?)
    GROUP BY d
  `).all(startDate);
  const totalCompleted = completedByDay.reduce((sum, r) => sum + r.n, 0);
  const totalFocusMinutes = focusByDay.reduce((sum, r) => sum + (r.mins || 0), 0);
  return { totalCompleted, totalFocusMinutes };
}

// Percent change vs a previous period. Returns null (not 0, not
// fabricated) when there's nothing meaningful to compare against —
// e.g. the previous period had zero completions, which would make a
// "% change" either divide-by-zero or misleading.
function percentChange(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function earliestActivityDate() {
  const row = db.prepare(`
    SELECT MIN(d) AS earliest FROM (
      SELECT MIN(created_at) AS d FROM tasks
      UNION ALL SELECT MIN(completed_at) FROM tasks WHERE completed_at IS NOT NULL
    )
  `).get();
  return row && row.earliest ? row.earliest.slice(0, 10) : todayISODate();
}

// GET /api/stats/detail?period=7d|30d|90d|all — powers the Statistics
// screen's period-scoped trend charts and KPI cards.
router.get('/detail', (req, res) => {
  const period = ['7d', '30d', '90d', 'all'].includes(req.query.period) ? req.query.period
    : ['today', 'week', 'month'].includes(req.query.range) ? { today: '7d', week: '7d', month: '30d' }[req.query.range] // back-compat with the old param name
    : '7d';

  let n;
  if (period === 'all') {
    const earliest = earliestActivityDate();
    const spanDays = Math.max(1, Math.round((new Date(todayISODate()) - new Date(earliest)) / 86400000) + 1);
    n = Math.min(spanDays, 180); // cap so "all" on a long-lived install doesn't render an absurd number of bars
  } else {
    n = PERIOD_DAYS[period];
  }

  const days = lastNDates(n);
  const startDate = days[0];

  const completedByDay = db.prepare(`
    SELECT date(completed_at) AS d, COUNT(*) AS n
    FROM tasks WHERE status = 'completed' AND date(completed_at) >= date(?)
    GROUP BY d
  `).all(startDate);
  const focusByDay = db.prepare(`
    SELECT date(completed_at) AS d, SUM(COALESCE(actual_minutes, estimated_minutes, 0)) AS mins
    FROM tasks WHERE status = 'completed' AND date(completed_at) >= date(?)
    GROUP BY d
  `).all(startDate);
  const createdByDay = db.prepare(`
    SELECT date(created_at) AS d, COUNT(*) AS n
    FROM tasks WHERE date(created_at) >= date(?)
    GROUP BY d
  `).all(startDate);

  const completedMap = Object.fromEntries(completedByDay.map((r) => [r.d, r.n]));
  const focusMap = Object.fromEntries(focusByDay.map((r) => [r.d, r.mins]));
  const createdMap = Object.fromEntries(createdByDay.map((r) => [r.d, r.n]));

  const totalCompleted = completedByDay.reduce((sum, r) => sum + r.n, 0);
  const totalFocusMinutes = focusByDay.reduce((sum, r) => sum + (r.mins || 0), 0);
  const totalCreated = createdByDay.reduce((sum, r) => sum + r.n, 0);
  const completionRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;
  const avgPerDay = Math.round((totalCompleted / n) * 10) / 10;

  // Real previous-period comparison — only computed (and only shown by
  // the frontend) when the previous period actually has data. 'all'
  // has no "previous all", so comparison is always omitted there.
  let comparison = null;
  if (period !== 'all') {
    const prevStart = lastNDates(n * 2)[0];
    const prevEnd = shiftIsoDate(startDate, -1);
    const prevRow = db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'completed' AND date(completed_at) BETWEEN date(?) AND date(?) THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'completed' AND date(completed_at) BETWEEN date(?) AND date(?) THEN COALESCE(actual_minutes, estimated_minutes, 0) ELSE 0 END) AS focusMinutes
      FROM tasks
    `).get(prevStart, prevEnd, prevStart, prevEnd);
    const prevCompleted = prevRow.completed || 0;
    const prevFocus = prevRow.focusMinutes || 0;
    const completedChange = percentChange(totalCompleted, prevCompleted);
    const focusChange = percentChange(totalFocusMinutes, prevFocus);
    if (completedChange !== null || focusChange !== null) {
      comparison = { completedChangePercent: completedChange, focusChangePercent: focusChange };
    }
  }

  res.json({
    period,
    days,
    labels: n <= 31 ? weekdayLabels(days) : days,
    completedByDay: days.map((d) => completedMap[d] || 0),
    focusMinutesByDay: days.map((d) => focusMap[d] || 0),
    createdByDay: days.map((d) => createdMap[d] || 0),
    totals: {
      totalCompleted,
      totalFocusMinutes,
      completionRate,
      avgPerDay,
    },
    comparison,
  });
});

// GET /api/stats/breakdown — current all-time snapshot of task
// composition (status / priority / category), for the multi-ring
// chart. This is deliberately NOT period-scoped: it answers "what does
// my task list look like right now", not "what happened in the last
// N days" (that's /detail's job).
router.get('/breakdown', (req, res) => {
  const byStatus = db.prepare(`
    SELECT status, COUNT(*) AS n FROM tasks GROUP BY status
  `).all();
  const byPriority = db.prepare(`
    SELECT priority, COUNT(*) AS n FROM tasks GROUP BY priority
  `).all();
  const byCategory = db.prepare(`
    SELECT categories.name AS name, COUNT(*) AS n
    FROM tasks LEFT JOIN categories ON categories.id = tasks.category_id
    GROUP BY categories.name
    ORDER BY n DESC
  `).all();
  const totalTasks = db.prepare('SELECT COUNT(*) AS n FROM tasks').get().n;
  const totalCompleted = db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE status = 'completed'").get().n;

  res.json({
    totalTasks,
    completionPercent: totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0,
    byStatus: byStatus.map((r) => ({ status: r.status, count: r.n })),
    byPriority: byPriority.map((r) => ({ priority: r.priority, count: r.n })),
    byCategory: byCategory.map((r) => ({ name: r.name || 'Uncategorized', count: r.n })),
  });
});

module.exports = router;

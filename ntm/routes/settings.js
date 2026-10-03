const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const counts = db.prepare(`
    SELECT COUNT(*) AS totalTasks,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS totalCompleted
    FROM tasks
  `).get();
  res.json({
    displayName: settings.display_name || 'there',
    totalTasks: counts.totalTasks || 0,
    totalCompleted: counts.totalCompleted || 0,
  });
});

router.put('/', (req, res) => {
  const { displayName } = req.body || {};
  if (displayName !== undefined) {
    db.prepare(`
      INSERT INTO settings (key, value) VALUES ('display_name', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(String(displayName).trim() || 'there');
  }
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  res.json({ displayName: settings.display_name || 'there' });
});

// GET /api/settings/export — full backup as JSON
router.get('/export', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks').all();
  const categories = db.prepare('SELECT * FROM categories').all();
  res.json({ exportedAt: new Date().toISOString(), tasks, categories });
});

// POST /api/settings/reset — clears all tasks (categories and settings kept)
router.post('/reset', (req, res) => {
  db.exec('DELETE FROM tasks;');
  res.json({ ok: true });
});

module.exports = router;

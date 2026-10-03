const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT categories.*, COUNT(tasks.id) AS task_count
    FROM categories
    LEFT JOIN tasks ON tasks.category_id = categories.id
    GROUP BY categories.id
    ORDER BY categories.name ASC
  `).all();
  res.json(rows.map((r) => ({
    id: r.id, name: r.name, color: r.color, taskCount: r.task_count,
  })));
});

router.post('/', (req, res) => {
  const { name, color } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  try {
    const result = db.prepare('INSERT INTO categories (name, color) VALUES (?, ?)')
      .run(String(name).trim(), color || null);
    res.status(201).json({ id: result.lastInsertRowid, name: String(name).trim(), color: color || null, taskCount: 0 });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'A category with that name already exists' });
    }
    res.status(400).json({ error: 'Could not create category', detail: err.message });
  }
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Category not found' });
  const { name, color } = req.body || {};
  if (name !== undefined && !String(name).trim()) {
    return res.status(400).json({ error: 'Category name cannot be empty' });
  }
  try {
    db.prepare('UPDATE categories SET name = ?, color = ? WHERE id = ?').run(
      name !== undefined ? String(name).trim() : existing.name,
      color !== undefined ? color : existing.color,
      req.params.id,
    );
    res.json({ id: Number(req.params.id), name: name !== undefined ? name : existing.name, color: color !== undefined ? color : existing.color });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'A category with that name already exists' });
    }
    res.status(400).json({ error: 'Could not update category', detail: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM categories WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Category not found' });
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;

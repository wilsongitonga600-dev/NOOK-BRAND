const express = require('express');
const path = require('node:path');

// Touch the database module first so schema creation / seed errors
// surface immediately with a clear message, instead of failing later
// on the first request.
let db;
try {
  db = require('./db/database');
} catch (err) {
  console.error('Failed to open the SQLite database:', err.message);
  console.error('Check that ./data is writable and that Node >= 22.5 is in use (for node:sqlite).');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/settings', require('./routes/settings'));

app.get('/api/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ ok: true, db: 'connected' });
  } catch (err) {
    res.status(500).json({ ok: false, db: 'unreachable', detail: err.message });
  }
});

// Fallback 404 for unknown API routes (keep JSON, not the SPA shell).
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Any other route serves the single-page app shell.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Central error handler — never let a request hang or crash the process
// silently; always return a useful JSON message.
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong on the server.', detail: err.message });
});

app.listen(PORT, () => {
  console.log(`NTM running at http://localhost:${PORT}`);
});

// NTM frontend — plain JS, no framework/build step (keeps it simple to
// run from Termux: open http://localhost:3000, nothing to compile).

const state = {
  page: 'home',
  categories: [],
  taskFilters: { when: 'today', status: '', priority: '', categoryId: '', search: '' },
  tasksView: 'list',
  planDate: localDateKey(),
  statsRange: '7d',
  searchOpen: false,
  focusTaskId: null,
};

const el = (sel, root = document) => root.querySelector(sel);
const els = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const pageContent = () => el('#page-content');

/* ---------------------------- utilities ---------------------------- */

const PRIORITY_LABEL = { critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM', low: 'LOW' };
const STATUS_LABEL = { not_started: 'Not started', in_progress: 'In progress', completed: 'Completed', paused: 'Paused' };

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatMinutes(mins) {
  if (!mins && mins !== 0) return null;
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function formatFocusTotal(mins) {
  if (!mins) return '0m';
  if (mins >= 1000) return `${(mins / 1000).toFixed(1)}k`;
  return `${mins}m`;
}

function formatTaskTime(task) {
  const parts = [];
  if (task.categoryName) parts.push(task.categoryName);
  if (task.scheduledTime) {
    const d = new Date(task.scheduledTime);
    parts.push(d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
  } else if (task.dueDate) {
    parts.push(formatDueLabel(task.dueDate));
  }
  const dur = formatMinutes(task.estimatedMinutes);
  if (dur) parts.push(dur);
  return parts.join(' · ');
}

// Time handling: Supabase stores exact moments (UTC). The app shows and
// enters times in the device's local time, so dates and clock times are
// derived from local getters, never by slicing an ISO string.
function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isoToLocalDate(iso) {
  return localDateKey(new Date(iso));
}

function isoToLocalTime(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Local date + clock time typed in the form -> exact moment (ISO, UTC).
// A date-time string with no offset is read as local time by the browser.
function localDateTimeToIso(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}

function formatDueLabel(dueDate) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(`${dueDate}T00:00:00`);
  const diffDays = Math.round((d - today) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function toast(message, type = 'info') {
  const root = el('#toast-root');
  const t = document.createElement('div');
  t.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
  t.textContent = message;
  root.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function errorBanner(message) {
  return `<div class="error-banner">${escapeHtml(message)}</div>`;
}

async function loadCategories() {
  try {
    state.categories = await Api.categories.list();
  } catch (err) {
    state.categories = [];
  }
  return state.categories;
}

/* ------------------------------ router ------------------------------ */

function setActiveNav(page) {
  els('.nav-item').forEach((btn) => btn.classList.toggle('active', btn.dataset.page === page));
}

async function navigateTo(page) {
  if (page === 'add') {
    openTaskModal();
    return;
  }
  stopFocusTicker();
  state.page = page;
  setActiveNav(page);
  window.location.hash = page;
  pageContent().innerHTML = '<div class="tiny" style="padding:40px 0;text-align:center;">Loading…</div>';
  try {
    if (page === 'home') await renderHome();
    else if (page === 'tasks') await renderTasks();
    else if (page === 'plan') await renderPlan();
    else if (page === 'stats') await renderStats();
    else if (page === 'account') await renderAccount();
    else if (page === 'focus') await renderFocus();
  } catch (err) {
    pageContent().innerHTML = errorBanner(err.message || 'Something went wrong loading this screen.');
  }
}

/* ------------------------------- HOME ------------------------------- */

async function renderHome() {
  const data = await Api.stats.dashboard();
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  const { todayProgress, focusTask, upcoming, quickStats } = data;

  const focusHtml = focusTask ? `
    <div class="card focus-card">
      <div class="focus-eyebrow">TODAY'S FOCUS</div>
      <div class="focus-title">${escapeHtml(focusTask.title)}</div>
      <div class="focus-meta">
        <span class="badge badge-${focusTask.priority}">${PRIORITY_LABEL[focusTask.priority]}</span>
        <span class="tiny">${[focusTask.categoryName, formatMinutes(focusTask.estimatedMinutes)].filter(Boolean).join(' · ')}</span>
      </div>
      <button class="btn-start" data-action="start-task" data-id="${focusTask.id}">
        ${focusTask.status === 'in_progress' ? 'Continue task' : 'Start task'}
      </button>
    </div>` : `
    <div class="card focus-card empty-state" style="padding:24px 16px;">
      <div class="emoji">🌿</div>
      <h3>Nothing queued up</h3>
      <p>Add a task to give today a focus.</p>
      <button class="btn-primary" style="width:auto" data-action="open-add">+ Add Task</button>
    </div>`;

  const upcomingHtml = upcoming.length ? upcoming.map((t) => `
    <div class="task-card" data-action="view-task" data-id="${t.id}">
      <span class="status-dot status-not_started" style="margin-top:6px;"></span>
      <div class="task-body">
        <div class="task-title">${escapeHtml(t.title)}</div>
        <div class="task-meta-row">
          <span class="badge badge-${t.priority}">${PRIORITY_LABEL[t.priority]}</span>
          <span class="task-time">${escapeHtml(formatTaskTime(t))}</span>
        </div>
      </div>
    </div>`).join('') : `<div class="tiny" style="padding:8px 0 4px;">Nothing scheduled beyond today.</div>`;

  pageContent().innerHTML = `
    <div class="greeting">
      <h1>${greeting} <span class="greeting-emoji">👋</span></h1>
      <div class="date">${dateStr}</div>
    </div>

    <div class="progress-hero">
      <svg class="progress-wave" viewBox="0 0 280 160" fill="none" aria-hidden="true">
        <path d="M60 150 C 110 140, 120 90, 170 70 S 230 20, 270 8" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
        <path d="M100 158 C 140 150, 150 110, 190 95 S 240 55, 268 44" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" opacity="0.28"/>
      </svg>
      <div class="card progress-card">
        <div class="label">Today's Progress</div>
        <div class="progress-ring-wrap">
          ${Charts.donutRing(todayProgress.percent, { size: 108, stroke: 12 })}
          <div class="progress-meta" style="margin-top:0;"><strong>${todayProgress.completed}</strong> completed<br><strong>${todayProgress.remaining}</strong> remaining</div>
        </div>
      </div>
    </div>

    ${focusHtml}

    <div class="section-title">Overview</div>
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Completed</div>
        <div class="stat-value">${quickStats.totalCompleted}</div>
        ${Charts.sparkline(quickStats.completedSparkline, { color: 'var(--chart-completed)' })}
      </div>
      <div class="stat-card">
        <div class="stat-label">Focus Time</div>
        <div class="stat-value">${formatFocusTotal(quickStats.totalFocusMinutes)}</div>
        ${Charts.sparkline(quickStats.focusSparkline, { color: 'var(--chart-focus)' })}
      </div>
      <div class="stat-card" style="text-align:center;">
        <div class="stat-label">Completion</div>
        <div style="display:flex;justify-content:center;margin-top:4px;">${Charts.donutRing(quickStats.completionRate, { size: 62, stroke: 7, color: 'var(--chart-rate)' })}</div>
      </div>
    </div>

    <div class="section-title">Upcoming</div>
    <div class="task-list">${upcomingHtml}</div>
  `;
}

/* ------------------------------- TASKS ------------------------------- */

function groupTasksByDate(tasks) {
  const groups = new Map();
  for (const t of tasks) {
    const key = t.dueDate || (t.scheduledTime ? isoToLocalDate(t.scheduledTime) : null) || 'no-date';
    const label = key === 'no-date' ? 'No date' : formatDueLabel(key);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(t);
  }
  return groups;
}

function taskCardHtml(t) {
  const completed = t.status === 'completed';
  return `
    <div class="task-card ${completed ? 'is-completed' : ''}" data-id="${t.id}">
      <button class="task-check ${completed ? 'checked' : ''}" data-action="toggle-complete" data-id="${t.id}" data-status="${t.status}" aria-label="Mark complete">
        ${completed ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
      </button>
      <div class="task-body" data-action="view-task" data-id="${t.id}">
        <div class="task-title">${escapeHtml(t.title)}</div>
        <div class="task-meta-row">
          <span class="badge badge-${t.priority}">${PRIORITY_LABEL[t.priority]}</span>
          <span class="task-time">${escapeHtml(formatTaskTime(t))}</span>
        </div>
      </div>
    </div>`;
}

/* ------------------------------- HISTORY (Phase 11) ------------------------------- */

// Buckets a completed task by how long ago it finished, using the same
// local-midnight comparison formatDueLabel already uses elsewhere, so
// "Today"/"Yesterday" mean the same thing throughout the app.
function historyBucket(completedAt) {
  if (!completedAt) return 'PREVIOUS WEEKS';
  const dateStr = isoToLocalDate(completedAt);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(`${dateStr}T00:00:00`);
  const diffDays = Math.round((today - d) / 86400000);
  if (diffDays <= 0) return 'TODAY';
  if (diffDays === 1) return 'YESTERDAY';
  if (diffDays <= 6) return 'THIS WEEK';
  return 'PREVIOUS WEEKS';
}

function historyMetaLine(t, includeDate) {
  const parts = [];
  const actual = formatMinutes(t.actualMinutes);
  const estimate = formatMinutes(t.estimatedMinutes);
  if (actual && estimate && Math.abs((t.actualMinutes || 0) - (t.estimatedMinutes || 0)) >= 5) {
    parts.push(`${actual} (est ${estimate})`);
  } else if (actual) {
    parts.push(actual);
  } else if (estimate) {
    parts.push(`est ${estimate}`);
  }
  if (t.categoryName) parts.push(t.categoryName);
  if (t.sessionCount > 1) parts.push(`${t.sessionCount} sessions`);
  if (includeDate && t.completedAt) parts.push(formatDueLabel(isoToLocalDate(t.completedAt)));
  return parts.join(' · ');
}

function historyTaskRow(t, includeDate) {
  return `
    <div class="task-card is-completed" data-action="view-task" data-id="${t.id}">
      <span class="task-check checked" style="pointer-events:none;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
      <div class="task-body">
        <div class="task-title">${escapeHtml(t.title)}</div>
        <div class="task-meta-row">
          <span class="badge badge-${t.priority}">${PRIORITY_LABEL[t.priority]}</span>
          <span class="task-time">${escapeHtml(historyMetaLine(t, includeDate))}</span>
        </div>
      </div>
    </div>`;
}

function renderHistoryView(tasks) {
  const order = ['TODAY', 'YESTERDAY', 'THIS WEEK', 'PREVIOUS WEEKS'];
  const groups = { TODAY: [], YESTERDAY: [], 'THIS WEEK': [], 'PREVIOUS WEEKS': [] };
  tasks
    .slice()
    .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0))
    .forEach((t) => groups[historyBucket(t.completedAt)].push(t));

  return order
    .filter((label) => groups[label].length > 0)
    .map((label) => `
      <div class="day-group-label">${label}</div>
      <div class="task-list">${groups[label].map((t) => historyTaskRow(t, label === 'PREVIOUS WEEKS')).join('')}</div>
    `).join('');
}

function formatClockTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function renderPlanView(tasks, { isToday = true } = {}) {
  const timed = tasks.filter((t) => t.scheduledTime).sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
  const anytime = tasks.filter((t) => !t.scheduledTime);

  if (timed.length === 0 && anytime.length === 0) {
    return `<div class="empty-state"><div class="emoji">🗓️</div><h3>Nothing planned</h3><p>Schedule a time on a task to see it here.</p></div>`;
  }

  const now = new Date();
  // The "current" slot only makes sense when looking at today — a past
  // or future date has no "now" to mark, just done/not-done.
  let nowIndex = -1;
  if (isToday) {
    timed.forEach((t, i) => {
      if (t.status !== 'completed' && new Date(t.scheduledTime) <= now) nowIndex = i;
    });
  }

  const timelineHtml = timed.map((t, i) => {
    const isLast = i === timed.length - 1;
    const dotClass = t.status === 'completed' ? 'done' : (i === nowIndex ? 'now' : '');
    return `
      <div class="plan-row">
        <div class="plan-time">${escapeHtml(formatClockTime(t.scheduledTime))}</div>
        <div class="plan-line">
          <div class="plan-dot ${dotClass}"></div>
          ${!isLast ? '<div class="plan-thread"></div>' : ''}
        </div>
        <div class="plan-card">
          <div class="task-card ${t.status === 'completed' ? 'is-completed' : ''}" style="border:none;padding:0 0 2px;background:none;">
            <button class="task-check ${t.status === 'completed' ? 'checked' : ''}" data-action="toggle-complete" data-id="${t.id}" data-status="${t.status}" aria-label="Mark complete">
              ${t.status === 'completed' ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
            </button>
            <div class="task-body" data-action="view-task" data-id="${t.id}">
              <div class="task-title">${escapeHtml(t.title)}</div>
              <div class="task-meta-row">
                <span class="badge badge-${t.priority}">${PRIORITY_LABEL[t.priority]}</span>
                <span class="task-time">${[t.categoryName, formatMinutes(t.estimatedMinutes)].filter(Boolean).join(' · ')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');

  const anytimeHtml = anytime.length ? `
    <div class="day-group-label">ANYTIME TODAY</div>
    <div class="task-list">${anytime.map(taskCardHtml).join('')}</div>
  ` : '';

  return `${timelineHtml}${anytimeHtml}`;
}

/* -------------------------------- PLAN -------------------------------- */

function shiftDate(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return localDateKey(d);
}

function todayISODate() {
  return localDateKey();
}

async function renderPlan() {
  const isToday = state.planDate === todayISODate();
  let tasks = [];
  let loadError = null;
  try {
    tasks = await Api.tasks.list({ day: state.planDate });
  } catch (err) {
    loadError = err.message;
  }

  const dateHeading = isToday ? 'Today' : formatDueLabel(state.planDate);
  const fullDate = new Date(`${state.planDate}T00:00:00`).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  pageContent().innerHTML = `
    <h1 class="screen-title">My Plan</h1>
    <div class="card" style="margin-top:14px;padding:14px 16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <button class="icon-btn" id="plan-prev" aria-label="Previous day">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div style="text-align:center;">
          <div style="font-weight:600;font-size:15px;">${escapeHtml(dateHeading)}</div>
          <div class="tiny">${escapeHtml(fullDate)}</div>
        </div>
        <button class="icon-btn" id="plan-next" aria-label="Next day">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
      ${!isToday ? `<button class="btn-ghost" id="plan-today-btn" style="width:100%;margin-top:4px;">Jump to today</button>` : ''}
    </div>
    <div style="margin-top:16px;">
      ${loadError ? errorBanner(loadError) : renderPlanView(tasks, { isToday })}
    </div>
  `;

  el('#plan-prev').addEventListener('click', () => { state.planDate = shiftDate(state.planDate, -1); renderPlan(); });
  el('#plan-next').addEventListener('click', () => { state.planDate = shiftDate(state.planDate, 1); renderPlan(); });
  const todayBtn = el('#plan-today-btn');
  if (todayBtn) todayBtn.addEventListener('click', () => { state.planDate = todayISODate(); renderPlan(); });
}

async function renderTasks() {
  await loadCategories();
  const f = state.taskFilters;
  let tasks = [];
  let loadError = null;
  try {
    tasks = await Api.tasks.list({
      when: f.when === 'all' ? undefined : f.when,
      status: f.status || undefined,
      priority: f.priority || undefined,
      categoryId: f.categoryId || undefined,
      search: f.search || undefined,
    });
  } catch (err) {
    loadError = err.message;
  }

  const groups = groupTasksByDate(tasks);
  let listHtml;
  if (loadError) {
    listHtml = errorBanner(loadError);
  } else if (tasks.length === 0 && f.when === 'done') {
    listHtml = `
      <div class="empty-state">
        <div class="emoji">🗂️</div>
        <h3>Nothing completed yet</h3>
        <p>Finished tasks will show up here.</p>
      </div>`;
  } else if (tasks.length === 0) {
    listHtml = `
      <div class="empty-state">
        <div class="emoji">🗒️</div>
        <h3>No tasks yet</h3>
        <p>Your day is waiting.</p>
        <button class="btn-primary" data-action="open-add">+ Add Task</button>
      </div>`;
  } else if (f.when === 'today' && state.tasksView === 'plan') {
    listHtml = renderPlanView(tasks);
  } else if (f.when === 'done') {
    listHtml = renderHistoryView(tasks);
  } else if (f.when === 'today' || f.when === 'all') {
    listHtml = Array.from(groups.entries()).map(([label, items]) => `
      <div class="day-group-label">${escapeHtml(label.toUpperCase())}</div>
      <div class="task-list">${items.map(taskCardHtml).join('')}</div>
    `).join('');
  } else {
    listHtml = `<div class="task-list">${tasks.map(taskCardHtml).join('')}</div>`;
  }

  const whenPills = [['today', 'Today'], ['upcoming', 'Upcoming'], ['all', 'All'], ['done', 'Done']];
  const showViewToggle = f.when === 'today' && !loadError && tasks.length > 0;

  pageContent().innerHTML = `
    <h1 class="screen-title">Tasks</h1>
    <div class="search-bar" style="margin-top:14px;">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      <input type="text" id="task-search" placeholder="Search tasks" value="${escapeHtml(f.search)}" />
    </div>
    <div class="pill-row" id="when-pills">
      ${whenPills.map(([val, label]) => `<button class="pill ${f.when === val ? 'active' : ''}" data-when="${val}">${label}</button>`).join('')}
    </div>
    <div class="pill-row" id="cat-pills" style="margin-top:4px;">
      <button class="pill ${!f.categoryId ? 'active' : ''}" data-cat="">All categories</button>
      ${state.categories.map((c) => `<button class="pill ${String(f.categoryId) === String(c.id) ? 'active' : ''}" data-cat="${c.id}">${escapeHtml(c.name)}</button>`).join('')}
    </div>
    ${showViewToggle ? `
    <div class="segmented" id="view-toggle" style="margin-top:12px;">
      <button data-view="list" class="${state.tasksView === 'list' ? 'active' : ''}">List</button>
      <button data-view="plan" class="${state.tasksView === 'plan' ? 'active' : ''}">Plan</button>
    </div>` : ''}
    <div style="margin-top:14px;">${listHtml}</div>
  `;

  if (showViewToggle) {
    els('#view-toggle button').forEach((btn) => btn.addEventListener('click', () => {
      state.tasksView = btn.dataset.view;
      renderTasks();
    }));
  }

  el('#task-search').addEventListener('input', debounce((e) => {
    state.taskFilters.search = e.target.value;
    renderTasks();
  }, 350));

  els('#when-pills .pill').forEach((btn) => btn.addEventListener('click', () => {
    state.taskFilters.when = btn.dataset.when;
    renderTasks();
  }));
  els('#cat-pills .pill').forEach((btn) => btn.addEventListener('click', () => {
    state.taskFilters.categoryId = btn.dataset.cat;
    renderTasks();
  }));
}

function debounce(fn, wait) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); };
}

async function toggleComplete(id, currentStatus) {
  try {
    if (currentStatus === 'completed') {
      await Api.tasks.update(id, { status: 'not_started' });
      toast('Marked as not started');
    } else {
      await Api.tasks.complete(id);
      toast('Task completed');
    }
    if (state.page === 'tasks') await renderTasks();
    else if (state.page === 'home') await renderHome();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function startTask(id) {
  try {
    await Api.tasks.focusStart(id);
    state.focusTaskId = id;
    await navigateTo('focus');
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ------------------------------- FOCUS MODE ------------------------------- */

let focusTickInterval = null;

function stopFocusTicker() {
  if (focusTickInterval) {
    clearInterval(focusTickInterval);
    focusTickInterval = null;
  }
}

function formatHMS(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

// Elapsed time is computed from real timestamps (prior sessions' summed
// actualMinutes + wall-clock difference since the open session started),
// not a counter that increments every tick — so it stays correct even
// if the tab was backgrounded or the phone screen was off for a while.
// Supabase returns timestamps either as ISO with an offset
// ("2026-10-08T00:16:56.123456+00:00") or as plain Postgres text
// ("2026-10-08 00:16:56"). Normalise both to a millisecond epoch.
// Returns NaN only if the value truly can't be read.
function parseDbTimestamp(value) {
  if (!value) return NaN;
  if (value instanceof Date) return value.getTime();
  let s = String(value).trim();
  s = s.replace(' ', 'T');
  s = s.replace(/(\.\d{3})\d+/, '$1'); // trim microseconds to milliseconds
  if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(s)) s += 'Z'; // no zone given: treat as UTC
  return new Date(s).getTime();
}

function currentElapsedSeconds(task) {
  const priorSeconds = (task.actualMinutes || 0) * 60;
  if (!task.activeSession) return priorSeconds;
  const startedMs = parseDbTimestamp(task.activeSession.startedAt);
  if (!Number.isFinite(startedMs)) {
    console.error('Focus timer: could not read session start time', task.activeSession.startedAt);
    return priorSeconds;
  }
  const liveMs = Date.now() - startedMs;
  return priorSeconds + Math.max(liveMs, 0) / 1000;
}

async function renderFocus() {
  stopFocusTicker();
  const id = state.focusTaskId;
  if (!id) { await navigateTo('home'); return; }

  let task;
  try {
    task = await Api.tasks.get(id);
  } catch (err) {
    pageContent().innerHTML = errorBanner(err.message);
    return;
  }

  if (task.status === 'completed') {
    pageContent().innerHTML = `
      <div class="empty-state" style="padding-top:60px;">
        <div class="emoji">✅</div>
        <h3>Already completed</h3>
        <p>${escapeHtml(task.title)}</p>
        <button class="btn-primary" style="width:auto;" id="focus-back-btn">Back to Home</button>
      </div>`;
    el('#focus-back-btn').addEventListener('click', () => navigateTo('home'));
    return;
  }

  const isRunning = task.status === 'in_progress' && task.activeSession;

  pageContent().innerHTML = `
    <div class="focus-screen">
      <button class="icon-btn" id="focus-close-btn" style="align-self:flex-start;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>

      <div class="focus-eyebrow" style="text-align:center;margin-top:8px;">${escapeHtml((task.categoryName || 'FOCUS').toUpperCase())}</div>
      <h1 class="focus-title-lg">${escapeHtml(task.title)}</h1>
      <div style="display:flex;justify-content:center;gap:8px;margin:10px 0 4px;">
        <span class="badge badge-${task.priority}">${PRIORITY_LABEL[task.priority]}</span>
      </div>
      ${task.estimatedMinutes ? `<div class="tiny" style="text-align:center;">Estimated ${escapeHtml(formatMinutes(task.estimatedMinutes))}</div>` : ''}

      <div class="focus-timer" id="focus-timer">${formatHMS(currentElapsedSeconds(task))}</div>

      <div style="display:flex;flex-direction:column;gap:12px;margin-top:8px;">
        ${task.status === 'not_started' ? `<button class="btn-primary" id="focus-primary-btn">Start</button>` : ''}
        ${task.status === 'in_progress' ? `<button class="btn-secondary" id="focus-primary-btn">Pause</button>` : ''}
        ${task.status === 'paused' ? `<button class="btn-primary" id="focus-primary-btn">Resume</button>` : ''}
        <button class="btn-start" id="focus-complete-btn">Complete</button>
      </div>

      ${task.description ? `
        <div class="section-title">Notes</div>
        <div class="card tiny">${escapeHtml(task.description)}</div>
      ` : ''}
    </div>
  `;

  el('#focus-close-btn').addEventListener('click', () => navigateTo('home'));

  el('#focus-primary-btn').addEventListener('click', async () => {
    try {
      if (task.status === 'not_started') await Api.tasks.focusStart(id);
      else if (task.status === 'in_progress') await Api.tasks.focusPause(id);
      else if (task.status === 'paused') await Api.tasks.focusResume(id);
      await renderFocus();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  el('#focus-complete-btn').addEventListener('click', async () => {
    try {
      await Api.tasks.complete(id);
      stopFocusTicker();
      toast('Task completed');
      await navigateTo('home');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  if (isRunning) {
    const timerEl = el('#focus-timer');
    focusTickInterval = setInterval(() => {
      if (!timerEl.isConnected) { stopFocusTicker(); return; }
      timerEl.textContent = formatHMS(currentElapsedSeconds(task));
    }, 1000);
  }
}

/* ------------------------------- STATS ------------------------------- */

function formatChangeLabel(percent) {
  if (percent === null || percent === undefined) return '';
  const arrow = percent >= 0 ? '↑' : '↓';
  const cls = percent >= 0 ? 'var(--chart-completed)' : 'var(--critical)';
  return `<span style="color:${cls};font-size:11.5px;font-weight:600;">${arrow} ${Math.abs(percent)}% vs previous period</span>`;
}

async function renderStats() {
  const PERIOD_TITLES = { '7d': '7D', '30d': '30D', '90d': '90D', all: 'ALL' };

  let data;
  let breakdown;
  try {
    [data, breakdown] = await Promise.all([Api.stats.detail(state.statsRange), Api.stats.breakdown()]);
  } catch (err) {
    pageContent().innerHTML = errorBanner(err.message);
    return;
  }

  const hasAnyData = data.totals.totalCompleted > 0;
  const dayLabels = data.labels || data.days;
  const cmp = data.comparison || {};

  // Build the multi-ring breakdown from whatever real data exists —
  // concentricRings itself drops any ring (status/priority/category)
  // that has no data, so this never fabricates a fake third ring.
  const ringInput = [
    {
      title: 'Status',
      segments: breakdown.byStatus.map((s) => ({ name: Charts.STATUS_LABELS[s.status] || s.status, value: s.count, color: Charts.STATUS_COLORS[s.status] || 'var(--text-muted)' })),
    },
    {
      title: 'Priority',
      segments: breakdown.byPriority.map((p) => ({ name: Charts.PRIORITY_LABELS_CHART[p.priority] || p.priority, value: p.count, color: Charts.PRIORITY_COLORS[p.priority] || 'var(--text-muted)' })),
    },
    {
      title: 'Category',
      segments: breakdown.byCategory.map((c, i) => ({ name: c.name, value: c.count, color: Charts.CATEGORY_PALETTE[i % Charts.CATEGORY_PALETTE.length] })),
    },
  ];
  const ringResult = Charts.concentricRings(ringInput, {
    size: 190,
    centerText: breakdown.totalTasks > 0 ? `${breakdown.completionPercent}%` : '—',
    centerLabel: breakdown.totalTasks > 0 ? 'COMPLETE' : '',
  });

  pageContent().innerHTML = `
    <h1 class="screen-title">My Statistics</h1>

    <div class="segmented" id="period-toggle" style="margin-top:14px;">
      ${['7d', '30d', '90d', 'all'].map((p) => `<button data-period="${p}" class="${state.statsRange === p ? 'active' : ''}">${PERIOD_TITLES[p]}</button>`).join('')}
    </div>

    <div class="stat-summary-grid" style="margin-top:14px;">
      <div class="stat-card">
        <div class="stat-label">Completed</div>
        <div class="stat-value">${data.totals.totalCompleted}</div>
        ${formatChangeLabel(cmp.completedChangePercent)}
      </div>
      <div class="stat-card">
        <div class="stat-label">Focus Time</div>
        <div class="stat-value">${formatFocusTotal(data.totals.totalFocusMinutes)}</div>
        ${formatChangeLabel(cmp.focusChangePercent)}
      </div>
      <div class="stat-card">
        <div class="stat-label">Rate</div>
        <div style="display:flex;justify-content:center;margin-top:2px;">${Charts.donutRing(data.totals.completionRate, { size: 56, stroke: 6, color: 'var(--chart-rate)' })}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg / Day</div>
        <div class="stat-value">${data.totals.avgPerDay}</div>
      </div>
    </div>

    <div class="card chart-card">
      <div class="chart-card-header">
        <span class="label" style="font-size:13px;color:var(--text-secondary);font-weight:500;">Productivity Trend</span>
      </div>
      ${hasAnyData ? Charts.areaChart(data.completedByDay, { color: 'var(--chart-productivity)' }) : `<div class="empty-state" style="padding:24px 0;"><p style="margin:0;">No productivity data yet.<br>Complete a few tasks and NTM will begin tracking your progress.</p></div>`}
    </div>

    <div class="card chart-card">
      <div class="chart-card-header"><span class="label" style="font-size:13px;color:var(--text-secondary);font-weight:500;">Focus Time</span></div>
      ${hasAnyData ? Charts.barChart(data.focusMinutesByDay, dayLabels) : `<div class="tiny">No focus time logged yet.</div>`}
    </div>

    <div class="card chart-card">
      <div class="chart-card-header"><span class="label" style="font-size:13px;color:var(--text-secondary);font-weight:500;">Task Breakdown</span></div>
      ${breakdown.totalTasks === 0 ? `
        <div class="empty-state" style="padding:24px 0;">
          <p style="margin:0;">No tasks yet.<br>Add a few tasks and NTM will show their status, priority, and category breakdown here.</p>
        </div>
      ` : `
        <div style="display:flex;justify-content:center;">${ringResult.svg}</div>
        ${ringResult.rings.map((ring) => `
          <div style="margin-top:14px;">
            <div class="tiny" style="font-weight:600;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:6px;">${escapeHtml(ring.title)}</div>
            ${ring.legendItems.map((item) => `
              <div class="category-bar-row" style="align-items:center;">
                <span style="width:10px;height:10px;border-radius:50%;background:${item.color};flex-shrink:0;"></span>
                <span class="cat-name" style="width:auto;flex:1;">${escapeHtml(item.name)}</span>
                <span class="category-bar-count" style="width:auto;">${item.value} · ${item.percent}%</span>
              </div>`).join('')}
          </div>
        `).join('')}
      `}
    </div>
  `;

  els('#period-toggle button').forEach((btn) => btn.addEventListener('click', () => {
    state.statsRange = btn.dataset.period;
    renderStats();
  }));
}

/* ------------------------------ ACCOUNT ------------------------------- */

/* ------------------------------ reminders / notifications ------------------------------ */

const NOTIF_PREF_KEY = 'ntm_notifications_enabled';
const notifiedTaskIds = new Set(); // per-session, so reopening the app can re-notify if still due

function notificationsSupported() {
  return typeof Notification !== 'undefined';
}
function notificationsEnabled() {
  return notificationsSupported() && Notification.permission === 'granted' && localStorage.getItem(NOTIF_PREF_KEY) === '1';
}

function fireReminder(task) {
  if (notifiedTaskIds.has(task.id)) return;
  notifiedTaskIds.add(task.id);
  try {
    const body = [task.categoryName, PRIORITY_LABEL[task.priority]].filter(Boolean).join(' · ') || 'Scheduled now';
    new Notification(task.title, { body, tag: `ntm-task-${task.id}` });
  } catch (err) {
    // Notification constructor can throw on some Android WebViews even
    // with permission granted — fail quietly, nothing else depends on it.
  }
}

async function checkReminders() {
  if (!notificationsEnabled()) return;
  let tasks;
  try {
    tasks = await Api.tasks.list({ when: 'today' });
  } catch (err) {
    return;
  }
  const now = Date.now();
  tasks.forEach((t) => {
    if (t.status === 'completed' || !t.scheduledTime) return;
    const diff = new Date(t.scheduledTime).getTime() - now;
    // Fire once the scheduled time arrives, within a 1-minute window either
    // side (covers the gap between 30s polling ticks).
    if (diff <= 60000 && diff >= -60000) fireReminder(t);
  });
}

setInterval(checkReminders, 30000);
setTimeout(checkReminders, 4000);

async function renderAccount() {
  await loadCategories();
  let settings;
  try {
    settings = await Api.settings.get();
  } catch (err) {
    pageContent().innerHTML = errorBanner(err.message);
    return;
  }
  const initial = (settings.displayName || 'N').trim().charAt(0).toUpperCase() || 'N';

  pageContent().innerHTML = `
    <h1 class="screen-title">Account</h1>
    <div class="card" style="margin-top:16px;">
      <div class="account-header">
        <div class="account-avatar">${escapeHtml(initial)}</div>
        <div>
          <div style="font-weight:600;font-size:16px;">${escapeHtml(settings.displayName)}</div>
          <div class="tiny">${settings.totalCompleted} tasks completed · ${settings.totalTasks} total</div>
        </div>
      </div>
      <div class="field" style="margin-top:14px;margin-bottom:0;">
        <label for="display-name-input">Display name</label>
        <input id="display-name-input" type="text" value="${escapeHtml(settings.displayName)}" />
      </div>
      <button class="btn-secondary" style="margin-top:12px;" id="save-name-btn">Save name</button>
    </div>

    <div class="section-title">Categories</div>
    <div class="card">
      <div class="chip-row" id="category-chips">
        ${state.categories.map((c) => `
          <span class="category-chip">
            ${escapeHtml(c.name)} <span class="tiny">(${c.taskCount})</span>
            <button data-action="delete-category" data-id="${c.id}" aria-label="Delete category">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </span>`).join('')}
      </div>
      <div class="field-row" style="margin-top:14px;">
        <div class="field" style="margin-bottom:0;">
          <input type="text" id="new-category-input" placeholder="New category name" />
        </div>
        <button class="btn-secondary" style="width:auto;padding:12px 18px;" id="add-category-btn">Add</button>
      </div>
    </div>

    <div class="section-title">Notifications</div>
    <div class="card">
      ${!notificationsSupported() ? `
        <div class="tiny">Reminders aren't supported in this browser.</div>
      ` : `
        <div class="list-row">
          <div>
            <div class="row-label">Task reminders</div>
            <div class="tiny" style="margin-top:2px;">${
              Notification.permission === 'denied'
                ? 'Blocked in browser settings'
                : notificationsEnabled()
                  ? 'On — notifies when a scheduled task is due'
                  : 'Off'
            }</div>
          </div>
          <button class="btn-secondary" style="width:auto;padding:10px 18px;" id="notif-toggle-btn" ${Notification.permission === 'denied' ? 'disabled' : ''}>
            ${notificationsEnabled() ? 'Turn off' : 'Turn on'}
          </button>
        </div>
        <div class="tiny" style="margin-top:10px;">Only fires while this tab is open — Android can suspend it in the background.</div>
      `}
    </div>

    <div class="section-title">Data</div>
    <div class="card">
      <div class="list-row">
        <span class="row-label">Export all data (JSON)</span>
        <button class="btn-ghost" id="export-btn">Export</button>
      </div>
      <div class="list-row">
        <span class="row-label">Import data (JSON)</span>
        <button class="btn-ghost" id="import-btn">Import</button>
        <input type="file" id="import-input" accept=".json,application/json" multiple hidden />
      </div>
      <div class="list-row">
        <span class="row-label">Clear all tasks</span>
        <button class="btn-danger" id="reset-btn">Reset</button>
      </div>
    </div>

    <div class="section-title">Session</div>
    <div class="card">
      <div class="list-row">
        <span class="row-label">Sign out of this device</span>
        <button class="btn-secondary" style="width:auto;padding:10px 18px;" id="signout-btn">Sign out</button>
      </div>
    </div>

    <div class="section-title">About</div>
    <div class="card tiny">
      Nook Task Manager · organize, prioritize, plan, execute.<br>
      Data is stored locally in SQLite on this device.
    </div>
  `;

  if (notificationsSupported()) {
    el('#notif-toggle-btn').addEventListener('click', async () => {
      if (notificationsEnabled()) {
        localStorage.setItem(NOTIF_PREF_KEY, '0');
        toast('Reminders turned off');
        await renderAccount();
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        localStorage.setItem(NOTIF_PREF_KEY, '1');
        toast('Reminders turned on');
      } else {
        localStorage.setItem(NOTIF_PREF_KEY, '0');
        toast('Notification permission was not granted', 'error');
      }
      await renderAccount();
    });
  }

  el('#save-name-btn').addEventListener('click', async () => {
    const val = el('#display-name-input').value.trim();
    try {
      await Api.settings.update({ displayName: val || 'there' });
      toast('Saved');
    } catch (err) { toast(err.message, 'error'); }
  });

  el('#add-category-btn').addEventListener('click', async () => {
    const input = el('#new-category-input');
    const name = input.value.trim();
    if (!name) return;
    try {
      await Api.categories.create({ name });
      input.value = '';
      await renderAccount();
    } catch (err) { toast(err.message, 'error'); }
  });

  els('[data-action="delete-category"]').forEach((btn) => btn.addEventListener('click', async () => {
    const ok = await confirmDialog('Delete this category? Tasks in it will become uncategorized.');
    if (!ok) return;
    try {
      await Api.categories.remove(btn.dataset.id);
      await renderAccount();
    } catch (err) { toast(err.message, 'error'); }
  }));

  el('#export-btn').addEventListener('click', async () => {
    try {
      const data = await Api.settings.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ntm-export-${localDateKey()}.json`;
      a.click();
      toast('Export downloaded');
    } catch (err) { toast(err.message, 'error'); }
  });

  el('#import-btn').addEventListener('click', () => el('#import-input').click());

  el('#import-input').addEventListener('change', async (event) => {
    const input = event.target;
    const picked = Array.from(input.files || []);
    input.value = '';
    if (!picked.length) return;

    try {
      const files = await Promise.all(picked.map(async (file) => {
        let data;
        try {
          data = JSON.parse(await file.text());
        } catch {
          throw new Error(`${file.name} is not valid JSON.`);
        }
        return { name: file.name, data };
      }));

      const preview = await Api.settings.importData(files, { dryRun: true });
      const ok = await confirmDialog(
        `Import ${preview.tasksAdded} tasks, ${preview.sessionsAdded} focus sessions ` +
        `and ${preview.categoriesAdded} new categories? ` +
        `${preview.tasksSkipped} tasks already exist and will be skipped.`
      );
      if (!ok) return;

      const result = await Api.settings.importData(files);
      toast(`Imported ${result.tasksAdded} tasks`);
      await renderAccount();
    } catch (err) { toast(err.message, 'error'); }
  });

  el('#reset-btn').addEventListener('click', async () => {
    const ok = await confirmDialog('This permanently deletes every task. Categories stay. Continue?');
    if (!ok) return;
    try {
      await Api.settings.reset();
      toast('All tasks cleared');
      await renderAccount();
    } catch (err) { toast(err.message, 'error'); }
  });

  el('#signout-btn').addEventListener('click', async () => {
    const ok = await confirmDialog('Sign out of NOOK on this device?');
    if (!ok) return;
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      toast(error.message || 'Could not sign out', 'error');
      return;
    }
    window.location.replace('login.html');
  });
}

/* --------------------------- Add/Edit Task modal --------------------------- */

function closeModal() {
  const root = el('#modal-root');
  root.innerHTML = '';
}

async function openTaskModal(existing = null) {
  await loadCategories();
  const t = existing || {
    title: '', description: '', priority: 'medium', categoryId: '',
    dueDate: '', scheduledTime: '', estimatedMinutes: '',
  };
  const scheduledDate = t.scheduledTime ? isoToLocalDate(t.scheduledTime) : '';
  const scheduledClock = t.scheduledTime ? isoToLocalTime(t.scheduledTime) : '';

  const root = el('#modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <span class="modal-title">${existing ? 'Edit Task' : 'Add Task'}</span>
          <button class="icon-btn" id="modal-close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div id="modal-error"></div>
        <form id="task-form">
          <div class="field">
            <label for="f-title">Title</label>
            <input id="f-title" type="text" required value="${escapeHtml(t.title)}" placeholder="What needs doing?" />
          </div>
          <div class="field">
            <label for="f-desc">Notes</label>
            <textarea id="f-desc" placeholder="Optional details">${escapeHtml(t.description || '')}</textarea>
          </div>
          <div class="field">
            <label>Priority</label>
            <div class="segmented" id="f-priority">
              ${['critical', 'high', 'medium', 'low'].map((p) => `<button type="button" data-val="${p}" class="${t.priority === p ? 'active' : ''}">${PRIORITY_LABEL[p]}</button>`).join('')}
            </div>
          </div>
          <div class="field">
            <label for="f-category">Category</label>
            <select id="f-category">
              <option value="">None</option>
              ${state.categories.map((c) => `<option value="${c.id}" ${String(t.categoryId) === String(c.id) ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
            </select>
          </div>
          <div class="field-row">
            <div class="field">
              <label for="f-due">Due date</label>
              <input id="f-due" type="date" value="${t.dueDate || ''}" />
            </div>
            <div class="field">
              <label for="f-est">Est. duration (min)</label>
              <input id="f-est" type="number" min="0" step="5" value="${t.estimatedMinutes || ''}" />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label for="f-sched-date">Scheduled date</label>
              <input id="f-sched-date" type="date" value="${scheduledDate}" />
            </div>
            <div class="field">
              <label for="f-sched-time">Scheduled time</label>
              <input id="f-sched-time" type="time" value="${scheduledClock}" />
            </div>
          </div>
          <div class="modal-actions">
            ${existing ? `<button type="button" class="btn-danger" id="delete-task-btn" style="flex:0 0 auto;">Delete</button>` : ''}
            <button type="submit" class="btn-primary">${existing ? 'Save changes' : 'Add Task'}</button>
          </div>
          ${existing && existing.status !== 'completed' ? `
            <button type="button" class="btn-secondary" id="start-focus-btn" style="margin-top:10px;">▶ Start Focus</button>
          ` : ''}
        </form>
      </div>
    </div>
  `;

  let selectedPriority = t.priority;
  els('#f-priority button').forEach((btn) => btn.addEventListener('click', () => {
    selectedPriority = btn.dataset.val;
    els('#f-priority button').forEach((b) => b.classList.toggle('active', b === btn));
  }));

  el('#modal-close').addEventListener('click', closeModal);
  el('#modal-backdrop').addEventListener('click', (e) => { if (e.target.id === 'modal-backdrop') closeModal(); });

  if (existing && existing.status !== 'completed') {
    el('#start-focus-btn').addEventListener('click', () => {
      closeModal();
      startTask(existing.id);
    });
  }

  if (existing) {
    el('#delete-task-btn').addEventListener('click', async () => {
      const ok = await confirmDialog('Delete this task? This cannot be undone.');
      if (!ok) return;
      try {
        await Api.tasks.remove(existing.id);
        closeModal();
        toast('Task deleted');
        await refreshCurrentPage();
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  el('#task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = el('#f-title').value.trim();
    if (!title) return;
    const dueDate = el('#f-due').value || null;
    const schedDate = el('#f-sched-date').value;
    const schedTime = el('#f-sched-time').value;
    const scheduledTime = schedDate ? localDateTimeToIso(schedDate, schedTime || '09:00') : null;
    const estimatedMinutes = el('#f-est').value ? Number(el('#f-est').value) : null;

    const payload = {
      title,
      description: el('#f-desc').value.trim() || null,
      priority: selectedPriority,
      categoryId: el('#f-category').value || null,
      dueDate,
      scheduledTime,
      estimatedMinutes,
    };

    try {
      if (existing) {
        await Api.tasks.update(existing.id, payload);
        toast('Task updated');
      } else {
        await Api.tasks.create(payload);
        toast('Task added');
      }
      closeModal();
      await refreshCurrentPage();
    } catch (err) {
      el('#modal-error').innerHTML = errorBanner(err.message);
    }
  });
}

async function viewTask(id) {
  try {
    const task = await Api.tasks.get(id);
    openTaskModal(task);
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function refreshCurrentPage() {
  if (state.page === 'home') await renderHome();
  else if (state.page === 'tasks') await renderTasks();
  else if (state.page === 'stats') await renderStats();
  else if (state.page === 'account') await renderAccount();
}

/* ------------------------------- confirm dialog ------------------------------- */

function confirmDialog(message) {
  return new Promise((resolve) => {
    const root = el('#modal-root');
    root.innerHTML = `
      <div class="modal-backdrop" id="confirm-backdrop">
        <div class="modal-sheet" style="padding-bottom:24px;">
          <div class="modal-handle"></div>
          <p style="font-size:15px;line-height:1.5;margin:6px 0 20px;">${escapeHtml(message)}</p>
          <div class="modal-actions">
            <button class="btn-secondary" id="confirm-cancel">Cancel</button>
            <button class="btn-danger" style="background:var(--surface-2);border-radius:var(--radius-md);padding:13px 20px;flex:1;" id="confirm-ok">Confirm</button>
          </div>
        </div>
      </div>`;
    const cleanup = (result) => { closeModal(); resolve(result); };
    el('#confirm-cancel').addEventListener('click', () => cleanup(false));
    el('#confirm-ok').addEventListener('click', () => cleanup(true));
    el('#confirm-backdrop').addEventListener('click', (e) => { if (e.target.id === 'confirm-backdrop') cleanup(false); });
  });
}

/* ------------------------------- global event delegation ------------------------------- */

document.addEventListener('click', (e) => {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;
  const { action, id, status } = actionEl.dataset;
  if (action === 'toggle-complete') toggleComplete(id, status);
  else if (action === 'view-task') viewTask(id);
  else if (action === 'start-task') startTask(id);
  else if (action === 'open-add') openTaskModal();
});

els('.nav-item').forEach((btn) => btn.addEventListener('click', () => navigateTo(btn.dataset.page)));

el('.nook-logo').addEventListener('click', (e) => { e.preventDefault(); navigateTo('home'); });

el('#search-toggle').addEventListener('click', () => {
  navigateTo('tasks').then(() => {
    const input = el('#task-search');
    if (input) input.focus();
  });
});

/* --------------------------------- boot --------------------------------- */

const initialPage = (window.location.hash || '#home').slice(1);
navigateTo(['home', 'tasks', 'stats', 'account'].includes(initialPage) ? initialPage : 'home');

// NTM Supabase API layer
// Keeps the existing Api.* interface used by app.js.
// Translates between the frontend camelCase contract and
// Supabase/Postgres snake_case columns.

const Api = (() => {
  const supabase = window.supabaseClient;

  if (!supabase) {
    throw new Error(
      'Supabase client is not available. Make sure supabase-client.js loads before api.js.'
    );
  }

  // ------------------------------------------------------------
  // COMMON HELPERS
  // ------------------------------------------------------------

  function handleError(error, fallback = 'Something went wrong.') {
    if (!error) return;

    console.error('NTM Supabase error:', error);

    throw new Error(error.message || fallback);
  }

  async function requireUser() {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      handleError(error, 'Could not verify your account.');
    }

    if (!data?.user) {
      throw new Error('You must be logged in.');
    }

    return data.user;
  }

  // Convert frontend task object -> Supabase task payload.
  function toTaskPayload(task = {}) {
    const payload = {};

    const fields = [
      'title',
      'description',
      'status',
      'priority',
      'position',
    ];

    fields.forEach(field => {
      if (task[field] !== undefined) {
        payload[field] = task[field];
      }
    });

    const mappings = {
      categoryId: 'category_id',
      dueDate: 'due_date',
      scheduledTime: 'scheduled_time',
      estimatedMinutes: 'estimated_minutes',
      actualMinutes: 'actual_minutes',
      completedAt: 'completed_at',
    };

    Object.entries(mappings).forEach(([frontendKey, dbKey]) => {
      if (task[frontendKey] !== undefined) {
        payload[dbKey] = task[frontendKey];
      }
    });

    // Also accept already-normalized database keys when needed.
    const dbFields = [
      'category_id',
      'due_date',
      'scheduled_time',
      'estimated_minutes',
      'actual_minutes',
      'completed_at',
    ];

    dbFields.forEach(field => {
      if (task[field] !== undefined) {
        payload[field] = task[field];
      }
    });

    return payload;
  }

  // Convert Supabase task row -> frontend task object.
  function fromTaskRow(row) {
    if (!row) return null;

    const sessions = Array.isArray(row.focus_sessions)
      ? row.focus_sessions
      : [];

    const completedSessions = sessions.filter(
      session => session.duration_minutes != null
    );

    const activeSession =
      sessions.find(session => session.ended_at === null) || null;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,

      categoryId: row.category_id,
      categoryName: row.categories?.name || null,

      dueDate: row.due_date,
      scheduledTime: row.scheduled_time,

      estimatedMinutes: row.estimated_minutes,
      actualMinutes: row.actual_minutes,

      position: row.position,

      createdAt: row.created_at,
      completedAt: row.completed_at,

      sessionCount: completedSessions.length,

      activeSession: activeSession
        ? fromSessionRow(activeSession)
        : null,
    };
  }

  function fromCategoryRow(row) {
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      color: row.color,
      createdAt: row.created_at,
    };
  }

  function fromSessionRow(row) {
    if (!row) return null;

    return {
      id: row.id,
      taskId: row.task_id,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      durationMinutes: row.duration_minutes,
    };
  }

  function escapePostgrestValue(value) {
    return String(value)
      .replace(/\\/g, '\\\\')
      .replace(/,/g, '\\,')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\./g, '\\.');
  }

  // Local calendar date (YYYY-MM-DD). Never use toISOString() for this:
  // it returns the UTC date, which is the previous day before 03:00 in Kenya.
  function localDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Exact moment (ISO, UTC) of local midnight at the start of a day.
  function localMidnightIso(dayKey) {
    return new Date(`${dayKey}T00:00:00`).toISOString();
  }

  function getDayRange(day) {
    const start = new Date(`${day}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  // ------------------------------------------------------------
  // TASKS
  // ------------------------------------------------------------

  async function listTasks(filters = {}) {
    await requireUser();

    let query = supabase
      .from('tasks')
      .select(`
        *,
        categories (
          name
        ),
        focus_sessions (
          id,
          task_id,
          started_at,
          ended_at,
          duration_minutes
        )
      `);

    // Exact day takes precedence over "when".
    if (filters.day) {
      const { start, end } = getDayRange(filters.day);

      query = query.or(
        `due_date.eq.${filters.day},scheduled_time.gte.${start},scheduled_time.lt.${end}`
      );
    } else if (filters.when === 'today') {
      const today = localDateKey();
      const { start, end } = getDayRange(today);

      query = query.or(
        `due_date.eq.${today},scheduled_time.gte.${start},scheduled_time.lt.${end}`
      );
    } else if (filters.when === 'upcoming') {
      const today = localDateKey();

      const tomorrowDate = new Date(`${today}T00:00:00`);
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);

      const tomorrow = localDateKey(tomorrowDate);

      query = query
        .neq('status', 'completed')
        .or(
          `due_date.gt.${today},scheduled_time.gte.${localMidnightIso(tomorrow)}`
        );
    } else if (filters.when === 'done') {
      query = query.eq('status', 'completed');
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }

    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    if (filters.search) {
      const search = filters.search.trim();

      if (search) {
        const safeSearch = escapePostgrestValue(search);

        query = query.or(
          `title.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`
        );
      }
    }

    const { data, error } = await query;

    if (error) {
      handleError(error, 'Could not load tasks.');
    }

    const tasks = (data || []).map(fromTaskRow);

    const priorityOrder = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    // Preserve the original NTM ordering behavior.
    tasks.sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') {
        return 1;
      }

      if (a.status !== 'completed' && b.status === 'completed') {
        return -1;
      }

      const pa = priorityOrder[a.priority] ?? 99;
      const pb = priorityOrder[b.priority] ?? 99;

      if (pa !== pb) {
        return pa - pb;
      }

      const dateA =
        a.scheduledTime ||
        a.dueDate ||
        a.createdAt ||
        '';

      const dateB =
        b.scheduledTime ||
        b.dueDate ||
        b.createdAt ||
        '';

      if (dateA < dateB) return -1;
      if (dateA > dateB) return 1;

      return (a.position ?? 0) - (b.position ?? 0);
    });

    return tasks;
  }

  async function getTask(id) {
    await requireUser();

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        categories (
          name
        ),
        focus_sessions (
          id,
          task_id,
          started_at,
          ended_at,
          duration_minutes
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      handleError(error, 'Could not load the task.');
    }

    return fromTaskRow(data);
  }

  async function createTask(task) {
    const user = await requireUser();

    const payload = toTaskPayload(task);

    // Explicit user ownership.
    payload.user_id = user.id;

    // Keep completed_at consistent with status.
    if (payload.status === 'completed' && !payload.completed_at) {
      payload.completed_at = new Date().toISOString();
    }

    if (
      payload.status &&
      payload.status !== 'completed'
    ) {
      payload.completed_at = null;
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert(payload)
      .select(`
        *,
        categories (
          name
        ),
        focus_sessions (
          id,
          task_id,
          started_at,
          ended_at,
          duration_minutes
        )
      `)
      .single();

    if (error) {
      handleError(error, 'Could not create the task.');
    }

    return fromTaskRow(data);
  }

  async function updateTask(id, task) {
    const user = await requireUser();

    const payload = toTaskPayload(task);

    // Keep completed_at synchronized with status.
    if (payload.status === 'completed') {
      payload.completed_at =
        payload.completed_at || new Date().toISOString();
    } else if ('status' in payload) {
      payload.completed_at = null;
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        *,
        categories (
          name
        ),
        focus_sessions (
          id,
          task_id,
          started_at,
          ended_at,
          duration_minutes
        )
      `)
      .single();

    if (error) {
      handleError(error, 'Could not update the task.');
    }

    return fromTaskRow(data);
  }

  async function completeTask(id, actualMinutes) {
    await requireUser();

    const { data, error } = await supabase.rpc(
      'complete_task',
      {
        p_task_id: id,
        p_actual_minutes: actualMinutes ?? null,
      }
    );

    if (error) {
      handleError(error, 'Could not complete the task.');
    }

    // Some RPC implementations return the completed task,
    // while others return void. Always return the normal task shape.
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data.id
        ? fromTaskRow(data)
        : data;
    }

    return getTask(id);
  }

  async function startTask(id) {
    return updateTask(id, {
      status: 'in_progress',
    });
  }

   async function focusStart(id) {
    await requireUser();

    const { error } = await supabase.rpc('focus_start', {
      p_task_id: id,
    });

    if (error) {
      handleError(error, 'Could not start the focus session.');
    }

    // The RPC returns the task, while Focus Mode needs
    // the task's active focus session. Re-fetch it so
    // activeSession contains the real started_at timestamp.
    return getTask(id);
  }

  async function focusPause(id) {
    await requireUser();

    const { error } = await supabase.rpc('focus_pause', {
      p_task_id: id,
    });

    if (error) {
      handleError(error, 'Could not pause the focus session.');
    }

    return getTask(id);
  }

  async function focusResume(id) {
    await requireUser();

    const { error } = await supabase.rpc('focus_resume', {
      p_task_id: id,
    });

    if (error) {
      handleError(error, 'Could not resume the focus session.');
    }

    // Re-fetch because focus_resume creates the new open
    // focus session and getTask() supplies activeSession.
    return getTask(id);
  }

  async function removeTask(id) {
    const user = await requireUser();

    const { data, error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      handleError(error, 'Could not delete the task.');
    }

    return fromTaskRow(data);
  }

  // ------------------------------------------------------------
  // CATEGORIES
  // ------------------------------------------------------------

  async function listCategories() {
    await requireUser();

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      handleError(error, 'Could not load categories.');
    }

    return (data || []).map(fromCategoryRow);
  }

  async function createCategory(category) {
    const user = await requireUser();

    const payload = {
      name: category.name,
      color: category.color,
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from('categories')
      .insert(payload)
      .select()
      .single();

    if (error) {
      handleError(
        error,
        'Could not create the category.'
      );
    }

    return fromCategoryRow(data);
  }

  async function updateCategory(id, category) {
    const user = await requireUser();

    const payload = {};

    if (category.name !== undefined) {
      payload.name = category.name;
    }

    if (category.color !== undefined) {
      payload.color = category.color;
    }

    const { data, error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      handleError(
        error,
        'Could not update the category.'
      );
    }

    return fromCategoryRow(data);
  }

  async function removeCategory(id) {
    const user = await requireUser();

    const { data, error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      handleError(
        error,
        'Could not delete the category.'
      );
    }

    return fromCategoryRow(data);
  }

  // ------------------------------------------------------------
  // STATISTICS
  // ------------------------------------------------------------

  async function dashboard() {
    await requireUser();

    const { data, error } =
      await supabase.rpc('get_dashboard');

    if (error) {
      handleError(
        error,
        'Could not load the dashboard.'
      );
    }

    return data;
  }

  async function detail(period) {
    await requireUser();

    const { data, error } =
      await supabase.rpc('get_stats_detail', {
        p_period: period || '7d',
      });

    if (error) {
      handleError(
        error,
        'Could not load statistics.'
      );
    }

    return data;
  }

  async function breakdown() {
    await requireUser();

    const { data, error } =
      await supabase.rpc('get_stats_breakdown');

    if (error) {
      handleError(
        error,
        'Could not load task breakdown.'
      );
    }

    return data;
  }

  // ------------------------------------------------------------
  // SETTINGS
  // ------------------------------------------------------------

  async function getSettings() {
    const user = await requireUser();

    const { data: settings, error: settingsError } =
      await supabase
        .from('settings')
        .select('key, value')
        .eq('user_id', user.id);

    if (settingsError) {
      handleError(
        settingsError,
        'Could not load settings.'
      );
    }

    const { count, error: taskError } =
      await supabase
        .from('tasks')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('user_id', user.id);

    if (taskError) {
      handleError(
        taskError,
        'Could not load task statistics.'
      );
    }

    const {
      count: completedCount,
      error: completedError,
    } = await supabase
      .from('tasks')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('user_id', user.id)
      .eq('status', 'completed');

    if (completedError) {
      handleError(
        completedError,
        'Could not load completed task statistics.'
      );
    }

    const displayName =
      settings?.find(
        setting => setting.key === 'display_name'
      )?.value || 'there';

    return {
      displayName,
      totalTasks: count || 0,
      totalCompleted: completedCount || 0,
    };
  }

  async function updateSettings(settings) {
    const user = await requireUser();

    if (settings.displayName !== undefined) {
      const { data, error } =
        await supabase
          .from('settings')
          .upsert(
            {
              user_id: user.id,
              key: 'display_name',
              value: settings.displayName,
            },
            {
              onConflict: 'user_id,key',
            }
          )
          .select()
          .single();

      if (error) {
        handleError(
          error,
          'Could not update settings.'
        );
      }

      return data;
    }

    return settings;
  }

  async function exportData() {
    await requireUser();

    const [
      tasksResult,
      categoriesResult,
    ] = await Promise.all([
      listTasks({ when: 'all' }),
      listCategories(),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      tasks: tasksResult,
      categories: categoriesResult,
    };
  }

  async function resetSettings() {
    const user = await requireUser();

    const { data, error } = await supabase
      .from('tasks')
      .delete()
      .eq('user_id', user.id)
      .select();

    if (error) {
      handleError(
        error,
        'Could not reset your tasks.'
      );
    }

    return (data || []).map(fromTaskRow);
  }


  // ------------------------------------------------------------
  // IMPORT
  // ------------------------------------------------------------
  // Merges one or more JSON files into the signed-in account.
  // Accepts the app's own export ({ tasks, categories }) and the raw
  // phone database tables (arrays of rows: tasks, categories,
  // focus_sessions, settings). Each file is recognised by its contents.
  //
  // Merge rules:
  //  - categories match existing ones by name (case-insensitive); missing ones are created
  //  - a task is skipped if one with the same title and created time already exists
  //  - focus sessions are imported only for tasks that are newly imported
  //  - a session that was never closed is imported as zero minutes
  //  - times without a timezone are read as phone local time (LOCAL_OFFSET)

  const LOCAL_OFFSET = '+03:00';

  function pick(obj, camelKey, snakeKey) {
    if (obj[camelKey] !== undefined) return obj[camelKey];
    return obj[snakeKey];
  }

  function toIsoTime(value) {
    if (value === null || value === undefined || value === '') return null;
    let s = String(value).trim().replace(' ', 'T');
    s = s.replace(/(\.\d{3})\d+/, '$1');
    if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(s)) s += LOCAL_OFFSET;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  function taskKey(title, isoTime) {
    return `${String(title).trim()}|${String(isoTime).slice(0, 19)}`;
  }

  function detectKind(rows) {
    if (!Array.isArray(rows)) return 'unknown';
    if (rows.length === 0) return 'empty';
    const r = rows[0];
    if ('task_id' in r || 'started_at' in r) return 'sessions';
    if ('key' in r && 'value' in r) return 'settings';
    if ('title' in r || 'status' in r) return 'tasks';
    if ('name' in r) return 'categories';
    return 'unknown';
  }

  function collectImport(files) {
    const bundle = { tasks: [], categories: [], sessions: [], displayName: null };

    files.forEach(({ name, data }) => {
      // The app's own export: one object holding tasks and categories.
      if (data && !Array.isArray(data) && typeof data === 'object') {
        if (Array.isArray(data.tasks)) bundle.tasks.push(...data.tasks);
        if (Array.isArray(data.categories)) bundle.categories.push(...data.categories);
        if (Array.isArray(data.focusSessions)) bundle.sessions.push(...data.focusSessions);
        if (Array.isArray(data.focus_sessions)) bundle.sessions.push(...data.focus_sessions);
        if (!Array.isArray(data.tasks) && !Array.isArray(data.categories)) {
          throw new Error(`${name} does not contain NOOK data.`);
        }
        return;
      }

      const kind = detectKind(data);
      if (kind === 'tasks') bundle.tasks.push(...data);
      else if (kind === 'categories') bundle.categories.push(...data);
      else if (kind === 'sessions') bundle.sessions.push(...data);
      else if (kind === 'settings') {
        const row = data.find(s => s.key === 'display_name');
        if (row && row.value) bundle.displayName = row.value;
      }
      else if (kind === 'empty') { /* nothing in this file */ }
      else throw new Error(`${name} is not a NOOK export.`);
    });

    const total = bundle.tasks.length + bundle.categories.length + bundle.sessions.length;
    if (total === 0 && !bundle.displayName) {
      throw new Error('No NOOK data found in the selected files.');
    }
    return bundle;
  }

  function normalizeTask(t) {
    return {
      oldId: t.id,
      title: (t.title || '').trim(),
      description: t.description ?? null,
      status: t.status || 'not_started',
      priority: t.priority || 'medium',
      oldCategoryId: pick(t, 'categoryId', 'category_id') ?? null,
      dueDate: pick(t, 'dueDate', 'due_date') ?? null,
      scheduledTime: toIsoTime(pick(t, 'scheduledTime', 'scheduled_time')),
      estimatedMinutes: pick(t, 'estimatedMinutes', 'estimated_minutes') ?? null,
      actualMinutes: pick(t, 'actualMinutes', 'actual_minutes') ?? null,
      position: t.position ?? 0,
      createdAt: toIsoTime(pick(t, 'createdAt', 'created_at')) || new Date().toISOString(),
      completedAt: toIsoTime(pick(t, 'completedAt', 'completed_at')),
    };
  }

  function normalizeSession(s) {
    return {
      oldTaskId: pick(s, 'taskId', 'task_id'),
      startedAt: toIsoTime(pick(s, 'startedAt', 'started_at')),
      endedAt: toIsoTime(pick(s, 'endedAt', 'ended_at')),
      durationMinutes: pick(s, 'durationMinutes', 'duration_minutes') ?? null,
      createdAt: toIsoTime(pick(s, 'createdAt', 'created_at')),
    };
  }

  async function importData(files, { dryRun = false } = {}) {
    const user = await requireUser();
    const bundle = collectImport(files);

    const [existingTasks, existingCategories] = await Promise.all([
      listTasks({ when: 'all' }),
      listCategories(),
    ]);

    // Categories: match by name, create the missing ones.
    const categoryByName = new Map(
      existingCategories.map(c => [c.name.toLowerCase(), c])
    );
    const categoryMap = new Map(); // old id -> category object
    let categoriesAdded = 0;

    for (const raw of bundle.categories) {
      const name = (raw.name || '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      let category = categoryByName.get(key);
      if (!category) {
        categoriesAdded++;
        category = dryRun
          ? { id: null, name }
          : await createCategory({ name, color: raw.color ?? null });
        categoryByName.set(key, category);
      }
      categoryMap.set(raw.id, category);
    }

    // Tasks: skip anything that already exists.
    const existingKeys = new Set(
      existingTasks.map(t => taskKey(t.title, t.createdAt))
    );
    const newTasks = [];
    let tasksSkipped = 0;

    for (const raw of bundle.tasks) {
      const t = normalizeTask(raw);
      if (!t.title) { tasksSkipped++; continue; }
      const key = taskKey(t.title, t.createdAt);
      if (existingKeys.has(key)) { tasksSkipped++; continue; }
      existingKeys.add(key);
      newTasks.push(t);
    }

    const taskIdMap = new Map(); // old task id -> new task id
    const newOldIds = new Set(newTasks.map(t => t.oldId));

    if (!dryRun) {
      for (const t of newTasks) {
        const category = t.oldCategoryId != null ? categoryMap.get(t.oldCategoryId) : null;
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            category_id: category?.id ?? null,
            due_date: t.dueDate,
            scheduled_time: t.scheduledTime,
            estimated_minutes: t.estimatedMinutes,
            actual_minutes: t.actualMinutes,
            position: t.position,
            created_at: t.createdAt,
            completed_at: t.status === 'completed' ? (t.completedAt || t.createdAt) : null,
          })
          .select('id')
          .single();

        if (error) handleError(error, `Could not import "${t.title}".`);
        taskIdMap.set(t.oldId, data.id);
      }
    }

    // Focus sessions: only for tasks that were just imported.
    const sessionRows = [];
    for (const raw of bundle.sessions) {
      const s = normalizeSession(raw);
      if (!newOldIds.has(s.oldTaskId) || !s.startedAt) continue;

      let endedAt = s.endedAt;
      let minutes = s.durationMinutes;
      if (!endedAt) { endedAt = s.startedAt; minutes = 0; }

      sessionRows.push({
        user_id: user.id,
        task_id: taskIdMap.get(s.oldTaskId),
        started_at: s.startedAt,
        ended_at: endedAt,
        duration_minutes: minutes ?? 0,
        created_at: s.createdAt || s.startedAt,
      });
    }

    if (!dryRun && sessionRows.length > 0) {
      const { error } = await supabase.from('focus_sessions').insert(sessionRows);
      if (error) handleError(error, 'Could not import focus sessions.');
    }

    if (!dryRun && bundle.displayName) {
      await updateSettings({ displayName: bundle.displayName });
    }

    return {
      dryRun,
      tasksAdded: newTasks.length,
      tasksSkipped,
      categoriesAdded,
      sessionsAdded: sessionRows.length,
      displayName: bundle.displayName,
    };
  }

  // ------------------------------------------------------------
  // PUBLIC API
  // ------------------------------------------------------------

  return {
    tasks: {
      list: listTasks,
      get: getTask,
      create: createTask,
      update: updateTask,
      complete: completeTask,
      start: startTask,
      focusStart,
      focusPause,
      focusResume,
      remove: removeTask,
    },

    categories: {
      list: listCategories,
      create: createCategory,
      update: updateCategory,
      remove: removeCategory,
    },

    stats: {
      dashboard,
      detail,
      breakdown,
    },

    settings: {
      get: getSettings,
      update: updateSettings,
      exportData,
      importData,
      reset: resetSettings,
    },
  };
})();

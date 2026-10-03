// Small fetch wrapper. Every function throws an Error with a
// human-readable message on failure so callers can show it directly
// instead of failing silently.

const Api = (() => {
  async function request(path, options = {}) {
    let res;
    try {
      res = await fetch(path, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
    } catch (networkErr) {
      throw new Error('Could not reach the server. Is it still running?');
    }

    let body = null;
    const text = await res.text();
    if (text) {
      try { body = JSON.parse(text); } catch (_) { body = null; }
    }

    if (!res.ok) {
      const msg = (body && body.error) ? body.error : `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return body;
  }

  const qs = (params) => {
    const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== ''));
    const s = new URLSearchParams(clean).toString();
    return s ? `?${s}` : '';
  };

  return {
    tasks: {
      list: (filters) => request(`/api/tasks${qs(filters)}`),
      get: (id) => request(`/api/tasks/${id}`),
      create: (data) => request('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) => request(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      complete: (id, actualMinutes) => request(`/api/tasks/${id}/complete`, { method: 'POST', body: JSON.stringify({ actualMinutes }) }),
      start: (id) => request(`/api/tasks/${id}/start`, { method: 'POST' }),
      focusStart: (id) => request(`/api/tasks/${id}/focus/start`, { method: 'POST' }),
      focusPause: (id) => request(`/api/tasks/${id}/focus/pause`, { method: 'POST' }),
      focusResume: (id) => request(`/api/tasks/${id}/focus/resume`, { method: 'POST' }),
      remove: (id) => request(`/api/tasks/${id}`, { method: 'DELETE' }),
    },
    categories: {
      list: () => request('/api/categories'),
      create: (data) => request('/api/categories', { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) => request(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      remove: (id) => request(`/api/categories/${id}`, { method: 'DELETE' }),
    },
    stats: {
      dashboard: () => request('/api/stats/dashboard'),
      detail: (period) => request(`/api/stats/detail${qs({ period })}`),
      breakdown: () => request('/api/stats/breakdown'),
    },
    settings: {
      get: () => request('/api/settings'),
      update: (data) => request('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),
      exportData: () => request('/api/settings/export'),
      reset: () => request('/api/settings/reset', { method: 'POST' }),
    },
  };
})();

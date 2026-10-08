function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function showError(elId, message) {
  document.getElementById(elId).innerHTML = `<div class="error-banner">${escapeHtml(message)}</div>`;
}

function showSuccess(elId, html) {
  document.getElementById(elId).innerHTML = `<div class="auth-success">${html}</div>`;
}

function setButtonLoading(btn, loadingText, idleText) {
  if (loadingText === null) { btn.disabled = false; btn.textContent = idleText; return; }
  btn.disabled = true;
  btn.textContent = loadingText;
}

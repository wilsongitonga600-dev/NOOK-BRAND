/* ==========================================================================
   NOOK ELECTRONICS — account page
   No auth yet, so "the account" is just a profile object saved to
   localStorage under 'nook-account', used to pre-fill delivery details
   at checkout later. Everything here (profile, cart, orders) lives on
   this device only, same pattern as the rest of the site pre-Supabase.
   ========================================================================== */

const ACCOUNT_KEY = 'nook-account';
const els = {};

function getProfile() {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveProfile(profile) {
  try { localStorage.setItem(ACCOUNT_KEY, JSON.stringify(profile)); } catch (e) { /* storage unavailable */ }
}

function populateForm() {
  const profile = getProfile();
  if (!profile) return;
  ['fullName', 'phone', 'email', 'county', 'town'].forEach(field => {
    const input = els.form.elements.namedItem(field);
    if (input && profile[field]) input.value = profile[field];
  });
  if (profile.fullName) {
    els.accountSubline.textContent = `Signed in locally as ${profile.fullName} — no account system yet, this is saved on this device only.`;
  }
}

function handleProfileSubmit(e) {
  e.preventDefault();
  const formData = new FormData(els.form);
  const profile = {
    fullName: formData.get('fullName') || '',
    phone: formData.get('phone') || '',
    email: formData.get('email') || '',
    county: formData.get('county') || '',
    town: formData.get('town') || '',
  };
  saveProfile(profile);
  populateForm();

  els.saveNote.hidden = false;
  clearTimeout(els.saveNote._timer);
  els.saveNote._timer = setTimeout(() => { els.saveNote.hidden = true; }, 2000);
}

function renderStats() {
  els.statOrders.textContent = String(getOrders().length);
  els.statCartItems.textContent = String(getCartCount());
  const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'Dark' : 'Light';
  els.statTheme.textContent = theme;
}

function initResetButton() {
  els.resetBtn.addEventListener('click', () => {
    const confirmed = window.confirm('Clear your cart, order history, and saved profile from this device? This cannot be undone.');
    if (!confirmed) return;
    try {
      localStorage.removeItem('nook-cart');
      localStorage.removeItem('nook-orders');
      localStorage.removeItem(ACCOUNT_KEY);
    } catch (e) { /* storage unavailable */ }
    els.form.reset();
    els.accountSubline.textContent = 'No account system yet — this is saved on this device only.';
    renderCartBadge();
    renderStats();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  els.form = document.getElementById('profileForm');
  els.saveNote = document.getElementById('saveNote');
  els.accountSubline = document.getElementById('accountSubline');
  els.resetBtn = document.getElementById('resetDataBtn');
  els.statOrders = document.getElementById('statOrders');
  els.statCartItems = document.getElementById('statCartItems');
  els.statTheme = document.getElementById('statTheme');

  renderNav(DB_CATEGORIES);
  initMenu();
  initTheme();
  renderCartBadge();

  populateForm();
  renderStats();
  initResetButton();
  els.form.addEventListener('submit', handleProfileSubmit);

  // keep the "Theme" stat in sync if the toggle is clicked while this page is open
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) themeToggle.addEventListener('click', () => setTimeout(renderStats, 0));
});

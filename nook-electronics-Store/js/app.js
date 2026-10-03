/* ==========================================================================
   NOOK ELECTRONICS — home page
   Reads DB_PRODUCTS / DB_CATEGORIES from js/data.js, which is exported
   straight from nook.db by database/export.sh (sqlite3 CLI only — see
   README). No fetch, no server: this file loads fine even opened directly
   as file://index.html.
   ========================================================================== */

function renderCategories() {
  const row = document.getElementById('categoryRow');
  if (!row) return;
  row.innerHTML = DB_CATEGORIES.map(c => `
    <a class="category-tile" href="products.html?cat=${c.key}">
      <span class="dot">${ICONS[c.icon]}</span>
      <span>${c.label}</span>
    </a>`).join('');
}

function renderGrids() {
  const featured = document.getElementById('featuredGrid');
  const recent = document.getElementById('recentGrid');
  if (featured) featured.innerHTML = DB_PRODUCTS.slice(0, 4).map(productCard).join('');
  if (recent) recent.innerHTML = DB_PRODUCTS.slice(-4).map(productCard).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderNav(DB_CATEGORIES);
  renderCategories();
  renderGrids();
  initMenu();
  initTheme();
  initCartButtons();
  initReveal();
  renderCartBadge();
});

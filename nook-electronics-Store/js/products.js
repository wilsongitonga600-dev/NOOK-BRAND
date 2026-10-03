/* ==========================================================================
   NOOK ELECTRONICS — product catalog page
   Filters/sorts/paginates DB_PRODUCTS (from js/data.js, exported straight
   from nook.db via database/export.sh) entirely in the browser — no
   fetch, no server. Re-run export.sh after changing data in sqlite3 and
   refresh the page to see the change.
   ========================================================================== */

const state = {
  category: new URLSearchParams(location.search).get('cat') || '',
  search: '',
  sort: 'newest',
  page: 1,
  limit: 12,
};

const els = {};

function getFiltered() {
  let items = DB_PRODUCTS.slice();

  if (state.category) {
    items = items.filter(p => p.category === state.category);
  }
  if (state.search) {
    const q = state.search.toLowerCase();
    items = items.filter(p => p.name.toLowerCase().includes(q));
  }

  switch (state.sort) {
    case 'price_asc':  items.sort((a, b) => a.price - b.price); break;
    case 'price_desc': items.sort((a, b) => b.price - a.price); break;
    case 'rating':     items.sort((a, b) => b.rating - a.rating); break;
    case 'newest':     items.sort((a, b) => b.id - a.id); break;
  }

  return items;
}

function render({ append = false } = {}) {
  const all = getFiltered();
  const total = all.length;
  const end = state.page * state.limit;
  const pageItems = append ? all.slice(end - state.limit, end) : all.slice(0, end);

  els.resultCount.textContent = `${total} product${total === 1 ? '' : 's'}`;
  els.emptyState.hidden = total !== 0;
  els.loadMoreBtn.hidden = end >= total;

  const html = pageItems.map(productCard).join('');
  els.grid.innerHTML = append ? els.grid.innerHTML + html : html;
  initReveal(els.grid);
}

function populateCategorySelect() {
  els.categorySelect.innerHTML =
    '<option value="">All categories</option>' +
    DB_CATEGORIES.map(c => `<option value="${c.key}">${c.label}</option>`).join('');
  els.categorySelect.value = state.category;
}

function updateTitle() {
  const selected = els.categorySelect.selectedOptions[0];
  els.catalogTitle.textContent = state.category && selected ? selected.textContent : 'All products';
}

function initToolbar() {
  els.categorySelect.addEventListener('change', () => {
    state.category = els.categorySelect.value;
    state.page = 1;
    updateTitle();
    render();
  });

  els.sortSelect.addEventListener('change', () => {
    state.sort = els.sortSelect.value;
    state.page = 1;
    render();
  });

  let searchTimer;
  const onSearchInput = (value) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.search = value.trim();
      state.page = 1;
      render();
    }, 250);
  };
  els.searchInput.addEventListener('input', (e) => onSearchInput(e.target.value));
  els.searchInputMobile.addEventListener('input', (e) => onSearchInput(e.target.value));

  els.loadMoreBtn.addEventListener('click', () => {
    state.page += 1;
    render({ append: true });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  els.grid = document.getElementById('productGrid');
  els.resultCount = document.getElementById('resultCount');
  els.emptyState = document.getElementById('emptyState');
  els.loadMoreBtn = document.getElementById('loadMoreBtn');
  els.categorySelect = document.getElementById('categorySelect');
  els.sortSelect = document.getElementById('sortSelect');
  els.searchInput = document.getElementById('searchInput');
  els.searchInputMobile = document.getElementById('searchInputMobile');
  els.catalogTitle = document.getElementById('catalogTitle');

  renderNav(DB_CATEGORIES);
  initMenu();
  initTheme();
  initCartButtons();
  initToolbar();

  populateCategorySelect();
  updateTitle();
  render();
  renderCartBadge();
});

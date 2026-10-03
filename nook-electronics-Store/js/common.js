/* ==========================================================================
   NOOK ELECTRONICS — shared utilities
   Used by every page's script so product-card markup, cart persistence,
   and theme handling live in exactly one place.
   ========================================================================== */

const ICONS = {
  tv: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="14" rx="2"/><line x1="8" y1="22" x2="16" y2="22"/></svg>',
  phone: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="10" y1="18" x2="14" y2="18"/></svg>',
  audio: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 14v-3a9 9 0 0 1 18 0v3"/><path d="M21 14a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2z"/><path d="M3 14a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z"/></svg>',
  fridge: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="5" y1="10" x2="19" y2="10"/><line x1="9" y1="5" x2="9" y2="7"/><line x1="9" y1="13" x2="9" y2="15"/></svg>',
  washing: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="13" r="5"/><circle cx="7" cy="6" r="0.8" fill="currentColor" stroke="none"/></svg>',
  kitchen: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v7a4 4 0 0 0 4 4v7"/><path d="M7 3v7"/><path d="M11 3v18"/><path d="M17 3c-2 1-2 5 0 6v11"/></svg>',
  computer: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="12" rx="2"/><line x1="8" y1="20" x2="16" y2="20"/><line x1="12" y1="16" x2="12" y2="20"/></svg>',
  accessories: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'
};

/* Renders the desktop subnav strip and the mobile drawer list from the same
   category data, so pages never drift apart. */
function renderNav(categories) {
  const subnav = document.getElementById('subnavList');
  const drawer = document.getElementById('drawerList');
  const items = categories.map(c => `<li><a href="products.html?cat=${c.key}">${c.label}</a></li>`).join('');
  if (subnav) subnav.innerHTML = items;
  if (drawer) drawer.innerHTML = items + '<li><a href="account.html">Account</a></li><li><a href="orders.html">My Orders</a></li>';
}

const money = (n) => 'KSh ' + Number(n).toLocaleString('en-KE');

function stockLine(stock) {
  if (stock === 0) return `<span class="stock-line stock-out"><span class="stock-dot"></span>Out of stock</span>`;
  if (stock <= 3) return `<span class="stock-line stock-low"><span class="stock-dot"></span>Low stock — ${stock} left</span>`;
  return `<span class="stock-line stock-in"><span class="stock-dot"></span>In stock</span>`;
}

function productCard(p) {
  const discount = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : null;
  const badge = p.badge === 'sale'
    ? '<span class="badge badge-sale">Sale</span>'
    : p.badge === 'new' ? '<span class="badge badge-new">New</span>' : '';

  return `
    <article class="product-card" data-id="${p.id}">
      <div class="product-media">
        ${badge}
        <button class="wishlist-btn" aria-label="Add to wishlist" data-wishlist>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
        </button>
        <a href="product.html?id=${p.id}" class="bezel" aria-label="View ${p.name}">
          <img src="${p.img}" alt="${p.name}" loading="lazy" onerror="this.closest('.product-media').querySelector('.bezel').style.background='linear-gradient(155deg,#1B2140,#0C0F1D)'; this.remove();">
        </a>
      </div>
      <div class="product-body">
        <a href="product.html?id=${p.id}" class="product-name">${p.name}</a>
        <div class="product-rating"><span class="stars">★★★★★</span>${p.rating}</div>
        <div class="product-price-row">
          <span class="product-price price">${money(p.price)}</span>
          ${p.oldPrice ? `<span class="product-price-old">${money(p.oldPrice)}</span>` : ''}
          ${discount ? `<span class="product-discount">-${discount}%</span>` : ''}
        </div>
        ${stockLine(p.stock)}
        <button class="add-cart-btn" data-add-cart ${p.stock === 0 ? 'disabled' : ''}>
          ${p.stock === 0 ? 'Out of stock' : 'Add to cart'}
        </button>
      </div>
    </article>`;
}

/* ---- Reveal cards as they enter the viewport ---- */
function initReveal(root = document) {
  const cards = root.querySelectorAll('.product-card:not(.in-view)');
  if (!('IntersectionObserver' in window)) {
    cards.forEach(c => c.classList.add('in-view'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  cards.forEach(c => io.observe(c));
}

/* ---- Mobile menu ---- */
function initMenu() {
  const toggle = document.getElementById('menuToggle');
  const drawer = document.getElementById('mobileDrawer');
  if (!toggle || !drawer) return;
  toggle.addEventListener('click', () => {
    const open = drawer.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
}

/* ---- Theme (light/dark) ----
   The actual attribute is set as early as possible by an inline script in
   each page's <head> (before CSS/paint) to avoid a flash of the wrong
   theme. This just wires the toggle button and keeps it in sync. */
function initTheme() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('nook-theme', next); } catch (e) { /* storage unavailable */ }
  });
}

/* ---- Cart (persisted in localStorage until Supabase lands in a later phase) ----
   Stored shape: [{ id, qty }, ...] — product details are looked up from
   DB_PRODUCTS at render time so the cart never goes stale relative to
   price/stock changes made via the database. */
const CART_KEY = 'nook-cart';

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* storage unavailable */ }
  renderCartBadge();
}

function addToCart(id, qty = 1) {
  const cart = getCart();
  const product = DB_PRODUCTS.find(p => p.id === id);
  const maxQty = product ? product.stock : Infinity;
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, maxQty);
  } else {
    cart.push({ id, qty: Math.min(qty, maxQty) });
  }
  saveCart(cart);
}

function setCartQty(id, qty) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (!item) return;
  const product = DB_PRODUCTS.find(p => p.id === id);
  const maxQty = product ? product.stock : Infinity;
  item.qty = Math.max(1, Math.min(qty, maxQty));
  saveCart(cart);
}

function removeFromCart(id) {
  saveCart(getCart().filter(i => i.id !== id));
}

function getCartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

/* Cart lines joined with live product data — used by cart.html */
function getCartLines() {
  return getCart()
    .map(item => {
      const product = DB_PRODUCTS.find(p => p.id === item.id);
      if (!product) return null;
      return { ...product, qty: item.qty };
    })
    .filter(Boolean);
}

function renderCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  badge.textContent = String(getCartCount());
}

/* ---- Orders (localStorage record written by checkout.js) ----
   Shared here so both orders.html and account.html (order-count summary)
   read orders the same way, sorted newest first. */
function getOrders() {
  try {
    const raw = localStorage.getItem('nook-orders');
    const orders = raw ? JSON.parse(raw) : [];
    return orders.slice().sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
  } catch (e) {
    return [];
  }
}

function bumpCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  renderCartBadge();
  badge.classList.remove('bump');
  void badge.offsetWidth; // restart animation
  badge.classList.add('bump');
}

function flyToCart(sourceImg) {
  const cartBtn = document.getElementById('cartBtn');
  if (!sourceImg || !cartBtn || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    bumpCartBadge();
    return;
  }
  const start = sourceImg.getBoundingClientRect();
  const end = cartBtn.getBoundingClientRect();
  const clone = sourceImg.cloneNode(true);
  clone.className = 'flying-thumb';
  clone.style.left = start.left + 'px';
  clone.style.top = start.top + 'px';
  clone.style.width = start.width + 'px';
  clone.style.height = start.height + 'px';
  clone.style.setProperty('--fx', (end.left - start.left) + 'px');
  clone.style.setProperty('--fy', (end.top - start.top) + 'px');
  document.body.appendChild(clone);
  requestAnimationFrame(() => clone.classList.add('go'));
  clone.addEventListener('animationend', () => {
    clone.remove();
    bumpCartBadge();
  });
}

function initCartButtons() {
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add-cart]');
    if (!btn || btn.disabled) return;
    const card = btn.closest('.product-card');
    const img = card ? card.querySelector('.product-media img') : null;
    const id = card ? Number(card.dataset.id) : null;

    if (id != null) addToCart(id, 1);
    flyToCart(img);

    const original = btn.textContent;
    btn.classList.add('added');
    btn.textContent = 'Added ✓';
    setTimeout(() => {
      btn.classList.remove('added');
      btn.textContent = original;
    }, 1200);
  });

  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-wishlist]');
    if (!btn) return;
    btn.classList.toggle('active');
  });
}

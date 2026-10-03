/* ==========================================================================
   NOOK ELECTRONICS — cart page
   Renders getCartLines() (from common.js — cart ids joined with live
   DB_PRODUCTS data) and wires quantity steppers / remove buttons back to
   the same localStorage-backed helpers used on index.html and products.html.
   ========================================================================== */

const els = {};

function cartLineRow(line) {
  const lineTotal = line.price * line.qty;
  const atMax = line.qty >= line.stock;

  return `
    <article class="cart-line" data-id="${line.id}">
      <div class="cart-line-media">
        <div class="bezel">
          <img src="${line.img}" alt="${line.name}" loading="lazy" onerror="this.closest('.cart-line-media').querySelector('.bezel').style.background='linear-gradient(155deg,#1B2140,#0C0F1D)'; this.remove();">
        </div>
      </div>
      <div class="cart-line-body">
        <div class="cart-line-top">
          <div class="cart-line-name">${line.name}</div>
          <button class="cart-line-remove" data-remove aria-label="Remove ${line.name}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16z"/></svg>
          </button>
        </div>
        <div class="price cart-line-unit">${money(line.price)} each</div>
        ${stockLine(line.stock)}
        <div class="cart-line-bottom">
          <div class="qty-stepper">
            <button class="qty-btn" data-qty-down aria-label="Decrease quantity">−</button>
            <span class="qty-value">${line.qty}</span>
            <button class="qty-btn" data-qty-up aria-label="Increase quantity" ${atMax ? 'disabled' : ''}>+</button>
          </div>
          <span class="price cart-line-total">${money(lineTotal)}</span>
        </div>
      </div>
    </article>`;
}

function render() {
  const lines = getCartLines();

  els.cartCount.textContent = lines.length
    ? `${getCartCount()} item${getCartCount() === 1 ? '' : 's'}`
    : '';

  if (lines.length === 0) {
    els.cartLines.innerHTML = '';
    els.cartSummary.hidden = true;
    els.emptyCart.hidden = false;
    return;
  }

  els.emptyCart.hidden = true;
  els.cartSummary.hidden = false;
  els.cartLines.innerHTML = lines.map(cartLineRow).join('');

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  els.summarySubtotal.textContent = money(subtotal);
  els.summaryTotal.textContent = money(subtotal);
}

function initLineEvents() {
  els.cartLines.addEventListener('click', (e) => {
    const line = e.target.closest('.cart-line');
    if (!line) return;
    const id = Number(line.dataset.id);

    if (e.target.closest('[data-remove]')) {
      removeFromCart(id);
      render();
      return;
    }

    const currentLine = getCartLines().find(l => l.id === id);
    if (!currentLine) return;

    if (e.target.closest('[data-qty-up]')) {
      setCartQty(id, currentLine.qty + 1);
      render();
    } else if (e.target.closest('[data-qty-down]')) {
      if (currentLine.qty <= 1) {
        removeFromCart(id);
      } else {
        setCartQty(id, currentLine.qty - 1);
      }
      render();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  els.cartLines = document.getElementById('cartLines');
  els.cartSummary = document.getElementById('cartSummary');
  els.emptyCart = document.getElementById('emptyCart');
  els.cartCount = document.getElementById('cartCount');
  els.summarySubtotal = document.getElementById('summarySubtotal');
  els.summaryTotal = document.getElementById('summaryTotal');

  renderNav(DB_CATEGORIES);
  initMenu();
  initTheme();
  initLineEvents();

  render();
  renderCartBadge();
});

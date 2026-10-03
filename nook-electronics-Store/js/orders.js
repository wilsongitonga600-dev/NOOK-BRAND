/* ==========================================================================
   NOOK ELECTRONICS — order history page
   Reads the orders array checkout.js writes to localStorage under
   'nook-orders'. No backend yet, so this is purely a local record of what
   was "placed" in this browser — it gets replaced by a real Supabase
   orders query (scoped to the logged-in customer) once auth (Phase 5) and
   Supabase (Phase 4) land.
   ========================================================================== */

const els = {};

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function statusLabel(status) {
  const labels = { pending: 'Pending', confirmed: 'Confirmed', delivered: 'Delivered', cancelled: 'Cancelled' };
  return labels[status] || status;
}

function orderCard(order) {
  const itemRows = order.lines.map(l => `
    <div class="order-item-row">
      <span>${l.name} <span class="order-item-qty">× ${l.qty}</span></span>
      <span class="price">${money(l.price * l.qty)}</span>
    </div>`).join('');

  return `
    <article class="order-card">
      <div class="order-card-head">
        <div>
          <div class="order-id">${order.id}</div>
          <div class="order-date">${formatDate(order.placedAt)}</div>
        </div>
        <span class="order-status">
          <span class="order-status-dot"></span>${statusLabel(order.status)}
        </span>
      </div>
      <div class="order-items">${itemRows}</div>
      <div class="order-card-foot">
        <span class="order-delivery">${order.lines.length} item${order.lines.length === 1 ? '' : 's'} · delivery ${money(order.deliveryFee)}</span>
        <span class="order-total">${money(order.total)}</span>
      </div>
    </article>`;
}

function render() {
  const orders = getOrders();

  if (orders.length === 0) {
    els.orderCount.textContent = '';
    els.ordersList.innerHTML = '';
    els.emptyOrders.hidden = false;
    return;
  }

  els.emptyOrders.hidden = true;
  els.orderCount.textContent = `${orders.length} order${orders.length === 1 ? '' : 's'}`;
  els.ordersList.innerHTML = orders.map(orderCard).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  els.ordersList = document.getElementById('ordersList');
  els.emptyOrders = document.getElementById('emptyOrders');
  els.orderCount = document.getElementById('orderCount');

  renderNav(DB_CATEGORIES);
  initMenu();
  initTheme();
  renderCartBadge();

  render();
});

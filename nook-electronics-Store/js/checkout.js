/* ==========================================================================
   NOOK ELECTRONICS — checkout page
   No payment or backend yet, so "placing an order" here means: validate
   the delivery form, record an order object to localStorage (same pattern
   as the cart), and clear the cart. This gets swapped for a real Supabase
   insert + M-Pesa STK push in later phases — the shape of the order object
   below (customer, lines, totals, status) is deliberately close to what
   the eventual `orders` table will look like.
   ========================================================================== */

const DELIVERY_FEE = 300; // flat placeholder — real logic comes with the backend

const els = {};

function renderSummary() {
  const lines = getCartLines();

  if (lines.length === 0) {
    els.checkoutForm.hidden = true;
    els.emptyCheckout.hidden = false;
    return;
  }

  els.checkoutForm.hidden = false;
  els.emptyCheckout.hidden = true;

  els.summaryLines.innerHTML = lines.map(l => `
    <div class="summary-line-item">
      <span>${l.name} <span class="summary-line-qty">× ${l.qty}</span></span>
      <span class="price">${money(l.price * l.qty)}</span>
    </div>`).join('');

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  els.summarySubtotal.textContent = money(subtotal);
  els.summaryDelivery.textContent = money(DELIVERY_FEE);
  els.summaryTotal.textContent = money(subtotal + DELIVERY_FEE);
}

function generateOrderId() {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `NK-${Date.now().toString().slice(-6)}${rand}`;
}

function saveOrder(order) {
  try {
    const raw = localStorage.getItem('nook-orders');
    const orders = raw ? JSON.parse(raw) : [];
    orders.push(order);
    localStorage.setItem('nook-orders', JSON.stringify(orders));
  } catch (e) { /* storage unavailable */ }
}

function handleSubmit(e) {
  e.preventDefault();

  if (!els.form.checkValidity()) {
    els.form.reportValidity();
    return;
  }

  const lines = getCartLines();
  if (lines.length === 0) return;

  const formData = new FormData(els.form);
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);

  const order = {
    id: generateOrderId(),
    placedAt: new Date().toISOString(),
    status: 'pending',
    customer: {
      fullName: formData.get('fullName'),
      phone: formData.get('phone'),
      county: formData.get('county'),
      town: formData.get('town'),
      address: formData.get('address'),
      notes: formData.get('notes') || null,
    },
    paymentMethod: formData.get('paymentMethod'),
    lines: lines.map(l => ({ id: l.id, name: l.name, price: l.price, qty: l.qty, img: l.img })),
    subtotal,
    deliveryFee: DELIVERY_FEE,
    total: subtotal + DELIVERY_FEE,
  };

  saveOrder(order);
  localStorage.setItem('nook-cart', '[]');
  renderCartBadge();

  els.checkoutForm.hidden = true;
  els.emptyCheckout.hidden = true;
  els.orderConfirmation.hidden = false;
  els.confirmOrderId.textContent = order.id;
}

document.addEventListener('DOMContentLoaded', () => {
  els.checkoutForm = document.getElementById('checkoutForm');
  els.emptyCheckout = document.getElementById('emptyCheckout');
  els.orderConfirmation = document.getElementById('orderConfirmation');
  els.form = document.getElementById('deliveryForm');
  els.summaryLines = document.getElementById('summaryLines');
  els.summarySubtotal = document.getElementById('summarySubtotal');
  els.summaryDelivery = document.getElementById('summaryDelivery');
  els.summaryTotal = document.getElementById('summaryTotal');
  els.confirmOrderId = document.getElementById('confirmOrderId');

  initTheme();
  renderSummary();
  renderCartBadge();
  els.form.addEventListener('submit', handleSubmit);
});

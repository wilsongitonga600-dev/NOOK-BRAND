/* ==========================================================================
   NOOK ELECTRONICS — product detail page
   Reads the product id from ?id= in the URL and looks it up in DB_PRODUCTS
   (from js/data.js, exported via database/export.sh). No fetch, same
   pattern as products.html.
   ========================================================================== */

const els = {};
let currentProduct = null;
let selectedQty = 1;

function getProductIdFromUrl() {
  const raw = new URLSearchParams(location.search).get('id');
  if (raw === null) return null;
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

function categoryLabel(key) {
  const cat = DB_CATEGORIES.find(c => c.key === key);
  return cat ? cat.label : key;
}

function renderBreadcrumb(product) {
  els.breadcrumb.innerHTML = `
    <a href="index.html">Home</a>
    <span>/</span>
    <a href="products.html?cat=${product.category}">${categoryLabel(product.category)}</a>
    <span>/</span>
    <span class="breadcrumb-current">${product.name}</span>`;
}

function renderProduct(product) {
  currentProduct = product;
  selectedQty = 1;

  document.getElementById('pageTitle').textContent = `${product.name} — Nook Electronics`;
  document.getElementById('pageDescription').setAttribute('content', product.description || product.name);

  renderBreadcrumb(product);

  els.pdImage.src = product.img;
  els.pdImage.alt = product.name;
  els.pdImage.onerror = function () {
    this.closest('.product-detail-bezel').style.background = 'linear-gradient(155deg,#1B2140,#0C0F1D)';
    this.remove();
  };

  if (product.badge === 'sale' || product.badge === 'new') {
    els.pdBadge.hidden = false;
    els.pdBadge.textContent = product.badge === 'sale' ? 'Sale' : 'New';
    els.pdBadge.className = `badge-inline ${product.badge === 'sale' ? 'badge-sale' : 'badge-new'}`;
  } else {
    els.pdBadge.hidden = true;
  }

  els.pdName.textContent = product.name;
  els.pdRating.innerHTML = `<span class="stars">★★★★★</span>${product.rating}`;
  els.pdPrice.textContent = money(product.price);

  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : null;
  if (product.oldPrice) {
    els.pdOldPrice.hidden = false;
    els.pdOldPrice.textContent = money(product.oldPrice);
    els.pdDiscount.hidden = false;
    els.pdDiscount.textContent = `-${discount}%`;
  } else {
    els.pdOldPrice.hidden = true;
    els.pdDiscount.hidden = true;
  }

  els.pdDescription.textContent = product.description || '';
  els.pdStock.innerHTML = stockLine(product.stock);

  updateQtyDisplay();
  els.pdAddToCart.disabled = product.stock === 0;
  els.pdAddToCart.textContent = product.stock === 0 ? 'Out of stock' : 'Add to cart';

  renderRelated(product);

  els.productView.hidden = false;
  els.notFound.hidden = true;
}

function updateQtyDisplay() {
  els.pdQtyValue.textContent = String(selectedQty);
  els.pdQtyDown.disabled = selectedQty <= 1;
  els.pdQtyUp.disabled = !currentProduct || selectedQty >= currentProduct.stock;
}

function renderRelated(product) {
  const related = DB_PRODUCTS
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  if (related.length === 0) {
    els.relatedSection.hidden = true;
    return;
  }
  els.relatedSection.hidden = false;
  els.relatedGrid.innerHTML = related.map(productCard).join('');
  initReveal(els.relatedGrid);
}

function initQtyStepper() {
  els.pdQtyDown.addEventListener('click', () => {
    if (selectedQty > 1) {
      selectedQty -= 1;
      updateQtyDisplay();
    }
  });
  els.pdQtyUp.addEventListener('click', () => {
    if (currentProduct && selectedQty < currentProduct.stock) {
      selectedQty += 1;
      updateQtyDisplay();
    }
  });
}

function initAddToCart() {
  els.pdAddToCart.addEventListener('click', () => {
    if (!currentProduct || currentProduct.stock === 0) return;
    addToCart(currentProduct.id, selectedQty);
    const original = els.pdAddToCart.textContent;
    els.pdAddToCart.classList.add('added');
    els.pdAddToCart.textContent = 'Added ✓';
    setTimeout(() => {
      els.pdAddToCart.classList.remove('added');
      els.pdAddToCart.textContent = original;
    }, 1200);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  els.productView = document.getElementById('productView');
  els.notFound = document.getElementById('notFound');
  els.breadcrumb = document.getElementById('breadcrumb');
  els.pdImage = document.getElementById('pdImage');
  els.pdBadge = document.getElementById('pdBadge');
  els.pdName = document.getElementById('pdName');
  els.pdRating = document.getElementById('pdRating');
  els.pdPrice = document.getElementById('pdPrice');
  els.pdOldPrice = document.getElementById('pdOldPrice');
  els.pdDiscount = document.getElementById('pdDiscount');
  els.pdDescription = document.getElementById('pdDescription');
  els.pdStock = document.getElementById('pdStock');
  els.pdQtyDown = document.getElementById('pdQtyDown');
  els.pdQtyUp = document.getElementById('pdQtyUp');
  els.pdQtyValue = document.getElementById('pdQtyValue');
  els.pdAddToCart = document.getElementById('pdAddToCart');
  els.relatedSection = document.getElementById('relatedSection');
  els.relatedGrid = document.getElementById('relatedGrid');

  renderNav(DB_CATEGORIES);
  initMenu();
  initTheme();
  initCartButtons(); // so add-cart / wishlist buttons on related product cards work too
  initQtyStepper();
  initAddToCart();
  renderCartBadge();

  const id = getProductIdFromUrl();
  const product = id != null ? DB_PRODUCTS.find(p => p.id === id) : null;

  if (product) {
    renderProduct(product);
  } else {
    els.productView.hidden = true;
    els.notFound.hidden = false;
  }
});

# Nook Electronics

## Phase 1 — UI Foundation

Static HTML/CSS/JS only. Matches the project structure from the architecture
spec so later phases (Supabase, auth, cart, payments) drop in without a
restructure.

```
index.html           Home page (header, hero, categories, product grids, footer)
css/main.css          Design tokens, base styles, header/footer layout
css/components.css    Buttons, hero, category tiles, product cards, catalog toolbar
css/animations.css    Keyframes + transition rules, respects prefers-reduced-motion
js/common.js          Shared: product card markup, cart interactions, nav rendering
js/app.js             Home page rendering
```

## Phase 2 — Product Catalog (SQLite CLI only, no Python/Node required)

`products.html` reads from a real database instead of a hardcoded array —
good for practicing SQL before the move to Supabase/Postgres — using
**only the `sqlite3` CLI**. No Flask, no Node, no server at all: the site
exports the database to a static JS file and reads that directly, so it
works even opened as `file://index.html`.

```
database/schema.sql   categories + products tables
database/seed.sql      raw SQL INSERT statements — no Python needed
database/export.sh     bash script: dumps nook.db → js/data.js as JSON
js/data.js              AUTO-GENERATED — DB_PRODUCTS / DB_CATEGORIES arrays
products.html           Catalog page: category filter, sort, search, "load more"
js/products.js           Filters/sorts/paginates DB_PRODUCTS entirely in-browser
```

### Setting it up in Termux

```bash
cd nook-electronics/database

# build and seed the database (first time, or to reset it)
sqlite3 nook.db < schema.sql
sqlite3 nook.db < seed.sql

# export the DB to js/data.js — re-run this any time you change data
bash export.sh
```

Then just open `index.html` or `products.html` in a browser — no server
needed. `js/data.js` ships already generated, so the site works out of
the box; re-run `export.sh` whenever you edit `nook.db` directly with
`sqlite3` and want the site to reflect it.

### Working with the data

Everything is plain SQL through the `sqlite3` shell — e.g.:

```bash
sqlite3 database/nook.db
sqlite> UPDATE products SET stock = 0 WHERE name LIKE '%iPhone%';
sqlite> INSERT INTO products (name, category_id, price, rating, stock, image_url)
   ...> VALUES ('New Product', 'audio', 5000, 4.0, 10, 'https://...');
sqlite> .quit
```

Then `bash database/export.sh` and refresh the page to see the change.

### Why not a Python/Node API server?

A live API (Flask, Express, etc.) means every filter/sort click hits a
real query — closer to how Supabase will work in Phase 4 — but it costs
an extra runtime installed on the device. Since storage is tight, this
static-export approach keeps you writing and running real SQL by hand
without installing anything beyond `sqlite3` itself. The trade-off is
that filtering/sorting on `products.html` happens in JavaScript over the
exported data, not via SQL per click — you still get the SQL practice
when you edit the data, just not on every page interaction.

## Design system

- **Colors** — navy (`#12172B`) header/footer, amber (`#E8A33D`) as the one
  accent for price/CTA, teal (`#22B8A6`) for in-stock/success states.
- **Type** — Space Grotesk for headings, Inter for body text, IBM Plex Mono
  for prices/SKUs/timestamps (gives the store a "spec sheet" feel that fits
  an electronics retailer).
- **Signature element** — the "bezel": every product image sits in a
  dark device-frame with a soft screen-reflection highlight. Used in the
  hero and every product card so the whole site visually echoes the
  products it sells.

## Phase 3 — Cart, Checkout, and Theme

```
js/cart.js             Cart page: renders localStorage cart joined with DB_PRODUCTS
cart.html               Line items, qty steppers (clamped to real stock), remove, summary
js/checkout.js          Delivery form + order simulation (no backend/payment yet)
checkout.html            Delivery details, payment method (UI only), order summary
```

Cart state persists in `localStorage` under `nook-cart` as `[{id, qty}, ...]` —
product details are always looked up live from `DB_PRODUCTS` at render time,
so editing prices/stock in the database and re-running `export.sh` is
reflected immediately, nothing goes stale in the cart.

Checkout validates the delivery form, then "places an order" by writing an
order record to `localStorage` under `nook-orders` and clearing the cart.
No payment is charged and nothing is sent anywhere — this is a placeholder
until Phase 8 (M-Pesa) and Phase 4 (Supabase) land. The saved order shape
(`customer`, `lines`, `subtotal`, `deliveryFee`, `total`, `status`) is kept
close to what the eventual `orders` table will look like, so that swap
should mostly be "write to Supabase instead of localStorage" rather than a
rewrite of the checkout flow.

Light/dark theme toggle (sun/moon button, top right on every page) persists
to `localStorage` under `nook-theme` and is applied before first paint via
a small inline script in each page's `<head>`, so there's no flash of the
wrong theme on load.

## Phase 3b — Product Detail

```
js/product.js           Reads ?id= from the URL, renders full product info + related items
product.html              Breadcrumb, large image, price/stock/description, qty stepper, related grid
```

Every product card (home, catalog, related-products) links to
`product.html?id=<id>` now, so browsing actually goes somewhere.

## Phase 3c — Order History

```
js/orders.js             Reads localStorage 'nook-orders' (written by checkout.js)
orders.html                Order cards: id, date, status, line items, delivery fee, total
```

Purely a local record right now — same as the cart, it lives in
`localStorage` on this device only and gets replaced by a real Supabase
query (scoped to the logged-in customer) once auth (Phase 5) is in place.
Orders render newest first.

## Phase 3d — Account

```
js/account.js             Local profile (name/phone/email/county/town), overview stats, reset
account.html                Profile form, orders/cart/theme overview, "clear local data"
```

Same pattern as everything else pre-Supabase: the "account" is a profile
object saved to `localStorage` under `nook-account`, with no real sign-in.
It exists mainly so checkout can eventually pre-fill delivery details from
it. The overview card reads the same `getOrders()`/cart helpers as
`orders.html` and `cart.html` (moved into `js/common.js` so all three
pages share one implementation instead of three copies). "Clear local
data" wipes cart, orders, and profile from this device — handy for
resetting to a clean state while testing.

## Known-issue fixes

**Broken CSS/JS on some navigations.** CSS/JS links used to be relative
(`css/main.css`), and clicking between pages surfaced a real bug: the dev
server rewrites `orders.html` → `/orders` (a 301 to a clean, extensionless
URL), and a same-page "helper" script that used to live here was
force-adding a trailing slash to any extensionless path, turning `/orders`
into `/orders/`. That flipped how the browser resolves relative links —
`css/main.css` now meant `/orders/css/main.css` instead of `/css/main.css`
— so every stylesheet and script 404'd right after that redirect fired.
That helper script has been removed, and every CSS/JS reference is now
**root-relative** (`/css/main.css`, `/js/data.js`) instead of relative to
the current page. A root-relative path always means the same file
regardless of what the address bar shows — extensionless, trailing slash
or not, redirected or not — so this class of bug shouldn't resurface. (If
the site is ever served from something other than the domain root — nested
under a subfolder on a shared host, say — these would need to go back to
relative or be prefixed with that subfolder; ask if that comes up.)

**"Product not found" for a product you just clicked.** This happens
when a page has `js/data.js` loaded in memory from *before* you last ran
`database/export.sh` — the tab is showing product cards from the old
export, but `product.html` loads the *current* `js/data.js` fresh, so an
id that existed in the stale tab's data may no longer exist in the
current one. Fix: after re-running `export.sh`, refresh any already-open
tabs (`index.html`, `products.html`) before clicking through — a fresh
page load always gets the current data. Separately, a real edge-case bug
in the id-parsing (a missing `?id=` was parsing to `0` instead of
correctly showing "not found") has also been fixed.

## Working right now

- Mobile drawer menu (hamburger, under 900px)
- Sticky navy header with desktop search bar / mobile search row
- Home page and catalog page both render from the same SQLite-exported data
- Category filter, sort, live search, and "load more" pagination on the catalog page
- Product detail page with breadcrumb, quantity stepper, and related products
- Persistent cart (localStorage), checkout flow, and local order history
- Light/dark theme toggle on every page
- Add-to-cart: thumbnail flies to the cart icon, badge count bumps
- Wishlist heart toggle (visual only — no persistence yet)
- Fully responsive: mobile-first, tested down to ~360px width

## Not yet wired (later phases per the spec)

- Every page referenced in the nav is now built. What's left is backend
  work, not pages: no real database (still SQLite exported to a static
  file), no auth, no payments.
- No auth — checkout collects delivery details but doesn't create an
  account or log the customer in, and order history is per-device, not
  per-customer.
- No real payment — M-Pesa/card is Phase 8.
- Phase 4 replaces `database/` + `js/data.js` with a live Supabase client —
  `DB_PRODUCTS` / `DB_CATEGORIES` were kept as plain arrays of the same
  shape on purpose so that swap is mostly a data-source change, not a
  rewrite of the pages that consume them.

-- Nook Electronics — Phase 2 learning DB (SQLite, replaced by Supabase/Postgres later)
-- Run with: sqlite3 nook.db < schema.sql

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;

CREATE TABLE categories (
  id    TEXT PRIMARY KEY,      -- slug, e.g. 'tvs' — matches ?cat= in URLs
  name  TEXT NOT NULL,
  icon  TEXT NOT NULL          -- key into the ICONS map in js/common.js
);

CREATE TABLE products (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  category_id   TEXT NOT NULL REFERENCES categories(id),
  price         INTEGER NOT NULL,     -- KSh, whole shillings, no decimals
  old_price     INTEGER,              -- NULL when not discounted
  rating        REAL NOT NULL DEFAULT 0,
  stock         INTEGER NOT NULL DEFAULT 0,
  image_url     TEXT NOT NULL,
  badge         TEXT,                 -- 'sale' | 'new' | NULL
  description   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_created  ON products(created_at);

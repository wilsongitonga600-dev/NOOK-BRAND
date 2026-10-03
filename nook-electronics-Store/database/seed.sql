-- Seed data for nook.db. Run with:
--   sqlite3 nook.db < schema.sql
--   sqlite3 nook.db < seed.sql
-- Safe to re-run schema.sql first — it drops and recreates both tables.

INSERT INTO categories (id, name, icon) VALUES
  ('tvs',         'TVs',                'tv'),
  ('phones',      'Phones & Tablets',   'phone'),
  ('audio',       'Audio',              'audio'),
  ('fridges',     'Refrigerators',      'fridge'),
  ('washing',     'Washing Machines',   'washing'),
  ('kitchen',     'Kitchen Appliances', 'kitchen'),
  ('computers',   'Computers',          'computer'),
  ('accessories', 'Accessories',        'accessories');

INSERT INTO products (name, category_id, price, old_price, rating, stock, image_url, badge, description) VALUES
  ('Samsung 55" 4K Smart TV', 'tvs', 85000, 98000, 4.6, 12,
   'https://images.unsplash.com/photo-1593305841991-05c297ba4575?q=80&w=600&auto=format&fit=crop',
   'sale', '55-inch 4K UHD smart TV with HDR and built-in streaming apps.'),

  ('LG 43" Full HD LED TV', 'tvs', 38000, NULL, 4.3, 9,
   'https://images.unsplash.com/photo-1461151304267-38535e780c79?q=80&w=600&auto=format&fit=crop',
   NULL, '43-inch Full HD LED TV, great everyday size for bedrooms.'),

  ('iPhone 14 (128GB)', 'phones', 92000, NULL, 4.8, 5,
   'https://images.unsplash.com/photo-1678652197831-2d180705cd2c?q=80&w=600&auto=format&fit=crop',
   'new', '128GB storage, A15 Bionic chip, dual rear camera.'),

  ('Samsung Galaxy A54', 'phones', 45000, 51000, 4.5, 14,
   'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?q=80&w=600&auto=format&fit=crop',
   'sale', '6.4-inch AMOLED display, 50MP camera, 5000mAh battery.'),

  ('Samsung Galaxy Tab A9', 'phones', 24000, 27500, 4.5, 2,
   'https://images.unsplash.com/photo-1561154464-82e9adf32764?q=80&w=600&auto=format&fit=crop',
   NULL, '8.7-inch tablet, ideal for streaming and light productivity.'),

  ('JBL Flip 6 Bluetooth Speaker', 'audio', 6500, 8200, 4.4, 3,
   'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?q=80&w=600&auto=format&fit=crop',
   'sale', 'Portable waterproof speaker with 12 hours of playtime.'),

  ('Sony WH-1000XM4 Headphones', 'audio', 32000, 38000, 4.9, 6,
   'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=600&auto=format&fit=crop',
   'sale', 'Industry-leading noise cancelling, 30-hour battery life.'),

  ('LG 250L Double Door Refrigerator', 'fridges', 48000, NULL, 4.5, 0,
   'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?q=80&w=600&auto=format&fit=crop',
   NULL, '250-litre double door fridge with fast-freeze compartment.'),

  ('Ramtons 7kg Washing Machine', 'washing', 41000, NULL, 4.2, 4,
   'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?q=80&w=600&auto=format&fit=crop',
   NULL, 'Top-load 7kg washer with 8 wash programs.'),

  ('Von 3-Burner Gas Cooker', 'kitchen', 15500, 17800, 4.1, 10,
   'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=600&auto=format&fit=crop',
   'sale', '3 gas burners plus electric hotplate, glass top.'),

  ('Nunix Blender 1.5L', 'kitchen', 3200, NULL, 4.0, 20,
   'https://images.unsplash.com/photo-1570222094114-d054a817e56b?q=80&w=600&auto=format&fit=crop',
   NULL, '1.5-litre jug blender with 3 speed settings.'),

  ('HP Pavilion 15" Laptop', 'computers', 78000, NULL, 4.3, 8,
   'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=600&auto=format&fit=crop',
   'new', 'Intel Core i5, 8GB RAM, 512GB SSD, 15.6-inch display.'),

  ('Logitech M185 Wireless Mouse', 'accessories', 1800, NULL, 4.4, 30,
   'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=600&auto=format&fit=crop',
   NULL, 'Compact wireless mouse, plug-and-play USB receiver.'),

  ('Anker 20W USB-C Charger', 'accessories', 2400, 2900, 4.6, 25,
   'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=600&auto=format&fit=crop',
   'sale', 'Fast-charging USB-C wall adapter, compact travel size.');

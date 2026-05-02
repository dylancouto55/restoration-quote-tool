-- ============================================================
-- Restoration Pressure Washing - Database Schema
-- Run this in Supabase: SQL Editor → New Query → paste → Run
-- ============================================================

-- Quotes table: stores every quote submission and tracks its status
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Customer contact info
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  marketing_consent BOOLEAN NOT NULL DEFAULT false,

  -- Property data (auto-filled from RentCast when available)
  living_sqft INTEGER,
  stories DECIMAL(2,1),
  bedrooms INTEGER,
  bathrooms DECIMAL(3,1),
  year_built INTEGER,
  property_data_source TEXT,

  -- Services requested (JSON array of service objects)
  -- Example: [{"type":"house_wash","sqft":2000,"price_low":300,"price_high":450}, ...]
  services JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Pricing
  price_low DECIMAL(10,2),
  price_high DECIMAL(10,2),
  final_price DECIMAL(10,2),

  -- Workflow status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'quoted', 'won', 'lost', 'completed')),

  -- Internal notes (private, only visible to you)
  notes TEXT,

  -- Source tracking
  source TEXT DEFAULT 'website',

  -- Soft delete
  archived BOOLEAN NOT NULL DEFAULT false
);

-- Indexes for fast filtering on common queries
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status) WHERE NOT archived;
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_phone ON quotes(customer_phone);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_email ON quotes(customer_email);

-- Auto-update the updated_at timestamp on any row update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_quotes_updated_at ON quotes;
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Settings table: stores your business config
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default settings: stored as a single 'config' JSON blob for easy editing
INSERT INTO settings (key, value) VALUES
  ('config', '{
    "business": {
      "name": "Restoration Pressure Washing LLC",
      "phone": "248-602-3934",
      "email": "",
      "booking_link": "https://tinyurl.com/RestorationQuoteForm",
      "reviews_link": "https://tinyurl.com/RestorationReviews",
      "facebook_link": "https://www.facebook.com/p/Restoration-Pressure-Washing-LLC-61560527516052/",
      "service_area": "Warren, Sterling Heights, Macomb, Mt Clemens, MI"
    },
    "behavior": {
      "show_instant_quote": true,
      "show_price_range": true,
      "price_range_spread_low": 0.10,
      "price_range_spread_high": 0.15,
      "require_marketing_consent": false,
      "bundle_discount_percent": 10,
      "bundle_discount_threshold": 3
    },
    "services": {
      "house_wash": {
        "enabled": true,
        "name": "House Wash",
        "min_price": 275,
        "rates": {
          "basic": 0.10,
          "standard": 0.18,
          "premium": 0.28
        }
      },
      "driveway": {
        "enabled": true,
        "name": "Driveway / Concrete",
        "min_price": 150,
        "rates": {
          "light": 0.18,
          "standard": 0.25,
          "heavy": 0.35
        }
      },
      "roof": {
        "enabled": true,
        "name": "Roof Wash",
        "min_price": 350,
        "rates": {
          "light": 0.30,
          "standard": 0.40,
          "heavy": 0.55
        }
      },
      "gutters": {
        "enabled": true,
        "name": "Gutter Cleaning",
        "min_price": 150,
        "rates": {
          "cleaning": 1.75,
          "brightening": 2.50,
          "both": 3.75
        }
      },
      "junk": {
        "enabled": true,
        "name": "Junk Removal",
        "tiers": {
          "single":       { "low": 75,  "high": 150, "label": "Single Item" },
          "quarter":      { "low": 150, "high": 250, "label": "1/4 Truck" },
          "half":         { "low": 250, "high": 400, "label": "1/2 Truck" },
          "threequarter": { "low": 400, "high": 550, "label": "3/4 Truck" },
          "full":         { "low": 550, "high": 750, "label": "Full Truck" }
        }
      }
    },
    "internal": {
      "default_labor_rate": 25,
      "default_chem_cost_per_ksqft": 12,
      "default_fuel_cost": 20,
      "home_address": "14815 Chippewa Dr, Warren, MI 48088"
    }
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Row Level Security
-- Public can INSERT quotes (customer submissions)
-- Only authenticated admin can SELECT/UPDATE/DELETE
-- ============================================================
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a quote (anonymous public access for INSERT only)
DROP POLICY IF EXISTS "Anyone can submit quotes" ON quotes;
CREATE POLICY "Anyone can submit quotes"
  ON quotes FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only authenticated users can read/update/delete quotes
DROP POLICY IF EXISTS "Auth users can view quotes" ON quotes;
CREATE POLICY "Auth users can view quotes"
  ON quotes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Auth users can update quotes" ON quotes;
CREATE POLICY "Auth users can update quotes"
  ON quotes FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Auth users can delete quotes" ON quotes;
CREATE POLICY "Auth users can delete quotes"
  ON quotes FOR DELETE
  TO authenticated
  USING (true);

-- Settings: authenticated only
DROP POLICY IF EXISTS "Auth users can view settings" ON settings;
CREATE POLICY "Auth users can view settings"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Auth users can update settings" ON settings;
CREATE POLICY "Auth users can update settings"
  ON settings FOR ALL
  TO authenticated
  USING (true);

-- Public can read the config setting (customer form needs pricing info)
DROP POLICY IF EXISTS "Public can view config" ON settings;
CREATE POLICY "Public can view config"
  ON settings FOR SELECT
  TO anon
  USING (key = 'config');

-- ================== Extensions ==================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================== Drop (child -> parent) ==================
DROP TABLE IF EXISTS inventory_items     CASCADE;
DROP TABLE IF EXISTS inventory_profiles  CASCADE;
DROP TABLE IF EXISTS inventory_members   CASCADE;
DROP TABLE IF EXISTS inventories         CASCADE;
DROP TABLE IF EXISTS groceries           CASCADE;
DROP TABLE IF EXISTS categories          CASCADE;
DROP TABLE IF EXISTS users               CASCADE;

-- ================== 1) users ==================
CREATE TABLE users (
  user_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_name VARCHAR(100),
  login_code   CHAR(4) UNIQUE
);

-- ================== 2) categories ==================
CREATE TABLE categories (
  category_id   INT PRIMARY KEY,
  category_name VARCHAR(255) NOT NULL UNIQUE,

  -- Extended columns (aligned with current design)
  avg_pantry_days            integer,
  pantry_product_count       integer,
  avg_refrigerate_days       integer,
  refrigerate_product_count  integer,
  avg_freeze_days            integer,
  freeze_product_count       integer,
  co2_factor_kg              numeric(10,2),
  co2_method                 text,
  co2_confidence             text,
  price                      numeric(10,2),
  product_size               integer,
  unit                       text
);

-- ================== 3) groceries ==================
CREATE TABLE groceries (
  grocery_id   SERIAL PRIMARY KEY,
  product_id   INT UNIQUE,
  name         CITEXT NOT NULL UNIQUE,
  category_id  INT NOT NULL REFERENCES categories(category_id),

  dop_pantry_max         NUMERIC,
  dop_pantry_metric      VARCHAR(16),
  dop_refrigerate_max    NUMERIC,
  dop_refrigerate_metric VARCHAR(16),
  dop_freeze_max         NUMERIC,
  dop_freeze_metric      VARCHAR(32),

  price         NUMERIC,
  product_size  TEXT,
  unit          TEXT,

  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_groceries_category   ON groceries(category_id);
CREATE INDEX IF NOT EXISTS idx_groceries_name_trgm  ON groceries USING GIN (name gin_trgm_ops);

-- ================== 4) inventories ==================
CREATE TABLE inventories (
  inventory_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_name VARCHAR(100) NOT NULL,
  owner_user_id  UUID NOT NULL REFERENCES users(user_id),
  inventory_type VARCHAR(10) NOT NULL DEFAULT 'shared',
  created_at     TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_inventories_type CHECK (inventory_type IN ('private','shared'))
);

-- ================== 5) inventory_members (no member limit) ==================
CREATE TABLE inventory_members (
  inventory_id  UUID NOT NULL REFERENCES inventories(inventory_id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(user_id)            ON DELETE CASCADE,
  role          VARCHAR(16) DEFAULT 'member',
  joined_at     TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (inventory_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_members_inventory ON inventory_members(inventory_id);
CREATE INDEX IF NOT EXISTS idx_members_user      ON inventory_members(user_id);

-- Trigger: after creating an inventory, automatically add owner as a member
CREATE OR REPLACE FUNCTION add_owner_membership() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO inventory_members(inventory_id, user_id, role)
  VALUES (NEW.inventory_id, NEW.owner_user_id, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_inventory_owner_membership ON inventories;
CREATE TRIGGER trg_inventory_owner_membership
AFTER INSERT ON inventories
FOR EACH ROW EXECUTE FUNCTION add_owner_membership();

-- ================== 6) inventory_profiles (three “profiles/slots”, share the same Shared) ==================
CREATE TABLE inventory_profiles (
  profile_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id  UUID NOT NULL REFERENCES inventories(inventory_id) ON DELETE CASCADE,
  profile_name  VARCHAR(60) NOT NULL,
  position      SMALLINT NOT NULL,   -- 1..3; typically 1 = creator, 2/3 added via “+”
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (inventory_id, position)
);

-- After creating an inventory, automatically create a default profile (position=1) using creator's display_name
CREATE OR REPLACE FUNCTION add_default_profile() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_name text;
BEGIN
  SELECT display_name INTO owner_name FROM users WHERE user_id = NEW.owner_user_id;
  IF owner_name IS NULL THEN owner_name := 'Owner'; END IF;

  INSERT INTO inventory_profiles(inventory_id, profile_name, position)
  VALUES (NEW.inventory_id, owner_name, 1)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_inventory_default_profile ON inventories;
CREATE TRIGGER trg_inventory_default_profile
AFTER INSERT ON inventories
FOR EACH ROW EXECUTE FUNCTION add_default_profile();

-- ================== 7) inventory_items (bind Shared/Private with profile) ==================
CREATE TABLE inventory_items (
  item_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id  UUID NOT NULL REFERENCES inventories(inventory_id) ON DELETE CASCADE,
  grocery_id    INT  NOT NULL REFERENCES groceries(grocery_id)     ON DELETE RESTRICT,
  quantity      NUMERIC(10,3) NOT NULL DEFAULT 1,
  purchased_at  DATE,
  actual_expiry DATE,
  created_by    UUID NOT NULL REFERENCES users(user_id),
  visibility    VARCHAR(10) NOT NULL DEFAULT 'shared',  -- 'shared' | 'private'
  profile_id    UUID NULL REFERENCES inventory_profiles(profile_id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_quantity_nonneg CHECK (quantity >= 0),
  CONSTRAINT chk_visibility CHECK (visibility IN ('shared','private')),
  CONSTRAINT chk_profile_match
    CHECK (
      (visibility='shared'  AND profile_id IS NULL) OR
      (visibility='private' AND profile_id IS NOT NULL)
    )
);
CREATE INDEX IF NOT EXISTS idx_items_inventory        ON inventory_items(inventory_id);
CREATE INDEX IF NOT EXISTS idx_items_grocery          ON inventory_items(grocery_id);
CREATE INDEX IF NOT EXISTS idx_items_expiry           ON inventory_items(actual_expiry);
CREATE INDEX IF NOT EXISTS idx_items_visibility       ON inventory_items(visibility);
CREATE INDEX IF NOT EXISTS idx_items_profile          ON inventory_items(profile_id);
CREATE INDEX IF NOT EXISTS idx_items_inv_gid_exp_upd  ON inventory_items(inventory_id, grocery_id, actual_expiry, updated_at DESC);

-- updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_inventory_items_updated ON inventory_items;
CREATE TRIGGER trg_inventory_items_updated
BEFORE UPDATE ON inventory_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Session actor + write validation (same logic as before)
CREATE OR REPLACE FUNCTION public.set_actor(p_user_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('app.user_id', p_user_id::text, true);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_member_can_write()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor UUID := NULLIF(current_setting('app.user_id', true), '');
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'missing app.user_id in session';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM inventory_members m
    WHERE m.inventory_id = NEW.inventory_id AND m.user_id = actor
  ) THEN
    RAISE EXCEPTION 'user % is not a member of inventory %', actor, NEW.inventory_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.created_by := actor;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'created_by is immutable';
    END IF;
  END IF;

  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_items_member_write ON public.inventory_items;
CREATE TRIGGER trg_items_member_write
BEFORE INSERT OR UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.check_member_can_write();

---------------------------------------------------
-- =========================================================
-- UseItUp DB migration: remove member cap + add three profiles + Private/Shared
-- Idempotent and safe to re-run
-- Recommendation: execute during a low-traffic window; run the whole script in one go
-- =========================================================
BEGIN;

-- ---------- 0) Base extensions (idempotent) ----------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------- 1) Remove “members ≤ 3” related objects ----------
-- Triggers & functions (ignore if they don’t exist)
DROP TRIGGER IF EXISTS trg_enforce_member_limit_ins ON public.inventory_members;
DROP FUNCTION IF EXISTS public.enforce_member_limit();

-- Old in-inventory short-number logic (if you had it before)
DROP TRIGGER IF EXISTS trg_assign_member_no ON public.inventory_members;
DROP FUNCTION IF EXISTS public.assign_member_no();
DROP INDEX IF EXISTS uq_member_no_per_inventory;              -- old unique index name
DROP INDEX IF EXISTS public.uq_member_no_per_inventory;       -- some environments prefix with schema
-- Optional: drop column (if you still keep member_no)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='inventory_members' AND column_name='member_no'
  ) THEN
    ALTER TABLE public.inventory_members DROP COLUMN member_no;
  END IF;
END$$;

-- ---------- 2) profiles: add “profile/slot” table ----------
CREATE TABLE IF NOT EXISTS public.inventory_profiles (
  profile_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id  UUID NOT NULL REFERENCES public.inventories(inventory_id) ON DELETE CASCADE,
  profile_name  VARCHAR(60) NOT NULL,
  position      SMALLINT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (inventory_id, position)
);

-- ---------- 3) Backfill default profiles (position=1, name = owner's display_name) for existing inventories ----------
-- Ensure we have a function for “auto-create default profile when a new inventory is created”
CREATE OR REPLACE FUNCTION public.add_default_profile() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_name text;
BEGIN
  SELECT display_name INTO owner_name FROM public.users WHERE user_id = NEW.owner_user_id;
  IF owner_name IS NULL THEN owner_name := 'Owner'; END IF;

  INSERT INTO public.inventory_profiles(inventory_id, profile_name, position)
  VALUES (NEW.inventory_id, owner_name, 1)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END$$;

-- Trigger: auto-create default profile for future inventories
DROP TRIGGER IF EXISTS trg_inventory_default_profile ON public.inventories;
CREATE TRIGGER trg_inventory_default_profile
AFTER INSERT ON public.inventories
FOR EACH ROW EXECUTE FUNCTION public.add_default_profile();

-- Backfill default profile for existing inventories (only when position=1 is missing)
WITH need AS (
  SELECT inv.inventory_id, COALESCE(u.display_name, 'Owner') AS owner_name
  FROM public.inventories inv
  LEFT JOIN public.users u ON u.user_id = inv.owner_user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.inventory_profiles p
    WHERE p.inventory_id = inv.inventory_id AND p.position = 1
  )
)
INSERT INTO public.inventory_profiles(inventory_id, profile_name, position)
SELECT inventory_id, owner_name, 1 FROM need
ON CONFLICT DO NOTHING;

-- ---------- 4) items: add Private/Shared structure ----------
-- 4.1 New columns (add first, then backfill, then add constraints)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='inventory_items' AND column_name='visibility'
  ) THEN
    ALTER TABLE public.inventory_items
      ADD COLUMN visibility VARCHAR(10);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='inventory_items' AND column_name='profile_id'
  ) THEN
    ALTER TABLE public.inventory_items
      ADD COLUMN profile_id UUID NULL;
  END IF;
END$$;

-- 4.2 Foreign key (create if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='inventory_items_profile_id_fkey'
  ) THEN
    ALTER TABLE public.inventory_items
      ADD CONSTRAINT inventory_items_profile_id_fkey
      FOREIGN KEY (profile_id) REFERENCES public.inventory_profiles(profile_id) ON DELETE CASCADE;
  END IF;
END$$;

-- 4.3 Backfill old data: treat all as Shared (no private)
UPDATE public.inventory_items
SET visibility = COALESCE(visibility, 'shared'),
    profile_id = NULL
WHERE visibility IS NULL;

-- 4.4 Add CHECK constraints (drop old names if they exist, then create)
ALTER TABLE public.inventory_items
  DROP CONSTRAINT IF EXISTS chk_visibility;
ALTER TABLE public.inventory_items
  ADD CONSTRAINT chk_visibility CHECK (visibility IN ('shared','private'));

ALTER TABLE public.inventory_items
  DROP CONSTRAINT IF EXISTS chk_profile_match;
ALTER TABLE public.inventory_items
  ADD CONSTRAINT chk_profile_match
  CHECK (
    (visibility='shared'  AND profile_id IS NULL) OR
    (visibility='private' AND profile_id IS NOT NULL)
  );

-- 4.5 Helper indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_items_visibility       ON public.inventory_items(visibility);
CREATE INDEX IF NOT EXISTS idx_items_profile          ON public.inventory_items(profile_id);
DROP INDEX IF EXISTS idx_items_inv_gid_exp_created;   -- old name (if you had it)
CREATE INDEX IF NOT EXISTS idx_items_inv_gid_exp_upd
  ON public.inventory_items(inventory_id, grocery_id, actual_expiry, updated_at DESC);

-- ---------- 5) Triggers/functions to keep (add if missing) ----------
-- updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_inventory_items_updated ON public.inventory_items;
CREATE TRIGGER trg_inventory_items_updated
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- session actor
CREATE OR REPLACE FUNCTION public.set_actor(p_user_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('app.user_id', p_user_id::text, true);
END;
$$;

-- write guard
CREATE OR REPLACE FUNCTION public.check_member_can_write()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor UUID := NULLIF(current_setting('app.user_id', true), '');
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'missing app.user_id in session';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_members m
    WHERE m.inventory_id = NEW.inventory_id AND m.user_id = actor
  ) THEN
    RAISE EXCEPTION 'user % is not a member of inventory %', actor, NEW.inventory_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.created_by := actor;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'created_by is immutable';
    END IF;
  END IF;

  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_items_member_write ON public.inventory_items;
CREATE TRIGGER trg_items_member_write
BEFORE INSERT OR UPDATE ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.check_member_can_write();

-- ---------- 6) Auto-add owner as member when creating an inventory (ensure enabled) ----------
CREATE OR REPLACE FUNCTION public.add_owner_membership() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.inventory_members(inventory_id, user_id, role)
  VALUES (NEW.inventory_id, NEW.owner_user_id, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_inventory_owner_membership ON public.inventories;
CREATE TRIGGER trg_inventory_owner_membership
AFTER INSERT ON public.inventories
FOR EACH ROW EXECUTE FUNCTION public.add_owner_membership();

COMMIT;
---------------

-- Drop share_code column (if it exists)
ALTER TABLE public.inventories DROP COLUMN IF EXISTS share_code;

-- Add inventory_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='inventories' AND column_name='inventory_type'
  ) THEN
    ALTER TABLE public.inventories
      ADD COLUMN inventory_type VARCHAR(10) NOT NULL DEFAULT 'shared';
  END IF;
END$$;

-- Add CHECK constraint
ALTER TABLE public.inventories DROP CONSTRAINT IF EXISTS chk_inventories_type;
ALTER TABLE public.inventories
  ADD CONSTRAINT chk_inventories_type CHECK (inventory_type IN ('private','shared'));
-----------------
-- New columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='inventory_items' AND column_name='visibility'
  ) THEN
    ALTER TABLE public.inventory_items ADD COLUMN visibility VARCHAR(10);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='inventory_items' AND column_name='profile_id'
  ) THEN
    ALTER TABLE public.inventory_items ADD COLUMN profile_id UUID NULL;
  END IF;
END$$;

-- Foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='inventory_items_profile_id_fkey'
  ) THEN
    ALTER TABLE public.inventory_items
      ADD CONSTRAINT inventory_items_profile_id_fkey
      FOREIGN KEY (profile_id) REFERENCES public.inventory_profiles(profile_id) ON DELETE CASCADE;
  END IF;
END$$;

-- Backfill old data
UPDATE public.inventory_items
SET visibility = COALESCE(visibility,'shared'),
    profile_id = NULL
WHERE visibility IS NULL;

-- Constraints
ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS chk_visibility;
ALTER TABLE public.inventory_items
  ADD CONSTRAINT chk_visibility CHECK (visibility IN ('shared','private'));

ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS chk_profile_match;
ALTER TABLE public.inventory_items
  ADD CONSTRAINT chk_profile_match
  CHECK (
    (visibility='shared'  AND profile_id IS NULL) OR
    (visibility='private' AND profile_id IS NOT NULL)
  );

-------------------------
BEGIN;

-- 1) Three-profile table
CREATE TABLE IF NOT EXISTS public.inventory_profiles (
  profile_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id  UUID NOT NULL REFERENCES public.inventories(inventory_id) ON DELETE CASCADE,
  profile_name  VARCHAR(60) NOT NULL,
  position      SMALLINT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (inventory_id, position)
);

-- 2) Auto-create position=1 (name = owner's display_name) on new inventory
CREATE OR REPLACE FUNCTION public.add_default_profile() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_name text;
BEGIN
  SELECT display_name INTO owner_name FROM public.users WHERE user_id = NEW.owner_user_id;
  IF owner_name IS NULL THEN owner_name := 'Owner'; END IF;

  INSERT INTO public.inventory_profiles(inventory_id, profile_name, position)
  VALUES (NEW.inventory_id, owner_name, 1)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_inventory_default_profile ON public.inventories;
CREATE TRIGGER trg_inventory_default_profile
AFTER INSERT ON public.inventories
FOR EACH ROW EXECUTE FUNCTION public.add_default_profile();

-- 3) Backfill position=1 for existing inventories
WITH need AS (
  SELECT inv.inventory_id, COALESCE(u.display_name,'Owner') AS owner_name
  FROM public.inventories inv
  LEFT JOIN public.users u ON u.user_id = inv.owner_user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.inventory_profiles p
    WHERE p.inventory_id = inv.inventory_id AND p.position = 1
  )
)
INSERT INTO public.inventory_profiles(inventory_id, profile_name, position)
SELECT inventory_id, owner_name, 1 FROM need
ON CONFLICT DO NOTHING;

COMMIT;
---
BEGIN;

ALTER TABLE public.inventories DROP COLUMN IF EXISTS share_code;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='inventories' AND column_name='inventory_type'
  ) THEN
    ALTER TABLE public.inventories
      ADD COLUMN inventory_type VARCHAR(10) NOT NULL DEFAULT 'shared';
  END IF;
END$$;

ALTER TABLE public.inventories DROP CONSTRAINT IF EXISTS chk_inventories_type;
ALTER TABLE public.inventories
  ADD CONSTRAINT chk_inventories_type CHECK (inventory_type IN ('private','shared'));

COMMIT;
--
BEGIN;

-- Add columns first (DDL will not trigger write validation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='inventory_items' AND column_name='visibility'
  ) THEN
    ALTER TABLE public.inventory_items ADD COLUMN visibility VARCHAR(10);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='inventory_items' AND column_name='profile_id'
  ) THEN
    ALTER TABLE public.inventory_items ADD COLUMN profile_id UUID NULL;
  END IF;
END$$;

-- Foreign key (profile table already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='inventory_items_profile_id_fkey'
  ) THEN
    ALTER TABLE public.inventory_items
      ADD CONSTRAINT inventory_items_profile_id_fkey
      FOREIGN KEY (profile_id) REFERENCES public.inventory_profiles(profile_id) ON DELETE CASCADE;
  END IF;
END$$;

-- Set default for new column to avoid passing it on subsequent inserts
ALTER TABLE public.inventory_items ALTER COLUMN visibility SET DEFAULT 'shared';

-- Backfill old data: temporarily disable all user triggers (including write validation & updated_at)
ALTER TABLE public.inventory_items DISABLE TRIGGER ALL;

UPDATE public.inventory_items
SET visibility = COALESCE(visibility, 'shared'),
    profile_id = NULL
WHERE visibility IS NULL;

-- Re-enable triggers after backfill
ALTER TABLE public.inventory_items ENABLE TRIGGER ALL;

-- Constraints
ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS chk_visibility;
ALTER TABLE public.inventory_items
  ADD CONSTRAINT chk_visibility CHECK (visibility IN ('shared','private'));

ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS chk_profile_match;
ALTER TABLE public.inventory_items
  ADD CONSTRAINT chk_profile_match
  CHECK (
    (visibility='shared'  AND profile_id IS NULL) OR
    (visibility='private' AND profile_id IS NOT NULL)
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_items_visibility  ON public.inventory_items(visibility);
CREATE INDEX IF NOT EXISTS idx_items_profile     ON public.inventory_items(profile_id);
DROP INDEX  IF EXISTS idx_items_inv_gid_exp_created;
CREATE INDEX IF NOT EXISTS idx_items_inv_gid_exp_upd
  ON public.inventory_items(inventory_id, grocery_id, actual_expiry, updated_at DESC);

COMMIT;
-------------------------
-- ① Detailed ledger: insert one row for every “consumption/use” event
CREATE TABLE IF NOT EXISTS consumption_ledger (
  consume_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id   UUID NOT NULL REFERENCES inventories(inventory_id) ON DELETE CASCADE,
  item_id        UUID,   -- for traceability; may be NULL (record remains even if the item is deleted)
  grocery_id     INT  NOT NULL REFERENCES groceries(grocery_id),
  quantity       NUMERIC(10,3) NOT NULL CHECK (quantity > 0),

  -- Snapshot at write-time (future price/factor changes won’t affect history)
  unit_price     NUMERIC(12,4),       -- unit price (e.g., price / product_size)
  co2_factor_kg  NUMERIC(12,4),       -- CO2 per unit
  category_id    INT,
  category_name  TEXT,

  -- Ownership dimensions aligned with items (for whole-inventory/shared/three private profiles aggregation)
  visibility     VARCHAR(10) NOT NULL CHECK (visibility IN ('shared','private')),
  profile_id     UUID NULL REFERENCES inventory_profiles(profile_id),

  consumed_by    UUID NOT NULL REFERENCES users(user_id),
  consumed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generated columns: persist “money/CO₂ saved” for faster aggregations
ALTER TABLE consumption_ledger
  ADD COLUMN IF NOT EXISTS money_saved   NUMERIC(14,4)
  GENERATED ALWAYS AS (quantity * COALESCE(unit_price, 0)) STORED;

ALTER TABLE consumption_ledger
  ADD COLUMN IF NOT EXISTS co2_saved_kg NUMERIC(14,4)
  GENERATED ALWAYS AS (quantity * COALESCE(co2_factor_kg, 0)) STORED;

-- Semantic constraint: shared => no profile; private => profile required
ALTER TABLE consumption_ledger DROP CONSTRAINT IF EXISTS chk_consume_profile_match;
ALTER TABLE consumption_ledger
  ADD CONSTRAINT chk_consume_profile_match
  CHECK (
    (visibility='shared'  AND profile_id IS NULL) OR
    (visibility='private' AND profile_id IS NOT NULL)
  );

-- Common indexes (used by trends/aggregations)
CREATE INDEX IF NOT EXISTS idx_consume_inv_time ON consumption_ledger(inventory_id, consumed_at DESC);
CREATE INDEX IF NOT EXISTS idx_consume_profile  ON consumption_ledger(profile_id);
CREATE INDEX IF NOT EXISTS idx_consume_vis      ON consumption_ledger(visibility);

-------------------------
select * from inventory_items;
select * from inventory_members;
select * from users;
select * from inventory_profiles;
select * from inventories;
select * from groceries;
select * from categories;
select * from consumption_ledger;

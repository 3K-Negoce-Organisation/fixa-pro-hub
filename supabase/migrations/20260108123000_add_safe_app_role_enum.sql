-- Idempotent migration to ensure public.app_role enum exists and contains required values.
-- ADD VALUE cannot be mixed with enum_range() in same transaction (PG visibility), so we add values one-by-one with exception handling.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE t.typname = 'app_role' AND n.nspname = 'public') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
    RETURN;
  END IF;
END
$$;

-- Add missing values (ignore if already exists). Each in its own block to avoid same-transaction enum visibility issues.
DO $$ BEGIN ALTER TYPE public.app_role ADD VALUE 'admin'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.app_role ADD VALUE 'moderator'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.app_role ADD VALUE 'user'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

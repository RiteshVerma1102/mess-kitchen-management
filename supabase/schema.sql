-- ============================================================================
-- FOODFLOW PRO MAX — UNIFIED IDEMPOTENT DATABASE SCHEMA
-- ============================================================================
-- This script safely initializes all FoodFlow tables, types, RLS policies,
-- security definer RPC functions, and triggers.
-- Paste this entire file into your Supabase SQL Editor and click RUN.
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'foodflow_role') THEN
    CREATE TYPE public.foodflow_role AS ENUM (
      'institution_admin',
      'mess_manager',
      'kitchen_staff',
      'attendance_operator',
      'viewer',
      'student'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'institution_type') THEN
    CREATE TYPE public.institution_type AS ENUM (
      'college',
      'university',
      'hostel',
      'school',
      'corporate',
      'hospital',
      'canteen',
      'ngo',
      'other'
    );
  ELSE
    -- Ensure 'university' exists
    ALTER TYPE public.institution_type ADD VALUE IF NOT EXISTS 'university';
  END IF;
END;
$$;

-- 3. CORE TENANCY TABLES
CREATE TABLE IF NOT EXISTS public.foodflow_institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'college',
  currency_code text NOT NULL DEFAULT 'INR',
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  waste_target_pct numeric(5,2) NOT NULL DEFAULT 5.0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.foodflow_institutions TO authenticated;
GRANT ALL ON public.foodflow_institutions TO service_role;
ALTER TABLE public.foodflow_institutions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.foodflow_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  email text,
  institution_id uuid REFERENCES public.foodflow_institutions(id) ON DELETE SET NULL,
  institution_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.foodflow_profiles TO authenticated;
GRANT UPDATE (display_name, institution_name, updated_at) ON public.foodflow_profiles TO authenticated;
GRANT ALL ON public.foodflow_profiles TO service_role;
ALTER TABLE public.foodflow_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.foodflow_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  role public.foodflow_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, institution_id, role)
);
GRANT SELECT ON public.foodflow_user_roles TO authenticated;
GRANT ALL ON public.foodflow_user_roles TO service_role;
ALTER TABLE public.foodflow_user_roles ENABLE ROW LEVEL SECURITY;

-- 4. HELPER FUNCTIONS FOR RLS
CREATE OR REPLACE FUNCTION public.foodflow_current_institution_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.institution_id FROM public.foodflow_profiles p WHERE p.user_id = auth.uid() LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.foodflow_current_institution_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_current_institution_id() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.foodflow_has_role(_institution_id uuid, _role public.foodflow_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.foodflow_user_roles r
    WHERE r.user_id = auth.uid()
      AND r.institution_id = _institution_id
      AND r.role = _role
  );
$$;
REVOKE ALL ON FUNCTION public.foodflow_has_role(uuid, public.foodflow_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_has_role(uuid, public.foodflow_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.foodflow_has_any_role(_institution_id uuid, _roles public.foodflow_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.foodflow_user_roles r
    WHERE r.user_id = auth.uid()
      AND r.institution_id = _institution_id
      AND r.role = ANY(_roles)
  );
$$;
REVOKE ALL ON FUNCTION public.foodflow_has_any_role(uuid, public.foodflow_role[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_has_any_role(uuid, public.foodflow_role[]) TO authenticated, service_role;

-- 5. OPERATIONAL TABLES
CREATE TABLE IF NOT EXISTS public.foodflow_halls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  capacity integer NOT NULL DEFAULT 0 CHECK (capacity >= 0),
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_halls TO authenticated;
GRANT ALL ON public.foodflow_halls TO service_role;
ALTER TABLE public.foodflow_halls ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.foodflow_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit text NOT NULL DEFAULT 'kg',
  minimum_quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (minimum_quantity >= 0),
  unit_cost numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  supplier_name text NOT NULL DEFAULT '',
  expiry_date date,
  is_demo boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_inventory TO authenticated;
GRANT ALL ON public.foodflow_inventory TO service_role;
ALTER TABLE public.foodflow_inventory ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.foodflow_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.foodflow_inventory(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  quantity_delta numeric(12,2) NOT NULL,
  unit text NOT NULL DEFAULT 'kg',
  reason text NOT NULL DEFAULT 'Manual update',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_stock_movements TO authenticated;
GRANT ALL ON public.foodflow_stock_movements TO service_role;
ALTER TABLE public.foodflow_stock_movements ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.foodflow_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_suppliers TO authenticated;
GRANT ALL ON public.foodflow_suppliers TO service_role;
ALTER TABLE public.foodflow_suppliers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.foodflow_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  supplier_name text NOT NULL,
  item_summary text NOT NULL,
  total_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Ordered','Received','Cancelled')),
  expected_date date,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, order_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_purchase_orders TO authenticated;
GRANT ALL ON public.foodflow_purchase_orders TO service_role;
ALTER TABLE public.foodflow_purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.foodflow_purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.foodflow_purchase_orders(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit text NOT NULL DEFAULT 'kg',
  unit_cost numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_purchase_order_items TO authenticated;
GRANT ALL ON public.foodflow_purchase_order_items TO service_role;
ALTER TABLE public.foodflow_purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.foodflow_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Main course',
  servings integer NOT NULL DEFAULT 100 CHECK (servings > 0),
  cost_per_serving numeric(12,2) NOT NULL DEFAULT 0 CHECK (cost_per_serving >= 0),
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  instructions text NOT NULL DEFAULT '',
  diet_type text NOT NULL DEFAULT 'veg' CHECK (diet_type IN ('veg','non-veg','jain','vegan')),
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_recipes TO authenticated;
GRANT ALL ON public.foodflow_recipes TO service_role;
ALTER TABLE public.foodflow_recipes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.foodflow_meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  service_date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('Breakfast','Lunch','Snacks','Dinner')),
  title text NOT NULL,
  dishes text[] NOT NULL DEFAULT '{}',
  expected_servings integer NOT NULL DEFAULT 0 CHECK (expected_servings >= 0),
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Published','Completed')),
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, service_date, meal_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_meal_plans TO authenticated;
GRANT ALL ON public.foodflow_meal_plans TO service_role;
ALTER TABLE public.foodflow_meal_plans ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.foodflow_kitchen_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  task_date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('Breakfast','Lunch','Snacks','Dinner')),
  dish_name text NOT NULL,
  planned_quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (planned_quantity >= 0),
  completed_quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (completed_quantity >= 0),
  assigned_to text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Not started' CHECK (status IN ('Not started','In progress','Ready','Completed')),
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_kitchen_tasks TO authenticated;
GRANT ALL ON public.foodflow_kitchen_tasks TO service_role;
ALTER TABLE public.foodflow_kitchen_tasks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.foodflow_service_actuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  service_date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('Breakfast','Lunch','Snacks','Dinner')),
  dish_name text NOT NULL,
  prepared_quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (prepared_quantity >= 0),
  served_quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (served_quantity >= 0),
  leftover_quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (leftover_quantity >= 0),
  spoiled_quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (spoiled_quantity >= 0),
  unit text NOT NULL DEFAULT 'portions',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, service_date, meal_type, dish_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_service_actuals TO authenticated;
GRANT ALL ON public.foodflow_service_actuals TO service_role;
ALTER TABLE public.foodflow_service_actuals ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.foodflow_waste_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  meal_type text NOT NULL CHECK (meal_type IN ('Breakfast','Lunch','Snacks','Dinner')),
  dish_name text NOT NULL,
  prepared_quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (prepared_quantity >= 0),
  served_quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (served_quantity >= 0),
  wasted_quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (wasted_quantity >= 0),
  unit text NOT NULL DEFAULT 'kg',
  waste_cost numeric(12,2) NOT NULL DEFAULT 0 CHECK (waste_cost >= 0),
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_waste_entries TO authenticated;
GRANT ALL ON public.foodflow_waste_entries TO service_role;
ALTER TABLE public.foodflow_waste_entries ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.foodflow_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  forecast_date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('Breakfast','Lunch','Snacks','Dinner')),
  expected_students integer NOT NULL DEFAULT 0 CHECK (expected_students >= 0),
  confidence numeric(5,2) NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  method text NOT NULL DEFAULT 'manual',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, forecast_date, meal_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_forecasts TO authenticated;
GRANT ALL ON public.foodflow_forecasts TO service_role;
ALTER TABLE public.foodflow_forecasts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.foodflow_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  student_code text NOT NULL,
  full_name text NOT NULL,
  hall text NOT NULL DEFAULT 'Main Dining Hall',
  meal_plan text NOT NULL DEFAULT 'Standard',
  diet text NOT NULL DEFAULT 'veg' CHECK (diet IN ('veg','non-veg','jain','vegan')),
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','On leave','Inactive')),
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, student_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_students TO authenticated;
GRANT ALL ON public.foodflow_students TO service_role;
ALTER TABLE public.foodflow_students ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.foodflow_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.foodflow_students(id) ON DELETE SET NULL,
  student_code text NOT NULL,
  student_name text NOT NULL,
  hall text NOT NULL DEFAULT 'Main Dining Hall',
  meal_type text NOT NULL,
  served_at timestamptz NOT NULL DEFAULT now(),
  device_uuid text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_attendance TO authenticated;
GRANT ALL ON public.foodflow_attendance TO service_role;
ALTER TABLE public.foodflow_attendance ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.foodflow_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  event_date date NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  attendance_factor numeric(5,2) NOT NULL DEFAULT 1 CHECK (attendance_factor >= 0),
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_calendar_events TO authenticated;
GRANT ALL ON public.foodflow_calendar_events TO service_role;
ALTER TABLE public.foodflow_calendar_events ENABLE ROW LEVEL SECURITY;

-- 6. RPC FUNCTIONS (SECURITY DEFINER)

-- User Registration Trigger Handler
CREATE OR REPLACE FUNCTION public.foodflow_handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_institution_name text := btrim(coalesce(NEW.raw_user_meta_data ->> 'institution_name', NEW.raw_user_meta_data ->> 'pending_institution_name', ''));
  requested_type text := coalesce(nullif(btrim(NEW.raw_user_meta_data ->> 'institution_type'), ''), 'college');
  created_institution_id uuid;
BEGIN
  IF length(requested_institution_name) >= 2 AND length(requested_institution_name) <= 120 THEN
    INSERT INTO public.foodflow_institutions (name, type)
      VALUES (requested_institution_name, requested_type)
      RETURNING id INTO created_institution_id;
  END IF;

  INSERT INTO public.foodflow_profiles (user_id, display_name, email, institution_id, institution_name)
    VALUES (
      NEW.id,
      coalesce(nullif(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''), nullif(btrim(NEW.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(NEW.email, ''), '@', 1)),
      NEW.email,
      created_institution_id,
      nullif(requested_institution_name, '')
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      display_name = CASE WHEN public.foodflow_profiles.display_name = '' THEN EXCLUDED.display_name ELSE public.foodflow_profiles.display_name END,
      institution_id = coalesce(public.foodflow_profiles.institution_id, EXCLUDED.institution_id),
      institution_name = coalesce(public.foodflow_profiles.institution_name, EXCLUDED.institution_name);

  IF created_institution_id IS NOT NULL THEN
    INSERT INTO public.foodflow_user_roles (user_id, institution_id, role)
      VALUES (NEW.id, created_institution_id, 'institution_admin')
      ON CONFLICT DO NOTHING;
    INSERT INTO public.foodflow_halls (institution_id, name, capacity)
      VALUES (created_institution_id, 'Main Dining Hall', 0)
      ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_handle_new_auth_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS foodflow_auth_user_created ON auth.users;
CREATE TRIGGER foodflow_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.foodflow_handle_new_auth_user();

-- Bootstrap Workspace for logged in user
CREATE OR REPLACE FUNCTION public.foodflow_complete_setup_for_current_user(_institution_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  tenant_id uuid;
  new_id uuid;
  cleaned_name text := btrim(_institution_name);
BEGIN
  IF caller_id IS NULL THEN RAISE EXCEPTION 'Sign in is required'; END IF;
  IF cleaned_name IS NULL OR length(cleaned_name) < 2 OR length(cleaned_name) > 120 THEN
    RAISE EXCEPTION 'Institution name must be between 2 and 120 characters';
  END IF;

  SELECT p.institution_id INTO tenant_id FROM public.foodflow_profiles p WHERE p.user_id = caller_id FOR UPDATE;
  IF tenant_id IS NOT NULL THEN RETURN tenant_id; END IF;

  INSERT INTO public.foodflow_institutions (name) VALUES (cleaned_name) RETURNING id INTO new_id;

  INSERT INTO public.foodflow_profiles (user_id, display_name, email, institution_id, institution_name)
    VALUES (caller_id, '', (SELECT email FROM auth.users WHERE id = caller_id), new_id, cleaned_name)
    ON CONFLICT (user_id) DO UPDATE SET
      institution_id = new_id,
      institution_name = cleaned_name,
      updated_at = now();

  INSERT INTO public.foodflow_user_roles (user_id, institution_id, role)
    VALUES (caller_id, new_id, 'institution_admin')
    ON CONFLICT DO NOTHING;

  INSERT INTO public.foodflow_halls (institution_id, name, capacity)
    VALUES (new_id, 'Main Dining Hall', 0)
    ON CONFLICT DO NOTHING;

  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_complete_setup_for_current_user(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_complete_setup_for_current_user(text) TO authenticated;

-- Create institution RPC
CREATE OR REPLACE FUNCTION public.foodflow_create_institution(_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.foodflow_complete_setup_for_current_user(_name);
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_create_institution(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_create_institution(text) TO authenticated;

-- Stock Adjustment RPC
CREATE OR REPLACE FUNCTION public.foodflow_adjust_inventory(_inventory_id uuid, _institution_id uuid, _delta numeric, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item public.foodflow_inventory%ROWTYPE;
  cleaned_reason text := left(coalesce(nullif(btrim(_reason), ''), 'Stock adjustment'), 120);
BEGIN
  IF auth.uid() IS NULL
    OR _institution_id IS NULL
    OR _institution_id <> public.foodflow_current_institution_id()
    OR NOT public.foodflow_has_any_role(_institution_id, ARRAY['institution_admin','mess_manager','kitchen_staff']::public.foodflow_role[]) THEN
    RAISE EXCEPTION 'A permitted institution role is required to adjust stock';
  END IF;

  IF _delta IS NULL OR _delta = 0 OR abs(_delta) > 100000 THEN
    RAISE EXCEPTION 'Stock adjustment must be non-zero and within allowed range';
  END IF;

  SELECT * INTO item FROM public.foodflow_inventory
    WHERE id = _inventory_id AND institution_id = _institution_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inventory item not found'; END IF;
  IF item.quantity + _delta < 0 THEN RAISE EXCEPTION 'Stock cannot go below zero'; END IF;

  UPDATE public.foodflow_inventory
    SET quantity = item.quantity + _delta, updated_at = now()
    WHERE id = item.id RETURNING * INTO item;

  INSERT INTO public.foodflow_stock_movements (institution_id, inventory_item_id, item_name, quantity_delta, unit, reason)
    VALUES (_institution_id, item.id, item.name, _delta, item.unit, cleaned_reason);

  RETURN jsonb_build_object(
    'id', item.id,
    'name', item.name,
    'category', item.category,
    'quantity', item.quantity,
    'unit', item.unit,
    'minimum_quantity', item.minimum_quantity,
    'unit_cost', item.unit_cost,
    'supplier_name', item.supplier_name,
    'expiry_date', item.expiry_date,
    'is_demo', item.is_demo
  );
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_adjust_inventory(uuid, uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_adjust_inventory(uuid, uuid, numeric, text) TO authenticated;

-- Delete inventory item RPC
CREATE OR REPLACE FUNCTION public.foodflow_delete_inventory_item(_inventory_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE tenant_id uuid := public.foodflow_current_institution_id();
BEGIN
  IF auth.uid() IS NULL
    OR tenant_id IS NULL
    OR NOT public.foodflow_has_any_role(tenant_id, ARRAY['institution_admin','mess_manager']::public.foodflow_role[]) THEN
    RAISE EXCEPTION 'A manager role is required to remove an ingredient';
  END IF;

  DELETE FROM public.foodflow_inventory WHERE id = _inventory_id AND institution_id = tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inventory item not found'; END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_delete_inventory_item(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_delete_inventory_item(uuid) TO authenticated;

-- Assign role by email RPC
CREATE OR REPLACE FUNCTION public.foodflow_assign_role_by_email(_target_email text, _role public.foodflow_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_institution uuid := public.foodflow_current_institution_id();
  target_user_id uuid;
  target_institution uuid;
  normalized_email text := lower(btrim(_target_email));
BEGIN
  IF auth.uid() IS NULL OR caller_institution IS NULL OR NOT public.foodflow_has_role(caller_institution, 'institution_admin') THEN
    RAISE EXCEPTION 'Only an institution administrator can assign roles';
  END IF;
  IF normalized_email IS NULL OR normalized_email = '' OR _role = 'institution_admin' THEN
    RAISE EXCEPTION 'Enter a valid email and a non-administrator role';
  END IF;

  SELECT u.id INTO target_user_id FROM auth.users u WHERE lower(u.email) = normalized_email LIMIT 1;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'That account must sign up before it can be assigned a role';
  END IF;

  SELECT p.institution_id INTO target_institution FROM public.foodflow_profiles p WHERE p.user_id = target_user_id FOR UPDATE;
  IF NOT FOUND OR (target_institution IS NOT NULL AND target_institution <> caller_institution) THEN
    RAISE EXCEPTION 'That account already belongs to another institution or is unavailable';
  END IF;

  UPDATE public.foodflow_profiles
    SET institution_id = caller_institution,
        institution_name = (SELECT i.name FROM public.foodflow_institutions i WHERE i.id = caller_institution),
        updated_at = now()
    WHERE user_id = target_user_id;

  INSERT INTO public.foodflow_user_roles (user_id, institution_id, role)
    VALUES (target_user_id, caller_institution, _role)
    ON CONFLICT (user_id, institution_id, role) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_assign_role_by_email(text, public.foodflow_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_assign_role_by_email(text, public.foodflow_role) TO authenticated;

-- List team RPC
CREATE OR REPLACE FUNCTION public.foodflow_list_team()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE tenant_id uuid := public.foodflow_current_institution_id();
BEGIN
  IF auth.uid() IS NULL OR tenant_id IS NULL OR NOT public.foodflow_has_role(tenant_id, 'institution_admin') THEN
    RAISE EXCEPTION 'Only an institution administrator can view the team';
  END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object('userId', g.user_id, 'name', coalesce(p.display_name, 'FoodFlow member'), 'email', p.email, 'roles', g.roles) ORDER BY p.display_name)
    FROM (
      SELECT r.user_id, array_agg(r.role ORDER BY r.role)::text[] AS roles
      FROM public.foodflow_user_roles r WHERE r.institution_id = tenant_id GROUP BY r.user_id
    ) g JOIN public.foodflow_profiles p ON p.user_id = g.user_id
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_list_team() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_list_team() TO authenticated;

-- Remove role RPC
CREATE OR REPLACE FUNCTION public.foodflow_remove_role(_target_user_id uuid, _role public.foodflow_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE tenant_id uuid := public.foodflow_current_institution_id();
BEGIN
  IF auth.uid() IS NULL OR tenant_id IS NULL OR NOT public.foodflow_has_role(tenant_id, 'institution_admin') THEN
    RAISE EXCEPTION 'Only an institution administrator can remove roles';
  END IF;
  IF _target_user_id = auth.uid() OR _role = 'institution_admin' THEN
    RAISE EXCEPTION 'The first institution administrator cannot be removed here';
  END IF;

  DELETE FROM public.foodflow_user_roles WHERE user_id = _target_user_id AND institution_id = tenant_id AND role = _role;
  IF NOT FOUND THEN RAISE EXCEPTION 'Role assignment not found'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.foodflow_user_roles WHERE user_id = _target_user_id AND institution_id = tenant_id) THEN
    UPDATE public.foodflow_profiles SET institution_id = NULL, institution_name = NULL, updated_at = now()
    WHERE user_id = _target_user_id AND institution_id = tenant_id;
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_remove_role(uuid, public.foodflow_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_remove_role(uuid, public.foodflow_role) TO authenticated;

-- Import demo data RPC
CREATE OR REPLACE FUNCTION public.foodflow_import_demo_inventory(_institution_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE tenant_id uuid := public.foodflow_current_institution_id();
DECLARE demo_day date := current_date;
DECLARE existing_demo boolean;
BEGIN
  IF auth.uid() IS NULL OR tenant_id IS NULL OR tenant_id <> _institution_id OR NOT public.foodflow_has_role(tenant_id, 'institution_admin') THEN
    RAISE EXCEPTION 'Only an institution administrator can add sample data';
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.foodflow_inventory WHERE institution_id = tenant_id AND is_demo) INTO existing_demo;
  IF existing_demo THEN RETURN true; END IF;

  INSERT INTO public.foodflow_inventory (institution_id,name,category,quantity,unit,minimum_quantity,unit_cost,supplier_name,is_demo) VALUES
    (tenant_id,'Basmati rice','Grains',42,'kg',50,78,'Greenfield Foods',true),
    (tenant_id,'Red tomatoes','Produce',18,'kg',15,42,'Daily Harvest Co.',true),
    (tenant_id,'Whole milk','Dairy',26,'L',18,56,'Meadow Dairy',true),
    (tenant_id,'Toor dal','Pulses',33,'kg',24,132,'Greenfield Foods',true),
    (tenant_id,'Fresh spinach','Produce',8,'kg',12,38,'Daily Harvest Co.',true),
    (tenant_id,'Yogurt','Dairy',13,'kg',10,64,'Meadow Dairy',true),
    (tenant_id,'Sunflower oil','Pantry',29,'L',20,145,'Cedar Supply',true)
    ON CONFLICT DO NOTHING;

  INSERT INTO public.foodflow_suppliers (institution_id,name,contact_name,email,phone,category,is_demo) VALUES
    (tenant_id,'Greenfield Foods','Arjun Patel','orders@greenfield.example','+91 98765 00001','Grains & pulses',true),
    (tenant_id,'Daily Harvest Co.','Priya Nair','hello@dailyharvest.example','+91 98765 00002','Fresh produce',true),
    (tenant_id,'Meadow Dairy','Dev Malhotra','supply@meadow.example','+91 98765 00003','Dairy',true)
    ON CONFLICT DO NOTHING;

  INSERT INTO public.foodflow_students (institution_id,student_code,full_name,hall,meal_plan,status,is_demo) VALUES
    (tenant_id,'ST-1042','Aarav Mehta','Main Dining Hall','Standard','Active',true),
    (tenant_id,'ST-1088','Ananya Rao','Main Dining Hall','Standard','Active',true),
    (tenant_id,'ST-1136','Kabir Shah','Main Dining Hall','Standard','Active',true),
    (tenant_id,'ST-1194','Meera Iyer','Main Dining Hall','Standard','Active',true),
    (tenant_id,'ST-1235','Vihaan Kapoor','Main Dining Hall','Standard','On leave',true)
    ON CONFLICT DO NOTHING;

  INSERT INTO public.foodflow_recipes (institution_id,name,category,servings,cost_per_serving,ingredients,instructions,diet_type,is_demo) VALUES
    (tenant_id,'Vegetable pulao','Main course',100,26.50,'[{"name":"Basmati rice","quantity":12,"unit":"kg"},{"name":"Seasonal vegetables","quantity":8,"unit":"kg"}]'::jsonb,'Rinse rice, sauté whole spices and vegetables, then cook together until fluffy.','veg',true),
    (tenant_id,'Dal tadka','Main course',100,19.25,'[{"name":"Toor dal","quantity":10,"unit":"kg"},{"name":"Tomatoes","quantity":4,"unit":"kg"}]'::jsonb,'Simmer the dal until soft. Finish with a warm tomato and cumin tempering.','veg',true),
    (tenant_id,'Paneer bhurji','Main course',80,34.00,'[{"name":"Paneer","quantity":8,"unit":"kg"},{"name":"Tomatoes","quantity":3,"unit":"kg"}]'::jsonb,'Cook tomatoes and spices until fragrant; crumble paneer in just before serving.','veg',true),
    (tenant_id,'Fresh fruit bowl','Side',120,17.50,'[{"name":"Seasonal fruit","quantity":12,"unit":"kg"}]'::jsonb,'Wash, portion and chill seasonal fruit shortly before service.','veg',true)
    ON CONFLICT DO NOTHING;

  INSERT INTO public.foodflow_meal_plans (institution_id,service_date,meal_type,title,dishes,expected_servings,status,is_demo) VALUES
    (tenant_id,demo_day,'Breakfast','A bright, balanced start',ARRAY['Poha','Fresh seasonal fruit','Masala chai'],420,'Published',true),
    (tenant_id,demo_day,'Lunch','Comforting midday meal',ARRAY['Dal tadka','Steamed basmati rice','Seasonal sabzi','Roti'],680,'Published',true),
    (tenant_id,demo_day,'Snacks','Afternoon kitchen break',ARRAY['Vegetable cutlet','Masala chai'],350,'Published',true),
    (tenant_id,demo_day,'Dinner','Freshly prepared evening menu',ARRAY['Paneer bhurji','Phulka','Cucumber salad'],610,'Published',true)
    ON CONFLICT (institution_id, service_date, meal_type) DO NOTHING;

  INSERT INTO public.foodflow_kitchen_tasks (institution_id,task_date,meal_type,dish_name,planned_quantity,completed_quantity,assigned_to,status,is_demo) VALUES
    (tenant_id,demo_day,'Breakfast','Prepare poha',420,420,'Morning kitchen','Completed',true),
    (tenant_id,demo_day,'Lunch','Cook dal tadka',680,415,'Hot kitchen','In progress',true),
    (tenant_id,demo_day,'Lunch','Steam basmati rice',680,340,'Grain station','In progress',true),
    (tenant_id,demo_day,'Dinner','Prepare paneer bhurji',610,0,'Evening kitchen','Not started',true)
    ON CONFLICT DO NOTHING;

  INSERT INTO public.foodflow_purchase_orders (institution_id,order_number,supplier_name,item_summary,total_amount,status,expected_date,is_demo) VALUES
    (tenant_id,'DEMO-PO-018','Greenfield Foods','Rice, toor dal',18400,'Approved',demo_day,true),
    (tenant_id,'DEMO-PO-017','Daily Harvest Co.','Tomatoes, spinach, onions',9650,'Ordered',demo_day + 1,true),
    (tenant_id,'DEMO-PO-016','Meadow Dairy','Milk, yogurt',7120,'Received',demo_day - 3,true)
    ON CONFLICT (institution_id, order_number) DO NOTHING;

  INSERT INTO public.foodflow_waste_entries (institution_id,record_date,meal_type,dish_name,prepared_quantity,served_quantity,wasted_quantity,unit,waste_cost,is_demo) VALUES
    (tenant_id,demo_day - 1,'Lunch','Seasonal sabzi',112,105,7,'kg',630,true),
    (tenant_id,demo_day,'Breakfast','Poha',74,69,5,'kg',350,true)
    ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_import_demo_inventory(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_import_demo_inventory(uuid) TO authenticated;

-- 7. IDEMPOTENT RLS POLICIES

-- Institutions
DROP POLICY IF EXISTS "FoodFlow members read their institution" ON public.foodflow_institutions;
CREATE POLICY "FoodFlow members read their institution" ON public.foodflow_institutions FOR SELECT TO authenticated
  USING (id = public.foodflow_current_institution_id());

-- Profiles
DROP POLICY IF EXISTS "FoodFlow users read their own profile" ON public.foodflow_profiles;
CREATE POLICY "FoodFlow users read their own profile" ON public.foodflow_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "FoodFlow users update only their display name" ON public.foodflow_profiles;
CREATE POLICY "FoodFlow users update only their display name" ON public.foodflow_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Roles
DROP POLICY IF EXISTS "FoodFlow users read roles in their institution" ON public.foodflow_user_roles;
CREATE POLICY "FoodFlow users read roles in their institution" ON public.foodflow_user_roles FOR SELECT TO authenticated
  USING (institution_id = public.foodflow_current_institution_id());

-- Standard tenant isolation policies for domain tables
DO $$
DECLARE
  table_name text;
  writer_roles text[];
  delete_roles text[];
  writer_array text;
  delete_array text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'foodflow_halls',
    'foodflow_inventory',
    'foodflow_stock_movements',
    'foodflow_meal_plans',
    'foodflow_recipes',
    'foodflow_suppliers',
    'foodflow_students',
    'foodflow_attendance',
    'foodflow_kitchen_tasks',
    'foodflow_forecasts',
    'foodflow_purchase_orders',
    'foodflow_waste_entries',
    'foodflow_calendar_events',
    'foodflow_service_actuals'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "FoodFlow member reads tenant %1$s" ON public.%1$I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "FoodFlow assigned roles create tenant %1$s" ON public.%1$I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "FoodFlow assigned roles update tenant %1$s" ON public.%1$I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "FoodFlow authorized roles delete tenant %1$s" ON public.%1$I', table_name);

    writer_roles := CASE table_name
      WHEN 'foodflow_inventory' THEN ARRAY['institution_admin','mess_manager','kitchen_staff']
      WHEN 'foodflow_stock_movements' THEN ARRAY['institution_admin','mess_manager','kitchen_staff']
      WHEN 'foodflow_meal_plans' THEN ARRAY['institution_admin','mess_manager']
      WHEN 'foodflow_recipes' THEN ARRAY['institution_admin','mess_manager']
      WHEN 'foodflow_suppliers' THEN ARRAY['institution_admin','mess_manager']
      WHEN 'foodflow_halls' THEN ARRAY['institution_admin','mess_manager']
      WHEN 'foodflow_students' THEN ARRAY['institution_admin','mess_manager','attendance_operator']
      WHEN 'foodflow_attendance' THEN ARRAY['institution_admin','mess_manager','kitchen_staff','attendance_operator']
      WHEN 'foodflow_kitchen_tasks' THEN ARRAY['institution_admin','mess_manager','kitchen_staff']
      WHEN 'foodflow_forecasts' THEN ARRAY['institution_admin','mess_manager']
      WHEN 'foodflow_purchase_orders' THEN ARRAY['institution_admin','mess_manager']
      WHEN 'foodflow_waste_entries' THEN ARRAY['institution_admin','mess_manager','kitchen_staff']
      WHEN 'foodflow_calendar_events' THEN ARRAY['institution_admin','mess_manager']
      WHEN 'foodflow_service_actuals' THEN ARRAY['institution_admin','mess_manager','kitchen_staff']
      ELSE ARRAY['institution_admin']
    END;

    delete_roles := CASE table_name
      WHEN 'foodflow_students' THEN ARRAY['institution_admin']
      WHEN 'foodflow_attendance' THEN ARRAY['institution_admin']
      ELSE ARRAY['institution_admin','mess_manager']
    END;

    writer_array := array_to_string(ARRAY(SELECT quote_literal(r) FROM unnest(writer_roles) AS r), ',');
    delete_array := array_to_string(ARRAY(SELECT quote_literal(r) FROM unnest(delete_roles) AS r), ',');

    EXECUTE format('CREATE POLICY "FoodFlow member reads tenant %1$s" ON public.%1$I FOR SELECT TO authenticated USING (institution_id = public.foodflow_current_institution_id())', table_name);
    EXECUTE format('CREATE POLICY "FoodFlow assigned roles create tenant %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (institution_id = public.foodflow_current_institution_id() AND public.foodflow_has_any_role(institution_id, ARRAY[%2$s]::public.foodflow_role[]))', table_name, writer_array);
    EXECUTE format('CREATE POLICY "FoodFlow assigned roles update tenant %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (institution_id = public.foodflow_current_institution_id() AND public.foodflow_has_any_role(institution_id, ARRAY[%2$s]::public.foodflow_role[])) WITH CHECK (institution_id = public.foodflow_current_institution_id() AND public.foodflow_has_any_role(institution_id, ARRAY[%2$s]::public.foodflow_role[]))', table_name, writer_array);
    EXECUTE format('CREATE POLICY "FoodFlow authorized roles delete tenant %1$s" ON public.%1$I FOR DELETE TO authenticated USING (institution_id = public.foodflow_current_institution_id() AND public.foodflow_has_any_role(institution_id, ARRAY[%2$s]::public.foodflow_role[]))', table_name, delete_array);
  END LOOP;
END;
$$;

-- Purchase order items special policy
DROP POLICY IF EXISTS "FoodFlow members read order items" ON public.foodflow_purchase_order_items;
CREATE POLICY "FoodFlow members read order items" ON public.foodflow_purchase_order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.foodflow_purchase_orders po WHERE po.id = purchase_order_id AND po.institution_id = public.foodflow_current_institution_id()));

DROP POLICY IF EXISTS "FoodFlow managers manage order items" ON public.foodflow_purchase_order_items;
CREATE POLICY "FoodFlow managers manage order items" ON public.foodflow_purchase_order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.foodflow_purchase_orders po WHERE po.id = purchase_order_id AND po.institution_id = public.foodflow_current_institution_id() AND public.foodflow_has_any_role(po.institution_id, ARRAY['institution_admin','mess_manager']::public.foodflow_role[])))
  WITH CHECK (EXISTS (SELECT 1 FROM public.foodflow_purchase_orders po WHERE po.id = purchase_order_id AND po.institution_id = public.foodflow_current_institution_id() AND public.foodflow_has_any_role(po.institution_id, ARRAY['institution_admin','mess_manager']::public.foodflow_role[])));

-- 8. INDEXES
CREATE INDEX IF NOT EXISTS foodflow_inventory_institution_name_idx ON public.foodflow_inventory (institution_id, name);
CREATE INDEX IF NOT EXISTS foodflow_meal_plans_institution_date_idx ON public.foodflow_meal_plans (institution_id, service_date);
CREATE INDEX IF NOT EXISTS foodflow_attendance_institution_served_idx ON public.foodflow_attendance (institution_id, served_at DESC);
CREATE INDEX IF NOT EXISTS foodflow_kitchen_tasks_institution_date_idx ON public.foodflow_kitchen_tasks (institution_id, task_date);
CREATE INDEX IF NOT EXISTS foodflow_waste_institution_date_idx ON public.foodflow_waste_entries (institution_id, record_date);
CREATE INDEX IF NOT EXISTS foodflow_roles_institution_user_idx ON public.foodflow_user_roles (institution_id, user_id);

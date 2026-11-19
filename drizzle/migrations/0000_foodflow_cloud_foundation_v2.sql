CREATE TYPE public.foodflow_role AS ENUM ('institution_admin', 'mess_manager', 'kitchen_staff', 'attendance_operator', 'viewer');

CREATE TABLE public.foodflow_institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  currency_code text NOT NULL DEFAULT 'INR',
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.foodflow_institutions TO authenticated;
GRANT ALL ON public.foodflow_institutions TO service_role;
ALTER TABLE public.foodflow_institutions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.foodflow_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  institution_id uuid REFERENCES public.foodflow_institutions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.foodflow_profiles TO authenticated;
GRANT UPDATE (display_name) ON public.foodflow_profiles TO authenticated;
GRANT ALL ON public.foodflow_profiles TO service_role;
ALTER TABLE public.foodflow_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.foodflow_user_roles (
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

CREATE FUNCTION public.foodflow_current_institution_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT p.institution_id FROM public.foodflow_profiles p WHERE p.user_id = auth.uid() LIMIT 1 $$;
REVOKE ALL ON FUNCTION public.foodflow_current_institution_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_current_institution_id() TO authenticated;

CREATE FUNCTION public.foodflow_has_role(_institution_id uuid, _role public.foodflow_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.foodflow_user_roles r WHERE r.user_id = auth.uid() AND r.institution_id = _institution_id AND r.role = _role) $$;
REVOKE ALL ON FUNCTION public.foodflow_has_role(uuid, public.foodflow_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_has_role(uuid, public.foodflow_role) TO authenticated;

CREATE FUNCTION public.foodflow_has_any_role(_institution_id uuid, _roles public.foodflow_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.foodflow_user_roles r WHERE r.user_id = auth.uid() AND r.institution_id = _institution_id AND r.role = ANY(_roles)) $$;
REVOKE ALL ON FUNCTION public.foodflow_has_any_role(uuid, public.foodflow_role[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_has_any_role(uuid, public.foodflow_role[]) TO authenticated;

CREATE FUNCTION public.foodflow_handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.foodflow_profiles (user_id, display_name)
  VALUES (NEW.id, coalesce(nullif(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(NEW.email, ''), '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_handle_new_auth_user() FROM PUBLIC;
CREATE TRIGGER foodflow_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.foodflow_handle_new_auth_user();

CREATE TABLE public.foodflow_halls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  capacity integer NOT NULL DEFAULT 0 CHECK (capacity >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_halls TO authenticated;
GRANT ALL ON public.foodflow_halls TO service_role;
ALTER TABLE public.foodflow_halls ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.foodflow_inventory (
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
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_inventory TO authenticated;
GRANT ALL ON public.foodflow_inventory TO service_role;
ALTER TABLE public.foodflow_inventory ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.foodflow_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES public.foodflow_inventory(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity_delta numeric(12,2) NOT NULL,
  unit text NOT NULL DEFAULT 'kg',
  reason text NOT NULL DEFAULT 'Stock adjustment',
  moved_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_stock_movements TO authenticated;
GRANT ALL ON public.foodflow_stock_movements TO service_role;
ALTER TABLE public.foodflow_stock_movements ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.foodflow_meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  service_date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('Breakfast','Lunch','Snacks','Dinner')),
  title text NOT NULL,
  dishes text[] NOT NULL DEFAULT '{}',
  expected_servings integer NOT NULL DEFAULT 0 CHECK (expected_servings >= 0),
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Published','Completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, service_date, meal_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_meal_plans TO authenticated;
GRANT ALL ON public.foodflow_meal_plans TO service_role;
ALTER TABLE public.foodflow_meal_plans ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.foodflow_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Main course',
  servings integer NOT NULL DEFAULT 50 CHECK (servings > 0),
  cost_per_serving numeric(12,2) NOT NULL DEFAULT 0 CHECK (cost_per_serving >= 0),
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  instructions text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_recipes TO authenticated;
GRANT ALL ON public.foodflow_recipes TO service_role;
ALTER TABLE public.foodflow_recipes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.foodflow_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Review')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_suppliers TO authenticated;
GRANT ALL ON public.foodflow_suppliers TO service_role;
ALTER TABLE public.foodflow_suppliers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.foodflow_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  student_code text NOT NULL,
  full_name text NOT NULL,
  hall text NOT NULL DEFAULT '',
  meal_plan text NOT NULL DEFAULT 'Standard',
  dietary_notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','On leave','Inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, student_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_students TO authenticated;
GRANT ALL ON public.foodflow_students TO service_role;
ALTER TABLE public.foodflow_students ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.foodflow_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.foodflow_students(id) ON DELETE SET NULL,
  student_code text NOT NULL DEFAULT '',
  student_name text NOT NULL,
  hall text NOT NULL DEFAULT '',
  meal_type text NOT NULL CHECK (meal_type IN ('Breakfast','Lunch','Snacks','Dinner')),
  served_at timestamptz NOT NULL DEFAULT now(),
  device_uuid text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_attendance TO authenticated;
GRANT ALL ON public.foodflow_attendance TO service_role;
ALTER TABLE public.foodflow_attendance ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.foodflow_kitchen_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  task_date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('Breakfast','Lunch','Snacks','Dinner')),
  dish_name text NOT NULL,
  planned_quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (planned_quantity >= 0),
  completed_quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (completed_quantity >= 0),
  assigned_to text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Not started' CHECK (status IN ('Not started','In progress','Ready','Completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_kitchen_tasks TO authenticated;
GRANT ALL ON public.foodflow_kitchen_tasks TO service_role;
ALTER TABLE public.foodflow_kitchen_tasks ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.foodflow_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  forecast_date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('Breakfast','Lunch','Snacks','Dinner')),
  expected_students integer NOT NULL DEFAULT 0 CHECK (expected_students >= 0),
  confidence numeric(5,2) NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  method text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, forecast_date, meal_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_forecasts TO authenticated;
GRANT ALL ON public.foodflow_forecasts TO service_role;
ALTER TABLE public.foodflow_forecasts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.foodflow_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  supplier_name text NOT NULL,
  item_summary text NOT NULL,
  total_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Ordered','Received','Cancelled')),
  expected_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, order_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_purchase_orders TO authenticated;
GRANT ALL ON public.foodflow_purchase_orders TO service_role;
ALTER TABLE public.foodflow_purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.foodflow_purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.foodflow_purchase_orders(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit text NOT NULL DEFAULT 'kg',
  unit_cost numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_purchase_order_items TO authenticated;
GRANT ALL ON public.foodflow_purchase_order_items TO service_role;
ALTER TABLE public.foodflow_purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.foodflow_waste_entries (
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
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_waste_entries TO authenticated;
GRANT ALL ON public.foodflow_waste_entries TO service_role;
ALTER TABLE public.foodflow_waste_entries ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.foodflow_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.foodflow_institutions(id) ON DELETE CASCADE,
  event_date date NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  attendance_factor numeric(5,2) NOT NULL DEFAULT 1 CHECK (attendance_factor >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_calendar_events TO authenticated;
GRANT ALL ON public.foodflow_calendar_events TO service_role;
ALTER TABLE public.foodflow_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.foodflow_service_actuals (
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
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, service_date, meal_type, dish_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foodflow_service_actuals TO authenticated;
GRANT ALL ON public.foodflow_service_actuals TO service_role;
ALTER TABLE public.foodflow_service_actuals ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.foodflow_create_institution(_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  new_id uuid;
  existing_id uuid;
  cleaned_name text := btrim(_name);
BEGIN
  IF caller_id IS NULL THEN RAISE EXCEPTION 'Sign in is required'; END IF;
  IF cleaned_name IS NULL OR length(cleaned_name) < 2 OR length(cleaned_name) > 120 THEN RAISE EXCEPTION 'Institution name must be between 2 and 120 characters'; END IF;
  SELECT institution_id INTO existing_id FROM public.foodflow_profiles WHERE user_id = caller_id FOR UPDATE;
  IF existing_id IS NOT NULL THEN RAISE EXCEPTION 'This account already belongs to an institution'; END IF;
  INSERT INTO public.foodflow_institutions (name) VALUES (cleaned_name) RETURNING id INTO new_id;
  UPDATE public.foodflow_profiles SET institution_id = new_id, updated_at = now() WHERE user_id = caller_id;
  INSERT INTO public.foodflow_user_roles (user_id, institution_id, role) VALUES (caller_id, new_id, 'institution_admin');
  INSERT INTO public.foodflow_halls (institution_id, name, capacity) VALUES (new_id, 'Main Dining Hall', 0);
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_create_institution(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_create_institution(text) TO authenticated;

CREATE FUNCTION public.foodflow_assign_role(_target_user_id uuid, _role public.foodflow_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  caller_institution uuid := public.foodflow_current_institution_id();
  target_institution uuid;
BEGIN
  IF auth.uid() IS NULL OR caller_institution IS NULL OR NOT public.foodflow_has_role(caller_institution, 'institution_admin') THEN
    RAISE EXCEPTION 'Only an institution administrator can assign roles';
  END IF;
  IF _target_user_id IS NULL OR _role = 'institution_admin' THEN
    RAISE EXCEPTION 'Use institution setup for the first administrator';
  END IF;
  SELECT institution_id INTO target_institution FROM public.foodflow_profiles WHERE user_id = _target_user_id FOR UPDATE;
  IF NOT FOUND OR (target_institution IS NOT NULL AND target_institution <> caller_institution) THEN
    RAISE EXCEPTION 'That account cannot be added to this institution';
  END IF;
  UPDATE public.foodflow_profiles SET institution_id = caller_institution, updated_at = now() WHERE user_id = _target_user_id;
  INSERT INTO public.foodflow_user_roles (user_id, institution_id, role)
    VALUES (_target_user_id, caller_institution, _role)
    ON CONFLICT (user_id, institution_id, role) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_assign_role(uuid, public.foodflow_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_assign_role(uuid, public.foodflow_role) TO authenticated;

CREATE POLICY "FoodFlow members read their institution" ON public.foodflow_institutions FOR SELECT TO authenticated
  USING (id = public.foodflow_current_institution_id());
CREATE POLICY "FoodFlow users read their own profile" ON public.foodflow_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "FoodFlow users update only their display name" ON public.foodflow_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "FoodFlow users read roles in their institution" ON public.foodflow_user_roles FOR SELECT TO authenticated
  USING (institution_id = public.foodflow_current_institution_id());

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['foodflow_halls','foodflow_inventory','foodflow_stock_movements','foodflow_meal_plans','foodflow_recipes','foodflow_suppliers','foodflow_students','foodflow_attendance','foodflow_kitchen_tasks','foodflow_forecasts','foodflow_purchase_orders','foodflow_waste_entries','foodflow_calendar_events','foodflow_service_actuals'] LOOP
    EXECUTE format('CREATE POLICY "FoodFlow member reads tenant %1$s" ON public.%1$I FOR SELECT TO authenticated USING (institution_id = public.foodflow_current_institution_id())', t);
    EXECUTE format('CREATE POLICY "FoodFlow manager creates tenant %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (institution_id = public.foodflow_current_institution_id() AND public.foodflow_has_any_role(institution_id, ARRAY[''institution_admin'',''mess_manager'',''kitchen_staff'']::public.foodflow_role[]))', t);
    EXECUTE format('CREATE POLICY "FoodFlow manager updates tenant %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (institution_id = public.foodflow_current_institution_id() AND public.foodflow_has_any_role(institution_id, ARRAY[''institution_admin'',''mess_manager'',''kitchen_staff'']::public.foodflow_role[])) WITH CHECK (institution_id = public.foodflow_current_institution_id() AND public.foodflow_has_any_role(institution_id, ARRAY[''institution_admin'',''mess_manager'',''kitchen_staff'']::public.foodflow_role[]))', t);
    EXECUTE format('CREATE POLICY "FoodFlow admin deletes tenant %1$s" ON public.%1$I FOR DELETE TO authenticated USING (institution_id = public.foodflow_current_institution_id() AND public.foodflow_has_any_role(institution_id, ARRAY[''institution_admin'',''mess_manager'']::public.foodflow_role[]))', t);
  END LOOP;
END;
$$;

CREATE POLICY "FoodFlow members read order items" ON public.foodflow_purchase_order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.foodflow_purchase_orders po WHERE po.id = purchase_order_id AND po.institution_id = public.foodflow_current_institution_id()));
CREATE POLICY "FoodFlow managers manage order items" ON public.foodflow_purchase_order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.foodflow_purchase_orders po WHERE po.id = purchase_order_id AND po.institution_id = public.foodflow_current_institution_id() AND public.foodflow_has_any_role(po.institution_id, ARRAY['institution_admin','mess_manager']::public.foodflow_role[])))
  WITH CHECK (EXISTS (SELECT 1 FROM public.foodflow_purchase_orders po WHERE po.id = purchase_order_id AND po.institution_id = public.foodflow_current_institution_id() AND public.foodflow_has_any_role(po.institution_id, ARRAY['institution_admin','mess_manager']::public.foodflow_role[])));

CREATE INDEX foodflow_inventory_institution_name_idx ON public.foodflow_inventory (institution_id, name);
CREATE INDEX foodflow_meal_plans_institution_date_idx ON public.foodflow_meal_plans (institution_id, service_date);
CREATE INDEX foodflow_attendance_institution_served_idx ON public.foodflow_attendance (institution_id, served_at DESC);
CREATE INDEX foodflow_kitchen_tasks_institution_date_idx ON public.foodflow_kitchen_tasks (institution_id, task_date);
CREATE INDEX foodflow_waste_institution_date_idx ON public.foodflow_waste_entries (institution_id, record_date);
CREATE INDEX foodflow_roles_institution_user_idx ON public.foodflow_user_roles (institution_id, user_id);
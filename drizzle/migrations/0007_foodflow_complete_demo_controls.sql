CREATE OR REPLACE FUNCTION public.foodflow_complete_setup_for_current_user(_institution_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  institution_id uuid;
  cleaned_name text := btrim(_institution_name);
BEGIN
  IF caller_id IS NULL THEN RAISE EXCEPTION 'Sign in is required'; END IF;
  IF cleaned_name IS NULL OR length(cleaned_name) < 2 OR length(cleaned_name) > 120 THEN
    RAISE EXCEPTION 'Institution name must be between 2 and 120 characters';
  END IF;
  SELECT p.institution_id INTO institution_id FROM public.foodflow_profiles p WHERE p.user_id = caller_id FOR UPDATE;
  IF institution_id IS NOT NULL THEN RETURN institution_id; END IF;
  INSERT INTO public.foodflow_institutions (name) VALUES (cleaned_name) RETURNING id INTO institution_id;
  UPDATE public.foodflow_profiles SET institution_id = institution_id, institution_name = cleaned_name, updated_at = now() WHERE user_id = caller_id;
  INSERT INTO public.foodflow_user_roles (user_id, institution_id, role) VALUES (caller_id, institution_id, 'institution_admin') ON CONFLICT DO NOTHING;
  INSERT INTO public.foodflow_halls (institution_id, name, capacity) VALUES (institution_id, 'Main Dining Hall', 0);
  RETURN institution_id;
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_complete_setup_for_current_user(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_complete_setup_for_current_user(text) TO authenticated;

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
  IF _target_user_id = auth.uid() OR _role = 'institution_admin' THEN RAISE EXCEPTION 'The first institution administrator cannot be removed here'; END IF;
  DELETE FROM public.foodflow_user_roles WHERE user_id = _target_user_id AND institution_id = tenant_id AND role = _role;
  IF NOT FOUND THEN RAISE EXCEPTION 'Role assignment not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.foodflow_user_roles WHERE user_id = _target_user_id AND institution_id = tenant_id) THEN
    UPDATE public.foodflow_profiles SET institution_id = NULL, institution_name = NULL, updated_at = now() WHERE user_id = _target_user_id AND institution_id = tenant_id;
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_remove_role(uuid, public.foodflow_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_remove_role(uuid, public.foodflow_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.foodflow_adjust_inventory(_inventory_id uuid, _institution_id uuid, _delta numeric, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE item public.foodflow_inventory%ROWTYPE;
DECLARE cleaned_reason text := left(coalesce(nullif(btrim(_reason), ''), 'Stock adjustment'), 120);
BEGIN
  IF auth.uid() IS NULL OR _institution_id IS NULL OR _institution_id <> public.foodflow_current_institution_id()
    OR NOT public.foodflow_has_any_role(_institution_id, ARRAY['institution_admin','mess_manager','kitchen_staff']::public.foodflow_role[]) THEN
    RAISE EXCEPTION 'A permitted institution role is required to adjust stock';
  END IF;
  IF _delta IS NULL OR _delta = 0 OR abs(_delta) > 100000 THEN RAISE EXCEPTION 'Stock adjustment must be non-zero and within the allowed range'; END IF;
  SELECT * INTO item FROM public.foodflow_inventory WHERE id = _inventory_id AND institution_id = _institution_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inventory item not found'; END IF;
  IF item.quantity + _delta < 0 THEN RAISE EXCEPTION 'Stock cannot go below zero'; END IF;
  UPDATE public.foodflow_inventory SET quantity = item.quantity + _delta, updated_at = now() WHERE id = item.id RETURNING * INTO item;
  INSERT INTO public.foodflow_stock_movements (institution_id, inventory_item_id, item_name, quantity_delta, unit, reason)
    VALUES (_institution_id, item.id, item.name, _delta, item.unit, cleaned_reason);
  RETURN jsonb_build_object('id', item.id, 'name', item.name, 'category', item.category, 'quantity', item.quantity, 'unit', item.unit,
    'minimum_quantity', item.minimum_quantity, 'unit_cost', item.unit_cost, 'supplier_name', item.supplier_name, 'expiry_date', item.expiry_date, 'is_demo', item.is_demo);
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_adjust_inventory(uuid, uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_adjust_inventory(uuid, uuid, numeric, text) TO authenticated;

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
    (tenant_id,'Sunflower oil','Pantry',29,'L',20,145,'Cedar Supply',true);
  INSERT INTO public.foodflow_suppliers (institution_id,name,contact_name,email,phone,category,is_demo) VALUES
    (tenant_id,'Greenfield Foods','Arjun Patel','orders@greenfield.example','+91 98765 00001','Grains & pulses',true),
    (tenant_id,'Daily Harvest Co.','Priya Nair','hello@dailyharvest.example','+91 98765 00002','Fresh produce',true),
    (tenant_id,'Meadow Dairy','Dev Malhotra','supply@meadow.example','+91 98765 00003','Dairy',true);
  INSERT INTO public.foodflow_students (institution_id,student_code,full_name,hall,meal_plan,status,is_demo) VALUES
    (tenant_id,'ST-1042','Aarav Mehta','North Hall','Standard','Active',true),
    (tenant_id,'ST-1088','Ananya Rao','East Hall','Vegetarian','Active',true),
    (tenant_id,'ST-1136','Kabir Shah','North Hall','Standard','Active',true),
    (tenant_id,'ST-1194','Meera Iyer','Garden Hall','Dairy-free','Active',true),
    (tenant_id,'ST-1235','Vihaan Kapoor','East Hall','Standard','On leave',true);
  INSERT INTO public.foodflow_recipes (institution_id,name,category,servings,cost_per_serving,ingredients,instructions,is_demo) VALUES
    (tenant_id,'Vegetable pulao','Main course',100,26.50,'[{"name":"Basmati rice","quantity":12,"unit":"kg"},{"name":"Seasonal vegetables","quantity":8,"unit":"kg"}]'::jsonb,'Rinse rice, sauté whole spices and vegetables, then cook together until fluffy.',true),
    (tenant_id,'Dal tadka','Main course',100,19.25,'[{"name":"Toor dal","quantity":10,"unit":"kg"},{"name":"Tomatoes","quantity":4,"unit":"kg"}]'::jsonb,'Simmer the dal until soft. Finish with a warm tomato and cumin tempering.',true),
    (tenant_id,'Paneer bhurji','Main course',80,34.00,'[{"name":"Paneer","quantity":8,"unit":"kg"},{"name":"Tomatoes","quantity":3,"unit":"kg"}]'::jsonb,'Cook tomatoes and spices until fragrant; crumble paneer in just before serving.',true),
    (tenant_id,'Fresh fruit bowl','Side',120,17.50,'[{"name":"Seasonal fruit","quantity":12,"unit":"kg"}]'::jsonb,'Wash, portion and chill seasonal fruit shortly before service.',true);
  INSERT INTO public.foodflow_meal_plans (institution_id,service_date,meal_type,title,dishes,expected_servings,status,is_demo) VALUES
    (tenant_id,demo_day,'Breakfast','A bright, balanced start',ARRAY['Poha','Fresh seasonal fruit','Masala chai'],420,'Published',true),
    (tenant_id,demo_day,'Lunch','Comforting midday meal',ARRAY['Dal tadka','Steamed basmati rice','Seasonal sabzi','Roti'],680,'Published',true),
    (tenant_id,demo_day,'Snacks','Afternoon kitchen break',ARRAY['Vegetable cutlet','Masala chai'],350,'Published',true),
    (tenant_id,demo_day,'Dinner','Freshly prepared evening menu',ARRAY['Paneer bhurji','Phulka','Cucumber salad'],610,'Published',true),
    (tenant_id,demo_day + 1,'Breakfast','Tomorrow’s breakfast plan',ARRAY['Upma','Fresh seasonal fruit','Yogurt'],410,'Draft',true),
    (tenant_id,demo_day + 1,'Lunch','Tomorrow’s lunch plan',ARRAY['Dal tadka','Vegetable pulao','Seasonal sabzi'],665,'Draft',true);
  INSERT INTO public.foodflow_kitchen_tasks (institution_id,task_date,meal_type,dish_name,planned_quantity,completed_quantity,assigned_to,status,is_demo) VALUES
    (tenant_id,demo_day,'Breakfast','Prepare poha',420,420,'Morning kitchen','Completed',true),
    (tenant_id,demo_day,'Lunch','Cook dal tadka',680,415,'Hot kitchen','In progress',true),
    (tenant_id,demo_day,'Lunch','Steam basmati rice',680,340,'Grain station','In progress',true),
    (tenant_id,demo_day,'Dinner','Prepare paneer bhurji',610,0,'Evening kitchen','Not started',true);
  INSERT INTO public.foodflow_purchase_orders (institution_id,order_number,supplier_name,item_summary,total_amount,status,expected_date,is_demo) VALUES
    (tenant_id,'DEMO-PO-018','Greenfield Foods','Rice, toor dal',18400,'Approved',demo_day,true),
    (tenant_id,'DEMO-PO-017','Daily Harvest Co.','Tomatoes, spinach, onions',9650,'Ordered',demo_day + 1,true),
    (tenant_id,'DEMO-PO-016','Meadow Dairy','Milk, yogurt',7120,'Received',demo_day - 3,true);
  INSERT INTO public.foodflow_forecasts (institution_id,forecast_date,meal_type,expected_students,confidence,method,is_demo)
  SELECT tenant_id, demo_day + offset_day, meal_type, counts.count, 72, 'illustrative_sample', true
  FROM generate_series(1,7) AS offset_day
  CROSS JOIN (VALUES ('Breakfast',410),('Lunch',665),('Snacks',340),('Dinner',590)) AS counts(meal_type,count);
  INSERT INTO public.foodflow_waste_entries (institution_id,record_date,meal_type,dish_name,prepared_quantity,served_quantity,wasted_quantity,unit,waste_cost,is_demo) VALUES
    (tenant_id,demo_day - 4,'Lunch','Seasonal sabzi',110,102,8,'kg',720,true),
    (tenant_id,demo_day - 3,'Lunch','Steamed rice',145,137,8,'kg',624,true),
    (tenant_id,demo_day - 2,'Dinner','Dal tadka',95,89,6,'kg',462,true),
    (tenant_id,demo_day - 1,'Lunch','Seasonal sabzi',112,105,7,'kg',630,true),
    (tenant_id,demo_day,'Breakfast','Poha',74,69,5,'kg',350,true);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_import_demo_inventory(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_import_demo_inventory(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.foodflow_create_institution(_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE caller_id uuid := auth.uid(); DECLARE new_id uuid;
BEGIN
  IF caller_id IS NULL OR NOT public.foodflow_has_role(public.foodflow_current_institution_id(), 'institution_admin') THEN RAISE EXCEPTION 'Only an institution administrator can create another institution'; END IF;
  IF _name IS NULL OR length(btrim(_name)) < 2 OR length(btrim(_name)) > 120 THEN RAISE EXCEPTION 'Institution name must be between 2 and 120 characters'; END IF;
  INSERT INTO public.foodflow_institutions (name) VALUES (btrim(_name)) RETURNING id INTO new_id;
  INSERT INTO public.foodflow_halls (institution_id, name, capacity) VALUES (new_id, 'Main Dining Hall', 0);
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_create_institution(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_create_institution(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.foodflow_complete_setup_for_current_user(_institution_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE caller_id uuid := auth.uid(); DECLARE tenant_id uuid; DECLARE new_id uuid; DECLARE cleaned_name text := btrim(_institution_name);
BEGIN
  IF caller_id IS NULL THEN RAISE EXCEPTION 'Sign in is required'; END IF;
  IF cleaned_name IS NULL OR length(cleaned_name) < 2 OR length(cleaned_name) > 120 THEN RAISE EXCEPTION 'Institution name must be between 2 and 120 characters'; END IF;
  SELECT p.institution_id INTO tenant_id FROM public.foodflow_profiles p WHERE p.user_id = caller_id FOR UPDATE;
  IF tenant_id IS NOT NULL THEN RETURN tenant_id; END IF;
  INSERT INTO public.foodflow_institutions (name) VALUES (cleaned_name) RETURNING id INTO new_id;
  UPDATE public.foodflow_profiles SET institution_id = new_id, institution_name = cleaned_name, updated_at = now() WHERE user_id = caller_id;
  INSERT INTO public.foodflow_user_roles (user_id, institution_id, role) VALUES (caller_id, new_id, 'institution_admin') ON CONFLICT DO NOTHING;
  INSERT INTO public.foodflow_halls (institution_id, name, capacity) VALUES (new_id, 'Main Dining Hall', 0);
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_complete_setup_for_current_user(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_complete_setup_for_current_user(text) TO authenticated;
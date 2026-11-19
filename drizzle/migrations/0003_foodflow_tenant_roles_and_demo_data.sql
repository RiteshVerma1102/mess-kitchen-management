ALTER TABLE public.foodflow_halls ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.foodflow_inventory ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.foodflow_stock_movements ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.foodflow_meal_plans ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.foodflow_recipes ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.foodflow_suppliers ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.foodflow_students ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.foodflow_attendance ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.foodflow_kitchen_tasks ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.foodflow_forecasts ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.foodflow_purchase_orders ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.foodflow_waste_entries ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.foodflow_purchase_order_items ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.foodflow_calendar_events ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.foodflow_service_actuals ADD COLUMN is_demo boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.foodflow_list_team()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tenant_id uuid := public.foodflow_current_institution_id();
BEGIN
  IF auth.uid() IS NULL OR tenant_id IS NULL OR NOT public.foodflow_has_role(tenant_id, 'institution_admin') THEN
    RAISE EXCEPTION 'Only an institution administrator can view the team';
  END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object('userId', g.user_id, 'name', coalesce(p.display_name, 'FoodFlow member'), 'roles', g.roles) ORDER BY p.display_name)
    FROM (
      SELECT r.user_id, array_agg(r.role ORDER BY r.role)::text[] AS roles
      FROM public.foodflow_user_roles r
      WHERE r.institution_id = tenant_id
      GROUP BY r.user_id
    ) g
    JOIN public.foodflow_profiles p ON p.user_id = g.user_id
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_list_team() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_list_team() TO authenticated;

DO $$
DECLARE
  table_name text;
  writer_roles text[];
  delete_roles text[];
  writer_array text;
  delete_array text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['foodflow_halls','foodflow_inventory','foodflow_stock_movements','foodflow_meal_plans','foodflow_recipes','foodflow_suppliers','foodflow_students','foodflow_attendance','foodflow_kitchen_tasks','foodflow_forecasts','foodflow_purchase_orders','foodflow_waste_entries','foodflow_calendar_events','foodflow_service_actuals'] LOOP
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
    EXECUTE format('DROP POLICY IF EXISTS "FoodFlow assigned roles create tenant %1$s" ON public.%1$I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "FoodFlow assigned roles update tenant %1$s" ON public.%1$I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "FoodFlow authorized roles delete tenant %1$s" ON public.%1$I', table_name);
    EXECUTE format('CREATE POLICY "FoodFlow assigned roles create tenant %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (institution_id = public.foodflow_current_institution_id() AND public.foodflow_has_any_role(institution_id, ARRAY[%2$s]::public.foodflow_role[]))', table_name, writer_array);
    EXECUTE format('CREATE POLICY "FoodFlow assigned roles update tenant %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (institution_id = public.foodflow_current_institution_id() AND public.foodflow_has_any_role(institution_id, ARRAY[%2$s]::public.foodflow_role[])) WITH CHECK (institution_id = public.foodflow_current_institution_id() AND public.foodflow_has_any_role(institution_id, ARRAY[%2$s]::public.foodflow_role[]))', table_name, writer_array);
    EXECUTE format('CREATE POLICY "FoodFlow authorized roles delete tenant %1$s" ON public.%1$I FOR DELETE TO authenticated USING (institution_id = public.foodflow_current_institution_id() AND public.foodflow_has_any_role(institution_id, ARRAY[%2$s]::public.foodflow_role[]))', table_name, delete_array);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.foodflow_import_demo_inventory(_institution_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tenant_id uuid := public.foodflow_current_institution_id();
  demo_day date := current_date;
  existing_demo boolean;
BEGIN
  IF auth.uid() IS NULL OR tenant_id IS NULL OR tenant_id <> _institution_id
    OR NOT public.foodflow_has_role(tenant_id, 'institution_admin') THEN
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
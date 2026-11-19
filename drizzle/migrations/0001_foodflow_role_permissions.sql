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
  UPDATE public.foodflow_profiles SET institution_id = caller_institution, updated_at = now() WHERE user_id = target_user_id;
  INSERT INTO public.foodflow_user_roles (user_id, institution_id, role)
    VALUES (target_user_id, caller_institution, _role)
    ON CONFLICT (user_id, institution_id, role) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_assign_role_by_email(text, public.foodflow_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_assign_role_by_email(text, public.foodflow_role) TO authenticated;

DO $$
DECLARE
  table_name text;
  allowed_writers text[];
  allowed_deleters text[];
BEGIN
  FOREACH table_name IN ARRAY ARRAY['foodflow_halls','foodflow_inventory','foodflow_stock_movements','foodflow_meal_plans','foodflow_recipes','foodflow_suppliers','foodflow_students','foodflow_attendance','foodflow_kitchen_tasks','foodflow_forecasts','foodflow_purchase_orders','foodflow_waste_entries','foodflow_calendar_events','foodflow_service_actuals'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "FoodFlow manager creates tenant %1$s" ON public.%1$I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "FoodFlow manager updates tenant %1$s" ON public.%1$I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "FoodFlow admin deletes tenant %1$s" ON public.%1$I', table_name);
    allowed_writers := CASE table_name
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
    allowed_deleters := CASE table_name
      WHEN 'foodflow_students' THEN ARRAY['institution_admin']
      WHEN 'foodflow_attendance' THEN ARRAY['institution_admin']
      WHEN 'foodflow_inventory' THEN ARRAY['institution_admin','mess_manager']
      WHEN 'foodflow_stock_movements' THEN ARRAY['institution_admin','mess_manager']
      ELSE ARRAY['institution_admin','mess_manager']
    END;
    EXECUTE format('CREATE POLICY "FoodFlow assigned roles create tenant %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (institution_id = public.foodflow_current_institution_id() AND public.foodflow_has_any_role(institution_id, %2$L::public.foodflow_role[]))', table_name, allowed_writers);
    EXECUTE format('CREATE POLICY "FoodFlow assigned roles update tenant %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (institution_id = public.foodflow_current_institution_id() AND public.foodflow_has_any_role(institution_id, %2$L::public.foodflow_role[])) WITH CHECK (institution_id = public.foodflow_current_institution_id() AND public.foodflow_has_any_role(institution_id, %2$L::public.foodflow_role[]))', table_name, allowed_writers);
    EXECUTE format('CREATE POLICY "FoodFlow authorized roles delete tenant %1$s" ON public.%1$I FOR DELETE TO authenticated USING (institution_id = public.foodflow_current_institution_id() AND public.foodflow_has_any_role(institution_id, %2$L::public.foodflow_role[]))', table_name, allowed_deleters);
  END LOOP;
END;
$$;
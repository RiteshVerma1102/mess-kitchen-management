ALTER TABLE public.foodflow_profiles ADD COLUMN email text;
ALTER TABLE public.foodflow_profiles ADD COLUMN institution_name text;
ALTER TABLE public.foodflow_profiles ALTER COLUMN institution_id DROP NOT NULL;
GRANT SELECT (user_id, display_name, institution_id, institution_name) ON public.foodflow_profiles TO authenticated;
REVOKE UPDATE (institution_id, institution_name, email, user_id) ON public.foodflow_profiles FROM authenticated;
GRANT UPDATE (display_name, institution_name) ON public.foodflow_profiles TO authenticated;
GRANT UPDATE (display_name, institution_name, updated_at) ON public.foodflow_profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.foodflow_handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_institution_name text := btrim(coalesce(NEW.raw_user_meta_data ->> 'institution_name', ''));
  created_institution_id uuid;
BEGIN
  IF length(requested_institution_name) > 0 THEN
    IF length(requested_institution_name) < 2 OR length(requested_institution_name) > 120 THEN
      RAISE EXCEPTION 'Institution name must be between 2 and 120 characters';
    END IF;
    INSERT INTO public.foodflow_institutions (name) VALUES (requested_institution_name) RETURNING id INTO created_institution_id;
  END IF;
  INSERT INTO public.foodflow_profiles (user_id, display_name, email, institution_id, institution_name)
    VALUES (NEW.id,
      coalesce(nullif(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(NEW.email, ''), '@', 1)),
      NEW.email, created_institution_id, nullif(requested_institution_name, ''))
    ON CONFLICT (user_id) DO NOTHING;
  IF created_institution_id IS NOT NULL THEN
    INSERT INTO public.foodflow_user_roles (user_id, institution_id, role) VALUES (NEW.id, created_institution_id, 'institution_admin');
    INSERT INTO public.foodflow_halls (institution_id, name, capacity) VALUES (created_institution_id, 'Main Dining Hall', 0);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_handle_new_auth_user() FROM PUBLIC;

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
  IF target_user_id IS NULL THEN RAISE EXCEPTION 'That account must sign up before it can be assigned a role'; END IF;
  SELECT p.institution_id INTO target_institution FROM public.foodflow_profiles p WHERE p.user_id = target_user_id FOR UPDATE;
  IF NOT FOUND OR (target_institution IS NOT NULL AND target_institution <> caller_institution) THEN
    RAISE EXCEPTION 'That account already belongs to another institution or is unavailable';
  END IF;
  UPDATE public.foodflow_profiles SET institution_id = caller_institution, institution_name = (SELECT i.name FROM public.foodflow_institutions i WHERE i.id = caller_institution), updated_at = now() WHERE user_id = target_user_id;
  INSERT INTO public.foodflow_user_roles (user_id, institution_id, role)
    VALUES (target_user_id, caller_institution, _role)
    ON CONFLICT (user_id, institution_id, role) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_assign_role_by_email(text, public.foodflow_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_assign_role_by_email(text, public.foodflow_role) TO authenticated;
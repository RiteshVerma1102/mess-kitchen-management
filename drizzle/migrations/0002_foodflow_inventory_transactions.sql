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
    RAISE EXCEPTION 'Stock adjustment must be non-zero and within the allowed range';
  END IF;
  SELECT * INTO item
  FROM public.foodflow_inventory
  WHERE id = _inventory_id AND institution_id = _institution_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inventory item not found'; END IF;
  IF item.quantity + _delta < 0 THEN RAISE EXCEPTION 'Stock cannot go below zero'; END IF;
  UPDATE public.foodflow_inventory
  SET quantity = item.quantity + _delta, updated_at = now()
  WHERE id = item.id
  RETURNING * INTO item;
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
    'expiry_date', item.expiry_date
  );
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_adjust_inventory(uuid, uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_adjust_inventory(uuid, uuid, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.foodflow_delete_inventory_item(_inventory_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tenant_id uuid := public.foodflow_current_institution_id();
BEGIN
  IF auth.uid() IS NULL
    OR tenant_id IS NULL
    OR NOT public.foodflow_has_any_role(tenant_id, ARRAY['institution_admin','mess_manager']::public.foodflow_role[]) THEN
    RAISE EXCEPTION 'A manager role is required to remove an ingredient';
  END IF;
  DELETE FROM public.foodflow_inventory
  WHERE id = _inventory_id AND institution_id = tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inventory item not found'; END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.foodflow_delete_inventory_item(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodflow_delete_inventory_item(uuid) TO authenticated;
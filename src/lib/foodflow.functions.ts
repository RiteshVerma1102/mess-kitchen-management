import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole } from "@/lib/foodflow-data";

const roleValues: AppRole[] = [
  "institution_admin",
  "mess_manager",
  "kitchen_staff",
  "attendance_operator",
  "viewer",
];

export const getFoodFlowContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile, error: profileError } = await context.supabase
      .from("foodflow_profiles")
      .select("user_id, display_name, institution_id, institution_name")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (profileError) throw new Error("Could not load your FoodFlow account.");
    if (!profile) return { userId: context.userId, name: "FoodFlow member", email: null, institutionId: null, institutionName: null, role: null, hasInstitution: false };

    const email = typeof context.claims.email === "string" ? context.claims.email : null;
    if (!profile.institution_id) return { userId: context.userId, name: profile.display_name || "FoodFlow member", email, institutionId: null, institutionName: null, role: null, hasInstitution: false };

    const [{ data: institution, error: institutionError }, { data: roles, error: rolesError }] = await Promise.all([
      context.supabase.from("foodflow_institutions").select("id, name, currency_code, timezone").eq("id", profile.institution_id).maybeSingle(),
      context.supabase.from("foodflow_user_roles").select("role").eq("user_id", context.userId).eq("institution_id", profile.institution_id),
    ]);

    if (institutionError || rolesError) throw new Error("Could not load your institution access.");
    const availableRoles = (roles ?? []).map((row) => row.role).filter((role): role is AppRole => roleValues.includes(role));
    const role = availableRoles.includes("institution_admin")
      ? "institution_admin"
      : availableRoles.includes("mess_manager")
        ? "mess_manager"
        : availableRoles[0] ?? null;

    return {
      userId: context.userId,
      name: profile.display_name || "FoodFlow member",
      email,
      institutionId: profile.institution_id,
      institutionName: profile.institution_name || institution?.name || null,
      currencyCode: institution?.currency_code ?? "INR",
      timezone: institution?.timezone ?? "Asia/Kolkata",
      role,
      roles: availableRoles,
      hasInstitution: Boolean(institution),
    };
  });

export const createFoodFlowInstitution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string }) => {
    const name = input.name.trim();
    if (name.length < 2 || name.length > 120) throw new Error("Enter an institution name between 2 and 120 characters.");
    return { name };
  })
  .handler(async ({ data, context }) => {
    const { data: institutionId, error } = await context.supabase.rpc("foodflow_complete_setup_for_current_user", { _institution_name: data.name });
    if (error) throw new Error(error.message.includes("already belongs") ? "This account is already linked to an institution." : "Could not set up your institution. Please try again.");
    return { institutionId };
  });

export const updateFoodFlowDisplayName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { displayName: string }) => {
    const displayName = input.displayName.trim();
    if (displayName.length < 2 || displayName.length > 80) throw new Error("Enter a display name between 2 and 80 characters.");
    return { displayName };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("foodflow_profiles")
      .update({ display_name: data.displayName, updated_at: new Date().toISOString() })
      .eq("user_id", context.userId);
    if (error) throw new Error("Could not save your name.");
    return { displayName: data.displayName };
  });

export const assignFoodFlowRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; role: AppRole }) => {
    const email = input.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email address.");
    if (!roleValues.includes(input.role) || input.role === "institution_admin") throw new Error("Choose a standard FoodFlow role.");
    return { email, role: input.role };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("foodflow_assign_role_by_email", { _target_email: data.email, _role: data.role });
    if (error) throw new Error(error.message.includes("Only an institution administrator") ? "Only an institution administrator can add teammates." : error.message.includes("must sign up") ? "Ask your teammate to create their account first, then try again." : error.message.includes("already belongs") ? "That account already belongs to another institution." : "Could not add that teammate.");
    return { success: true };
  });

export const listFoodFlowTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile, error: profileError } = await context.supabase
      .from("foodflow_profiles")
      .select("institution_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (profileError) throw new Error("Could not load your team.");
    if (!profile?.institution_id) return { members: [] };
    const { data, error } = await context.supabase.rpc("foodflow_list_team");
    if (error) throw new Error(error.message.includes("Only an institution administrator") ? "Only institution administrators can manage teammates." : "Could not load your team.");
    const members = Array.isArray(data) ? data.flatMap((entry) => {
      if (entry === null || typeof entry !== "object" || Array.isArray(entry)) return [];
      const row = entry as Record<string, unknown>;
      if (typeof row["userId"] !== "string" || typeof row["name"] !== "string" || !Array.isArray(row["roles"])) return [];
      const roles = row["roles"].filter((role): role is AppRole => typeof role === "string" && roleValues.includes(role as AppRole));
      return [{ userId: row["userId"], name: row["name"], email: typeof row["email"] === "string" ? row["email"] : null, roles }];
    }) : [];
    return { members };
  });

export const listFoodFlowBusinessRows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { table: "foodflow_meal_plans" | "foodflow_recipes" | "foodflow_students" | "foodflow_kitchen_tasks" | "foodflow_forecasts" | "foodflow_purchase_orders" | "foodflow_waste_entries" | "foodflow_service_actuals" | "foodflow_calendar_events" | "foodflow_suppliers" | "foodflow_halls" | "foodflow_attendance" | "foodflow_stock_movements" }) => {
    const allowed: string[] = ["foodflow_meal_plans", "foodflow_recipes", "foodflow_students", "foodflow_kitchen_tasks", "foodflow_forecasts", "foodflow_purchase_orders", "foodflow_waste_entries", "foodflow_service_actuals", "foodflow_calendar_events", "foodflow_suppliers", "foodflow_halls", "foodflow_attendance", "foodflow_stock_movements"];
    if (!allowed.includes(input.table)) throw new Error("Choose a valid FoodFlow page.");
    return { table: input.table };
  })
  .handler(async ({ data, context }) => {
    const table = data.table;
    let query;
    if (table === "foodflow_meal_plans") query = context.supabase.from(table).select("id, service_date, meal_type, title, dishes, expected_servings, status, is_demo, created_at").order("service_date", { ascending: false }).limit(120);
    else if (table === "foodflow_recipes") query = context.supabase.from(table).select("id, name, category, servings, cost_per_serving, ingredients, instructions, is_demo, created_at").order("name");
    else if (table === "foodflow_students") query = context.supabase.from(table).select("id, student_code, full_name, hall, meal_plan, dietary_notes, status, is_demo, created_at").order("full_name");
    else if (table === "foodflow_kitchen_tasks") query = context.supabase.from(table).select("id, task_date, meal_type, dish_name, planned_quantity, completed_quantity, assigned_to, status, is_demo, created_at").order("task_date", { ascending: false }).limit(100);
    else if (table === "foodflow_forecasts") query = context.supabase.from(table).select("id, forecast_date, meal_type, expected_students, confidence, method, is_demo, created_at").order("forecast_date", { ascending: false }).limit(100);
    else if (table === "foodflow_purchase_orders") query = context.supabase.from(table).select("id, order_number, supplier_name, item_summary, total_amount, status, expected_date, is_demo, created_at").order("created_at", { ascending: false });
    else if (table === "foodflow_waste_entries") query = context.supabase.from(table).select("id, record_date, meal_type, dish_name, prepared_quantity, served_quantity, wasted_quantity, unit, waste_cost, is_demo, created_at").order("record_date", { ascending: false }).limit(100);
    else if (table === "foodflow_service_actuals") query = context.supabase.from(table).select("id, service_date, meal_type, dish_name, prepared_quantity, served_quantity, leftover_quantity, spoiled_quantity, unit, is_demo, created_at").order("service_date", { ascending: false }).limit(100);
    else if (table === "foodflow_calendar_events") query = context.supabase.from(table).select("id, event_date, title, description, attendance_factor, is_demo, created_at").order("event_date", { ascending: false }).limit(100);
    else if (table === "foodflow_attendance") query = context.supabase.from(table).select("id, student_code, student_name, hall, meal_type, served_at, is_demo, created_at").order("served_at", { ascending: false }).limit(100);
    else if (table === "foodflow_stock_movements") query = context.supabase.from(table).select("id, item_name, quantity_delta, unit, reason, moved_at, is_demo").order("moved_at", { ascending: false }).limit(100);
    else if (table === "foodflow_suppliers") query = context.supabase.from(table).select("id, name, contact_name, email, phone, category, status, is_demo, created_at").order("name");
    else query = context.supabase.from(table).select("id, name, capacity, is_demo, created_at").order("name");
    const { data: rows, error } = await query;
    if (error) throw new Error("Could not load this FoodFlow page.");
    return { rows: rows ?? [] };
  });

export const createFoodFlowBusinessRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: "meal" | "recipe" | "task" | "student" | "order" | "waste" | "forecast" | "event" | "supplier" | "actual" | "attendance" | "hall"; fields: Record<string, string | number | boolean | null | string[]> }) => {
    const allowed = ["meal", "recipe", "task", "student", "order", "waste", "forecast", "event", "supplier", "actual", "attendance", "hall"];
    if (!allowed.includes(input.kind) || Object.keys(input.fields).length > 20) throw new Error("Choose a valid FoodFlow record.");
    for (const value of Object.values(input.fields)) {
      if (typeof value === "string" && value.length > 3000) throw new Error("One of the entered values is too long.");
      if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Enter valid numbers for quantities and costs.");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: profile, error: profileError } = await context.supabase
      .from("foodflow_profiles")
      .select("institution_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (profileError || !profile?.institution_id) throw new Error("Set up your institution before adding records.");
    const i = profile.institution_id;
    const f = data.fields;
    let table: "foodflow_meal_plans" | "foodflow_recipes" | "foodflow_kitchen_tasks" | "foodflow_students" | "foodflow_purchase_orders" | "foodflow_waste_entries" | "foodflow_forecasts" | "foodflow_calendar_events" | "foodflow_suppliers" | "foodflow_service_actuals" | "foodflow_attendance" | "foodflow_halls";
    let record: Record<string, unknown>;
    if (data.kind === "meal") {
      table = "foodflow_meal_plans";
      record = { institution_id: i, service_date: String(f["service_date"] ?? ""), meal_type: String(f["meal_type"] ?? "Lunch"), title: String(f["title"] ?? "").trim(), dishes: Array.isArray(f["dishes"]) ? f["dishes"] : [], expected_servings: Number(f["expected_servings"] ?? 0), status: "Draft" };
    } else if (data.kind === "recipe") {
      table = "foodflow_recipes";
      record = { institution_id: i, name: String(f["name"] ?? "").trim(), category: String(f["category"] ?? "Main course"), servings: Number(f["servings"] ?? 50), cost_per_serving: Number(f["cost_per_serving"] ?? 0), ingredients: Array.isArray(f["ingredients"]) ? f["ingredients"] : [], instructions: String(f["instructions"] ?? "") };
    } else if (data.kind === "task") {
      table = "foodflow_kitchen_tasks";
      record = { institution_id: i, task_date: String(f["task_date"] ?? ""), meal_type: String(f["meal_type"] ?? "Lunch"), dish_name: String(f["dish_name"] ?? "").trim(), planned_quantity: Number(f["planned_quantity"] ?? 0), assigned_to: String(f["assigned_to"] ?? "").trim(), status: "Not started" };
    } else if (data.kind === "student") {
      table = "foodflow_students";
      record = { institution_id: i, student_code: String(f["student_code"] ?? "").trim(), full_name: String(f["full_name"] ?? "").trim(), hall: String(f["hall"] ?? "").trim(), meal_plan: String(f["meal_plan"] ?? "Standard"), dietary_notes: "", status: "Active" };
    } else if (data.kind === "order") {
      table = "foodflow_purchase_orders";
      record = { institution_id: i, order_number: `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`, supplier_name: String(f["supplier_name"] ?? "").trim(), item_summary: String(f["item_summary"] ?? "").trim(), total_amount: Number(f["total_amount"] ?? 0), status: "Pending", expected_date: f["expected_date"] ? String(f["expected_date"]) : null };
    } else if (data.kind === "waste") {
      table = "foodflow_waste_entries";
      record = { institution_id: i, record_date: String(f["record_date"] ?? ""), meal_type: String(f["meal_type"] ?? "Lunch"), dish_name: String(f["dish_name"] ?? "").trim(), prepared_quantity: Number(f["prepared_quantity"] ?? 0), served_quantity: Number(f["served_quantity"] ?? 0), wasted_quantity: Number(f["wasted_quantity"] ?? 0), unit: String(f["unit"] ?? "kg"), waste_cost: Number(f["waste_cost"] ?? 0) };
    } else if (data.kind === "forecast") {
      table = "foodflow_forecasts";
      record = { institution_id: i, forecast_date: String(f["forecast_date"] ?? ""), meal_type: String(f["meal_type"] ?? "Lunch"), expected_students: Number(f["expected_students"] ?? 0), confidence: Number(f["confidence"] ?? 70), method: "manual" };
    } else if (data.kind === "event") {
      table = "foodflow_calendar_events";
      record = { institution_id: i, event_date: String(f["event_date"] ?? ""), title: String(f["title"] ?? "").trim(), description: String(f["description"] ?? "").trim(), attendance_factor: Number(f["attendance_factor"] ?? 1) };
    } else if (data.kind === "actual") {
      table = "foodflow_service_actuals";
      record = { institution_id: i, service_date: String(f["service_date"] ?? ""), meal_type: String(f["meal_type"] ?? "Lunch"), dish_name: String(f["dish_name"] ?? "").trim(), prepared_quantity: Number(f["prepared_quantity"] ?? 0), served_quantity: Number(f["served_quantity"] ?? 0), leftover_quantity: Number(f["leftover_quantity"] ?? 0), spoiled_quantity: Number(f["spoiled_quantity"] ?? 0), unit: String(f["unit"] ?? "portions") };
    } else if (data.kind === "attendance") {
      table = "foodflow_attendance";
      record = { institution_id: i, student_code: String(f["student_code"] ?? "").trim(), student_name: String(f["student_name"] ?? "").trim(), hall: String(f["hall"] ?? "").trim(), meal_type: String(f["meal_type"] ?? "Lunch") };
    } else if (data.kind === "hall") {
      table = "foodflow_halls";
      record = { institution_id: i, name: String(f["name"] ?? "").trim(), capacity: Number(f["capacity"] ?? 0) };
    } else {
      table = "foodflow_suppliers";
      record = { institution_id: i, name: String(f["name"] ?? "").trim(), contact_name: String(f["contact_name"] ?? "").trim(), email: String(f["email"] ?? "").trim(), phone: String(f["phone"] ?? "").trim(), category: String(f["category"] ?? "General"), status: "Active" };
    }
    const nameField = data.kind === "task" || data.kind === "waste" || data.kind === "actual" ? "dish_name" : data.kind === "student" ? "full_name" : data.kind === "attendance" ? "student_name" : data.kind === "meal" || data.kind === "event" ? "title" : data.kind === "order" ? "supplier_name" : data.kind === "forecast" ? "forecast_date" : "name";
    const name = record[nameField];
    if (typeof name !== "string" || name.trim().length < 2) throw new Error("Fill in all required details before saving.");
    const { data: saved, error } = await context.supabase.from(table).insert(record as never).select("*").single();
    if (error || !saved) throw new Error(error?.message.includes("row-level security") ? "Your role cannot create this record." : error?.message.includes("duplicate") ? "A record for this date and meal already exists." : "Could not save this record.");
    return { record: saved };
  });

export const updateFoodFlowBusinessRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { table: "foodflow_meal_plans" | "foodflow_kitchen_tasks" | "foodflow_purchase_orders" | "foodflow_forecasts"; id: string; fields: Record<string, string | number | boolean | null | string[]> }) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.id)) throw new Error("Select a valid FoodFlow record.");
    const writableFields: Record<string, string[]> = {
      foodflow_meal_plans: ["service_date", "meal_type", "title", "dishes", "expected_servings", "status"],
      foodflow_kitchen_tasks: ["task_date", "meal_type", "dish_name", "planned_quantity", "completed_quantity", "assigned_to", "status"],
      foodflow_purchase_orders: ["supplier_name", "item_summary", "total_amount", "status", "expected_date"],
      foodflow_forecasts: ["forecast_date", "meal_type", "expected_students", "confidence", "method"],
    };
    const allowedFields = writableFields[input.table];
    if (!allowedFields || !Object.keys(input.fields).length || Object.keys(input.fields).some((field) => !allowedFields.includes(field))) {
      throw new Error("Choose valid fields for this FoodFlow record.");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from(data.table).update(data.fields as never).eq("id", data.id);
    if (error) throw new Error(error.message.includes("row-level security") ? "Your role cannot update this record." : "Could not update this record.");
    return { success: true };
  });

export const updateFoodFlowOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: "Pending" | "Approved" | "Ordered" | "Received" | "Cancelled" }) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.id)) throw new Error("Select a valid purchase order.");
    if (!["Pending", "Approved", "Ordered", "Received", "Cancelled"].includes(input.status)) throw new Error("Choose a valid purchase-order status.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("foodflow_purchase_orders").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message.includes("row-level security") ? "Your role cannot update purchase orders." : "Could not update this purchase order.");
    return { success: true };
  });

export const removeFoodFlowRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: AppRole }) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.userId)) throw new Error("Select a valid account.");
    if (!roleValues.includes(input.role) || input.role === "institution_admin") throw new Error("The first administrator role cannot be removed here.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("foodflow_remove_role", { _target_user_id: data.userId, _role: data.role });
    if (error) throw new Error("Could not remove that role. Check your account permissions.");
    return { success: true };
  });

export const listFoodFlowInventory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile, error: profileError } = await context.supabase
      .from("foodflow_profiles")
      .select("institution_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (profileError) throw new Error("Could not load inventory.");
    if (!profile?.institution_id) return { institutionId: null, items: [] };
    const { data, error } = await context.supabase
      .from("foodflow_inventory")
      .select("id, name, category, quantity, unit, minimum_quantity, unit_cost, supplier_name, expiry_date")
      .eq("institution_id", profile.institution_id)
      .order("name");
    if (error) throw new Error("Could not load inventory.");
    return { institutionId: profile.institution_id, items: data ?? [] };
  });

export const createFoodFlowInventoryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; category: string; quantity: number; unit: string; minimumQuantity: number; unitCost: number; supplierName: string }) => {
    const name = input.name.trim();
    const category = input.category.trim() || "General";
    const unit = input.unit.trim() || "kg";
    const supplierName = input.supplierName.trim();
    if (name.length < 2 || name.length > 100) throw new Error("Enter an ingredient name between 2 and 100 characters.");
    if (![input.quantity, input.minimumQuantity, input.unitCost].every((value) => Number.isFinite(value) && value >= 0)) throw new Error("Quantity and cost must be zero or greater.");
    return { name, category, unit, supplierName, quantity: input.quantity, minimumQuantity: input.minimumQuantity, unitCost: input.unitCost };
  })
  .handler(async ({ data, context }) => {
    const { data: profile, error: profileError } = await context.supabase
      .from("foodflow_profiles")
      .select("institution_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (profileError || !profile?.institution_id) throw new Error("Set up your institution before adding inventory.");
    const { data: item, error } = await context.supabase.from("foodflow_inventory").insert({
      institution_id: profile.institution_id,
      name: data.name,
      category: data.category,
      quantity: data.quantity,
      unit: data.unit,
      minimum_quantity: data.minimumQuantity,
      unit_cost: data.unitCost,
      supplier_name: data.supplierName,
    }).select("id, name, category, quantity, unit, minimum_quantity, unit_cost, supplier_name, expiry_date").single();
    if (error || !item) throw new Error(error?.message.includes("row-level security") ? "Your role cannot add inventory items." : "Could not add this ingredient.");
    return { item };
  });

export const adjustFoodFlowInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; delta: number; reason: string }) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.id)) throw new Error("Select a valid ingredient.");
    if (!Number.isFinite(input.delta) || input.delta === 0 || Math.abs(input.delta) > 100000) throw new Error("Enter a non-zero stock adjustment.");
    const reason = input.reason.trim().slice(0, 120) || "Stock adjustment";
    return { id: input.id, delta: input.delta, reason };
  })
  .handler(async ({ data, context }) => {
    const { data: profile, error: profileError } = await context.supabase
      .from("foodflow_profiles")
      .select("institution_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (profileError || !profile?.institution_id) throw new Error("Set up your institution before adjusting stock.");
    const { data: updated, error } = await context.supabase.rpc("foodflow_adjust_inventory", {
      _inventory_id: data.id,
      _institution_id: profile.institution_id,
      _delta: data.delta,
      _reason: data.reason,
    });
    if (error) throw new Error(error.message.includes("not found") ? "This ingredient no longer exists." : error.message.includes("below zero") ? "Stock cannot go below zero." : error.message.includes("role") ? "Your role cannot adjust stock." : "Could not update stock.");
    return { item: Array.isArray(updated) ? updated[0] ?? null : updated };
  });

export const deleteFoodFlowInventoryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.id)) throw new Error("Select a valid ingredient.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("foodflow_delete_inventory_item", { _inventory_id: data.id });
    if (error) throw new Error("Could not delete this ingredient. Check your institution access and role.");
    return { success: true };
  });

export const migrateLegacyFoodFlowInventoryDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile, error: profileError } = await context.supabase
      .from("foodflow_profiles")
      .select("institution_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (profileError || !profile?.institution_id) throw new Error("Set up your institution before adding sample stock.");
    const { error } = await context.supabase.rpc("foodflow_import_demo_inventory", { _institution_id: profile.institution_id });
    if (error) throw new Error("Could not add sample inventory.");
    return { success: true };
  });
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { LoaderCircle, LockKeyhole, LogOut, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { FoodFlowShell } from "@/components/foodflow-shell";
import { AuthPage } from "@/components/foodflow-auth";
import { FoodFlowContent, type DashboardProps, type FoodFlowContext } from "@/components/foodflow-dashboard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { sampleInventory, type AppRole, type DemoInventoryItem, type FoodFlowPage } from "@/lib/foodflow-data";
import {
  assignFoodFlowRole,
  createFoodFlowBusinessRecord,
  createFoodFlowInstitution,
  createFoodFlowInventoryItem,
  deleteFoodFlowInventoryItem,
  getFoodFlowContext,
  listFoodFlowBusinessRows,
  listFoodFlowInventory,
  listFoodFlowTeam,
  removeFoodFlowRole,
  updateFoodFlowBusinessRecord,
  updateFoodFlowDisplayName,
  updateFoodFlowOrderStatus,
  adjustFoodFlowInventory,
} from "@/lib/foodflow.functions";
import { type FoodFlowMember, type FoodFlowRow } from "@/lib/foodflow-models";

const businessTables = [
  "foodflow_meal_plans",
  "foodflow_recipes",
  "foodflow_students",
  "foodflow_kitchen_tasks",
  "foodflow_forecasts",
  "foodflow_purchase_orders",
  "foodflow_waste_entries",
  "foodflow_service_actuals",
  "foodflow_calendar_events",
  "foodflow_suppliers",
  "foodflow_halls",
  "foodflow_attendance",
  "foodflow_stock_movements",
] as const;
type BusinessTable = (typeof businessTables)[number];

type ActionName = "institution" | "name" | "invite" | "inventory" | "meal" | "recipe" | "task" | "student" | "order" | "waste" | "forecast" | "event" | "supplier" | "actual" | "attendance" | "hall" | "report" | "movement";
type FormField = { key: string; label: string; type?: "text" | "number" | "date" | "email" | "select" | "textarea"; options?: string[]; required?: boolean; min?: number; max?: number; placeholder?: string };

const fieldsByAction: Record<Exclude<ActionName, "institution" | "name" | "invite" | "report" | "movement">, FormField[]> = {
  inventory: [
    { key: "name", label: "Ingredient name", required: true },
    { key: "category", label: "Category", type: "select", options: ["Grains", "Pulses", "Produce", "Dairy", "Pantry", "Other"] },
    { key: "quantity", label: "Quantity on hand", type: "number", min: 0, required: true },
    { key: "unit", label: "Unit", type: "select", options: ["kg", "L", "pieces", "boxes", "packs"] },
    { key: "minimum_quantity", label: "Restock minimum", type: "number", min: 0, required: true },
    { key: "unit_cost", label: "Cost per unit (₹)", type: "number", min: 0, required: true },
    { key: "supplier_name", label: "Supplier" },
  ],
  meal: [
    { key: "service_date", label: "Service date", type: "date", required: true },
    { key: "meal_type", label: "Meal", type: "select", options: ["Breakfast", "Lunch", "Snacks", "Dinner"], required: true },
    { key: "title", label: "Menu title", required: true },
    { key: "expected_servings", label: "Expected portions", type: "number", min: 0, required: true },
    { key: "dishes", label: "Dishes", placeholder: "Separate dishes with commas" },
  ],
  recipe: [
    { key: "name", label: "Recipe name", required: true },
    { key: "category", label: "Category", type: "select", options: ["Breakfast", "Main course", "Side", "Snack", "Dessert"] },
    { key: "servings", label: "Servings", type: "number", min: 1, required: true },
    { key: "cost_per_serving", label: "Cost per serving (₹)", type: "number", min: 0, required: true },
    { key: "ingredients", label: "Ingredients", placeholder: "Separate ingredients with commas" },
    { key: "instructions", label: "Preparation", type: "textarea" },
  ],
  task: [
    { key: "task_date", label: "Preparation date", type: "date", required: true },
    { key: "meal_type", label: "Meal", type: "select", options: ["Breakfast", "Lunch", "Snacks", "Dinner"], required: true },
    { key: "dish_name", label: "Preparation task", required: true },
    { key: "planned_quantity", label: "Planned portions", type: "number", min: 0, required: true },
    { key: "assigned_to", label: "Assigned kitchen team" },
  ],
  student: [
    { key: "student_code", label: "Student code", required: true },
    { key: "full_name", label: "Student name", required: true },
    { key: "hall", label: "Dining hall" },
    { key: "meal_plan", label: "Meal plan", type: "select", options: ["Standard", "Vegetarian", "Vegan", "Dairy-free", "Gluten-free"] },
  ],
  order: [
    { key: "supplier_name", label: "Supplier", required: true },
    { key: "item_summary", label: "Items ordered", required: true },
    { key: "total_amount", label: "Order total (₹)", type: "number", min: 0, required: true },
    { key: "expected_date", label: "Expected delivery", type: "date" },
  ],
  waste: [
    { key: "record_date", label: "Service date", type: "date", required: true },
    { key: "meal_type", label: "Meal", type: "select", options: ["Breakfast", "Lunch", "Snacks", "Dinner"], required: true },
    { key: "dish_name", label: "Dish", required: true },
    { key: "prepared_quantity", label: "Prepared quantity", type: "number", min: 0, required: true },
    { key: "served_quantity", label: "Served quantity", type: "number", min: 0, required: true },
    { key: "wasted_quantity", label: "Waste quantity", type: "number", min: 0, required: true },
    { key: "unit", label: "Unit", type: "select", options: ["kg", "portions", "L"] },
    { key: "waste_cost", label: "Waste cost (₹)", type: "number", min: 0, required: true },
  ],
  forecast: [
    { key: "forecast_date", label: "Forecast date", type: "date", required: true },
    { key: "meal_type", label: "Meal", type: "select", options: ["Breakfast", "Lunch", "Snacks", "Dinner"], required: true },
    { key: "expected_students", label: "Expected portions", type: "number", min: 0, required: true },
    { key: "confidence", label: "Estimate confidence (%)", type: "number", min: 0, max: 100, required: true },
  ],
  event: [
    { key: "event_date", label: "Event date", type: "date", required: true },
    { key: "title", label: "Event name", required: true },
    { key: "description", label: "Details", type: "textarea" },
    { key: "attendance_factor", label: "Attendance factor", type: "number", min: 0, required: true },
  ],
  supplier: [
    { key: "name", label: "Supplier name", required: true },
    { key: "category", label: "Supplies", type: "select", options: ["Produce", "Dairy", "Grains", "Meat & fish", "General"] },
    { key: "contact_name", label: "Contact name" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone" },
  ],
  actual: [
    { key: "service_date", label: "Service date", type: "date", required: true },
    { key: "meal_type", label: "Meal", type: "select", options: ["Breakfast", "Lunch", "Snacks", "Dinner"], required: true },
    { key: "dish_name", label: "Dish", required: true },
    { key: "prepared_quantity", label: "Prepared portions", type: "number", min: 0, required: true },
    { key: "served_quantity", label: "Served portions", type: "number", min: 0, required: true },
    { key: "leftover_quantity", label: "Leftover portions", type: "number", min: 0, required: true },
    { key: "spoiled_quantity", label: "Spoiled portions", type: "number", min: 0, required: true },
  ],
  attendance: [
    { key: "student_name", label: "Student name", required: true },
    { key: "student_code", label: "Student code" },
    { key: "hall", label: "Dining hall" },
    { key: "meal_type", label: "Meal", type: "select", options: ["Breakfast", "Lunch", "Snacks", "Dinner"], required: true },
  ],
  hall: [
    { key: "name", label: "Dining hall name", required: true },
    { key: "capacity", label: "Seating capacity", type: "number", min: 0, required: true },
  ],
};

const tableByAction: Partial<Record<ActionName, (typeof businessTables)[number]>> = {
  meal: "foodflow_meal_plans", recipe: "foodflow_recipes", task: "foodflow_kitchen_tasks", student: "foodflow_students", order: "foodflow_purchase_orders", waste: "foodflow_waste_entries", forecast: "foodflow_forecasts", event: "foodflow_calendar_events", supplier: "foodflow_suppliers", actual: "foodflow_service_actuals",
};

function initialFormValues(action: ActionName, initial: FoodFlowRow | null): Record<string, string> {
  const fields = action in fieldsByAction ? fieldsByAction[action as keyof typeof fieldsByAction] : [];
  return Object.fromEntries(fields.map((field) => {
    const value = initial?.[field.key];
    const fallback = field.type === "date" ? new Date().toISOString().slice(0, 10) : field.key === "meal_type" ? "Lunch" : field.key === "confidence" ? "70" : field.key === "attendance_factor" ? "1" : field.key === "unit" ? "kg" : "";
    return [field.key, Array.isArray(value) ? value.join(", ") : value === null || value === undefined ? fallback : String(value)];
  }));
}

export function FoodFlowApp({ page }: { page: FoodFlowPage }) {
  const navigate = useNavigate();
  const getContextFn = useServerFn(getFoodFlowContext);
  const listRowsFn = useServerFn(listFoodFlowBusinessRows);
  const listInventoryFn = useServerFn(listFoodFlowInventory);
  const listTeamFn = useServerFn(listFoodFlowTeam);
  const createInstitutionFn = useServerFn(createFoodFlowInstitution);
  const updateNameFn = useServerFn(updateFoodFlowDisplayName);
  const assignRoleFn = useServerFn(assignFoodFlowRole);
  const removeRoleFn = useServerFn(removeFoodFlowRole);
  const createRecordFn = useServerFn(createFoodFlowBusinessRecord);
  const updateRecordFn = useServerFn(updateFoodFlowBusinessRecord);
  const updateOrderFn = useServerFn(updateFoodFlowOrderStatus);
  const createInventoryFn = useServerFn(createFoodFlowInventoryItem);
  const adjustInventoryFn = useServerFn(adjustFoodFlowInventory);
  const deleteInventoryFn = useServerFn(deleteFoodFlowInventoryItem);

  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authEpoch, setAuthEpoch] = useState(0);
  const [context, setContext] = useState<FoodFlowContext | null>(null);
  const [inventoryItems, setInventoryItems] = useState<DemoInventoryItem[]>([]);
  const [rowsByTable, setRowsByTable] = useState<Partial<Record<BusinessTable, FoodFlowRow[]>>>({});
  const [members, setMembers] = useState<FoodFlowMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dataMode, setDataMode] = useState<"live" | "demo">("demo");
  const [demoAccess, setDemoAccess] = useState(false);
  const [action, setAction] = useState<ActionName | null>(null);
  const [initialRecord, setInitialRecord] = useState<FoodFlowRow | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    const applySession = (session: { user?: unknown } | null) => {
      if (!active) return;
      const signedIn = Boolean(session?.user);
      setAuthenticated(signedIn);
      setAuthReady(true);
      setAuthEpoch((previous) => previous + 1);
      if (signedIn) setDemoAccess(false);
      if (!signedIn) {
        setContext(null);
        setInventoryItems([]);
        setRowsByTable({});
        setMembers([]);
        setDataMode("demo");
      }
    };
    void supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => applySession(session));
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const loadWorkspace = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    try {
      const nextContext = await getContextFn();
      const [inventoryResult, ...rowResults] = await Promise.all([
        listInventoryFn(),
        ...businessTables.map((table) => listRowsFn({ data: { table } })),
      ]);
      const nextRows = Object.fromEntries(businessTables.map((table, index) => [table, (rowResults[index]?.rows ?? []).map((row) => ({ ...row }))])) as Partial<Record<BusinessTable, FoodFlowRow[]>>;
      setContext(nextContext);
      setInventoryItems(inventoryResult.items.map((item) => ({ ...item })));
      setRowsByTable(nextRows);
      setDataMode("live");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load your FoodFlow workspace.");
    } finally {
      setLoading(false);
    }
  }, [authenticated, getContextFn, listInventoryFn, listRowsFn]);

  useEffect(() => {
    if (!authReady || !authenticated) return;
    void loadWorkspace();
  }, [authReady, authenticated, authEpoch, loadWorkspace]);

  useEffect(() => {
    if (!authenticated || page !== "users" || context?.role !== "institution_admin") return;
    let active = true;
    void listTeamFn().then((result) => { if (active) setMembers(result.members); }).catch((error) => toast.error(error instanceof Error ? error.message : "Could not load your team."));
    return () => { active = false; };
  }, [authenticated, context?.role, listTeamFn, page]);

  const openAction = (kind: string, initial?: FoodFlowRow | null) => {
    if (!(kind in fieldsByAction) && !["institution", "name", "invite", "report", "movement"].includes(kind)) return;
    const selectedAction = kind as ActionName;
    setInitialRecord(initial ?? null);
    setAction(selectedAction);
    setValues(initialFormValues(selectedAction, initial ?? null));
  };

  const closeAction = () => { setAction(null); setInitialRecord(null); setValues({}); };
  const setValue = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const refreshAfterSave = async () => { await loadWorkspace(); };

  const saveAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!action) return;
    if (!authenticated) {
      toast.info("Create a FoodFlow account to save workspace records.");
      return;
    }
    setBusy(true);
    try {
      if (action === "institution") {
        await createInstitutionFn({ data: { name: values["name"] ?? "" } });
        toast.success("Your institution is ready.");
      } else if (action === "name") {
        await updateNameFn({ data: { displayName: values["display_name"] ?? "" } });
        toast.success("Your name was updated.");
      } else if (action === "invite") {
        await assignRoleFn({ data: { email: values["email"] ?? "", role: (values["role"] ?? "mess_manager") as AppRole } });
        toast.success("Teammate access was added.");
      } else if (action === "inventory") {
        await createInventoryFn({ data: {
          name: values["name"] ?? "", category: values["category"] ?? "General", quantity: Number(values["quantity"] ?? 0), unit: values["unit"] ?? "kg", minimumQuantity: Number(values["minimum_quantity"] ?? 0), unitCost: Number(values["unit_cost"] ?? 0), supplierName: values["supplier_name"] ?? "",
        } });
        toast.success("Ingredient added to inventory.");
      } else if (action in fieldsByAction) {
        const rawFields = fieldsByAction[action as keyof typeof fieldsByAction];
        const fields: Record<string, string | number | string[]> = {};
        for (const field of rawFields) {
          const value = values[field.key] ?? "";
          if (["quantity", "minimum_quantity", "unit_cost", "expected_servings", "servings", "cost_per_serving", "planned_quantity", "total_amount", "prepared_quantity", "served_quantity", "wasted_quantity", "waste_cost", "expected_students", "confidence", "attendance_factor", "leftover_quantity", "spoiled_quantity", "capacity"].includes(field.key)) fields[field.key] = Number(value || 0);
          else if (["dishes", "ingredients"].includes(field.key)) fields[field.key] = value.split(",").map((item) => item.trim()).filter(Boolean);
          else fields[field.key] = value;
        }
        const existingId = initialRecord?.["id"];
        if (typeof existingId === "string" && tableByAction[action]) {
          const table = tableByAction[action];
          if (table) await updateRecordFn({ data: { table: table as "foodflow_meal_plans" | "foodflow_kitchen_tasks" | "foodflow_purchase_orders" | "foodflow_forecasts", id: existingId, fields } });
          toast.success("Your changes were saved.");
        } else {
          await createRecordFn({ data: { kind: action as "meal" | "recipe" | "task" | "student" | "order" | "waste" | "forecast" | "event" | "supplier" | "actual" | "attendance" | "hall", fields } });
          toast.success("FoodFlow record added.");
        }
      }
      closeAction();
      await refreshAfterSave();
      if (action === "invite" && page === "users") {
        const team = await listTeamFn();
        setMembers(team.members);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this change.");
    } finally {
      setBusy(false);
    }
  };

  const handleAdjustStock = async (item: DemoInventoryItem, delta: number, reason: string) => {
    if (dataMode === "demo") return;
    try {
      await adjustInventoryFn({ data: { id: item.id, delta, reason } });
      toast.success("Stock quantity updated.");
      await refreshAfterSave();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not adjust this stock item."); }
  };

  const handleDeleteStock = async (item: DemoInventoryItem) => {
    if (dataMode === "demo" || !window.confirm(`Remove ${item.name} from inventory?`)) return;
    try {
      await deleteInventoryFn({ data: { id: item.id } });
      toast.success("Ingredient removed.");
      await refreshAfterSave();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not remove this ingredient."); }
  };

  const updateTask = async (row: FoodFlowRow, fields: Record<string, string | number | string[]>) => {
    const id = row["id"];
    if (dataMode === "demo" || typeof id !== "string") return;
    try {
      await updateRecordFn({ data: { table: "foodflow_kitchen_tasks", id, fields } });
      toast.success("Kitchen task updated.");
      await refreshAfterSave();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update this kitchen task."); }
  };

  const updateOrder = async (row: FoodFlowRow) => {
    const id = row["id"];
    if (dataMode === "demo" || typeof id !== "string") return;
    const next = row["status"] === "Pending" ? "Approved" : row["status"] === "Approved" ? "Ordered" : "Received";
    try {
      await updateOrderFn({ data: { id, status: next } });
      toast.success(`Purchase order ${next.toLowerCase()}.`);
      await refreshAfterSave();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update this purchase order."); }
  };

  const handleRemoveRole = async (member: FoodFlowMember, role: string) => {
    if (window.confirm(`Remove ${role.replaceAll("_", " ")} access for ${member.name}?`)) {
      try {
        await removeRoleFn({ data: { userId: member.userId, role: role as AppRole } });
        const team = await listTeamFn();
        setMembers(team.members);
        toast.success("Teammate access removed.");
      } catch (error) { toast.error(error instanceof Error ? error.message : "Could not remove this role."); }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error("Could not sign out. Please try again.");
    else { setAuthenticated(false); setDemoAccess(false); setContext(null); setDataMode("demo"); void navigate({ to: "/auth" }); }
  };

  const handleToggleDemo = () => {
    if (!authenticated) {
      setDemoAccess(true);
      setDataMode("demo");
      return;
    }
    setDataMode((current) => current === "demo" ? "live" : "demo");
    toast.info(dataMode === "demo" ? "Showing your saved workspace records." : "Showing illustrative sample values.");
  };

  const rows = useMemo(() => {
    const tableByPage: Partial<Record<FoodFlowPage, readonly BusinessTable[]>> = {
      "meal-planning": ["foodflow_meal_plans", "foodflow_calendar_events"], "weekly-menu": ["foodflow_meal_plans"], calendar: ["foodflow_calendar_events"], recipes: ["foodflow_recipes"], kitchen: ["foodflow_kitchen_tasks", "foodflow_service_actuals"], inventory: ["foodflow_stock_movements"], movements: ["foodflow_stock_movements"], purchasing: ["foodflow_purchase_orders", "foodflow_suppliers"], suppliers: ["foodflow_suppliers"], attendance: ["foodflow_attendance"], students: ["foodflow_students"], forecast: ["foodflow_forecasts"], waste: ["foodflow_waste_entries"], analytics: ["foodflow_service_actuals", "foodflow_waste_entries"], reports: businessTables, actuals: ["foodflow_service_actuals"], halls: ["foodflow_halls"], overview: businessTables,
    };
    return (tableByPage[page] ?? []).flatMap((table) => rowsByTable[table] ?? []);
  }, [page, rowsByTable]);

  if (!authReady) return <div className="grid min-h-screen place-items-center"><div className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Opening FoodFlow</div></div>;
  if (!authenticated && !demoAccess) return <AuthPage onExploreDemo={handleToggleDemo} />;

  const currentContext = context ?? { userId: "", name: "FoodFlow member", email: null, institutionId: null, institutionName: null, role: null, hasInstitution: false };
  const role = currentContext.role;
  const canManage = authenticated && dataMode === "live" && (role === "institution_admin" || role === "mess_manager");
  const canOperate = authenticated && dataMode === "live" && role !== null && role !== "viewer";
  const visibleInventory = dataMode === "demo" ? sampleInventory : inventoryItems;
  const dashboardProps: DashboardProps = {
    currentPage: page,
    currentName: currentContext.name,
    institutionName: demoAccess ? "Sample institution · preview only" : currentContext.institutionName,
    institutionId: currentContext.institutionId,
    role,
    canManage,
    canOperate,
    inventoryItems: visibleInventory,
    rows,
    members,
    dataMode,
    currencyCode: currentContext.currencyCode ?? "INR",
    timezone: currentContext.timezone ?? "Asia/Kolkata",
    onAction: openAction,
    onNavigate: (nextPage) => void navigate({ to: nextPage === "overview" ? "/" : `/${nextPage}` as never }),
    onToggleDemo: handleToggleDemo,
    onAdjustStock: handleAdjustStock,
    onDeleteStock: handleDeleteStock,
    onUpdateTask: updateTask,
    onUpdateOrder: updateOrder,
    onChangeRole: (email, selectedRole) => { setValues({ email, role: selectedRole }); setAction("invite"); },
    onRemoveRole: (member, selectedRole) => void handleRemoveRole(member, selectedRole),
    onSaveDisplayName: (name) => { setValues({ display_name: name }); setAction("name"); },
    onSignOut: () => void signOut(),
  };

  const modalTitle = action === "institution" ? "Set up your institution" : action === "name" ? "Update your name" : action === "invite" ? "Add a teammate" : action === "inventory" ? "Add an ingredient" : action === "meal" ? initialRecord ? "Edit meal plan" : "Plan a meal" : action === "recipe" ? "Add a recipe" : action === "task" ? "Add a kitchen task" : action === "student" ? "Add a student" : action === "order" ? "Create purchase order" : action === "waste" ? "Record food waste" : action === "forecast" ? "Add a meal estimate" : action === "event" ? "Add a campus event" : action === "supplier" ? "Add a supplier" : action === "actual" ? "Record meal service" : action === "attendance" ? "Record meal attendance" : action === "hall" ? "Add a dining hall" : "FoodFlow";
  const modalDescription = action === "institution" ? "This workspace is private to your institution." : action === "invite" ? "Your teammate must have a FoodFlow account before access can be assigned." : action === "name" ? "Your name appears in your FoodFlow workspace." : "This record will be saved for your institution.";
  const actionFields = action && action in fieldsByAction ? fieldsByAction[action as keyof typeof fieldsByAction] : [];

  return <>
    <FoodFlowShell currentPage={page} currentName={currentContext.name} institutionName={currentContext.institutionName} unreadCount={dataMode === "demo" ? 2 : 0} onSignOut={() => void signOut()} dataMode={dataMode} onToggleDemo={handleToggleDemo}>
      {loading && <div className="mb-4 flex items-center justify-end gap-2 text-[10px] text-muted-foreground"><LoaderCircle className="size-3 animate-spin" />Refreshing your records</div>}
      {(!currentContext.hasInstitution || demoAccess) && <div className="mb-5 flex flex-wrap items-center gap-3 border-l-2 border-warning bg-warning/10 px-4 py-3"><LockKeyhole className="size-4 shrink-0 text-warning" /><div className="min-w-0 flex-1"><p className="text-xs font-medium">{demoAccess ? "You’re viewing a sample workspace." : "Set up an institution to start saving records."}</p><p className="mt-1 text-[10px] text-muted-foreground">{demoAccess ? "Examples are not connected to a real kitchen or institution." : "The sample data is only an example and cannot be edited."}</p></div><Button size="sm" variant={demoAccess ? "default" : "outline"} className="h-8 shrink-0" onClick={() => { setDemoAccess(false); void navigate({ to: "/auth" }); }}>{demoAccess ? "Create an account" : "Set up"}<Plus className="size-3.5" /></Button>{!demoAccess && authenticated && <Button size="sm" className="h-8 shrink-0" onClick={() => openAction("institution")}>Set up<Plus className="size-3.5" /></Button>}</div>}
      <FoodFlowContent {...dashboardProps} />
      {context && <div className="sr-only"><ShieldCheck />Signed in to {context.institutionName ?? "FoodFlow"}.</div>}
    </FoodFlowShell>
    <Dialog open={action !== null} onOpenChange={(open) => { if (!open && !busy) closeAction(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader><DialogTitle>{modalTitle}</DialogTitle><DialogDescription>{modalDescription}</DialogDescription></DialogHeader>
        <form onSubmit={(event) => void saveAction(event)} className="space-y-4">
          {action === "institution" && <Field label="Institution name" value={values["name"] ?? ""} onChange={(value) => setValue("name", value)} required placeholder="Your college or organisation" />}
          {action === "name" && <Field label="Display name" value={values["display_name"] ?? currentContext.name} onChange={(value) => setValue("display_name", value)} required />}
          {action === "invite" && <><Field label="Teammate email" type="email" value={values["email"] ?? ""} onChange={(value) => setValue("email", value)} required placeholder="teammate@institution.edu" /><FormSelect label="Access role" value={values["role"] ?? "mess_manager"} onChange={(value) => setValue("role", value)} options={[["mess_manager", "Mess manager"], ["kitchen_staff", "Kitchen staff"], ["attendance_operator", "Attendance operator"], ["viewer", "Read-only access"]]} /></>}
          {actionFields.map((field) => <FormFieldControl key={field.key} field={field} value={values[field.key] ?? ""} onChange={(value) => setValue(field.key, value)} />)}
          {action === "movement" && <div className="rounded-sm border border-border p-4 text-sm text-muted-foreground">Use the adjustment buttons beside an ingredient to record an inbound delivery or kitchen issue. The change and its reason are saved together.</div>}
          {action === "report" && <div className="rounded-sm border border-border p-4 text-sm text-muted-foreground">Use the Reports page to download a CSV snapshot of the records currently available to your institution.</div>}
          <DialogFooter className="gap-2 sm:gap-2"><Button type="button" variant="outline" onClick={closeAction} disabled={busy}>Cancel</Button>{action !== "movement" && action !== "report" && <Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}{busy ? "Saving" : "Save"}</Button>}</DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}

function Field({ label, value, onChange, required, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: "text" | "email" | "number" | "date"; placeholder?: string }) {
  const id = label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} min={type === "number" ? 0 : undefined} placeholder={placeholder} /></div>;
}

function FormSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return <div className="space-y-2"><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{options.map(([optionValue, name]) => <SelectItem key={optionValue} value={optionValue}>{name}</SelectItem>)}</SelectContent></Select></div>;
}

function FormFieldControl({ field, value, onChange }: { field: FormField; value: string; onChange: (value: string) => void }) {
  if (field.type === "select") return <FormSelect label={field.label} value={value || field.options?.[0] || ""} onChange={onChange} options={(field.options ?? []).map((option) => [option, option])} />;
  if (field.type === "textarea") return <div className="space-y-2"><Label htmlFor={field.key}>{field.label}</Label><Textarea id={field.key} value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} rows={3} /></div>;
  return <div className="space-y-2"><Label htmlFor={field.key}>{field.label}</Label><Input id={field.key} type={field.type ?? "text"} value={value} onChange={(event) => onChange(event.target.value)} required={field.required} min={field.min} max={field.max} placeholder={field.placeholder} /></div>;
}
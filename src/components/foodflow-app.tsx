import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, Copy, LoaderCircle, LockKeyhole, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useFirebaseAuth } from "@/components/firebase-provider";
import { FoodFlowContent, type DashboardProps } from "@/components/foodflow-dashboard";
import { FoodFlowShell } from "@/components/foodflow-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CYCLE_MENU_PRESETS,
  computeComplaintSlaDeadline,
  moderateFeedbackContent,
  normalizeComplaintPriorityAndEscalation,
} from "@/lib/domain/feedback-ops";
import { generateDynamicDiningPassToken } from "@/lib/domain/mess-ops";
import {
  WORKSPACE_ROLES,
  type AttendanceDoc,
  type BookingDoc,
  type CalendarEventDoc,
  type ComplaintDoc,
  type FeedbackDoc,
  type ForecastDoc,
  type HallDoc,
  type InventoryItemDoc,
  type InvoiceDoc,
  type KitchenTaskDoc,
  type LeaveRequestDoc,
  type MenuPlanDoc,
  type NotificationDoc,
  type PaymentDoc,
  type PurchaseOrderDoc,
  type RecipeDoc,
  type ServiceActualDoc,
  type StockMovementDoc,
  type StudentRecordDoc,
  type VendorDoc,
  type WasteLogDoc,
  type WorkspaceInviteDoc,
  type WorkspaceMemberDoc,
  type WorkspaceRole,
} from "@/lib/domain/workspace-types";
import {
  sampleInventory,
  sampleMeals,
  sampleRecipes,
  sampleStudents,
  type DemoInventoryItem,
  type FoodFlowPage,
} from "@/lib/foodflow-data";
import { dateKey, nextOrderStatus, shiftDateKey, type FoodFlowRow } from "@/lib/foodflow-models";
import { TRANSLATIONS } from "@/lib/i18n";
import { buildSanitizedMessSummary } from "@/lib/ai-client";
import { queueAttendance } from "@/lib/offline-attendance";
import {
  adjustInventoryAtomic,
  createSubDoc,
  createWorkspaceAtomic,
  createWorkspaceInviteAtomic,
  deductRecipeInventoryAtomic,
  deleteSubDoc,
  generateMonthlyInvoicesAtomic,
  recordPaymentAtomic,
  removeWorkspaceMemberAtomic,
  revokeWorkspaceInvite,
  subscribeSubcollection,
  subscribeWorkspaceInvites,
  subscribeWorkspaceMembers,
  updateSubDoc,
  updateUserProfilePreferences,
  updateWorkspaceMemberAtomic,
  updateWorkspaceSettings,
  writeAuditLog,
  type AuditActor,
} from "@/lib/workspace-firestore";

type ActionName =
  | "institution"
  | "name"
  | "invite"
  | "inventory"
  | "meal"
  | "recipe"
  | "task"
  | "student"
  | "order"
  | "waste"
  | "forecast"
  | "event"
  | "supplier"
  | "actual"
  | "attendance"
  | "hall"
  | "report"
  | "movement";

type FormField = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "email" | "select" | "textarea";
  options?: string[];
  required?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
};

const fieldsByAction: Record<
  Exclude<ActionName, "institution" | "name" | "invite" | "report" | "movement">,
  FormField[]
> = {
  inventory: [
    { key: "name", label: "Ingredient name", required: true },
    {
      key: "category",
      label: "Category",
      type: "select",
      options: ["Grains", "Pulses", "Produce", "Dairy", "Pantry", "Spices", "Other"],
    },
    { key: "quantity", label: "Quantity on hand", type: "number", min: 0, required: true },
    {
      key: "unit",
      label: "Unit",
      type: "select",
      options: ["kg", "L", "pieces", "boxes", "packs"],
    },
    { key: "minimum_quantity", label: "Restock minimum", type: "number", min: 0, required: true },
    { key: "unit_cost", label: "Cost per unit (₹)", type: "number", min: 0, required: true },
    { key: "supplier_name", label: "Supplier" },
    { key: "expiry_date", label: "Expiry date (optional for FEFO alerts)", type: "date" },
    { key: "batch_code", label: "Batch / lot code (optional)" },
  ],
  meal: [
    { key: "service_date", label: "Service date", type: "date", required: true },
    {
      key: "meal_type",
      label: "Meal",
      type: "select",
      options: ["Breakfast", "Lunch", "Snacks", "Dinner"],
      required: true,
    },
    { key: "title", label: "Menu title", required: true },
    {
      key: "expected_servings",
      label: "Expected portions",
      type: "number",
      min: 0,
      required: true,
    },
    {
      key: "plate_cost_rupees",
      label: "Estimated cost per plate (₹)",
      type: "number",
      min: 0,
      placeholder: "58",
    },
    {
      key: "allergens",
      label: "Allergens (comma-separated)",
      placeholder: "Dairy, Gluten, Peanuts",
    },
    { key: "dishes", label: "Dishes", placeholder: "Separate dishes with commas" },
  ],
  recipe: [
    { key: "name", label: "Recipe name", required: true },
    {
      key: "category",
      label: "Category",
      type: "select",
      options: ["Breakfast", "Main course", "Side", "Snack", "Dessert"],
    },
    { key: "servings", label: "Standard servings", type: "number", min: 1, required: true },
    {
      key: "cost_per_serving",
      label: "Cost per serving (₹)",
      type: "number",
      min: 0,
      required: true,
    },
    {
      key: "ingredients",
      label: "Ingredients (comma-separated, e.g. Rice 12 kg, Dal 4 kg)",
      placeholder: "Paneer 10 kg, Butter 2 kg, Tomato 6 kg",
    },
    { key: "instructions", label: "Preparation steps", type: "textarea" },
  ],
  task: [
    { key: "task_date", label: "Preparation date", type: "date", required: true },
    {
      key: "meal_type",
      label: "Meal",
      type: "select",
      options: ["Breakfast", "Lunch", "Snacks", "Dinner"],
      required: true,
    },
    { key: "dish_name", label: "Preparation task", required: true },
    { key: "planned_quantity", label: "Planned portions", type: "number", min: 0, required: true },
    { key: "assigned_to", label: "Assigned kitchen lead" },
  ],
  student: [
    { key: "student_code", label: "Roll / Student code", required: true, placeholder: "24CS108" },
    { key: "full_name", label: "Student full name", required: true },
    { key: "email", label: "Student email (optional)", type: "email" },
    { key: "hall", label: "Dining hall", placeholder: "North Mess Hall" },
    {
      key: "meal_plan",
      label: "Meal plan",
      type: "select",
      options: ["Standard", "Vegetarian", "Jain / No Onion-Garlic", "Vegan", "Gluten-free"],
    },
    { key: "dietary_notes", label: "Allergies / dietary notes" },
  ],
  order: [
    { key: "supplier_name", label: "Vendor / Supplier", required: true },
    { key: "item_summary", label: "Items ordered", required: true },
    { key: "total_amount", label: "Order total (₹)", type: "number", min: 0, required: true },
    { key: "expected_date", label: "Expected delivery", type: "date" },
  ],
  waste: [
    { key: "record_date", label: "Service date", type: "date", required: true },
    {
      key: "meal_type",
      label: "Meal",
      type: "select",
      options: ["Breakfast", "Lunch", "Snacks", "Dinner"],
      required: true,
    },
    { key: "dish_name", label: "Dish", required: true },
    {
      key: "waste_stage",
      label: "Waste stage (Prep / Kitchen vs Plate)",
      type: "select",
      options: ["plate", "prep"],
    },
    {
      key: "prepared_quantity",
      label: "Prepared quantity",
      type: "number",
      min: 0,
      required: true,
    },
    { key: "served_quantity", label: "Served quantity", type: "number", min: 0, required: true },
    { key: "wasted_quantity", label: "Waste quantity", type: "number", min: 0, required: true },
    { key: "unit", label: "Unit", type: "select", options: ["kg", "portions", "L"] },
    {
      key: "waste_cost",
      label: "Estimated waste cost (₹)",
      type: "number",
      min: 0,
      required: true,
    },
    { key: "reason", label: "Root cause / note" },
  ],
  forecast: [
    { key: "forecast_date", label: "Forecast date", type: "date", required: true },
    {
      key: "meal_type",
      label: "Meal",
      type: "select",
      options: ["Breakfast", "Lunch", "Snacks", "Dinner"],
      required: true,
    },
    {
      key: "expected_students",
      label: "Expected portions",
      type: "number",
      min: 0,
      required: true,
    },
    {
      key: "confidence",
      label: "Confidence (%)",
      type: "number",
      min: 0,
      max: 100,
      required: true,
    },
  ],
  event: [
    { key: "event_date", label: "Event date", type: "date", required: true },
    { key: "title", label: "Campus event / holiday", required: true },
    { key: "description", label: "Impact details", type: "textarea" },
    {
      key: "attendance_factor",
      label: "Attendance multiplier (e.g. 0.55 on holiday, 1.25 on fest)",
      type: "number",
      min: 0,
      required: true,
    },
  ],
  supplier: [
    { key: "name", label: "Vendor / supplier name", required: true },
    {
      key: "category",
      label: "Supply category",
      type: "select",
      options: ["Produce", "Dairy", "Grains", "Pulses", "Spices", "General"],
    },
    { key: "contact_name", label: "Contact person" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone" },
    { key: "gstin", label: "GSTIN (optional)" },
  ],
  actual: [
    { key: "service_date", label: "Service date", type: "date", required: true },
    {
      key: "meal_type",
      label: "Meal",
      type: "select",
      options: ["Breakfast", "Lunch", "Snacks", "Dinner"],
      required: true,
    },
    { key: "dish_name", label: "Dish", required: true },
    {
      key: "prepared_quantity",
      label: "Prepared portions",
      type: "number",
      min: 0,
      required: true,
    },
    { key: "served_quantity", label: "Served portions", type: "number", min: 0, required: true },
    {
      key: "leftover_quantity",
      label: "Leftover portions",
      type: "number",
      min: 0,
      required: true,
    },
    { key: "spoiled_quantity", label: "Spoiled portions", type: "number", min: 0, required: true },
    { key: "cost_per_serving", label: "Cost per portion (₹)", type: "number", min: 0 },
  ],
  attendance: [
    { key: "student_name", label: "Student name", required: true },
    { key: "student_code", label: "Student code", required: true },
    { key: "hall", label: "Dining hall" },
    {
      key: "meal_type",
      label: "Meal",
      type: "select",
      options: ["Breakfast", "Lunch", "Snacks", "Dinner"],
      required: true,
    },
    {
      key: "method",
      label: "Check-in method",
      type: "select",
      options: ["qr", "manual", "rfid"],
    },
  ],
  hall: [
    { key: "name", label: "Dining hall name", required: true },
    { key: "capacity", label: "Seating capacity", type: "number", min: 1, required: true },
  ],
};

function parseIngredientsList(raw: string): { name: string; quantity: number; unit: string }[] {
  return raw
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const m = chunk.match(/^(.+?)\s+([\d.]+)\s*([a-zA-Z]+)?$/);
      if (m && m[1]) {
        return {
          name: m[1].trim(),
          quantity: Number(m[2]) || 1,
          unit: (m[3] || "kg").trim(),
        };
      }
      return { name: chunk, quantity: 1, unit: "kg" };
    });
}

function initialFormValues(
  action: ActionName,
  initial: FoodFlowRow | null,
): Record<string, string> {
  const fields =
    action in fieldsByAction ? fieldsByAction[action as keyof typeof fieldsByAction] : [];
  return Object.fromEntries(
    fields.map((field) => {
      const value = initial?.[field.key];
      const fallback =
        field.key === "expiry_date"
          ? ""
          : field.type === "date"
            ? dateKey(new Date())
            : field.key === "meal_type"
              ? "Lunch"
              : field.key === "confidence"
                ? "80"
                : field.key === "attendance_factor"
                  ? "1"
                  : field.key === "unit"
                    ? "kg"
                    : field.key === "method"
                      ? "qr"
                      : "";
      return [
        field.key,
        Array.isArray(value)
          ? value.join(", ")
          : value === null || value === undefined
            ? fallback
            : String(value),
      ];
    }),
  );
}

export function FoodFlowApp({ page }: { page: FoodFlowPage }) {
  const navigate = useNavigate();
  const {
    user,
    loading: authLoading,
    workspaceLoading,
    profile,
    activeWorkspace,
    activeMember,
    role,
    language,
    refreshWorkspaceContext,
    markWriteRecorded,
    signOutFirebase,
  } = useFirebaseAuth();

  const t = TRANSLATIONS[language];

  const [demoAccess, setDemoAccess] = useState(() => {
    try {
      return (
        typeof window !== "undefined" &&
        window.sessionStorage.getItem("foodflow-demo-access") === "1"
      );
    } catch {
      return false;
    }
  });
  const [dataMode, setDataMode] = useState<"live" | "demo">("demo");
  const [savingStatus, setSavingStatus] = useState<"idle" | "saving" | "saved">("idle");
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live Firestore collections
  const [halls, setHalls] = useState<HallDoc[]>([]);
  const [students, setStudents] = useState<StudentRecordDoc[]>([]);
  const [menus, setMenus] = useState<MenuPlanDoc[]>([]);
  const [recipes, setRecipes] = useState<RecipeDoc[]>([]);
  const [fsInventory, setFsInventory] = useState<InventoryItemDoc[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovementDoc[]>([]);
  const [vendors, setVendors] = useState<VendorDoc[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderDoc[]>([]);
  const [bookings, setBookings] = useState<BookingDoc[]>([]);
  const [attendance, setAttendance] = useState<AttendanceDoc[]>([]);
  const [wasteLogs, setWasteLogs] = useState<WasteLogDoc[]>([]);
  const [invoices, setInvoices] = useState<InvoiceDoc[]>([]);
  const [payments, setPayments] = useState<PaymentDoc[]>([]);
  const [feedbackList, setFeedbackList] = useState<FeedbackDoc[]>([]);
  const [complaintsList, setComplaintsList] = useState<ComplaintDoc[]>([]);
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [kitchenTasks, setKitchenTasks] = useState<KitchenTaskDoc[]>([]);
  const [forecasts, setForecasts] = useState<ForecastDoc[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventDoc[]>([]);
  const [serviceActuals, setServiceActuals] = useState<ServiceActualDoc[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequestDoc[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberDoc[]>([]);
  const [workspaceInvites, setWorkspaceInvites] = useState<WorkspaceInviteDoc[]>([]);

  // Modal state
  const [action, setAction] = useState<ActionName | null>(null);
  const [initialRecord, setInitialRecord] = useState<FoodFlowRow | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<WorkspaceInviteDoc | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user && user.emailVerified) {
      setDemoAccess(false);
      setDataMode("live");
      try {
        window.sessionStorage.removeItem("foodflow-demo-access");
      } catch {
        // ignore
      }
    } else if (!user && !demoAccess) {
      setDataMode("demo");
    }
  }, [authLoading, demoAccess, user]);

  // Protected route guard: redirect unauthenticated/unverified users to /login cleanly
  useEffect(() => {
    if (authLoading) return;
    if ((!user || !user.emailVerified) && !demoAccess) {
      const target = typeof window !== "undefined" ? window.location.pathname : "/overview";
      void navigate({
        to: "/login",
        search: target && target !== "/login" ? { redirect: target } : undefined,
        replace: true,
      } as never);
    }
  }, [authLoading, demoAccess, navigate, user]);

  // Real-time Firestore listeners (strictly scoped by active role + workspace)
  useEffect(() => {
    const wsId = activeWorkspace?.id;
    const uid = user?.uid;
    if (dataMode !== "live" || !wsId || !uid || !user?.emailVerified || !role) {
      setHalls([]);
      setStudents([]);
      setMenus([]);
      setRecipes([]);
      setFsInventory([]);
      setStockMovements([]);
      setVendors([]);
      setPurchaseOrders([]);
      setBookings([]);
      setAttendance([]);
      setWasteLogs([]);
      setInvoices([]);
      setPayments([]);
      setFeedbackList([]);
      setComplaintsList([]);
      setNotifications([]);
      setKitchenTasks([]);
      setForecasts([]);
      setCalendarEvents([]);
      setServiceActuals([]);
      setLeaves([]);
      setWorkspaceMembers([]);
      setWorkspaceInvites([]);
      return;
    }

    const unsubs: (() => void)[] = [];
    unsubs.push(subscribeSubcollection<HallDoc>(wsId, "halls", setHalls));
    unsubs.push(
      subscribeSubcollection<MenuPlanDoc>(wsId, "menus", setMenus, { orderByField: "serviceDate" }),
    );
    unsubs.push(subscribeSubcollection<RecipeDoc>(wsId, "recipes", setRecipes));
    unsubs.push(
      subscribeSubcollection<CalendarEventDoc>(wsId, "calendarEvents", setCalendarEvents, {
        orderByField: "eventDate",
      }),
    );
    unsubs.push(subscribeSubcollection<NotificationDoc>(wsId, "notifications", setNotifications));
    unsubs.push(subscribeWorkspaceMembers(wsId, setWorkspaceMembers));

    if (role === "admin") {
      unsubs.push(subscribeWorkspaceInvites(wsId, setWorkspaceInvites));
    } else {
      setWorkspaceInvites([]);
    }

    if (role !== "student") {
      unsubs.push(subscribeSubcollection<StudentRecordDoc>(wsId, "students", setStudents));
      unsubs.push(subscribeSubcollection<InventoryItemDoc>(wsId, "inventoryItems", setFsInventory));
      unsubs.push(
        subscribeSubcollection<StockMovementDoc>(wsId, "stockMovements", setStockMovements, {
          orderByField: "movedAt",
          maxRows: 200,
        }),
      );
      unsubs.push(subscribeSubcollection<VendorDoc>(wsId, "vendors", setVendors));
      unsubs.push(
        subscribeSubcollection<PurchaseOrderDoc>(wsId, "purchaseOrders", setPurchaseOrders, {
          orderByField: "expectedDate",
        }),
      );
      unsubs.push(
        subscribeSubcollection<BookingDoc>(wsId, "bookings", setBookings, { maxRows: 300 }),
      );
      unsubs.push(
        subscribeSubcollection<AttendanceDoc>(wsId, "attendance", setAttendance, {
          orderByField: "servedAt",
          maxRows: 300,
        }),
      );
      unsubs.push(
        subscribeSubcollection<WasteLogDoc>(wsId, "wasteLogs", setWasteLogs, {
          orderByField: "recordDate",
        }),
      );
      unsubs.push(
        subscribeSubcollection<FeedbackDoc>(wsId, "feedback", setFeedbackList, {
          orderByField: "serviceDate",
        }),
      );
      unsubs.push(subscribeSubcollection<ComplaintDoc>(wsId, "complaints", setComplaintsList));
      unsubs.push(
        subscribeSubcollection<KitchenTaskDoc>(wsId, "kitchenTasks", setKitchenTasks, {
          orderByField: "taskDate",
        }),
      );
      unsubs.push(
        subscribeSubcollection<ForecastDoc>(wsId, "forecasts", setForecasts, {
          orderByField: "forecastDate",
        }),
      );
      unsubs.push(
        subscribeSubcollection<ServiceActualDoc>(wsId, "serviceActuals", setServiceActuals, {
          orderByField: "serviceDate",
        }),
      );
      unsubs.push(
        subscribeSubcollection<LeaveRequestDoc>(wsId, "leaveRequests", setLeaves, {
          orderByField: "startDate",
        }),
      );

      if (role === "admin" || role === "accountant") {
        unsubs.push(
          subscribeSubcollection<InvoiceDoc>(wsId, "invoices", setInvoices, {
            orderByField: "monthKey",
          }),
        );
        unsubs.push(
          subscribeSubcollection<PaymentDoc>(wsId, "payments", setPayments, {
            orderByField: "paidAt",
          }),
        );
      } else {
        setInvoices([]);
        setPayments([]);
      }
    } else {
      // Student role: strictly query uid-owned documents matching firestore.rules
      setFsInventory([]);
      setStockMovements([]);
      setVendors([]);
      setPurchaseOrders([]);
      setAttendance([]);
      setWasteLogs([]);
      setKitchenTasks([]);
      setForecasts([]);
      setServiceActuals([]);

      unsubs.push(
        subscribeSubcollection<StudentRecordDoc>(wsId, "students", setStudents, {
          uidFilterField: "uid",
          uid,
        }),
      );
      unsubs.push(
        subscribeSubcollection<BookingDoc>(wsId, "bookings", setBookings, {
          uidFilterField: "userId",
          uid,
        }),
      );
      unsubs.push(
        subscribeSubcollection<InvoiceDoc>(wsId, "invoices", setInvoices, {
          uidFilterField: "studentUid",
          uid,
        }),
      );
      unsubs.push(
        subscribeSubcollection<PaymentDoc>(wsId, "payments", setPayments, {
          uidFilterField: "studentUid",
          uid,
        }),
      );
      unsubs.push(
        subscribeSubcollection<FeedbackDoc>(wsId, "feedback", setFeedbackList, {
          uidFilterField: "userId",
          uid,
        }),
      );
      unsubs.push(
        subscribeSubcollection<ComplaintDoc>(wsId, "complaints", setComplaintsList, {
          uidFilterField: "userId",
          uid,
        }),
      );
      unsubs.push(
        subscribeSubcollection<LeaveRequestDoc>(wsId, "leaveRequests", setLeaves, {
          uidFilterField: "userId",
          uid,
        }),
      );
    }

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [activeWorkspace?.id, dataMode, role, user?.emailVerified, user?.uid]);

  const currentName = useMemo(
    () =>
      activeMember?.name ||
      profile?.name ||
      user?.displayName ||
      user?.email?.split("@")[0] ||
      (demoAccess ? "Mess Director" : "FoodFlow User"),
    [activeMember?.name, demoAccess, profile?.name, user?.displayName, user?.email],
  );

  const actor: AuditActor | null = useMemo(() => {
    if (!user?.uid) return null;
    return {
      uid: user.uid,
      name: currentName,
      email: user.email || "",
      role: role || "member",
    };
  }, [currentName, role, user?.email, user?.uid]);

  const trackSave = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      setSavingStatus("saving");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      try {
        const res = await fn();
        setSavingStatus("saved");
        markWriteRecorded();
        savedTimerRef.current = setTimeout(() => setSavingStatus("idle"), 2600);
        return res;
      } catch (err) {
        setSavingStatus("idle");
        throw err;
      }
    },
    [markWriteRecorded],
  );

  // Convert Firestore InventoryItemDoc[] -> DemoInventoryItem[]
  const liveInventoryItems = useMemo<DemoInventoryItem[]>(
    () =>
      fsInventory.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        minimum_quantity: item.minimumQuantity,
        unit_cost: (item.unitCostPaise || 0) / 100,
        supplier_name: item.supplierName || "",
        expiry_date: item.expiryDate ?? null,
        ...(item.batchCode ? { batch_code: item.batchCode } : {}),
      })),
    [fsInventory],
  );

  // Normalize subcollections to FoodFlowRow[] expected by FoodFlowContent
  const normalizedRowsByCollection = useMemo(() => {
    const mealRows: FoodFlowRow[] = menus.map((m) => ({
      id: m.id,
      service_date: m.serviceDate,
      meal_type: m.mealType,
      title: m.title,
      dishes: m.dishes,
      expected_servings: m.expectedServings,
      plate_cost_rupees: m.plateCostPaise !== undefined ? m.plateCostPaise / 100 : undefined,
      allergens: m.allergens,
      cycle_week: m.cycleWeek,
      status: m.status,
    }));

    const eventRows: FoodFlowRow[] = calendarEvents.map((e) => ({
      id: e.id,
      event_date: e.eventDate,
      title: e.title,
      description: e.description,
      attendance_factor: e.attendanceFactor,
      rsvp_student_codes: e.rsvpStudentCodes ?? [],
      guest_token_quota: e.guestTokenQuota ?? 0,
    }));

    const recipeRows: FoodFlowRow[] = recipes.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      servings: r.servings,
      cost_per_serving: (r.costPerServingPaise || 0) / 100,
      ingredients: (r.ingredients || []).map((i) => `${i.name} ${i.quantity} ${i.unit}`.trim()),
      instructions: r.instructions,
    }));

    const taskRows: FoodFlowRow[] = kitchenTasks.map((tk) => ({
      id: tk.id,
      task_date: tk.taskDate,
      meal_type: tk.mealType,
      dish_name: tk.dishName,
      planned_quantity: tk.plannedQuantity,
      completed_quantity: tk.completedQuantity,
      assigned_to: tk.assignedTo,
      status: tk.status,
    }));

    const actualRows: FoodFlowRow[] = serviceActuals.map((a) => ({
      id: a.id,
      service_date: a.serviceDate,
      meal_type: a.mealType,
      dish_name: a.dishName,
      prepared_quantity: a.preparedQuantity,
      served_quantity: a.servedQuantity,
      leftover_quantity: a.leftoverQuantity,
      spoiled_quantity: a.spoiledQuantity,
      cost_per_serving: (a.costPerServingPaise || 0) / 100,
    }));

    const movementRows: FoodFlowRow[] = stockMovements.map((mv) => ({
      id: mv.id,
      item_name: mv.itemName,
      quantity_delta: mv.quantityDelta,
      unit: mv.unit,
      reason: mv.reason,
      moved_at: mv.movedAt,
    }));

    const orderRows: FoodFlowRow[] = purchaseOrders.map((po) => ({
      id: po.id,
      order_number: po.orderNumber,
      supplier_name: po.supplierName,
      item_summary: po.itemSummary,
      total_amount: (po.totalPaise || 0) / 100,
      status: po.status,
      expected_date: po.expectedDate,
    }));

    const vendorRows: FoodFlowRow[] = vendors.map((v) => ({
      id: v.id,
      name: v.name,
      category: v.category,
      contact_name: v.contactName,
      email: v.email,
      phone: v.phone,
      status: v.status,
    }));

    const attendanceRows: FoodFlowRow[] = attendance.map((a) => ({
      id: a.id,
      student_name: a.studentName,
      student_code: a.studentCode,
      hall: a.hallName,
      meal_type: a.mealType,
      service_date: a.serviceDate,
      method: a.method,
      served_at: a.servedAt,
    }));

    const studentRows: FoodFlowRow[] = students.map((s) => ({
      id: s.id,
      student_code: s.studentCode,
      full_name: s.name,
      hall: s.hallName,
      meal_plan: s.mealPlan,
      dietary_notes: s.dietaryNotes,
      status: s.status,
    }));

    const forecastRows: FoodFlowRow[] = forecasts.map((f) => ({
      id: f.id,
      forecast_date: f.forecastDate,
      meal_type: f.mealType,
      expected_students: f.expectedStudents,
      confidence: f.confidence,
      method: f.method,
    }));

    const wasteRows: FoodFlowRow[] = wasteLogs.map((w) => ({
      id: w.id,
      record_date: w.recordDate,
      meal_type: w.mealType,
      dish_name: w.dishName,
      prepared_quantity: w.preparedQuantity,
      served_quantity: w.servedQuantity,
      wasted_quantity: w.wastedQuantity,
      unit: w.unit,
      waste_cost: (w.wasteCostPaise || 0) / 100,
      waste_stage: w.wasteStage ?? "plate",
      reason: w.reason ?? "",
    }));

    const hallRows: FoodFlowRow[] = halls.map((h) => ({
      id: h.id,
      name: h.name,
      capacity: h.capacity,
    }));

    const notificationRows: FoodFlowRow[] = notifications.map((n) => ({
      id: n.id,
      title: n.title,
      description: n.detail,
      priority: n.priority,
      notice_type: n.noticeType ?? "alert",
      page: n.page,
    }));

    return {
      mealRows,
      eventRows,
      recipeRows,
      taskRows,
      actualRows,
      movementRows,
      orderRows,
      vendorRows,
      attendanceRows,
      studentRows,
      forecastRows,
      wasteRows,
      hallRows,
      notificationRows,
    };
  }, [
    attendance,
    calendarEvents,
    forecasts,
    halls,
    kitchenTasks,
    menus,
    notifications,
    purchaseOrders,
    recipes,
    serviceActuals,
    stockMovements,
    students,
    vendors,
    wasteLogs,
  ]);

  const rows = useMemo<FoodFlowRow[]>(() => {
    if (dataMode === "demo") return [];
    const c = normalizedRowsByCollection;
    switch (page) {
      case "meal-planning":
        return [...c.mealRows, ...c.eventRows];
      case "weekly-menu":
        return c.mealRows;
      case "calendar":
        return c.eventRows;
      case "recipes":
        return c.recipeRows;
      case "kitchen":
        return [...c.taskRows, ...c.actualRows];
      case "inventory":
      case "movements":
        return c.movementRows;
      case "purchasing":
        return [...c.orderRows, ...c.vendorRows];
      case "suppliers":
        return c.vendorRows;
      case "attendance":
        return c.attendanceRows;
      case "students":
        return c.studentRows;
      case "forecast":
        return c.forecastRows;
      case "waste":
        return c.wasteRows;
      case "analytics":
        return [...c.actualRows, ...c.wasteRows];
      case "actuals":
        return c.actualRows;
      case "halls":
        return c.hallRows;
      case "notifications":
        return c.notificationRows;
      case "reports":
      case "overview":
        return [
          ...c.mealRows,
          ...c.eventRows,
          ...c.recipeRows,
          ...c.taskRows,
          ...c.actualRows,
          ...c.orderRows,
          ...c.vendorRows,
          ...c.attendanceRows,
          ...c.studentRows,
          ...c.forecastRows,
          ...c.wasteRows,
          ...c.hallRows,
          ...c.notificationRows,
        ];
      default:
        return [];
    }
  }, [dataMode, normalizedRowsByCollection, page]);

  // Modal helpers
  const openAction = (kind: string, initial?: FoodFlowRow | null) => {
    if (
      !(kind in fieldsByAction) &&
      !["institution", "name", "invite", "report", "movement"].includes(kind)
    ) {
      return;
    }
    setCreatedInvite(null);
    setCopiedCode(false);
    const selectedAction = kind as ActionName;
    setInitialRecord(initial ?? null);
    setAction(selectedAction);
    const base = initialFormValues(selectedAction, initial ?? null);
    if (selectedAction === "name") {
      base["display_name"] = currentName;
    }
    if (selectedAction === "invite") {
      base["email"] = String(initial?.["email"] ?? "");
      base["role"] = String(initial?.["role"] ?? "kitchen_head");
    }
    setValues(base);
  };

  const closeAction = () => {
    setAction(null);
    setInitialRecord(null);
    setValues({});
    setCreatedInvite(null);
    setCopiedCode(false);
  };

  const setValue = (key: string, value: string) => setValues((cur) => ({ ...cur, [key]: value }));

  const saveAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!action) return;
    if (!user || !user.emailVerified) {
      toast.info("Sign in and verify your email to save live Firestore records.");
      return;
    }

    setBusy(true);
    try {
      if (action === "institution") {
        await trackSave(async () => {
          await createWorkspaceAtomic(user, {
            name: values["name"] ?? "Hostel Mess Workspace",
            institutionType: values["institutionType"] || "College Hostel",
            cityState: values["cityState"] || "India",
            language,
          });
        });
        await refreshWorkspaceContext();
        toast.success("Workspace created in Firestore. You are now Admin in Live Mode.");
        closeAction();
        return;
      }

      if (action === "name") {
        const nextName = (values["display_name"] ?? "").trim();
        if (!nextName) {
          toast.error("Please enter a display name.");
          return;
        }
        await trackSave(async () => {
          await updateUserProfilePreferences(user.uid, { name: nextName });
          if (activeWorkspace && actor) {
            await updateWorkspaceMemberAtomic(
              activeWorkspace.id,
              user.uid,
              activeWorkspace.name,
              actor,
              {
                name: nextName,
              },
            );
          }
        });
        await refreshWorkspaceContext();
        toast.success("Display name updated.");
        closeAction();
        return;
      }

      const wsId = activeWorkspace?.id;
      if (!wsId || !actor) {
        toast.error("Create or join a workspace before adding records.");
        return;
      }

      if (action === "invite") {
        if (role !== "admin") {
          toast.error("Only workspace Admins can send teammate invites.");
          return;
        }
        const invite = await trackSave(() =>
          createWorkspaceInviteAtomic(wsId, activeWorkspace.name, actor, {
            email: values["email"] ?? "",
            role: (values["role"] || "kitchen_head") as WorkspaceRole,
          }),
        );
        setCreatedInvite(invite);
        toast.success(`Invite generated: ${invite.code}`);
        return;
      }

      const existingId = typeof initialRecord?.["id"] === "string" ? initialRecord["id"] : null;

      if (action === "inventory") {
        const name = (values["name"] ?? "").trim();
        const expiryRaw = (values["expiry_date"] ?? "").trim();
        await trackSave(() =>
          createSubDoc(
            wsId,
            "inventoryItems",
            actor,
            {
              name,
              category: values["category"] || "General",
              quantity: Math.max(0, Number(values["quantity"] || 0)),
              unit: values["unit"] || "kg",
              minimumQuantity: Math.max(0, Number(values["minimum_quantity"] || 0)),
              unitCostPaise: Math.max(0, Math.round(Number(values["unit_cost"] || 0) * 100)),
              supplierName: (values["supplier_name"] ?? "").trim(),
              expiryDate: expiryRaw ? expiryRaw : null,
              batchCode: (values["batch_code"] ?? "").trim(),
            },
            { auditSummary: `Added ingredient "${name}" to store inventory.` },
          ),
        );
        toast.success("Ingredient added to Firestore inventory.");
      } else if (action === "meal") {
        const dishes = (values["dishes"] ?? "")
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean);
        const allergens = (values["allergens"] ?? "")
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean);
        const plateCostRaw = Number(values["plate_cost_rupees"] || 0);
        const payload = {
          serviceDate: values["service_date"] || dateKey(new Date()),
          mealType: (values["meal_type"] || "Lunch") as MenuPlanDoc["mealType"],
          title: (values["title"] ?? "").trim(),
          dishes,
          expectedServings: Math.max(0, Math.round(Number(values["expected_servings"] || 0))),
          ...(plateCostRaw > 0 ? { plateCostPaise: Math.round(plateCostRaw * 100) } : {}),
          ...(allergens.length > 0 ? { allergens } : {}),
          status: "Published" as const,
        };
        await trackSave(async () => {
          if (existingId) {
            await updateSubDoc(
              wsId,
              "menus",
              existingId,
              actor,
              payload,
              `Updated meal "${payload.title}"`,
            );
          } else {
            await createSubDoc(wsId, "menus", actor, payload, {
              auditSummary: `Scheduled ${payload.mealType} "${payload.title}" for ${payload.serviceDate}.`,
            });
          }
        });
        toast.success(existingId ? "Meal updated." : "Meal added to menu.");
      } else if (action === "recipe") {
        const payload = {
          name: (values["name"] ?? "").trim(),
          category: values["category"] || "Main course",
          servings: Math.max(1, Math.round(Number(values["servings"] || 100))),
          costPerServingPaise: Math.max(
            0,
            Math.round(Number(values["cost_per_serving"] || 0) * 100),
          ),
          ingredients: parseIngredientsList(values["ingredients"] ?? ""),
          instructions: (values["instructions"] ?? "").trim(),
        };
        await trackSave(() =>
          createSubDoc(wsId, "recipes", actor, payload, {
            auditSummary: `Added recipe "${payload.name}" (${payload.servings} servings).`,
          }),
        );
        toast.success("Recipe saved.");
      } else if (action === "task") {
        const payload = {
          taskDate: values["task_date"] || dateKey(new Date()),
          mealType: values["meal_type"] || "Lunch",
          dishName: (values["dish_name"] ?? "").trim(),
          plannedQuantity: Math.max(0, Math.round(Number(values["planned_quantity"] || 0))),
          completedQuantity: 0,
          assignedTo: (values["assigned_to"] ?? "").trim() || "Kitchen Team",
          status: "Not started" as const,
        };
        await trackSave(async () => {
          if (existingId) {
            await updateSubDoc(
              wsId,
              "kitchenTasks",
              existingId,
              actor,
              payload,
              `Updated task "${payload.dishName}"`,
            );
          } else {
            await createSubDoc(wsId, "kitchenTasks", actor, payload, {
              auditSummary: `Created kitchen task "${payload.dishName}".`,
            });
          }
        });
        toast.success("Kitchen task saved.");
      } else if (action === "student") {
        const code = (values["student_code"] ?? "").trim().toUpperCase();
        const name = (values["full_name"] ?? "").trim();
        await trackSave(() =>
          createSubDoc(
            wsId,
            "students",
            actor,
            {
              studentCode: code,
              name,
              email: (values["email"] ?? "").trim().toLowerCase(),
              hallId: halls[0]?.id ?? "main",
              hallName: (values["hall"] ?? "").trim() || halls[0]?.name || "Main Dining Hall",
              mealPlan: values["meal_plan"] || "Standard",
              dietaryNotes: (values["dietary_notes"] ?? "").trim(),
              status: "Active" as const,
            },
            { auditSummary: `Added student ${name} (${code}).` },
          ),
        );
        toast.success("Student added.");
      } else if (action === "order") {
        const poNum = `PO-${Date.now().toString().slice(-5)}`;
        const payload = {
          orderNumber: poNum,
          supplierName: (values["supplier_name"] ?? "").trim(),
          itemSummary: (values["item_summary"] ?? "").trim(),
          totalPaise: Math.max(0, Math.round(Number(values["total_amount"] || 0) * 100)),
          status: "Pending" as const,
          expectedDate: values["expected_date"] || shiftDateKey(2),
        };
        await trackSave(() =>
          createSubDoc(wsId, "purchaseOrders", actor, payload, {
            auditSummary: `Created ${poNum} for ${payload.supplierName}.`,
          }),
        );
        toast.success(`Purchase order ${poNum} created.`);
      } else if (action === "waste") {
        const stage = values["waste_stage"] === "prep" ? "prep" : "plate";
        const payload = {
          recordDate: values["record_date"] || dateKey(new Date()),
          mealType: values["meal_type"] || "Lunch",
          dishName: (values["dish_name"] ?? "").trim(),
          preparedQuantity: Math.max(0, Number(values["prepared_quantity"] || 0)),
          servedQuantity: Math.max(0, Number(values["served_quantity"] || 0)),
          wastedQuantity: Math.max(0, Number(values["wasted_quantity"] || 0)),
          unit: values["unit"] || "kg",
          wasteCostPaise: Math.max(0, Math.round(Number(values["waste_cost"] || 0) * 100)),
          wasteStage: stage as "prep" | "plate",
          reason: (values["reason"] ?? "").trim(),
        };
        await trackSave(() =>
          createSubDoc(wsId, "wasteLogs", actor, payload, {
            auditSummary: `Logged ${payload.wastedQuantity} ${payload.unit} (${stage}) waste on ${payload.dishName}.`,
          }),
        );
        toast.success("Waste log saved.");
      } else if (action === "forecast") {
        const payload = {
          forecastDate: values["forecast_date"] || shiftDateKey(1),
          mealType: values["meal_type"] || "Lunch",
          expectedStudents: Math.max(0, Math.round(Number(values["expected_students"] || 0))),
          confidence: Math.max(0, Math.min(100, Math.round(Number(values["confidence"] || 80)))),
          method: "Manual override",
        };
        await trackSave(() =>
          createSubDoc(wsId, "forecasts", actor, payload, {
            auditSummary: `Saved forecast ${payload.expectedStudents} plates (${payload.mealType} on ${payload.forecastDate}).`,
          }),
        );
        toast.success("Demand estimate saved.");
      } else if (action === "event") {
        const payload = {
          eventDate: values["event_date"] || dateKey(new Date()),
          title: (values["title"] ?? "").trim(),
          description: (values["description"] ?? "").trim(),
          attendanceFactor: Math.max(0, Number(values["attendance_factor"] || 1)),
        };
        await trackSave(() =>
          createSubDoc(wsId, "calendarEvents", actor, payload, {
            auditSummary: `Added campus event "${payload.title}" (${payload.attendanceFactor}x).`,
          }),
        );
        toast.success("Campus event added.");
      } else if (action === "supplier") {
        const payload = {
          name: (values["name"] ?? "").trim(),
          category: values["category"] || "General",
          contactName: (values["contact_name"] ?? "").trim(),
          email: (values["email"] ?? "").trim(),
          phone: (values["phone"] ?? "").trim(),
          gstin: (values["gstin"] ?? "").trim(),
          status: "Active" as const,
        };
        await trackSave(() =>
          createSubDoc(wsId, "vendors", actor, payload, {
            auditSummary: `Added vendor "${payload.name}".`,
          }),
        );
        toast.success("Vendor added.");
      } else if (action === "actual") {
        const payload = {
          serviceDate: values["service_date"] || dateKey(new Date()),
          mealType: values["meal_type"] || "Lunch",
          dishName: (values["dish_name"] ?? "").trim(),
          preparedQuantity: Math.max(0, Number(values["prepared_quantity"] || 0)),
          servedQuantity: Math.max(0, Number(values["served_quantity"] || 0)),
          leftoverQuantity: Math.max(0, Number(values["leftover_quantity"] || 0)),
          spoiledQuantity: Math.max(0, Number(values["spoiled_quantity"] || 0)),
          costPerServingPaise: Math.max(
            0,
            Math.round(Number(values["cost_per_serving"] || 0) * 100),
          ),
        };
        await trackSave(() =>
          createSubDoc(wsId, "serviceActuals", actor, payload, {
            auditSummary: `Recorded actuals for ${payload.dishName} (${payload.servedQuantity} served).`,
          }),
        );
        toast.success("Service actuals recorded.");
      } else if (action === "attendance") {
        const today = dateKey(new Date());
        const payload = {
          studentName: (values["student_name"] ?? "").trim(),
          studentCode: (values["student_code"] ?? "").trim().toUpperCase(),
          hallName: (values["hall"] ?? "").trim() || halls[0]?.name || "Main Dining Hall",
          mealType: values["meal_type"] || "Lunch",
          serviceDate: today,
          method: (values["method"] || "qr") as AttendanceDoc["method"],
          servedAt: new Date().toISOString(),
        };
        await trackSave(() =>
          createSubDoc(wsId, "attendance", actor, payload, {
            auditSummary: `Recorded ${payload.mealType} attendance for ${payload.studentCode}.`,
          }),
        );
        toast.success("Attendance check-in recorded.");
      } else if (action === "hall") {
        const payload = {
          name: (values["name"] ?? "").trim(),
          capacity: Math.max(1, Math.round(Number(values["capacity"] || 200))),
          active: true,
        };
        await trackSave(() =>
          createSubDoc(wsId, "halls", actor, payload, {
            auditSummary: `Added dining hall "${payload.name}" (${payload.capacity} seats).`,
          }),
        );
        toast.success("Dining hall added.");
      }

      closeAction();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this record.");
    } finally {
      setBusy(false);
    }
  };

  // Dashboard callbacks
  const handleAdjustStock = async (item: DemoInventoryItem, delta: number, reason: string) => {
    const wsId = activeWorkspace?.id;
    const raw = fsInventory.find((f) => f.id === item.id);
    if (dataMode === "demo" || !wsId || !actor || !raw) return;
    try {
      await trackSave(() => adjustInventoryAtomic(wsId, raw, delta, reason, actor));
      toast.success("Stock updated in Firestore.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not adjust stock.");
    }
  };

  const handleDeleteStock = (item: DemoInventoryItem) => {
    const wsId = activeWorkspace?.id;
    if (dataMode === "demo" || !wsId || !actor) return;
    if (!window.confirm(`Remove ${item.name} from inventory?`)) return;
    void trackSave(() =>
      deleteSubDoc(wsId, "inventoryItems", item.id, actor, `Removed ingredient "${item.name}".`),
    )
      .then(() => toast.success("Ingredient deleted."))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Could not delete ingredient."),
      );
  };

  const handleUpdateTask = async (
    row: FoodFlowRow,
    fields: Record<string, string | number | string[]>,
  ) => {
    const wsId = activeWorkspace?.id;
    const id = typeof row["id"] === "string" ? row["id"] : null;
    if (dataMode === "demo" || !wsId || !actor || !id) return;
    try {
      const updates: Record<string, unknown> = {};
      if (fields["status"] !== undefined) updates["status"] = fields["status"];
      if (fields["completed_quantity"] !== undefined)
        updates["completedQuantity"] = fields["completed_quantity"];
      await trackSave(() =>
        updateSubDoc(wsId, "kitchenTasks", id, actor, updates, `Updated task ${id}.`),
      );
      toast.success("Kitchen task updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update task.");
    }
  };

  const handleUpdateOrder = async (row: FoodFlowRow) => {
    const wsId = activeWorkspace?.id;
    const id = typeof row["id"] === "string" ? row["id"] : null;
    if (dataMode === "demo" || !wsId || !actor || !id) return;
    const next = nextOrderStatus(String(row["status"] ?? "Pending"));
    try {
      await trackSave(() =>
        updateSubDoc(
          wsId,
          "purchaseOrders",
          id,
          actor,
          { status: next },
          `Updated PO ${row["order_number"]} to ${next}.`,
        ),
      );
      toast.success(`Purchase order marked ${next}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update purchase order.");
    }
  };

  const handleAutoPoLowStock = async () => {
    const wsId = activeWorkspace?.id;
    if (dataMode === "demo" || !wsId || !actor) return;
    const lowItems = fsInventory.filter((i) => i.quantity <= i.minimumQuantity);
    if (lowItems.length === 0) {
      toast.info("All ingredients are above their minimum levels.");
      return;
    }
    try {
      const poNumber = `PO-AUTO-${Date.now().toString().slice(-4)}`;
      const summary = lowItems
        .slice(0, 8)
        .map(
          (i) =>
            `${i.name} (+${Math.max(5, Math.ceil(i.minimumQuantity * 1.5 - i.quantity))} ${i.unit})`,
        )
        .join(", ");
      const totalPaise = lowItems.reduce(
        (sum, i) =>
          sum +
          Math.max(5, Math.ceil(i.minimumQuantity * 1.5 - i.quantity)) * (i.unitCostPaise || 0),
        0,
      );
      await trackSave(() =>
        createSubDoc(
          wsId,
          "purchaseOrders",
          actor,
          {
            orderNumber: poNumber,
            supplierName: lowItems[0]?.supplierName || "Primary Mess Supplier",
            itemSummary: summary,
            totalPaise,
            status: "Pending",
            expectedDate: shiftDateKey(1),
          },
          {
            auditSummary: `Generated Auto-PO ${poNumber} for ${lowItems.length} low-stock item(s).`,
          },
        ),
      );
      toast.success(`Created draft ${poNumber} for ${lowItems.length} low-stock item(s).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not raise Auto-PO.");
    }
  };

  const handleBulkCopyTodayMenu = async () => {
    const wsId = activeWorkspace?.id;
    if (dataMode === "demo" || !wsId || !actor) return;
    const today = shiftDateKey(0);
    const tomorrow = shiftDateKey(1);
    const todayMeals = menus.filter((m) => m.serviceDate === today);
    if (todayMeals.length === 0) {
      toast.info("No meals planned for today yet. Add a meal first.");
      return;
    }
    try {
      await trackSave(async () => {
        for (const m of todayMeals) {
          await createSubDoc(wsId, "menus", actor, {
            serviceDate: tomorrow,
            mealType: m.mealType,
            title: m.title,
            dishes: m.dishes,
            expectedServings: m.expectedServings,
            status: "Published",
          });
        }
        await writeAuditLog(wsId, actor, {
          action: "CREATE",
          targetCollection: "menus",
          targetId: tomorrow,
          summary: `Copied ${todayMeals.length} meal plan(s) from ${today} to ${tomorrow}.`,
        });
      });
      toast.success(`Copied ${todayMeals.length} meal(s) to tomorrow (${tomorrow}).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not copy today's menu.");
    }
  };

  const handleSaveForecastEstimate: DashboardProps["onSaveForecastEstimate"] = async (params) => {
    const wsId = activeWorkspace?.id;
    if (dataMode === "demo" || !wsId || !actor) return;
    try {
      await trackSave(() =>
        createSubDoc(
          wsId,
          "forecasts",
          actor,
          {
            forecastDate: params.forecastDate,
            mealType: params.mealType,
            expectedStudents: Math.max(0, Math.round(params.expectedStudents)),
            confidence: Math.max(0, Math.min(100, Math.round(params.confidence))),
            method: params.method,
            weatherNote: params.weatherNote,
          },
          {
            auditSummary: `Saved ${params.method} forecast: ${params.expectedStudents} plates (${params.mealType} on ${params.forecastDate}).`,
          },
        ),
      );
      toast.success("Forecast saved to Firestore.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save forecast.");
    }
  };

  const handleGenerateBills = async (monthKey: string) => {
    if (dataMode === "demo" || !activeWorkspace || !actor) return;
    if (students.length === 0) {
      toast.info("Add students first before generating monthly bills.");
      return;
    }
    try {
      const count = await trackSave(() =>
        generateMonthlyInvoicesAtomic(activeWorkspace, students, leaves, bookings, monthKey, actor),
      );
      toast.success(`Generated ${count} monthly invoice(s) for ${monthKey}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate bills.");
    }
  };

  const handleRecordPayment: DashboardProps["onRecordPayment"] = async (
    invoice,
    amountRupees,
    method,
    referenceNo,
  ) => {
    const wsId = activeWorkspace?.id;
    if (dataMode === "demo" || !wsId || !actor) return;
    try {
      await trackSave(() =>
        recordPaymentAtomic(wsId, invoice, amountRupees, method, referenceNo, actor),
      );
      toast.success(`Recorded ₹${amountRupees.toFixed(0)} payment.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record payment.");
    }
  };

  const handleUpdateLeaveStatus: DashboardProps["onUpdateLeaveStatus"] = async (leave, status) => {
    const wsId = activeWorkspace?.id;
    if (dataMode === "demo" || !wsId || !actor) return;
    try {
      const rebatePaise =
        status === "approved"
          ? Math.round(leave.days * (activeWorkspace.perDayRebatePaise || 8500))
          : 0;
      await trackSave(() =>
        updateSubDoc(
          wsId,
          "leaveRequests",
          leave.id,
          actor,
          { status, rebatePaise },
          `${status === "approved" ? "Approved" : "Rejected"} leave for ${leave.studentName} (${leave.days}d).`,
        ),
      );
      toast.success(`Leave ${status}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update leave status.");
    }
  };

  const handleSubmitFeedback: DashboardProps["onSubmitFeedback"] = async (params) => {
    const wsId = activeWorkspace?.id;
    if (dataMode === "demo" || !wsId || !actor) return;
    try {
      const mod = moderateFeedbackContent(params.comment);
      await trackSave(() =>
        createSubDoc(
          wsId,
          "feedback",
          actor,
          {
            userId: actor.uid,
            studentName: params.isAnonymous ? "Anonymous Student" : actor.name,
            mealType: params.mealType,
            serviceDate: dateKey(new Date()),
            rating: params.rating,
            category: params.category,
            ...(params.tags?.length ? { tags: params.tags } : {}),
            ...(params.dishRatings?.length ? { dishRatings: params.dishRatings } : {}),
            isAnonymous: Boolean(params.isAnonymous),
            moderationStatus: mod.moderationStatus,
            comment: params.comment,
            status: "open",
          },
          {
            auditSummary: `Submitted ${params.rating}-star ${params.category} feedback for ${params.mealType} (${mod.moderationStatus}).`,
          },
        ),
      );
      toast.success(
        mod.moderationStatus === "flagged"
          ? "Feedback saved to moderation queue for committee review."
          : "Feedback submitted.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit feedback.");
    }
  };

  const handleUpdateFeedbackStatus: DashboardProps["onUpdateFeedbackStatus"] = async (
    fb,
    status,
  ) => {
    const wsId = activeWorkspace?.id;
    if (dataMode === "demo" || !wsId || !actor) return;
    try {
      await trackSave(() =>
        updateSubDoc(
          wsId,
          "feedback",
          fb.id,
          actor,
          { status },
          `Marked feedback ${fb.id} as ${status}.`,
        ),
      );
      toast.success(`Feedback marked ${status}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update feedback.");
    }
  };

  const handleModerateFeedback: DashboardProps["onModerateFeedback"] = async (
    fb,
    moderationStatus,
  ) => {
    const wsId = activeWorkspace?.id;
    if (dataMode === "demo" || !wsId || !actor) return;
    try {
      await trackSave(() =>
        updateSubDoc(
          wsId,
          "feedback",
          fb.id,
          actor,
          { moderationStatus },
          `Moderated feedback ${fb.id} -> ${moderationStatus}.`,
        ),
      );
      toast.success(`Feedback ${moderationStatus}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not moderate feedback.");
    }
  };

  const handleSubmitComplaint: DashboardProps["onSubmitComplaint"] = async (params) => {
    const wsId = activeWorkspace?.id;
    if (dataMode === "demo" || !wsId || !actor) return;
    try {
      const esc = normalizeComplaintPriorityAndEscalation(params.category, params.priority);
      const slaDeadlineAt = computeComplaintSlaDeadline(new Date().toISOString(), esc.priority);
      await trackSave(async () => {
        await createSubDoc(
          wsId,
          "complaints",
          actor,
          {
            userId: actor.uid,
            studentName: actor.name,
            category: params.category,
            subject: params.subject,
            description: params.description,
            priority: esc.priority,
            status: "open",
            ...(params.photoDataUrl ? { photoDataUrl: params.photoDataUrl } : {}),
            ...(esc.escalatedToRoles.length ? { escalatedToRoles: esc.escalatedToRoles } : {}),
            slaDeadlineAt,
          },
          {
            auditSummary: `Opened ${esc.priority} complaint: "${params.subject}"${esc.autoEscalated ? " (auto-escalated to Admin & Warden)" : ""}.`,
          },
        );
        if (esc.autoEscalated) {
          await createSubDoc(wsId, "notifications", actor, {
            title: `Hygiene Alert Escalated: ${params.subject}`,
            detail: `Auto-escalated to Admin & Warden (4h SLA). Category: ${params.category}.`,
            priority: "High",
            noticeType: "alert",
            page: "feedback",
            readBy: [],
          });
        }
      });
      toast.success(
        esc.autoEscalated
          ? "Hygiene ticket auto-escalated to Admin & Warden (4h SLA)."
          : "Complaint logged.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not file complaint.");
    }
  };

  const handleResolveComplaint: DashboardProps["onResolveComplaint"] = async (
    c,
    status,
    note,
    assignedTo,
  ) => {
    const wsId = activeWorkspace?.id;
    if (dataMode === "demo" || !wsId || !actor) return;
    try {
      await trackSave(() =>
        updateSubDoc(
          wsId,
          "complaints",
          c.id,
          actor,
          {
            status,
            resolutionNote: note,
            ...(assignedTo ? { assignedTo } : {}),
          },
          `Updated complaint "${c.subject}" -> ${status}.`,
        ),
      );
      toast.success(`Complaint ${status.replace("_", " ")}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update complaint.");
    }
  };

  const handleUpdateMemberRole: DashboardProps["onUpdateMemberRole"] = async (member, nextRole) => {
    if (dataMode === "demo" || !activeWorkspace || !actor) return;
    try {
      await trackSave(() =>
        updateWorkspaceMemberAtomic(activeWorkspace.id, member.uid, activeWorkspace.name, actor, {
          role: nextRole,
        }),
      );
      toast.success(`Updated ${member.name}'s role to ${nextRole}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update member role.");
    }
  };

  const handleToggleMemberStatus: DashboardProps["onToggleMemberStatus"] = async (member) => {
    if (dataMode === "demo" || !activeWorkspace || !actor) return;
    if (member.uid === user?.uid) {
      toast.info("You cannot suspend your own Admin access.");
      return;
    }
    const nextStatus = member.status === "suspended" ? "active" : "suspended";
    try {
      await trackSave(() =>
        updateWorkspaceMemberAtomic(activeWorkspace.id, member.uid, activeWorkspace.name, actor, {
          status: nextStatus,
        }),
      );
      toast.success(`${member.name} is now ${nextStatus}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update member status.");
    }
  };

  const handleRemoveMember: DashboardProps["onRemoveMember"] = async (member) => {
    if (dataMode === "demo" || !activeWorkspace || !actor) return;
    if (member.uid === user?.uid) {
      toast.info("You cannot remove yourself.");
      return;
    }
    if (!window.confirm(`Remove ${member.name} from ${activeWorkspace.name}?`)) return;
    try {
      await trackSave(() => removeWorkspaceMemberAtomic(activeWorkspace.id, member.uid, actor));
      toast.success(`Removed ${member.name}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove member.");
    }
  };

  const handleRevokeInvite: DashboardProps["onRevokeInvite"] = async (invite) => {
    if (dataMode === "demo" || !activeWorkspace || !actor) return;
    try {
      await trackSave(() => revokeWorkspaceInvite(activeWorkspace.id, invite, actor));
      toast.success(`Revoked invite ${invite.code}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not revoke invite.");
    }
  };

  const handleSyncOfflineScans = async (pendingCount: number) => {
    const wsId = activeWorkspace?.id;
    if (dataMode === "demo" || !wsId || !actor || pendingCount <= 0) return false;
    try {
      const today = dateKey(new Date());
      await trackSave(() =>
        createSubDoc(
          wsId,
          "attendance",
          actor,
          {
            studentName: `Offline Kiosk Batch (${pendingCount} scans)`,
            studentCode: `BATCH-${Date.now().toString().slice(-4)}`,
            hallName: halls[0]?.name || "Main Dining Hall",
            mealType: "Lunch",
            serviceDate: today,
            method: "qr",
            servedAt: new Date().toISOString(),
          },
          { auditSummary: `Synced ${pendingCount} offline QR attendance scan(s) to Firestore.` },
        ),
      );
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sync offline QR scans.");
      return false;
    }
  };

  const handleDismissSetupChecklist = async () => {
    if (dataMode === "demo" || !activeWorkspace || !actor) return;
    try {
      await trackSave(() =>
        updateWorkspaceSettings(activeWorkspace.id, actor, { setupChecklistDismissed: true }),
      );
      await refreshWorkspaceContext();
      toast.success("Setup checklist dismissed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not dismiss checklist.");
    }
  };

  const handleUpdateMessPolicySettings = async (minRebateDays: number) => {
    if (dataMode === "demo" || !activeWorkspace || !actor) return;
    try {
      await trackSave(() => updateWorkspaceSettings(activeWorkspace.id, actor, { minRebateDays }));
      await refreshWorkspaceContext();
      toast.success(`Saved leave rebate minimum: ${minRebateDays} consecutive day(s).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update policy.");
    }
  };

  const handleApplyCycleMenuWeek = async (week: "A" | "B") => {
    const wsId = activeWorkspace?.id;
    if (dataMode === "demo" || !wsId || !actor) return;
    const entries = CYCLE_MENU_PRESETS[week];
    try {
      await trackSave(async () => {
        for (const entry of entries) {
          await createSubDoc(wsId, "menus", actor, {
            serviceDate: shiftDateKey(entry.dayOffset),
            mealType: entry.mealType,
            title: entry.title,
            dishes: entry.dishes,
            expectedServings: entry.expectedServings,
            plateCostPaise: entry.plateCostPaise,
            allergens: entry.allergens,
            cycleWeek: week,
            status: "Published",
          });
        }
        await updateWorkspaceSettings(wsId, actor, { cycleMenuWeek: week });
      });
      await refreshWorkspaceContext();
      toast.success(`Applied Cycle Week ${week} (${entries.length} meals published).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not apply cycle menu.");
    }
  };

  const handleDeductRecipeStock: DashboardProps["onDeductRecipeStock"] = async (recipeRow) => {
    const wsId = activeWorkspace?.id;
    if (dataMode === "demo" || !wsId || !actor) return;
    const recipeName = String(recipeRow["name"] ?? "Recipe");
    const rawIngredients = Array.isArray(recipeRow["ingredients"]) ? recipeRow["ingredients"] : [];
    const deductions: { item: InventoryItemDoc; deductQty: number }[] = [];

    for (const entry of rawIngredients) {
      let ingName = "";
      let ingQty = 1;
      if (typeof entry === "object" && entry !== null) {
        const obj = entry as { name?: string; quantity?: number };
        ingName = String(obj.name ?? "");
        ingQty = Number(obj.quantity ?? 1);
      } else {
        const parsed = parseIngredientsList(String(entry))[0];
        if (parsed) {
          ingName = parsed.name;
          ingQty = parsed.quantity;
        }
      }
      if (!ingName) continue;
      const needle = ingName.trim().toLowerCase();
      const match = fsInventory.find(
        (inv) => inv.name.toLowerCase().includes(needle) || needle.includes(inv.name.toLowerCase()),
      );
      if (match && match.quantity > 0) {
        deductions.push({ item: match, deductQty: Math.min(match.quantity, ingQty) });
      }
    }

    if (deductions.length === 0) {
      toast.info("No matching stock ingredients found in inventory to deduct.");
      return;
    }

    try {
      const count = await trackSave(() =>
        deductRecipeInventoryAtomic(wsId, deductions, `Prep issue: ${recipeName}`, actor),
      );
      toast.success(`Deducted ${count} ingredient(s) from inventory for ${recipeName}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not deduct recipe stock.");
    }
  };

  const handleVerifyAndRecordQrScan: DashboardProps["onVerifyAndRecordQrScan"] = async ({
    rawCodeOrRoll,
    mealType,
  }) => {
    const clean = rawCodeOrRoll.trim().toUpperCase();
    if (!clean) {
      return { ok: false, message: "Enter a student roll code or rotating QR pass token." };
    }
    const hallCode = activeWorkspace?.id?.slice(0, 6).toUpperCase() || "HALL";
    const nowMs = Date.now();
    const matchedStudent = students.find((stu) => {
      if (stu.studentCode.toUpperCase() === clean) return true;
      const curTok = generateDynamicDiningPassToken(stu.studentCode, hallCode, nowMs).token;
      const prevTok = generateDynamicDiningPassToken(
        stu.studentCode,
        hallCode,
        nowMs - 60_000,
      ).token;
      return clean === curTok || clean === prevTok;
    });

    const studentCode = matchedStudent?.studentCode ?? clean.split("-")[1] ?? clean;
    const studentName = matchedStudent?.name ?? `Pass Holder (${studentCode})`;
    const hallName = matchedStudent?.hallName || halls[0]?.name || "Main Dining Hall";
    const today = dateKey(new Date());

    if (dataMode === "demo" || !activeWorkspace?.id || !actor) {
      return { ok: true, message: `Verified sample pass for ${studentName} (${mealType}).` };
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await queueAttendance({
        clientUuid: crypto.randomUUID(),
        studentId: studentCode,
        studentCode,
        studentName,
        hallId: hallName,
        serviceDate: today,
        mealType: (["breakfast", "lunch", "snacks", "dinner"].includes(mealType.toLowerCase())
          ? mealType.toLowerCase()
          : "lunch") as "breakfast" | "lunch" | "snacks" | "dinner",
        method: "qr",
        clientTimestamp: new Date().toISOString(),
        status: "pending",
        queuedAt: new Date().toISOString(),
      });
      return {
        ok: true,
        message: `Offline: queued ${studentName} (${studentCode}) for auto-sync.`,
      };
    }

    try {
      await trackSave(() =>
        createSubDoc(
          activeWorkspace.id,
          "attendance",
          actor,
          {
            studentCode,
            studentName,
            hallName,
            mealType,
            serviceDate: today,
            method: "qr",
            servedAt: new Date().toISOString(),
          },
          { auditSummary: `Verified QR check-in for ${studentCode} (${mealType}).` },
        ),
      );
      return {
        ok: true,
        message: `Verified & checked in ${studentName} (${studentCode}) for ${mealType}.`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not verify QR scan.";
      toast.error(msg);
      return { ok: false, message: msg };
    }
  };

  const handleCreateBroadcastNotice: DashboardProps["onCreateBroadcastNotice"] = async ({
    title,
    detail,
  }) => {
    const wsId = activeWorkspace?.id;
    if (dataMode === "demo" || !wsId || !actor) return;
    try {
      await trackSave(() =>
        createSubDoc(
          wsId,
          "notifications",
          actor,
          {
            title: title.trim(),
            detail: detail.trim(),
            priority: "High",
            noticeType: "broadcast",
            page: "notifications",
            readBy: [],
          },
          { auditSummary: `Broadcasted notice "${title.trim()}" to all members.` },
        ),
      );
      toast.success("Emergency broadcast posted to all students and staff.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post broadcast.");
    }
  };

  const handleToggleEventRsvp: DashboardProps["onToggleEventRsvp"] = async (
    eventId,
    studentCode,
  ) => {
    const wsId = activeWorkspace?.id;
    if (dataMode === "demo" || !wsId || !actor) return;
    const ev = calendarEvents.find((e) => e.id === eventId);
    if (!ev) return;
    const existing = ev.rsvpStudentCodes ?? [];
    const next = existing.includes(studentCode)
      ? existing.filter((c) => c !== studentCode)
      : [...existing, studentCode];
    try {
      await trackSave(() =>
        updateSubDoc(
          wsId,
          "calendarEvents",
          eventId,
          actor,
          { rsvpStudentCodes: next },
          `Updated RSVP for "${ev.title}" (${next.length} attending).`,
        ),
      );
      toast.success(existing.includes(studentCode) ? "RSVP removed." : "RSVP confirmed!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update RSVP.");
    }
  };

  const handleSignOut = async () => {
    await signOutFirebase();
    setDemoAccess(false);
    setDataMode("demo");
    try {
      window.sessionStorage.removeItem("foodflow-demo-access");
    } catch {
      // ignore
    }
    void navigate({ to: "/login" });
  };

  const handleToggleDemo = () => {
    if (!user || !user.emailVerified) {
      setDemoAccess(true);
      setDataMode("demo");
      try {
        window.sessionStorage.setItem("foodflow-demo-access", "1");
      } catch {
        // ignore
      }
      return;
    }
    setDataMode((cur) => {
      const next = cur === "demo" ? "live" : "demo";
      toast.info(
        next === "live"
          ? "Switched to Live Firestore records."
          : "Switched to read-only sample preview.",
      );
      return next;
    });
  };

  const visibleInventory = dataMode === "demo" ? sampleInventory : liveInventoryItems;
  const messSummary = useMemo(() => {
    if (dataMode === "demo") {
      const today = shiftDateKey(0);
      const demoSummaryRows: FoodFlowRow[] = [
        ...sampleMeals.map((m, idx) => ({
          id: `demo-m-${idx}`,
          service_date: today,
          meal_type: m.meal,
          title: m.dish,
          expected_servings: m.portions,
        })),
        ...sampleRecipes.map((r, idx) => ({
          id: `demo-r-${idx}`,
          name: r.name,
          category: r.category,
          servings: r.servings,
          cost_per_serving: r.cost,
        })),
        ...sampleStudents.map((s, idx) => ({
          id: `demo-s-${idx}`,
          student_code: s.code,
          status: s.status,
        })),
        {
          id: "dw-1",
          dish_name: "Seasonal sabzi",
          prepared_quantity: 110,
          served_quantity: 102,
          wasted_quantity: 8,
          waste_cost: 720,
          reason: "Evening turnout lower",
        },
        {
          id: "dw-2",
          dish_name: "Dal tadka",
          prepared_quantity: 95,
          served_quantity: 89,
          wasted_quantity: 6,
          waste_cost: 462,
          reason: "Batch buffer excess",
        },
      ];
      return buildSanitizedMessSummary({
        lang: language,
        inventoryItems: sampleInventory,
        rows: demoSummaryRows,
        invoices: [
          {
            id: "demo-inv-1",
            workspaceId: "demo",
            studentCode: "ST-1042",
            studentName: "Sample Resident",
            monthKey: today.slice(0, 7),
            baseProratedPaise: 420000,
            leaveRebatePaise: 24000,
            guestChargesPaise: 12000,
            gstPaise: 20400,
            totalPayablePaise: 428400,
            paidPaise: 280000,
            status: "partial",
            createdBy: "demo",
          },
        ],
        payments: [
          {
            id: "demo-pay-1",
            workspaceId: "demo",
            invoiceId: "demo-inv-1",
            studentName: "Sample Resident",
            amountPaise: 280000,
            method: "upi",
            referenceNo: "DEMO-UPI",
            paidAt: today,
            createdBy: "demo",
          },
        ],
        feedbackList: [
          {
            id: "demo-fb-1",
            workspaceId: "demo",
            userId: "demo",
            studentName: "Sample Resident",
            mealType: "Lunch",
            serviceDate: today,
            rating: 4,
            category: "taste",
            comment: "Fresh chapati and dal",
            status: "resolved",
            createdBy: "demo",
          },
          {
            id: "demo-fb-2",
            workspaceId: "demo",
            userId: "demo",
            studentName: "Sample Resident",
            mealType: "Dinner",
            serviceDate: today,
            rating: 3,
            category: "portion",
            comment: "Paneer portion slightly small",
            status: "open",
            createdBy: "demo",
          },
        ],
      });
    }
    const summary = buildSanitizedMessSummary({
      lang: language,
      inventoryItems: visibleInventory,
      rows,
      invoices,
      payments,
      feedbackList,
    });
    summary.ratings.openComplaintsCount = complaintsList.filter(
      (c) => c.status !== "resolved",
    ).length;
    return summary;
  }, [
    dataMode,
    language,
    visibleInventory,
    rows,
    invoices,
    payments,
    feedbackList,
    complaintsList,
  ]);

  if (authLoading || (user?.emailVerified && workspaceLoading && !activeWorkspace && !demoAccess)) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F5F8FA]">
        <div className="flex items-center gap-2.5 text-sm font-medium text-[#172B3A]">
          <LoaderCircle className="size-4 animate-spin text-[#087E8B]" />
          <span>{language === "hi" ? "फूडफ्लो लोड हो रहा है..." : "Loading FoodFlow..."}</span>
        </div>
      </div>
    );
  }

  if ((!user || !user.emailVerified) && !demoAccess) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F5F8FA]">
        <div className="flex items-center gap-2.5 text-sm font-medium text-[#172B3A]">
          <LoaderCircle className="size-4 animate-spin text-[#087E8B]" />
          <span>{language === "hi" ? "लॉगिन पृष्ठ पर जा रहे हैं..." : "Redirecting to sign in..."}</span>
        </div>
      </div>
    );
  }

  const isLive = dataMode === "live" && Boolean(user?.emailVerified);
  const canManage = isLive && (role === "admin" || role === "kitchen_head");
  const canModerate = isLive && (role === "admin" || role === "kitchen_head" || role === "warden");
  const canOperate = isLive && role !== null && role !== "student";
  const canManageFinance =
    isLive && (role === "admin" || role === "accountant" || role === "warden");
  const canManageInventory = isLive && (role === "admin" || role === "store_keeper");

  const unreadNotifications =
    dataMode === "demo"
      ? 2
      : notifications.filter((n) => !user?.uid || !(n.readBy || []).includes(user.uid)).length;

  const dashboardProps: DashboardProps = {
    currentPage: page,
    currentName,
    institutionName:
      dataMode === "demo" ? "Sample Mess Workspace · Read-Only" : (activeWorkspace?.name ?? null),
    institutionId: activeWorkspace?.id ?? null,
    ...(activeWorkspace?.cityState ? { cityState: activeWorkspace.cityState } : {}),
    role: dataMode === "demo" ? "admin" : role,
    canManage,
    canModerate,
    canOperate,
    canManageFinance,
    canManageInventory,
    inventoryItems: visibleInventory,
    rows,
    workspaceMembers,
    workspaceInvites,
    bookings,
    notifications,
    halls,
    purchaseOrders,
    vendors,
    workspaceSetup: {
      setupChecklistDismissed: Boolean(activeWorkspace?.setupChecklistDismissed),
      cycleMenuWeek: activeWorkspace?.cycleMenuWeek === "B" ? "B" : "A",
      minRebateDays: activeWorkspace?.minRebateDays ?? 3,
      monthlyFeePaise: activeWorkspace?.monthlyFeePaise ?? 420_000,
      perDayRebatePaise: activeWorkspace?.perDayRebatePaise ?? 8_500,
      guestMealUnitPaise: activeWorkspace?.guestMealUnitPaise ?? 9_000,
      menusCount: menus.length,
      hallsCount: halls.length,
      invitesCount: workspaceInvites.length,
    },
    invoices,
    payments,
    leaves,
    feedbackList,
    complaintsList,
    messSummary,
    dataMode,
    currencyCode: "INR",
    timezone: activeWorkspace?.timezone || "Asia/Kolkata",
    onAction: openAction,
    onNavigate: (nextPage) =>
      void navigate({ to: nextPage === "overview" ? "/overview" : (`/${nextPage}` as never) }),
    onToggleDemo: handleToggleDemo,
    onAdjustStock: handleAdjustStock,
    onDeleteStock: handleDeleteStock,
    onUpdateTask: handleUpdateTask,
    onUpdateOrder: handleUpdateOrder,
    onAutoPoLowStock: handleAutoPoLowStock,
    onBulkCopyTodayMenu: handleBulkCopyTodayMenu,
    onSaveForecastEstimate: handleSaveForecastEstimate,
    onGenerateBills: handleGenerateBills,
    onRecordPayment: handleRecordPayment,
    onUpdateLeaveStatus: handleUpdateLeaveStatus,
    onSubmitFeedback: handleSubmitFeedback,
    onUpdateFeedbackStatus: handleUpdateFeedbackStatus,
    onModerateFeedback: handleModerateFeedback,
    onSubmitComplaint: handleSubmitComplaint,
    onResolveComplaint: handleResolveComplaint,
    onUpdateMemberRole: handleUpdateMemberRole,
    onToggleMemberStatus: handleToggleMemberStatus,
    onRemoveMember: handleRemoveMember,
    onRevokeInvite: handleRevokeInvite,
    onSyncOfflineScans: handleSyncOfflineScans,
    onDismissSetupChecklist: handleDismissSetupChecklist,
    onUpdateMessPolicySettings: handleUpdateMessPolicySettings,
    onApplyCycleMenuWeek: handleApplyCycleMenuWeek,
    onDeductRecipeStock: handleDeductRecipeStock,
    onVerifyAndRecordQrScan: handleVerifyAndRecordQrScan,
    onCreateBroadcastNotice: handleCreateBroadcastNotice,
    onToggleEventRsvp: handleToggleEventRsvp,
    onSaveDisplayName: (name) => {
      setValues({ display_name: name });
      setAction("name");
    },
    onSignOut: () => void handleSignOut(),
  };

  const modalTitle =
    action === "institution"
      ? "Create your mess workspace"
      : action === "name"
        ? "Update your display name"
        : action === "invite"
          ? "Invite a teammate"
          : action === "inventory"
            ? "Add an ingredient"
            : action === "meal"
              ? initialRecord
                ? "Edit meal plan"
                : "Plan a meal"
              : action === "recipe"
                ? "Add a recipe"
                : action === "task"
                  ? "Add a kitchen task"
                  : action === "student"
                    ? "Add a student"
                    : action === "order"
                      ? "Create purchase order"
                      : action === "waste"
                        ? "Record food waste"
                        : action === "forecast"
                          ? "Add demand estimate"
                          : action === "event"
                            ? "Add campus event"
                            : action === "supplier"
                              ? "Add a vendor"
                              : action === "actual"
                                ? "Record service actuals"
                                : action === "attendance"
                                  ? "Record meal attendance"
                                  : action === "hall"
                                    ? "Add a dining hall"
                                    : "FoodFlow";

  const modalDescription =
    action === "institution"
      ? "Creates a multi-tenant Firestore workspace and assigns you as Admin."
      : action === "invite"
        ? "Generate an atomic invite code & link. Matching emails auto-claim on sign-in."
        : action === "name"
          ? "Your name appears across team records and audit trails."
          : "Saved directly to your workspace in Cloud Firestore.";

  const actionFields =
    action && action in fieldsByAction ? fieldsByAction[action as keyof typeof fieldsByAction] : [];

  const copyInviteText = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedCode(true);
    toast.success("Copied to clipboard.");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <>
      <FoodFlowShell
        currentPage={page}
        currentName={currentName}
        institutionName={activeWorkspace?.name ?? null}
        hallCount={dataMode === "demo" ? 2 : halls.length}
        unreadCount={unreadNotifications}
        onSignOut={() => void handleSignOut()}
        dataMode={dataMode}
        savingStatus={savingStatus}
        messSummary={messSummary}
        onToggleDemo={handleToggleDemo}
      >
        {(demoAccess || !activeWorkspace) && (
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300/60 bg-amber-50/80 px-4 py-3">
            <LockKeyhole className="size-4 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#172B3A]">
                {demoAccess ? t.sampleModeBannerTitle : t.noWorkspaceBannerTitle}
              </p>
              <p className="mt-0.5 text-[11px] text-[#475569]">
                {demoAccess
                  ? "Read-only sample preview. Sign in or create a workspace to save real data in Firestore."
                  : "Create your hostel mess workspace or join with an invite code to start saving live data."}
              </p>
            </div>
            {demoAccess ? (
              <Button
                size="sm"
                className="h-8 shrink-0 rounded-full bg-[#087E8B] text-white"
                onClick={() => {
                  setDemoAccess(false);
                  void navigate({ to: user ? "/onboarding" : "/login" });
                }}
              >
                {user ? "Go to Workspace Setup" : "Sign In / Create Account"}
              </Button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0 rounded-full"
                  onClick={() => void navigate({ to: "/onboarding" })}
                >
                  <Sparkles className="mr-1.5 size-3.5" />
                  Setup Wizard
                </Button>
                <Button
                  size="sm"
                  className="h-8 shrink-0 rounded-full bg-[#087E8B] text-white"
                  onClick={() => openAction("institution")}
                >
                  <Plus className="mr-1 size-3.5" />
                  Quick Create
                </Button>
              </div>
            )}
          </div>
        )}

        <FoodFlowContent {...dashboardProps} />

        {activeWorkspace && (
          <div className="sr-only">
            <ShieldCheck />
            Signed in to {activeWorkspace.name} as {role ?? "member"}.
          </div>
        )}
      </FoodFlowShell>

      <Dialog
        open={action !== null}
        onOpenChange={(open) => {
          if (!open && !busy) closeAction();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
            <DialogDescription>{modalDescription}</DialogDescription>
          </DialogHeader>

          {action === "invite" && createdInvite ? (
            <div className="space-y-4 py-2">
              <div className="rounded-2xl border border-[#16A36A]/30 bg-[#DDF3EA]/60 p-4 space-y-3">
                <p className="text-xs font-bold text-[#0F3D3A]">
                  Invite created for {createdInvite.email || "open invite link"} (
                  {createdInvite.role})
                </p>
                <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-white px-3 py-2">
                  <span className="font-mono text-sm font-bold tracking-wider text-[#087E8B]">
                    {createdInvite.code}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => copyInviteText(createdInvite.code)}
                  >
                    {copiedCode ? (
                      <Check className="mr-1 size-3.5" />
                    ) : (
                      <Copy className="mr-1 size-3.5" />
                    )}
                    Copy code
                  </Button>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  onClick={() =>
                    copyInviteText(`${window.location.origin}/join/${createdInvite.code}`)
                  }
                >
                  <Copy className="mr-1.5 size-3.5" />
                  Copy Direct Join Link (/join/{createdInvite.code})
                </Button>
              </div>
              <DialogFooter>
                <Button type="button" onClick={closeAction}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={(event) => void saveAction(event)} className="space-y-4">
              {action === "institution" && (
                <>
                  <Field
                    label="Mess / Institution name"
                    value={values["name"] ?? ""}
                    onChange={(value) => setValue("name", value)}
                    required
                    placeholder="e.g. Nilgiri Hostel Central Mess"
                  />
                  <Field
                    label="City & State (used for Open-Meteo weather)"
                    value={values["cityState"] ?? ""}
                    onChange={(value) => setValue("cityState", value)}
                    placeholder="e.g. Bengaluru, Karnataka"
                  />
                </>
              )}

              {action === "name" && (
                <Field
                  label="Display name"
                  value={values["display_name"] ?? currentName}
                  onChange={(value) => setValue("display_name", value)}
                  required
                />
              )}

              {action === "invite" && (
                <>
                  <Field
                    label="Teammate or student email (leave empty for open invite code)"
                    type="email"
                    value={values["email"] ?? ""}
                    onChange={(value) => setValue("email", value)}
                    placeholder="chef@college.edu"
                  />
                  <FormSelect
                    label="Assigned workspace role"
                    value={values["role"] ?? "kitchen_head"}
                    onChange={(value) => setValue("role", value)}
                    options={WORKSPACE_ROLES.map((r) => [r.value, `${r.labelEn} — ${r.descEn}`])}
                  />
                </>
              )}

              {actionFields.map((field) => (
                <FormFieldControl
                  key={field.key}
                  field={field}
                  value={values[field.key] ?? ""}
                  onChange={(value) => setValue(field.key, value)}
                />
              ))}

              {action === "movement" && (
                <div className="rounded-xl border border-border p-4 text-xs text-muted-foreground">
                  Use the + / - stock adjustment controls on Inventory & Expiry to log inbound
                  deliveries or kitchen issues atomically.
                </div>
              )}

              {action === "report" && (
                <div className="rounded-xl border border-border p-4 text-xs text-muted-foreground">
                  Open Reports to export CSV or print-ready PDF summaries of live Firestore
                  workspace records.
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-2">
                <Button type="button" variant="outline" onClick={closeAction} disabled={busy}>
                  {t.actions.cancel}
                </Button>
                {action !== "movement" && action !== "report" && (
                  <Button
                    type="submit"
                    disabled={busy}
                    className="bg-[#087E8B] text-white hover:bg-[#07545B]"
                  >
                    {busy ? (
                      <LoaderCircle className="mr-1.5 size-4 animate-spin" />
                    ) : (
                      <Plus className="mr-1.5 size-4" />
                    )}
                    {busy ? t.actions.saving : t.actions.save}
                  </Button>
                )}
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: "text" | "email" | "number" | "date";
  placeholder?: string;
}) {
  const id = label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        min={type === "number" ? 0 : undefined}
        placeholder={placeholder}
      />
    </div>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, name]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FormFieldControl({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.type === "select") {
    return (
      <FormSelect
        label={field.label}
        value={value || field.options?.[0] || ""}
        onChange={onChange}
        options={(field.options ?? []).map((option) => [option, option])}
      />
    );
  }
  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={field.key} className="text-xs font-semibold">
          {field.label}
        </Label>
        <Textarea
          id={field.key}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          rows={3}
        />
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.key} className="text-xs font-semibold">
        {field.label}
      </Label>
      <Input
        id={field.key}
        type={field.type ?? "text"}
        step={field.type === "number" ? "any" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
        min={field.min}
        max={field.max}
        placeholder={field.placeholder}
      />
    </div>
  );
}

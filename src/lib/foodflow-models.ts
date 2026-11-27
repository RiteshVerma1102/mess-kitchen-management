import type { AppRole, FoodFlowPage } from "@/lib/foodflow-data";
import { formatWorkspaceRole } from "@/lib/domain/workspace-types";

export type FoodFlowRow = Record<string, string | number | boolean | null | string[] | unknown> & {
  id?: unknown;
  title?: unknown;
  dishes?: unknown;
  expected_servings?: unknown;
  meal_type?: unknown;
  task_date?: unknown;
  expected_students?: unknown;
  confidence?: unknown;
  served_quantity?: unknown;
  prepared_quantity?: unknown;
  leftover_quantity?: unknown;
  spoiled_quantity?: unknown;
  cost_per_serving?: unknown;
  cost_amount?: unknown;
  waste_cost?: unknown;
  record_date?: unknown;
  forecast_date?: unknown;
  attendance_factor?: unknown;
  description?: unknown;
  quantity_delta?: unknown;
  minimum_quantity?: unknown;
  total_amount?: unknown;
  order_number?: unknown;
  supplier_name?: unknown;
  item_summary?: unknown;
  expected_date?: unknown;
  contact_name?: unknown;
  email?: unknown;
  phone?: unknown;
  category?: unknown;
  full_name?: unknown;
  hall?: unknown;
  meal_plan?: unknown;
  dietary_notes?: unknown;
  assigned_to?: unknown;
  planned_quantity?: unknown;
  completed_quantity?: unknown;
  status?: unknown;
  method?: unknown;
  servings?: unknown;
  instructions?: unknown;
  event_date?: unknown;
  student_code?: unknown;
  student_name?: unknown;
  served_at?: unknown;
  priority?: unknown;
  unit_cost?: unknown;
  quantity?: unknown;
  unit?: unknown;
  capacity?: unknown;
  moved_at?: unknown;
  reason?: unknown;
  is_demo?: unknown;
  page?: unknown;
  service_date?: unknown;
  dish_name?: unknown;
  name?: unknown;
  ingredients?: unknown;
  wasted_quantity?: unknown;
};

export type FoodFlowMember = {
  userId: string;
  name: string;
  email?: string | null;
  roles: AppRole[];
  status?: "active" | "suspended";
  joinedAt?: string;
};

export type Metric = {
  label: string;
  value: string;
  hint: string;
  icon: string;
  tone: "teal" | "green" | "amber" | "red";
};

export type ChartPoint = {
  label: string;
  meals: number;
  forecast: number;
  cost: number;
  waste: number;
};

export const rowText = (row: FoodFlowRow | undefined, key: string, fallback = "—") => {
  const value = row?.[key];
  return typeof value === "string" && value.length > 0
    ? value
    : typeof value === "number"
      ? String(value)
      : fallback;
};

export const rowNumber = (row: FoodFlowRow | undefined, key: string, fallback = 0) => {
  const value = row?.[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : typeof value === "string" && Number.isFinite(Number(value))
      ? Number(value)
      : fallback;
};

export const rowStringArray = (row: FoodFlowRow | undefined, key: string) => {
  const value = row?.[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
};

export const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const shiftDateKey = (offset: number) => {
  const day = new Date();
  day.setDate(day.getDate() + offset);
  return dateKey(day);
};

export const friendlyDate = (value: string, options?: Intl.DateTimeFormatOptions) => {
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", options ?? { day: "numeric", month: "short" }).format(
    parsed,
  );
};

export const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

export const moneyFromPaise = (paise: number, decimals = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format((paise || 0) / 100);

export const roleLabel = (role: AppRole | string) => formatWorkspaceRole(role, "en");

export const nextOrderStatus = (status: string) =>
  ({
    Pending: "Approved",
    Approved: "Ordered",
    Ordered: "Received",
    Received: "Received",
    Cancelled: "Pending",
  })[status] ?? "Approved";

export const pageTitle = (page: FoodFlowPage) =>
  ({
    overview: "Today’s overview",
    "meal-planning": "Meal planning",
    "weekly-menu": "Weekly menu",
    recipes: "Recipes & costing",
    kitchen: "Kitchen operations",
    inventory: "Inventory & expiry",
    purchasing: "Vendors & purchase orders",
    attendance: "QR attendance",
    students: "Student records",
    forecast: "Demand & weather forecast",
    waste: "Food waste log",
    billing: "Monthly billing & payments",
    feedback: "Feedback & complaints",
    analytics: "Cost analytics",
    reports: "Reports & charts",
    settings: "Settings & Data Health",
    notifications: "Notifications",
    users: "User management",
    audit: "Audit logs",
    calendar: "Academic calendar",
    suppliers: "Vendor directory",
    halls: "Dining halls",
    movements: "Stock movements",
    actuals: "Service actuals",
  })[page];

import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  ChefHat,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  CloudRain,
  CookingPot,
  Copy,
  Flame,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  Megaphone,
  Package,
  Plus,
  Recycle,
  RefreshCw,
  ScanLine,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { useFirebaseAuth } from "@/components/firebase-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  analyzeDishQualityLoop,
  computeDailyRationIndent,
  computeVendorPriceVariance,
} from "@/lib/domain/feedback-ops";
import {
  formatWorkspaceRole,
  WORKSPACE_ROLES,
  type BookingDoc,
  type ComplaintDoc,
  type FeedbackDoc,
  type HallDoc,
  type InvoiceDoc,
  type LeaveRequestDoc,
  type NotificationDoc,
  type PaymentDoc,
  type PurchaseOrderDoc,
  type VendorDoc,
  type WorkspaceInviteDoc,
  type WorkspaceMemberDoc,
  type WorkspaceRole,
} from "@/lib/domain/workspace-types";
import { exportToCSV, exportToPrintablePDF } from "@/lib/export-helpers";
import {
  moduleDescriptions,
  sampleMeals,
  sampleNotifications,
  sampleRecipes,
  sampleStudents,
  sampleTrend,
  sampleWaste,
  type DemoInventoryItem,
  type FoodFlowPage,
} from "@/lib/foodflow-data";
import {
  dateKey,
  friendlyDate,
  money,
  moneyFromPaise,
  nextOrderStatus,
  pageTitle,
  rowNumber,
  rowText,
  shiftDateKey,
  type FoodFlowRow,
} from "@/lib/foodflow-models";
import {
  buildSanitizedMessSummary,
  requestDemandForecastAI,
  requestInsightsAI,
  useAiUsageToday,
  type InsightsResponse,
  type SanitizedMessSummary,
  type TomorrowDemandBreakdown,
} from "@/lib/ai-client";
import { TRANSLATIONS } from "@/lib/i18n";
import {
  getPendingAttendanceQueue,
  queueAttendance,
  syncPendingAttendance,
} from "@/lib/offline-attendance";
import { fetchOpenMeteoForecast, type WeatherDayForecast } from "@/lib/weather";

const LazyBillingModule = lazy(() =>
  import("@/components/modules/lazy-modules").then((m) => ({ default: m.BillingPaymentsModule })),
);
const LazyFeedbackModule = lazy(() =>
  import("@/components/modules/lazy-modules").then((m) => ({
    default: m.FeedbackComplaintsModule,
  })),
);
const LazyDataHealthCard = lazy(() =>
  import("@/components/modules/lazy-modules").then((m) => ({ default: m.DataHealthCard })),
);

function ModuleSkeleton() {
  return (
    <div className="space-y-4 rounded-[24px] border border-border/60 bg-card p-6">
      <div className="h-6 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-24 animate-pulse rounded-2xl bg-muted/60" />
        ))}
      </div>
      <div className="h-56 animate-pulse rounded-2xl bg-muted/40" />
    </div>
  );
}

export type FoodFlowContext = {
  userId: string;
  name: string;
  email: string | null;
  institutionId: string | null;
  institutionName: string | null;
  currencyCode?: string;
  timezone?: string;
  role: string | null;
  roles?: string[];
  hasInstitution: boolean;
};

export type DashboardProps = {
  currentPage: FoodFlowPage;
  currentName: string;
  institutionName: string | null;
  institutionId: string | null;
  cityState?: string;
  role: WorkspaceRole | null;
  canManage: boolean;
  canModerate: boolean;
  canOperate: boolean;
  canManageFinance: boolean;
  canManageInventory: boolean;
  inventoryItems: DemoInventoryItem[];
  rows: FoodFlowRow[];
  workspaceMembers: WorkspaceMemberDoc[];
  workspaceInvites: WorkspaceInviteDoc[];
  bookings: BookingDoc[];
  notifications: NotificationDoc[];
  halls: HallDoc[];
  purchaseOrders: PurchaseOrderDoc[];
  vendors: VendorDoc[];
  workspaceSetup: {
    setupChecklistDismissed: boolean;
    cycleMenuWeek: "A" | "B";
    minRebateDays: number;
    monthlyFeePaise: number;
    perDayRebatePaise: number;
    guestMealUnitPaise: number;
    menusCount: number;
    hallsCount: number;
    invitesCount: number;
  };
  invoices: InvoiceDoc[];
  payments: PaymentDoc[];
  leaves: LeaveRequestDoc[];
  feedbackList: FeedbackDoc[];
  complaintsList: ComplaintDoc[];
  messSummary?: SanitizedMessSummary;
  dataMode: "live" | "demo";
  currencyCode: string;
  timezone: string;
  onAction: (kind: string, initial?: FoodFlowRow | null) => void;
  onNavigate: (page: FoodFlowPage) => void;
  onToggleDemo: () => void;
  onAdjustStock: (item: DemoInventoryItem, delta: number, reason: string) => Promise<void>;
  onDeleteStock: (item: DemoInventoryItem) => void;
  onUpdateTask: (
    row: FoodFlowRow,
    fields: Record<string, string | number | string[]>,
  ) => Promise<void>;
  onUpdateOrder: (row: FoodFlowRow) => Promise<void>;
  onAutoPoLowStock: () => Promise<void>;
  onBulkCopyTodayMenu: () => Promise<void>;
  onSaveForecastEstimate: (params: {
    forecastDate: string;
    mealType: string;
    expectedStudents: number;
    confidence: number;
    method: string;
    weatherNote: string;
  }) => Promise<void>;
  onGenerateBills: (monthKey: string) => Promise<void>;
  onRecordPayment: (
    invoice: InvoiceDoc,
    amountRupees: number,
    method: PaymentDoc["method"],
    referenceNo: string,
  ) => Promise<void>;
  onUpdateLeaveStatus: (leave: LeaveRequestDoc, status: "approved" | "rejected") => Promise<void>;
  onSubmitFeedback: (params: {
    mealType: string;
    rating: number;
    category: FeedbackDoc["category"];
    comment: string;
    tags?: string[];
    dishRatings?: { dish: string; rating: number }[];
    isAnonymous?: boolean;
  }) => Promise<void>;
  onUpdateFeedbackStatus: (fb: FeedbackDoc, status: FeedbackDoc["status"]) => Promise<void>;
  onModerateFeedback: (fb: FeedbackDoc, moderationStatus: "approved" | "hidden") => Promise<void>;
  onSubmitComplaint: (params: {
    category: string;
    subject: string;
    description: string;
    priority: ComplaintDoc["priority"];
    photoDataUrl?: string;
  }) => Promise<void>;
  onResolveComplaint: (
    c: ComplaintDoc,
    status: ComplaintDoc["status"],
    note: string,
    assignedTo?: string,
  ) => Promise<void>;
  onUpdateMemberRole: (member: WorkspaceMemberDoc, nextRole: WorkspaceRole) => Promise<void>;
  onToggleMemberStatus: (member: WorkspaceMemberDoc) => Promise<void>;
  onRemoveMember: (member: WorkspaceMemberDoc) => Promise<void>;
  onRevokeInvite: (invite: WorkspaceInviteDoc) => Promise<void>;
  onSyncOfflineScans: (pendingCount: number) => Promise<boolean>;
  onDismissSetupChecklist: () => Promise<void>;
  onUpdateMessPolicySettings: (minRebateDays: number) => Promise<void>;
  onApplyCycleMenuWeek: (week: "A" | "B") => Promise<void>;
  onDeductRecipeStock: (recipeRow: FoodFlowRow) => Promise<void>;
  onVerifyAndRecordQrScan: (params: {
    rawCodeOrRoll: string;
    mealType: string;
  }) => Promise<{ ok: boolean; message: string }>;
  onCreateBroadcastNotice: (params: { title: string; detail: string }) => Promise<void>;
  onToggleEventRsvp: (eventId: string, studentCode: string) => Promise<void>;
  onSaveDisplayName: (name: string) => void;
  onSignOut: () => void;
};

function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[24px] border border-border/70 bg-card shadow-sm ${className}`}>
      {children}
    </section>
  );
}

function SurfaceHeader({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-5 py-4 sm:px-6">
      {children}
      {action}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  trend,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Users;
  tone: "teal" | "green" | "amber" | "red";
  trend?: "up" | "down";
}) {
  const cardStyle = {
    teal: "bg-[#DDF3EA]/50 border-[#DDF3EA] hover:border-[#087E8B]/40",
    green: "bg-[#DDF3EA] border-[#c0e8d8] hover:border-emerald-500/40",
    amber: "bg-[#FFF1C7]/70 border-[#FFF1C7] hover:border-amber-500/40",
    red: "bg-[#FFE1D0]/70 border-[#FFE1D0] hover:border-rose-500/40",
  }[tone];

  const iconColor = {
    teal: "bg-[#087E8B] text-white",
    green: "bg-emerald-600 text-white",
    amber: "bg-[#FF7A1A] text-[#0F3D3A]",
    red: "bg-rose-600 text-white",
  }[tone];

  return (
    <div
      className={`card-lift relative flex flex-col justify-between rounded-[24px] border p-5 shadow-sm transition-all ${cardStyle}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-[#0F3D3A]/70">{label}</p>
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-xl shadow-xs ${iconColor}`}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-4">
        <p className="font-display text-3xl font-extrabold tracking-tight text-[#0F3D3A]">
          {value}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-[#0F3D3A]/70">
          {trend &&
            (trend === "up" ? (
              <span className="flex items-center text-emerald-700">
                <ArrowUpRight className="size-3.5" />
              </span>
            ) : (
              <span className="flex items-center text-amber-700">
                <ArrowDownRight className="size-3.5" />
              </span>
            ))}
          <span>{hint}</span>
        </div>
      </div>
    </div>
  );
}

function DatasetStamp({ demo }: { demo: boolean }) {
  return (
    <Badge
      variant="outline"
      className={`rounded-sm px-2 py-0.5 text-[10px] font-medium ${
        demo
          ? "border-warning/30 bg-warning/10 text-warning"
          : "border-success/30 bg-success/10 text-success"
      }`}
    >
      {demo ? "Sample preview" : "Live Firestore"}
    </Badge>
  );
}

function SetupPanel({
  institutionName,
  onAction,
}: {
  institutionName: string | null;
  onAction: (kind: string) => void;
}) {
  return (
    <div className="max-w-[720px] py-6 sm:py-10">
      <div className="mb-5 flex size-12 items-center justify-center rounded-md bg-teal-soft text-primary">
        <Package className="size-5" />
      </div>
      <p className="mb-3 text-[10px] font-semibold text-muted-foreground">FIRST STEPS</p>
      <h2 className="text-2xl font-semibold">Start your live FoodFlow workspace.</h2>
      <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
        {institutionName
          ? "Your account is ready. Create a workspace or join via invite code to start saving real data."
          : "Create your hostel mess workspace or join with an invite code."}
      </p>
      <Button className="mt-6 bg-[#087E8B] text-white" onClick={() => onAction("institution")}>
        Create Live Workspace <ArrowRight className="ml-2 size-4" />
      </Button>
    </div>
  );
}

function DashboardOverview({ props }: { props: DashboardProps }) {
  const { rows, inventoryItems, dataMode, institutionName, currentName, onAction, onNavigate } =
    props;
  const { language } = useFirebaseAuth();
  const t = TRANSLATIONS[language];

  const today = shiftDateKey(0);
  const tomorrow = shiftDateKey(1);

  const liveMeals = rows.filter(
    (row) => typeof row.service_date === "string" && typeof row.title === "string",
  );
  const todayMeals = liveMeals.filter((row) => row.service_date === today);
  const planForDay =
    todayMeals.length > 0 ? todayMeals : liveMeals.filter((row) => row.service_date === tomorrow);
  const plannedServings = planForDay.reduce(
    (sum, row) => sum + rowNumber(row, "expected_servings"),
    0,
  );

  const onHandValue = inventoryItems.reduce(
    (sum, item) => sum + Number(item.quantity ?? 0) * Number(item.unit_cost ?? 0),
    0,
  );
  const lowStock = inventoryItems.filter((item) => item.quantity <= item.minimum_quantity);
  const recentTasks = rows
    .filter((row) => typeof row.status === "string" && typeof row.dish_name === "string")
    .slice(0, 4);

  const todayAttendance = rows.filter(
    (row) => typeof row.student_name === "string" && rowText(row, "service_date") === today,
  );
  const wasteRows = rows.filter(
    (row) => row.wasted_quantity !== undefined && typeof row.dish_name === "string",
  );
  const totalPreparedWaste = wasteRows.reduce((s, r) => s + rowNumber(r, "prepared_quantity"), 0);
  const totalWasted = wasteRows.reduce((s, r) => s + rowNumber(r, "wasted_quantity"), 0);
  const liveWastePct = totalPreparedWaste > 0 ? (totalWasted / totalPreparedWaste) * 100 : null;

  const actualRows = rows.filter(
    (row) => row.cost_per_serving !== undefined && row.served_quantity !== undefined,
  );
  const actualServedTotal = actualRows.reduce((s, r) => s + rowNumber(r, "served_quantity"), 0);
  const actualCostTotal = actualRows.reduce(
    (s, r) => s + rowNumber(r, "prepared_quantity") * rowNumber(r, "cost_per_serving"),
    0,
  );
  const liveCostPerMeal = actualServedTotal > 0 ? actualCostTotal / actualServedTotal : null;

  const mealsToServe = planForDay.map((row) => ({
    meal: rowText(row, "meal_type"),
    dish: rowText(row, "title"),
    servings: rowNumber(row, "expected_servings"),
    status: rowText(row, "status"),
  }));
  const shownMeals =
    dataMode === "demo"
      ? sampleMeals.map((m) => ({
          meal: m.meal,
          dish: m.dish,
          servings: m.portions,
          status: m.status,
        }))
      : mealsToServe.slice(0, 4);

  const metrics = [
    {
      label: t.overview.plannedMealsToday,
      value: dataMode === "demo" ? "4" : String(todayMeals.length),
      hint: todayMeals.length
        ? "Published in live schedule"
        : dataMode === "demo"
          ? "Sample daily schedule"
          : t.empty.noMenuTitle,
      icon: CalendarDays,
      tone: "teal" as const,
    },
    {
      label: t.overview.expectedStudents,
      value:
        dataMode === "demo"
          ? "2,060"
          : plannedServings > 0
            ? plannedServings.toLocaleString("en-IN")
            : "0",
      hint: plannedServings > 0 ? "From planned menus" : "Plan a meal to project portions",
      icon: Users,
      tone: "green" as const,
    },
    {
      label: t.overview.mealsServed,
      value: dataMode === "demo" ? "1,842" : String(todayAttendance.length),
      hint: dataMode === "demo" ? "Sample count only" : "QR & manual check-ins today",
      icon: CheckCircle2,
      tone: "teal" as const,
    },
    {
      label: t.overview.inventoryValue,
      value: inventoryItems.length ? money(onHandValue) : "₹0",
      hint: inventoryItems.length
        ? `${inventoryItems.length} item(s) tracked`
        : t.empty.noInventoryTitle,
      icon: Package,
      tone: "amber" as const,
    },
    {
      label: t.overview.costPerMeal,
      value:
        dataMode === "demo"
          ? "₹68.40"
          : liveCostPerMeal !== null
            ? `₹${liveCostPerMeal.toFixed(2)}`
            : "—",
      hint: dataMode === "demo" ? "Sample calculation" : "From service actuals",
      icon: CircleDollarSign,
      tone: "green" as const,
    },
    {
      label: t.overview.foodWaste,
      value:
        dataMode === "demo" ? "6.8%" : liveWastePct !== null ? `${liveWastePct.toFixed(1)}%` : "—",
      hint:
        dataMode === "demo"
          ? "Sample waste rate"
          : wasteRows.length
            ? `${wasteRows.length} waste log(s)`
            : "Log waste to measure",
      icon: Recycle,
      tone: "amber" as const,
    },
  ];

  const liveChart = rows.filter(
    (row) => typeof row.forecast_date === "string" || typeof row.service_date === "string",
  );
  const chartData = useMemo(() => {
    if (dataMode === "demo") return sampleTrend;
    if (!liveChart.length) return [];
    const byDay = new Map<
      string,
      { day: string; served: number; forecast: number; cost: number }
    >();
    for (const row of liveChart) {
      const rawDate = rowText(row, "service_date", rowText(row, "forecast_date"));
      if (!rawDate || rawDate === "—") continue;
      const parsed = new Date(`${rawDate}T12:00:00`);
      const day = Number.isNaN(parsed.getTime())
        ? rawDate
        : new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(parsed);
      const item = byDay.get(day) ?? { day, served: 0, forecast: 0, cost: 0 };
      item.served += rowNumber(row, "served_quantity") || rowNumber(row, "expected_servings");
      item.forecast += rowNumber(row, "expected_students");
      item.cost += rowNumber(row, "waste_cost");
      byDay.set(day, item);
    }
    return Array.from(byDay.values()).slice(-7);
  }, [dataMode, liveChart]);

  const lowStockDisplay = lowStock.length
    ? lowStock.slice(0, 4).map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        minimum: item.minimum_quantity,
      }))
    : dataMode === "demo"
      ? ["Basmati rice", "Fresh spinach"].map((name, i) => ({
          name,
          quantity: [42, 8][i] ?? 0,
          unit: "kg",
          minimum: [50, 12][i] ?? 1,
        }))
      : [];
  const stockMax = Math.max(...lowStockDisplay.map((i) => i.minimum), 1);

  const liveWasteSeries = useMemo(() => {
    if (dataMode === "demo") return sampleWaste;
    if (!wasteRows.length) return [];
    return wasteRows.slice(-7).map((r) => {
      const prep = rowNumber(r, "prepared_quantity");
      const w = rowNumber(r, "wasted_quantity");
      return {
        day: friendlyDate(rowText(r, "record_date")),
        prepared: prep,
        wasted: prep > 0 ? Number(((w / prep) * 100).toFixed(1)) : 0,
      };
    });
  }, [dataMode, wasteRows]);

  const greeting =
    new Date().getHours() < 12
      ? t.overview.greetingMorning
      : new Date().getHours() < 17
        ? t.overview.greetingAfternoon
        : t.overview.greetingEvening;

  const { workspaceSetup, workspaceMembers, onDismissSetupChecklist } = props;
  const setupSteps = [
    {
      key: "halls",
      label: t.checklist.messHalls,
      done: Boolean(institutionName) && workspaceSetup.hallsCount > 0,
      target: "halls" as FoodFlowPage,
    },
    {
      key: "timings",
      label: t.checklist.mealTimings,
      done: Boolean(institutionName),
      target: "meal-planning" as FoodFlowPage,
    },
    {
      key: "fee",
      label: t.checklist.planFee,
      done: workspaceSetup.monthlyFeePaise > 0,
      target: "settings" as FoodFlowPage,
    },
    {
      key: "menu",
      label: t.checklist.firstMenu,
      done: workspaceSetup.menusCount > 0,
      target: "meal-planning" as FoodFlowPage,
    },
    {
      key: "team",
      label: t.checklist.inviteTeam,
      done: workspaceMembers.length > 1 || workspaceSetup.invitesCount > 0,
      target: "users" as FoodFlowPage,
    },
  ];
  const setupDoneCount = setupSteps.filter((s) => s.done).length;

  return (
    <div className="space-y-7">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 text-[10px] font-semibold text-muted-foreground">
            {new Intl.DateTimeFormat("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })
              .format(new Date())
              .toUpperCase()}
          </p>
          <h1 className="text-2xl font-semibold leading-tight sm:text-[30px]">
            {dataMode === "demo"
              ? language === "hi"
                ? "फूडफ्लो में आपका स्वागत है"
                : "Welcome to FoodFlow"
              : `${greeting}, ${currentName.split(" ")[0]}`}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t.overview.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DatasetStamp demo={dataMode === "demo"} />
          <Button variant="outline" size="sm" className="h-9" onClick={() => onNavigate("reports")}>
            <ArrowDownToLine className="mr-1.5 size-4" />
            {t.overview.exportReport}
          </Button>
          <Button
            size="sm"
            className="h-9 bg-[#087E8B] text-white"
            onClick={() => onAction("meal")}
          >
            <Plus className="mr-1.5 size-4" />
            {t.overview.planMeals}
          </Button>
        </div>
      </section>

      {dataMode === "live" && !workspaceSetup.setupChecklistDismissed && (
        <Surface className="border-[#087E8B]/30 bg-[#F8FCFC] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#172B3A]">{t.checklist.title}</h2>
                <Badge className="border-none bg-[#DDF3EA] text-[10px] font-bold text-[#087E8B]">
                  {setupDoneCount} {t.checklist.progressOf}
                </Badge>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{t.checklist.subtitle}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[11px] text-muted-foreground"
              onClick={() => void onDismissSetupChecklist()}
            >
              {t.checklist.dismiss}
            </Button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-5">
            {setupSteps.map((step) => (
              <button
                key={step.key}
                type="button"
                onClick={() => onNavigate(step.target)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                  step.done
                    ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                    : "border-border bg-white text-[#172B3A] hover:border-[#087E8B]/50"
                }`}
              >
                <CheckCircle2
                  className={`size-4 shrink-0 ${step.done ? "text-emerald-600" : "text-muted-foreground/50"}`}
                />
                <span className="line-clamp-2 text-[11px] font-medium">{step.label}</span>
              </button>
            ))}
          </div>
        </Surface>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-6 sm:gap-4">
        {metrics.map((metric) => (
          <StatCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.62fr)_minmax(300px,0.9fr)]">
        <Surface className="overflow-hidden">
          <SurfaceHeader>
            <div>
              <h2 className="text-sm font-semibold">{t.overview.weeklyConsumption}</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Live service & forecast records
              </p>
            </div>
            <DatasetStamp demo={dataMode === "demo"} />
          </SurfaceHeader>
          <div className="h-[260px] p-4 pr-5 sm:h-[284px] sm:p-5">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 12, right: 4, left: -18, bottom: 0 }}
                >
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      background: "var(--card)",
                      color: "var(--foreground)",
                    }}
                  />
                  <Bar
                    dataKey="served"
                    name="Served / Planned"
                    fill="var(--primary)"
                    radius={[3, 3, 0, 0]}
                    barSize={18}
                  />
                  <Line
                    dataKey="forecast"
                    name="Forecast"
                    stroke="var(--chart-3)"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <BlankChart
                title="No service records yet"
                note="Plan meals or record service actuals to populate trends."
              />
            )}
          </div>
        </Surface>

        <Surface className="overflow-hidden">
          <SurfaceHeader>
            <div>
              <h2 className="text-sm font-semibold">{t.overview.todaySchedule}</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">Published meals for today</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open meal planning"
              onClick={() => onNavigate("meal-planning")}
            >
              <ArrowRight className="size-4" />
            </Button>
          </SurfaceHeader>
          {shownMeals.length > 0 ? (
            <div className="divide-y divide-border">
              {shownMeals.map((meal, index) => (
                <button
                  key={`${meal.meal}-${index}`}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50"
                  onClick={() => onNavigate("meal-planning")}
                >
                  <div className="h-10 w-1 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-xs font-medium">{meal.meal}</p>
                      <span className="text-[10px] text-muted-foreground">
                        · {(meal.servings ?? 0).toLocaleString("en-IN")} portions
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                      {meal.dish}
                    </p>
                  </div>
                  <StatusBadge label={meal.status} />
                </button>
              ))}
            </div>
          ) : (
            <BlankSection
              icon={CalendarDays}
              title={t.empty.noMenuTitle}
              note={t.empty.noMenuDesc}
              action={t.actions.planMeal}
              onAction={() => onAction("meal")}
            />
          )}
        </Surface>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <Surface className="overflow-hidden">
          <SurfaceHeader>
            <div>
              <h2 className="text-sm font-semibold">{t.overview.inventoryHealth}</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">Low stock items to reorder</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open inventory"
              onClick={() => onNavigate("inventory")}
            >
              <ArrowRight className="size-4" />
            </Button>
          </SurfaceHeader>
          <div className="p-4 sm:p-5">
            {lowStockDisplay.length ? (
              <div className="space-y-4">
                {lowStockDisplay.map((item) => (
                  <div
                    key={item.name}
                    className="grid grid-cols-[minmax(100px,1fr)_minmax(100px,1.1fr)_58px] items-center gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{item.name}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Min {item.minimum} {item.unit}
                      </p>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-warning"
                        style={{
                          width: `${Math.min(100, Math.max(8, (item.quantity / stockMax) * 100))}%`,
                        }}
                      />
                    </div>
                    <p className="text-right text-[10px] font-medium tabular-nums">
                      {item.quantity} {item.unit}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <BlankSection
                icon={Package}
                title={t.empty.noInventoryTitle}
                note={t.empty.noInventoryDesc}
                action={t.actions.addIngredient}
                onAction={() => onAction("inventory")}
              />
            )}
          </div>
        </Surface>

        <Surface className="overflow-hidden">
          <SurfaceHeader>
            <div>
              <h2 className="text-sm font-semibold">{t.overview.costWasteSnapshot}</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Efficiency across recorded services
              </p>
            </div>
            <DatasetStamp demo={dataMode === "demo"} />
          </SurfaceHeader>
          <div className="grid gap-0 sm:grid-cols-2">
            <div className="border-b border-border p-4 sm:border-b-0 sm:border-r sm:p-5">
              <p className="text-xs text-muted-foreground">Recorded food spend</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {dataMode === "demo"
                  ? "₹4.47L"
                  : actualCostTotal > 0
                    ? money(actualCostTotal)
                    : "—"}
              </p>
              <div className="mt-5 h-[92px]">
                {dataMode === "demo" ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sampleTrend} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                      <Bar
                        dataKey="cost"
                        fill="var(--chart-2)"
                        radius={[2, 2, 0, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <BlankChart title="No service cost yet" note="Add service actuals" />
                )}
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-xs text-muted-foreground">Waste rate</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {dataMode === "demo"
                  ? "6.8%"
                  : liveWastePct !== null
                    ? `${liveWastePct.toFixed(1)}%`
                    : "—"}
              </p>
              <div className="mt-4 h-[112px]">
                {liveWasteSeries.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={liveWasteSeries}
                      margin={{ top: 5, right: 0, left: -28, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="day"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
                      />
                      <YAxis hide />
                      <Bar dataKey="wasted" name="Waste %" radius={[2, 2, 0, 0]} barSize={17}>
                        {liveWasteSeries.map((entry, idx) => (
                          <Cell
                            key={`${entry.day}-${idx}`}
                            fill={entry.wasted > 7 ? "var(--warning)" : "var(--primary)"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <BlankChart title="No waste logs yet" note="Log leftovers to view trend" />
                )}
              </div>
            </div>
          </div>
        </Surface>
      </div>

      <Surface className="overflow-hidden">
        <SurfaceHeader>
          <div>
            <h2 className="text-sm font-semibold">{t.overview.recentActivity}</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Kitchen prep & workspace updates
            </p>
          </div>
          <DatasetStamp demo={dataMode === "demo"} />
        </SurfaceHeader>
        <div className="divide-y divide-border">
          {dataMode === "demo" ? (
            [
              { title: "Lunch prep updated", detail: "Hot kitchen · sample", icon: Flame },
              { title: "Stock count updated", detail: "Basmati rice · sample", icon: Package },
            ].map((activity) => (
              <div key={activity.title} className="flex items-center gap-3 px-4 py-3">
                <span className="grid size-8 place-items-center rounded-md bg-muted text-muted-foreground">
                  <activity.icon className="size-4" />
                </span>
                <div>
                  <p className="text-xs font-medium">{activity.title}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{activity.detail}</p>
                </div>
              </div>
            ))
          ) : recentTasks.length ? (
            recentTasks.map((task, idx) => (
              <div
                key={rowText(task, "id", String(idx))}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span className="grid size-8 place-items-center rounded-md bg-muted text-muted-foreground">
                  <ClipboardList className="size-4" />
                </span>
                <div>
                  <p className="text-xs font-medium">{rowText(task, "dish_name")}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {rowText(task, "status")} · {friendlyDate(rowText(task, "task_date"))}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <EmptyRows
              icon={Clock3}
              title="Workspace ready for live data"
              note="Add your first student, ingredient, or meal plan using the sidebar or buttons above."
            />
          )}
        </div>
      </Surface>

      <p className="text-center text-[10px] text-muted-foreground">
        {institutionName || "FoodFlow Workspace"} ·{" "}
        {dataMode === "demo"
          ? "Sample workspace (read-only)."
          : "Connected to live Firestore multi-tenant records."}
      </p>
    </div>
  );
}

function TableFrame({
  headers,
  children,
  minimumWidth = "700px",
}: {
  headers: string[];
  children: ReactNode;
  minimumWidth?: string;
}) {
  return (
    <div className="w-full overflow-x-auto rounded-[20px] border border-border/60 bg-card">
      <table
        className="w-full border-collapse text-left text-xs"
        style={{ minWidth: minimumWidth }}
      >
        <thead>
          <tr className="border-b border-border/80 bg-muted/40">
            {headers.map((header) => (
              <th
                key={header}
                className="h-11 px-4 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground first:pl-6"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">{children}</tbody>
      </table>
    </div>
  );
}

function TableRow({ children }: { children: ReactNode }) {
  return <tr className="transition-colors hover:bg-muted/30">{children}</tr>;
}

function TableCell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-4 text-xs first:pl-6 ${className}`}>{children}</td>;
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone?: "green" | "amber" | "red" | "blue";
}) {
  const lower = label.toLowerCase();
  const key =
    tone ??
    (lower.includes("active") ||
    lower.includes("published") ||
    lower.includes("complete") ||
    lower.includes("received") ||
    lower === "ready" ||
    lower === "healthy"
      ? "green"
      : lower.includes("pending") ||
          lower.includes("progress") ||
          lower.includes("ordered") ||
          lower.includes("review") ||
          lower.includes("draft") ||
          lower.includes("restock") ||
          lower.includes("expiring")
        ? "amber"
        : lower.includes("leave") ||
            lower.includes("cancel") ||
            lower.includes("suspend") ||
            lower.includes("expired") ||
            lower.includes("not started")
          ? "red"
          : "blue");

  const style = {
    green: "border-emerald-500/30 bg-emerald-50 text-emerald-800",
    amber: "border-amber-500/30 bg-amber-50 text-amber-900",
    red: "border-rose-500/30 bg-rose-50 text-rose-800",
    blue: "border-teal-500/30 bg-teal-50 text-teal-900",
  }[key];

  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${style}`}
    >
      {label}
    </Badge>
  );
}

function EmptyRows({
  title,
  note,
  icon: Icon = ClipboardList,
}: {
  title: string;
  note: string;
  icon?: typeof ClipboardList;
}) {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto grid size-11 place-items-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-4 text-sm font-medium">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );
}

function BlankSection({
  icon: Icon,
  title,
  note,
  action,
  onAction,
}: {
  icon: typeof Package;
  title: string;
  note: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="py-9 text-center">
      <div className="mx-auto grid size-10 place-items-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <p className="mt-3 text-xs font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-[10px] leading-5 text-muted-foreground">{note}</p>
      {action && onAction && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-7 text-[10px] text-primary"
          onClick={onAction}
        >
          {action}
          <ArrowRight className="ml-1 size-3" />
        </Button>
      )}
    </div>
  );
}

function BlankChart({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {note && <p className="text-[10px] text-muted-foreground">{note}</p>}
    </div>
  );
}

function PageHeading({
  page,
  demo,
  action,
  customActionLabel,
}: {
  page: FoodFlowPage;
  demo: boolean;
  action?: () => void;
  customActionLabel?: string;
}) {
  const { language } = useFirebaseAuth();
  const t = TRANSLATIONS[language];
  const config =
    page === "overview"
      ? null
      : page in moduleDescriptions
        ? moduleDescriptions[page as keyof typeof moduleDescriptions]
        : {
            title: t.pages[page] ?? pageTitle(page),
            subtitle: "Manage your live workspace settings and roles.",
            action: "Save",
          };
  return (
    <section className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="mb-2 text-[10px] font-semibold text-muted-foreground">FOODFLOW WORKSPACE</p>
        <h1 className="text-2xl font-semibold sm:text-[28px]">
          {t.pages[page] ?? config?.title ?? pageTitle(page)}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{config?.subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <DatasetStamp demo={demo} />
        {config && action && config.action !== "Export report" && config.action !== "Save" && (
          <Button size="sm" className="h-9 bg-[#087E8B] text-white" onClick={action}>
            <Plus className="mr-1.5 size-4" />
            {customActionLabel ?? config.action}
          </Button>
        )}
      </div>
    </section>
  );
}

function InventoryPage({ props }: { props: DashboardProps }) {
  const {
    inventoryItems,
    dataMode,
    onAction,
    onAdjustStock,
    onDeleteStock,
    onAutoPoLowStock,
    canManageInventory,
  } = props;
  const { language } = useFirebaseAuth();
  const t = TRANSLATIONS[language];

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const nowMs = Date.now();
  const lowItems = inventoryItems.filter((item) => item.quantity <= item.minimum_quantity);
  const expiringItems = inventoryItems.filter(
    (item) => item.expiry_date && new Date(item.expiry_date).getTime() <= nowMs + 7 * 86_400_000,
  );
  const value = inventoryItems.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return inventoryItems.filter(
      (i) =>
        !q ||
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.supplier_name.toLowerCase().includes(q),
    );
  }, [inventoryItems, deferredSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeading
          page="inventory"
          demo={dataMode === "demo"}
          action={() => onAction("inventory")}
        />
        {canManageInventory && lowItems.length > 0 && dataMode === "live" && (
          <Button
            size="sm"
            variant="outline"
            className="h-9 border-[#FF7A1A] text-xs font-bold text-[#0F3D3A] hover:bg-[#FFF1C7]"
            onClick={() => void onAutoPoLowStock()}
          >
            <Truck className="mr-1.5 size-3.5 text-[#FF7A1A]" />
            {t.actions.autoCreatePo} ({lowItems.length})
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Stock value"
          value={money(value)}
          hint="Quantity × unit cost"
          icon={CircleDollarSign}
          tone="teal"
        />
        <StatCard
          label="Ingredients tracked"
          value={String(inventoryItems.length)}
          hint="In this workspace"
          icon={Package}
          tone="green"
        />
        <StatCard
          label="Below minimum"
          value={String(lowItems.length)}
          hint="Needs reorder"
          icon={ArrowDownRight}
          tone={lowItems.length ? "amber" : "green"}
        />
        <StatCard
          label="Expiring ≤ 7d (FEFO)"
          value={String(expiringItems.length)}
          hint="Use first in kitchen"
          icon={Clock3}
          tone={expiringItems.length ? "red" : "teal"}
        />
      </div>

      <Surface className="overflow-hidden">
        <SurfaceHeader
          action={
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search ingredient, category..."
                className="h-9 rounded-full pl-8 text-xs"
              />
            </div>
          }
        >
          <div>
            <h2 className="text-sm font-semibold">Ingredient stock & FEFO expiry</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Every +5 / −5 change logs a stock movement.
            </p>
          </div>
        </SurfaceHeader>

        {paginated.length ? (
          <TableFrame
            headers={[
              "INGREDIENT",
              "CATEGORY",
              "ON HAND",
              "MIN",
              "EXPIRY (FEFO)",
              "COST",
              "STATUS",
              "ACTIONS",
            ]}
            minimumWidth="940px"
          >
            {paginated.map((item) => {
              const low = item.quantity <= item.minimum_quantity;
              const isExpired = item.expiry_date
                ? new Date(item.expiry_date).getTime() < nowMs
                : false;
              const isExpiringSoon =
                item.expiry_date && !isExpired
                  ? new Date(item.expiry_date).getTime() <= nowMs + 7 * 86_400_000
                  : false;
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {item.supplier_name || "No supplier"}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.category}</TableCell>
                  <TableCell className="font-semibold tabular-nums">
                    {item.quantity} {item.unit}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.minimum_quantity} {item.unit}
                  </TableCell>
                  <TableCell>
                    {item.expiry_date ? (
                      <StatusBadge
                        label={
                          isExpired
                            ? `Expired (${item.expiry_date})`
                            : isExpiringSoon
                              ? `Expiring (${item.expiry_date})`
                              : item.expiry_date
                        }
                        tone={isExpired ? "red" : isExpiringSoon ? "amber" : "green"}
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {money(item.unit_cost)} / {item.unit}
                  </TableCell>
                  <TableCell>
                    <StatusBadge label={low ? "Restock" : "Healthy"} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[10px]"
                        disabled={!canManageInventory || dataMode === "demo"}
                        onClick={() =>
                          void onAdjustStock(item, -Math.min(5, item.quantity), "Kitchen issue")
                        }
                      >
                        −5
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[10px]"
                        disabled={!canManageInventory || dataMode === "demo"}
                        onClick={() => void onAdjustStock(item, 5, "Stock received")}
                      >
                        +5
                      </Button>
                      {canManageInventory && dataMode === "live" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[10px] text-rose-600"
                          onClick={() => onDeleteStock(item)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableFrame>
        ) : (
          <EmptyRows
            icon={Package}
            title={t.empty.noInventoryTitle}
            note={t.empty.noInventoryDesc}
          />
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-5 py-3 text-xs">
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Surface>
    </div>
  );
}

function MealPlanningPage({ props }: { props: DashboardProps }) {
  const {
    rows,
    inventoryItems,
    invoices,
    payments,
    feedbackList,
    complaintsList,
    messSummary,
    workspaceSetup,
    dataMode,
    canManage,
    onAction,
    onBulkCopyTodayMenu,
    onApplyCycleMenuWeek,
  } = props;
  const { language } = useFirebaseAuth();
  const t = TRANSLATIONS[language];
  const [menuInsights, setMenuInsights] = useState<InsightsResponse | null>(null);
  const [menuInsightsLoading, setMenuInsightsLoading] = useState(false);

  const qualitySummary = useMemo(
    () =>
      analyzeDishQualityLoop({
        feedbackList,
        complaints: complaintsList,
        todayDateKey: shiftDateKey(0),
      }),
    [complaintsList, feedbackList],
  );

  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() + index);
    return day;
  });
  const meals = rows.filter(
    (row) => typeof row.service_date === "string" && typeof row.title === "string",
  );
  const mealTypes = ["Breakfast", "Lunch", "Snacks", "Dinner"];
  const demoMenus =
    dataMode === "demo"
      ? ([
          {
            service_date: shiftDateKey(0),
            meal_type: "Breakfast",
            title: "Poha & fresh fruit",
            expected_servings: 420,
            plate_cost_rupees: 32,
            allergens: ["Peanuts"],
            status: "Published",
          },
          {
            service_date: shiftDateKey(0),
            meal_type: "Lunch",
            title: "Dal, rice & seasonal sabzi",
            expected_servings: 680,
            plate_cost_rupees: 58,
            allergens: ["Dairy"],
            status: "Published",
          },
          {
            service_date: shiftDateKey(0),
            meal_type: "Snacks",
            title: "Vegetable cutlet & chai",
            expected_servings: 350,
            plate_cost_rupees: 24,
            allergens: ["Gluten"],
            status: "Published",
          },
          {
            service_date: shiftDateKey(0),
            meal_type: "Dinner",
            title: "Paneer curry & phulka",
            expected_servings: 610,
            plate_cost_rupees: 66,
            allergens: ["Dairy", "Gluten"],
            status: "Published",
          },
        ] as FoodFlowRow[])
      : [];
  const visibleMeals = dataMode === "demo" ? demoMenus : meals;

  const handleSuggestMenu = async () => {
    setMenuInsightsLoading(true);
    try {
      const summary =
        messSummary ??
        buildSanitizedMessSummary({
          lang: language,
          inventoryItems,
          rows,
          invoices,
          payments,
          feedbackList,
        });
      const res = await requestInsightsAI({ kind: "menu_suggestions", summary });
      setMenuInsights(res);
    } finally {
      setMenuInsightsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeading
          page="meal-planning"
          demo={dataMode === "demo"}
          action={() => onAction("meal")}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            onClick={() => void handleSuggestMenu()}
            disabled={menuInsightsLoading}
          >
            {menuInsightsLoading ? (
              <LoaderCircle className="mr-1.5 size-3.5 animate-spin text-[#FF7A1A]" />
            ) : (
              <Sparkles className="mr-1.5 size-3.5 text-[#FF7A1A]" />
            )}
            {t.ai.menuSuggestions}
          </Button>
          {canManage && dataMode === "live" && (
            <>
              <Button
                size="sm"
                variant={workspaceSetup.cycleMenuWeek === "A" ? "default" : "outline"}
                className="h-9"
                onClick={() => void onApplyCycleMenuWeek("A")}
              >
                {t.ops.applyCycleWeek}: {t.ops.cycleWeekA}
              </Button>
              <Button
                size="sm"
                variant={workspaceSetup.cycleMenuWeek === "B" ? "default" : "outline"}
                className="h-9"
                onClick={() => void onApplyCycleMenuWeek("B")}
              >
                {t.ops.applyCycleWeek}: {t.ops.cycleWeekB}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9"
                onClick={() => void onBulkCopyTodayMenu()}
              >
                <Copy className="mr-1.5 size-3.5" />
                {t.actions.copyNextWeekMenu}
              </Button>
            </>
          )}
        </div>
      </div>

      {qualitySummary.lowRatedDishesNeedingReview.length > 0 && (
        <Surface className="border-amber-300/70 bg-amber-50/60 px-4 py-3 text-xs">
          <p className="font-bold text-amber-900">
            Dish Quality Loop Alert ({qualitySummary.lowRatedDishesNeedingReview.length} below
            3.0★):{" "}
            {qualitySummary.lowRatedDishesNeedingReview
              .map((d) => `${d.dish} (${d.avgRating.toFixed(1)}★)`)
              .join(", ")}
          </p>
        </Surface>
      )}

      {menuInsights && (
        <Surface className="border-[#087E8B]/30 bg-[#DDF3EA]/30 p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-[#087E8B]">
              {t.ai.menuSuggestions} · {menuInsights.highlightMetric}
            </p>
            <Badge variant="outline" className="text-[10px] capitalize">
              {menuInsights.source === "formula-fallback"
                ? "Formula Fallback"
                : menuInsights.source}
            </Badge>
          </div>
          {menuInsights.notice && (
            <p className="text-[11px] font-medium text-amber-800">{menuInsights.notice}</p>
          )}
          <ul className="space-y-1 text-xs text-[#172B3A]">
            {menuInsights.tips.map((tip, idx) => (
              <li key={idx}>• {tip}</li>
            ))}
          </ul>
        </Surface>
      )}

      <Surface className="overflow-hidden">
        <SurfaceHeader>
          <div>
            <h2 className="text-sm font-semibold">Seven-day meal calendar</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(
                new Date(),
              )}{" "}
              · Cycle Week {workspaceSetup.cycleMenuWeek}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={() => onAction("event")}>
              Academic event
            </Button>
            <Button
              size="sm"
              className="h-8 bg-[#087E8B] text-white"
              onClick={() => onAction("meal")}
            >
              <Plus className="mr-1 size-3.5" />
              {t.actions.planMeal}
            </Button>
          </div>
        </SurfaceHeader>

        <div className="overflow-x-auto">
          <div className="foodflow-grid min-w-[580px] border-b border-border">
            {days.map((day) => (
              <div
                key={dateKey(day)}
                className="border-r border-border px-2 py-3 text-center last:border-r-0"
              >
                <p className="text-[10px] font-medium text-muted-foreground">
                  {new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(day)}
                </p>
                <p
                  className={`mx-auto mt-1 grid size-7 place-items-center rounded-full text-xs font-semibold ${
                    dateKey(day) === shiftDateKey(0)
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground"
                  }`}
                >
                  {day.getDate()}
                </p>
              </div>
            ))}
          </div>
          <div className="min-w-[580px]">
            {mealTypes.map((mealType) => (
              <div
                key={mealType}
                className="foodflow-grid min-h-[120px] border-b border-border last:border-b-0"
              >
                <div className="flex items-start border-r border-border px-2 py-3 text-xs font-medium">
                  {mealType}
                </div>
                {days.map((day) => {
                  const menu = visibleMeals.find(
                    (item) =>
                      rowText(item, "service_date") === dateKey(day) &&
                      rowText(item, "meal_type") === mealType,
                  );
                  const menuTitle = menu ? rowText(menu, "title").toLowerCase() : "";
                  const dishFlag = menu
                    ? qualitySummary.dishLeaderboard.find((d) =>
                        menuTitle.includes(d.dish.toLowerCase()),
                      )
                    : undefined;
                  const plateCost = menu ? rowNumber(menu, "plate_cost_rupees") : 0;
                  return (
                    <div
                      key={`${mealType}-${dateKey(day)}`}
                      className="min-w-0 border-r border-border p-1.5 last:border-r-0"
                    >
                      {menu ? (
                        <button
                          onClick={() => onAction("meal", menu)}
                          className="h-full w-full rounded-sm border border-border bg-muted/50 p-2 text-left transition-colors hover:border-primary/40 hover:bg-teal-soft"
                        >
                          <p className="line-clamp-2 text-[10px] font-medium leading-4">
                            {rowText(menu, "title")}
                          </p>
                          <p className="mt-1 text-[9px] text-muted-foreground">
                            {rowNumber(menu, "expected_servings").toLocaleString("en-IN")} portions
                            {plateCost > 0 ? ` · ₹${plateCost}/plate` : ""}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <StatusBadge label={rowText(menu, "status")} />
                            {dishFlag?.status === "needs_review" && (
                              <StatusBadge
                                label={`${dishFlag.avgRating.toFixed(1)}★ Review`}
                                tone="red"
                              />
                            )}
                            {dishFlag?.status === "favorite" && (
                              <StatusBadge
                                label={`${dishFlag.avgRating.toFixed(1)}★ Fav`}
                                tone="green"
                              />
                            )}
                          </div>
                        </button>
                      ) : canManage && dataMode === "live" ? (
                        <button
                          className="grid h-full min-h-16 w-full place-items-center rounded-sm text-muted-foreground hover:bg-muted/70"
                          aria-label={`Plan ${mealType} for ${friendlyDate(dateKey(day))}`}
                          onClick={() =>
                            onAction("meal", { service_date: dateKey(day), meal_type: mealType })
                          }
                        >
                          <Plus className="size-4" />
                        </button>
                      ) : (
                        <div className="h-full" />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Surface>
    </div>
  );
}

function RecipesPage({ props }: { props: DashboardProps }) {
  const { rows, dataMode, canOperate, onAction, onDeductRecipeStock, inventoryItems } = props;
  const { language } = useFirebaseAuth();
  const t = TRANSLATIONS[language];
  const [batchScalePortions, setBatchScalePortions] = useState(250);

  const recipes = rows.filter(
    (row) => typeof row.name === "string" && row.cost_per_serving !== undefined,
  );
  const displayed =
    dataMode === "demo"
      ? sampleRecipes.map(
          (recipe, index) =>
            ({
              id: `demo-recipe-${index}`,
              name: recipe.name,
              category: recipe.category,
              servings: recipe.servings,
              cost_per_serving: recipe.cost,
              ingredients: recipe.ingredients
                .split(", ")
                .map((name) => ({ name, quantity: 5, unit: "kg" })),
              instructions: "Standard batch kitchen prep.",
            }) as FoodFlowRow,
        )
      : recipes;

  const rationIndent = useMemo(() => {
    const today = shiftDateKey(0);
    const menusToday =
      dataMode === "demo"
        ? sampleMeals.map((m) => ({
            title: m.dish,
            dishes: [m.dish],
            expectedServings: m.portions,
          }))
        : rows
            .filter(
              (r) =>
                typeof r.service_date === "string" &&
                typeof r.title === "string" &&
                rowText(r, "service_date") === today,
            )
            .map((r) => ({
              title: rowText(r, "title"),
              dishes: Array.isArray(r.dishes) ? (r.dishes as string[]) : [rowText(r, "title")],
              expectedServings: rowNumber(r, "expected_servings"),
            }));
    const recipeSpecs = displayed.map((r) => ({
      name: rowText(r, "name"),
      servings: Math.max(1, rowNumber(r, "servings", 100)),
      ingredients: (Array.isArray(r.ingredients) ? r.ingredients : []).map((entry) => {
        if (typeof entry === "object" && entry !== null) {
          const o = entry as { name?: string; quantity?: number; unit?: string };
          return { name: o.name ?? "Ingredient", quantity: o.quantity ?? 1, unit: o.unit ?? "kg" };
        }
        const m = String(entry).match(/^(.+?)\s+([\d.]+)\s*([a-zA-Z]+)?$/);
        return m && m[1]
          ? { name: m[1].trim(), quantity: Number(m[2]) || 1, unit: (m[3] || "kg").trim() }
          : { name: String(entry), quantity: 1, unit: "kg" };
      }),
    }));
    const invSpecs = inventoryItems.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
    }));
    return computeDailyRationIndent({
      menus: menusToday,
      recipes: recipeSpecs,
      inventoryItems: invSpecs,
    });
  }, [dataMode, displayed, inventoryItems, rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeading page="recipes" demo={dataMode === "demo"} action={() => onAction("recipe")} />
        <div className="flex items-center gap-2 rounded-2xl border border-[#E5EAF0] bg-white px-3 py-2 text-xs">
          <span className="font-semibold text-[#172B3A]">Batch Yield Scaler:</span>
          <Input
            type="number"
            min={10}
            max={10000}
            value={batchScalePortions}
            onChange={(e) => setBatchScalePortions(Math.max(10, Number(e.target.value) || 100))}
            className="h-8 w-24 text-center font-bold"
          />
          <span className="text-muted-foreground">portions</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Recipes"
          value={String(displayed.length)}
          hint="Standardized dishes"
          icon={ClipboardList}
          tone="teal"
        />
        <StatCard
          label="Pantry items"
          value={String(inventoryItems.length)}
          hint="Linked to costing"
          icon={Package}
          tone="green"
        />
        <StatCard
          label="Avg cost / plate"
          value={
            displayed.length
              ? money(
                  displayed.reduce((sum, row) => sum + rowNumber(row, "cost_per_serving"), 0) /
                    displayed.length,
                )
              : "—"
          }
          hint="Calculated in paise"
          icon={CircleDollarSign}
          tone="amber"
        />
        <StatCard
          label="Scaled batch size"
          value={batchScalePortions.toLocaleString("en-IN")}
          hint="Live multiplier"
          icon={ChefHat}
          tone="teal"
        />
      </div>

      {displayed.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {displayed.map((recipe) => {
            const baseServings = Math.max(1, rowNumber(recipe, "servings", 100));
            const multiplier = batchScalePortions / baseServings;
            const unitCost = rowNumber(recipe, "cost_per_serving");
            const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
            return (
              <Surface
                key={rowText(recipe, "id", rowText(recipe, "name"))}
                className="overflow-hidden"
              >
                <div className="border-b border-border bg-teal-soft/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold text-primary">
                        {rowText(recipe, "category", "MAIN COURSE").toUpperCase()}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold">{rowText(recipe, "name")}</h3>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      ×{multiplier.toFixed(2)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Base {baseServings} → <strong>{batchScalePortions}</strong> portions · Batch
                    est. <strong>{money(unitCost * batchScalePortions)}</strong>
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    SCALED INGREDIENTS
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ingredients.length ? (
                      ingredients.slice(0, 8).map((item, idx) => {
                        const obj =
                          typeof item === "object" && item !== null
                            ? (item as { name?: string; quantity?: number; unit?: string })
                            : null;
                        const label = obj
                          ? `${obj.name ?? "Item"} (${Number(((obj.quantity ?? 1) * multiplier).toFixed(1))} ${obj.unit ?? "kg"})`
                          : String(item);
                        return (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="rounded-sm px-2 py-1 text-[10px] font-medium"
                          >
                            {label}
                          </Badge>
                        );
                      })
                    ) : (
                      <span className="text-xs text-muted-foreground">No ingredients listed</span>
                    )}
                  </div>
                  <p className="mt-3 line-clamp-2 text-[11px] text-muted-foreground">
                    {rowText(recipe, "instructions", "Standard prep notes.")}
                  </p>
                  {canOperate && dataMode === "live" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 h-7 w-full text-[11px] font-semibold text-[#087E8B]"
                      onClick={() => void onDeductRecipeStock(recipe)}
                    >
                      <Package className="mr-1.5 size-3" /> {t.ops.deductPrepStock}
                    </Button>
                  )}
                </div>
              </Surface>
            );
          })}
        </div>
      ) : (
        <Surface>
          <EmptyRows
            title="No recipes added yet"
            note="Add recipes with base servings and ₹/plate cost to scale kitchen batch indents automatically."
            icon={ClipboardList}
          />
        </Surface>
      )}

      <Surface className="overflow-hidden">
        <SurfaceHeader>
          <div>
            <h2 className="text-sm font-semibold">{t.ops.rationIndentTitle}</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Auto-computed from today&apos;s published menus × standardized recipe yields vs
              on-hand stock.
            </p>
          </div>
          <DatasetStamp demo={dataMode === "demo"} />
        </SurfaceHeader>
        {rationIndent.length > 0 ? (
          <TableFrame
            headers={["INGREDIENT", "REQUIRED", "ON HAND", "TO ISSUE", "SHORTFALL"]}
            minimumWidth="640px"
          >
            {rationIndent.map((r) => (
              <TableRow key={r.ingredientName}>
                <TableCell className="font-medium">{r.ingredientName}</TableCell>
                <TableCell className="tabular-nums">
                  {r.requiredQty} {r.unit}
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {r.onHandQty} {r.unit}
                </TableCell>
                <TableCell className="font-semibold text-[#087E8B] tabular-nums">
                  {r.toIssueQty} {r.unit}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    label={r.shortfallQty > 0 ? `${r.shortfallQty} ${r.unit} short` : "Covered"}
                    tone={r.shortfallQty > 0 ? "red" : "green"}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableFrame>
        ) : (
          <EmptyRows
            title="No ration indent items calculated yet"
            note="Match today's menu dish titles with recipes to compute store issue quantities."
            icon={Package}
          />
        )}
      </Surface>
    </div>
  );
}

function KitchenPage({ props }: { props: DashboardProps }) {
  const { rows, bookings, dataMode, canOperate, onAction, onUpdateTask } = props;
  const { language } = useFirebaseAuth();
  const t = TRANSLATIONS[language];
  const tasks = rows.filter(
    (row) => typeof row.dish_name === "string" && row.planned_quantity !== undefined,
  );
  const displayed =
    dataMode === "demo"
      ? ["Prepare poha", "Cook dal tadka", "Steam basmati rice"].map(
          (name, idx) =>
            ({
              id: `demo-task-${idx}`,
              task_date: shiftDateKey(0),
              meal_type: idx === 0 ? "Breakfast" : "Lunch",
              dish_name: name,
              planned_quantity: 400,
              completed_quantity: idx === 0 ? 400 : 220,
              assigned_to: "Shift A",
              status: idx === 0 ? "Completed" : "In progress",
            }) as FoodFlowRow,
        )
      : tasks;

  const todayKey = shiftDateKey(0);
  const tiffinQueue =
    dataMode === "demo"
      ? [
          {
            id: "demo-tif-1",
            studentCode: "ST-1088",
            mealType: "lunch",
            serviceDate: todayKey,
            note: "Fever — deliver Room B-204",
          },
          {
            id: "demo-tif-2",
            studentCode: "ST-1136",
            mealType: "dinner",
            serviceDate: todayKey,
            note: "Late lab — pack by 20:15",
          },
        ]
      : bookings.filter(
          (b) => b.tiffinRequested && b.status !== "skipped" && b.serviceDate >= todayKey,
        );

  const planned = displayed.reduce((sum, task) => sum + rowNumber(task, "planned_quantity"), 0);
  const completed = displayed.reduce((sum, task) => sum + rowNumber(task, "completed_quantity"), 0);
  const progress = planned ? Math.round((completed / planned) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeading page="kitchen" demo={dataMode === "demo"} action={() => onAction("task")} />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Prep tasks"
          value={String(displayed.length)}
          hint="Assigned today"
          icon={ClipboardList}
          tone="teal"
        />
        <StatCard
          label="Portions planned"
          value={planned.toLocaleString("en-IN")}
          hint="Across tasks"
          icon={Users}
          tone="green"
        />
        <StatCard
          label="Portions completed"
          value={completed.toLocaleString("en-IN")}
          hint={`${progress}% complete`}
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Kitchen progress"
          value={`${progress}%`}
          hint="Live completion"
          icon={Activity}
          tone="amber"
        />
      </div>

      <Surface className="overflow-hidden">
        <SurfaceHeader>
          <div>
            <h2 className="text-sm font-semibold">{t.ops.tiffinBoardTitle}</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Students who requested sick trays or late-arrival tiffins before cut-off.
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] font-bold">
            {tiffinQueue.length} tray(s)
          </Badge>
        </SurfaceHeader>
        {tiffinQueue.length > 0 ? (
          <div className="divide-y divide-border">
            {tiffinQueue.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-xs"
              >
                <div>
                  <p className="font-semibold">
                    {item.studentCode} · <span className="capitalize">{item.mealType}</span> (
                    {item.serviceDate})
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.note || "Standard hostel tiffin tray"}
                  </p>
                </div>
                <StatusBadge label="Pack Tray" tone="amber" />
              </div>
            ))}
          </div>
        ) : (
          <p className="p-5 text-center text-xs text-muted-foreground">
            No sick/late tiffin trays requested for today.
          </p>
        )}
      </Surface>

      <Surface className="overflow-hidden">
        <SurfaceHeader>
          <div>
            <h2 className="text-sm font-semibold">Preparation schedule</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Move tasks from Not started → In progress → Ready → Completed.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => onAction("actual")}>
            <Plus className="mr-1.5 size-3.5" /> Record service actuals
          </Button>
        </SurfaceHeader>
        {displayed.length ? (
          <TableFrame
            headers={["MEAL", "PREPARATION TASK", "TEAM", "PLANNED", "DONE", "STATUS", "ACTION"]}
            minimumWidth="820px"
          >
            {displayed.map((task) => {
              const portion = rowNumber(task, "planned_quantity");
              const done = rowNumber(task, "completed_quantity");
              const status = rowText(task, "status");
              return (
                <TableRow key={rowText(task, "id", rowText(task, "dish_name"))}>
                  <TableCell>
                    <StatusBadge label={rowText(task, "meal_type")} />
                  </TableCell>
                  <TableCell className="font-medium">{rowText(task, "dish_name")}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {rowText(task, "assigned_to", "—")}
                  </TableCell>
                  <TableCell className="tabular-nums">{portion}</TableCell>
                  <TableCell className="tabular-nums">{done}</TableCell>
                  <TableCell>
                    <StatusBadge label={status} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[10px]"
                      disabled={!canOperate || dataMode === "demo" || status === "Completed"}
                      onClick={() =>
                        void onUpdateTask(task, {
                          status:
                            status === "Not started"
                              ? "In progress"
                              : status === "In progress"
                                ? "Ready"
                                : "Completed",
                          completed_quantity:
                            status === "Not started" ? Math.floor(portion * 0.5) : portion,
                        })
                      }
                    >
                      {status === "Not started"
                        ? "Start"
                        : status === "In progress"
                          ? "Mark ready"
                          : status === "Ready"
                            ? "Complete"
                            : "Done"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableFrame>
        ) : (
          <EmptyRows
            title="No prep tasks scheduled yet"
            note="Add a prep task to assign dishes and portion counts."
            icon={ChefHat}
          />
        )}
      </Surface>
    </div>
  );
}

function AttendancePage({ props }: { props: DashboardProps }) {
  const { rows, dataMode, canOperate, onAction, onSyncOfflineScans, onVerifyAndRecordQrScan } =
    props;
  const { language } = useFirebaseAuth();
  const t = TRANSLATIONS[language];
  const attendance = rows.filter(
    (row) => typeof row.student_name === "string" && typeof row.served_at === "string",
  );
  const realStudents = rows.filter(
    (row) => typeof row.student_code === "string" && typeof row.full_name === "string",
  );
  const displayed =
    dataMode === "demo"
      ? sampleStudents.slice(0, 4).map(
          (student, idx) =>
            ({
              id: `demo-att-${idx}`,
              student_code: student.code,
              student_name: student.name,
              hall: student.hall,
              meal_type: "Lunch",
              served_at: new Date(Date.now() - idx * 1800000).toISOString(),
            }) as FoodFlowRow,
        )
      : attendance;

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [scanMeal, setScanMeal] = useState("Lunch");
  const [scanResult, setScanResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [scanBusy, setScanBusy] = useState(false);

  const refreshQueueCount = useCallback(() => {
    void getPendingAttendanceQueue().then((q) => setPendingCount(q.length));
  }, []);

  const handleSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const report = await syncPendingAttendance(async () => onSyncOfflineScans(pendingCount));
      refreshQueueCount();
      if (report.syncedCount > 0) {
        toast.success(`Synced ${report.syncedCount} offline QR check-in(s) to Firestore.`);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, onSyncOfflineScans, pendingCount, refreshQueueCount]);

  useEffect(() => {
    refreshQueueCount();
    const handleOnline = () => {
      setIsOnline(true);
      void handleSync();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleSync, refreshQueueCount]);

  const handleVerifyScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    setScanBusy(true);
    try {
      const res = await onVerifyAndRecordQrScan({ rawCodeOrRoll: scanInput, mealType: scanMeal });
      setScanResult(res);
      refreshQueueCount();
      if (res.ok) setScanInput("");
    } finally {
      setScanBusy(false);
    }
  };

  const handleOfflineQueueScan = async () => {
    const picked =
      dataMode === "demo"
        ? { code: "ST-1042", name: "Sample Student", hall: "Main Hall" }
        : realStudents[0]
          ? {
              code: rowText(realStudents[0], "student_code"),
              name: rowText(realStudents[0], "full_name"),
              hall: rowText(realStudents[0], "hall", "Main Hall"),
            }
          : null;
    if (!picked) {
      toast.info("Add a student first or use Record Attendance.");
      onAction("attendance");
      return;
    }
    await queueAttendance({
      clientUuid: crypto.randomUUID(),
      studentId: picked.code,
      studentCode: picked.code,
      studentName: picked.name,
      hallId: picked.hall,
      serviceDate: new Date().toISOString().slice(0, 10),
      mealType: "lunch",
      method: "qr",
      clientTimestamp: new Date().toISOString(),
      status: "pending",
      queuedAt: new Date().toISOString(),
    });
    refreshQueueCount();
    toast.success(`Queued QR scan for ${picked.name} (${picked.code}).`);
  };

  const byMeal = new Map<string, number>();
  for (const row of displayed)
    byMeal.set(rowText(row, "meal_type"), (byMeal.get(rowText(row, "meal_type")) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeading
          page="attendance"
          demo={dataMode === "demo"}
          action={() => onAction("attendance")}
        />
        <div className="flex flex-wrap items-center gap-2">
          {!isOnline ? (
            <Badge variant="danger" className="gap-1.5 px-2.5 py-1 text-xs">
              <WifiOff className="size-3.5" /> Offline ({pendingCount} queued)
            </Badge>
          ) : pendingCount > 0 ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={() => void handleSync()}
            >
              <RefreshCw className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`} /> Sync{" "}
              {pendingCount} queued
            </Button>
          ) : (
            <Badge
              variant="soft"
              className="gap-1.5 border border-success/30 px-2.5 py-1 text-xs text-success"
            >
              <Wifi className="size-3.5" /> Online & Synced
            </Badge>
          )}
          {canOperate && dataMode === "live" && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs"
              onClick={() => void handleOfflineQueueScan()}
            >
              <ScanLine className="size-3.5" /> Queue QR Scan
            </Button>
          )}
        </div>
      </div>

      <Surface className="border-[#087E8B]/30 bg-[#F8FCFC] p-4 sm:p-5">
        <form onSubmit={(e) => void handleVerifyScan(e)} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1 space-y-1">
            <p className="text-xs font-bold text-[#172B3A]">{t.ops.verifyQrTitle}</p>
            <Input
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Paste rotating QR token (FF-...) or roll code (ST-1042)"
              className="h-9 bg-white text-xs font-mono"
            />
          </div>
          <div className="w-36 space-y-1">
            <p className="text-[11px] font-semibold text-muted-foreground">Meal slot</p>
            <Select value={scanMeal} onValueChange={setScanMeal}>
              <SelectTrigger className="h-9 bg-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Breakfast", "Lunch", "Snacks", "Dinner"].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={scanBusy || (!canOperate && dataMode === "live")}
            className="h-9 bg-[#087E8B] text-white"
          >
            <ScanLine className="mr-1.5 size-3.5" /> {t.ops.scanPassBtn}
          </Button>
        </form>
        {scanResult && (
          <p
            className={`mt-2.5 text-xs font-semibold ${
              scanResult.ok ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {scanResult.message}
          </p>
        )}
      </Surface>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Meals scanned"
          value={String(displayed.length)}
          hint="Recorded check-ins"
          icon={CheckCircle2}
          tone="teal"
        />
        <StatCard
          label="Breakfast"
          value={String(byMeal.get("Breakfast") ?? 0)}
          hint="Today"
          icon={CalendarDays}
          tone="green"
        />
        <StatCard
          label="Lunch"
          value={String(byMeal.get("Lunch") ?? 0)}
          hint="Today"
          icon={Users}
          tone="teal"
        />
        <StatCard
          label="Dinner"
          value={String(byMeal.get("Dinner") ?? 0)}
          hint="Today"
          icon={Clock3}
          tone="amber"
        />
      </div>

      <Surface className="overflow-hidden">
        <SurfaceHeader>
          <div>
            <h2 className="text-sm font-semibold">Recent QR & manual meal check-ins</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Stored in Firestore attendance subcollection.
            </p>
          </div>
          <Button
            size="sm"
            className="h-8 bg-[#087E8B] text-white"
            disabled={!canOperate}
            onClick={() => onAction("attendance")}
          >
            <Plus className="mr-1 size-3.5" /> Record check-in
          </Button>
        </SurfaceHeader>
        {displayed.length ? (
          <TableFrame headers={["STUDENT", "HALL", "MEAL", "TIME", "METHOD"]}>
            {displayed.slice(0, 25).map((row) => (
              <TableRow key={rowText(row, "id", rowText(row, "student_code"))}>
                <TableCell>
                  <p className="font-medium">{rowText(row, "student_name")}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {rowText(row, "student_code")}
                  </p>
                </TableCell>
                <TableCell className="text-muted-foreground">{rowText(row, "hall")}</TableCell>
                <TableCell>
                  <StatusBadge label={rowText(row, "meal_type")} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(
                    new Date(rowText(row, "served_at", new Date().toISOString())),
                  )}
                </TableCell>
                <TableCell className="uppercase text-[10px] font-bold">
                  {rowText(row, "method", "qr")}
                </TableCell>
              </TableRow>
            ))}
          </TableFrame>
        ) : (
          <EmptyRows
            title="No attendance scans yet"
            note="Record QR or manual meal check-ins as students dine."
            icon={ScanLine}
          />
        )}
      </Surface>
    </div>
  );
}

function StudentsPage({ props }: { props: DashboardProps }) {
  const { rows, dataMode, onAction } = props;
  const { language } = useFirebaseAuth();
  const t = TRANSLATIONS[language];

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const liveStudents = rows.filter(
    (row) => typeof row.student_code === "string" && typeof row.full_name === "string",
  );
  const allStudents =
    dataMode === "demo"
      ? sampleStudents.map(
          (s, idx) =>
            ({
              id: `demo-stu-${idx}`,
              student_code: s.code,
              full_name: s.name,
              hall: s.hall,
              meal_plan: s.plan,
              dietary_notes: "",
              status: s.status,
            }) as FoodFlowRow,
        )
      : liveStudents;

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return allStudents.filter(
      (s) =>
        !q ||
        rowText(s, "full_name").toLowerCase().includes(q) ||
        rowText(s, "student_code").toLowerCase().includes(q) ||
        rowText(s, "hall").toLowerCase().includes(q),
    );
  }, [allStudents, deferredSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <PageHeading page="students" demo={dataMode === "demo"} action={() => onAction("student")} />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Students listed"
          value={String(allStudents.length)}
          hint="In this workspace"
          icon={Users}
          tone="teal"
        />
        <StatCard
          label="Active"
          value={String(allStudents.filter((s) => rowText(s, "status") === "Active").length)}
          hint="Eligible for meals"
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Dietary plans"
          value={String(new Set(allStudents.map((s) => rowText(s, "meal_plan"))).size)}
          hint="Distinct plans"
          icon={ClipboardList}
          tone="amber"
        />
        <StatCard
          label="Dining halls"
          value={String(new Set(allStudents.map((s) => rowText(s, "hall"))).size)}
          hint="Assigned halls"
          icon={LayoutDashboard}
          tone="teal"
        />
      </div>

      <Surface className="overflow-hidden">
        <SurfaceHeader
          action={
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search student, roll code, hall..."
                className="h-9 rounded-full pl-8 text-xs"
              />
            </div>
          }
        >
          <div>
            <h2 className="text-sm font-semibold">Student dining directory</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Tenant-isolated Firestore student roster.
            </p>
          </div>
        </SurfaceHeader>

        {paginated.length ? (
          <TableFrame
            headers={["STUDENT", "CODE", "DINING HALL", "PLAN", "DIETARY NOTES", "STATUS"]}
          >
            {paginated.map((student) => (
              <TableRow key={rowText(student, "id", rowText(student, "student_code"))}>
                <TableCell className="font-medium">{rowText(student, "full_name")}</TableCell>
                <TableCell className="font-mono text-[11px] text-muted-foreground">
                  {rowText(student, "student_code")}
                </TableCell>
                <TableCell>{rowText(student, "hall")}</TableCell>
                <TableCell>
                  <StatusBadge label={rowText(student, "meal_plan")} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {rowText(student, "dietary_notes", "None")}
                </TableCell>
                <TableCell>
                  <StatusBadge label={rowText(student, "status")} />
                </TableCell>
              </TableRow>
            ))}
          </TableFrame>
        ) : (
          <EmptyRows title={t.empty.noStudentsTitle} note={t.empty.noStudentsDesc} icon={Users} />
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-5 py-3 text-xs">
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Surface>
    </div>
  );
}

function PurchasingPage({ props }: { props: DashboardProps }) {
  const {
    rows,
    purchaseOrders,
    inventoryItems,
    dataMode,
    canManageInventory,
    canManageFinance,
    onAction,
    onUpdateOrder,
    onAutoPoLowStock,
  } = props;
  const { language } = useFirebaseAuth();
  const t = TRANSLATIONS[language];
  const canMoveOrder = canManageInventory || canManageFinance;

  const orders = rows.filter((row) => typeof row.order_number === "string");
  const suppliers = rows.filter(
    (row) =>
      typeof row.name === "string" &&
      typeof row.category === "string" &&
      row.order_number === undefined &&
      row.cost_per_serving === undefined,
  );
  const displayedOrders =
    dataMode === "demo"
      ? ([
          {
            id: "demo-po-1",
            order_number: "PO-2026-018",
            supplier_name: "Greenfield Foods",
            item_summary: "Rice, toor dal",
            total_amount: 18400,
            status: "Approved",
            expected_date: shiftDateKey(0),
          },
          {
            id: "demo-po-2",
            order_number: "PO-2026-017",
            supplier_name: "Daily Harvest Co.",
            item_summary: "Tomatoes, spinach",
            total_amount: 9650,
            status: "Ordered",
            expected_date: shiftDateKey(1),
          },
        ] as FoodFlowRow[])
      : orders;

  const vendorVariance = useMemo(() => {
    const poSpecs = displayedOrders.map((po) => ({
      supplierName: rowText(po, "supplier_name"),
      totalPaise: Math.round(rowNumber(po, "total_amount") * 100),
      status: rowText(po, "status", "Pending") as PurchaseOrderDoc["status"],
    }));
    const invSpecs = inventoryItems.map((i) => ({
      supplierName: i.supplier_name,
      quantity: i.quantity,
      unitCostPaise: Math.round(i.unit_cost * 100),
    }));
    return computeVendorPriceVariance({
      purchaseOrders: dataMode === "live" && purchaseOrders.length > 0 ? purchaseOrders : poSpecs,
      inventoryItems: invSpecs,
    });
  }, [dataMode, displayedOrders, inventoryItems, purchaseOrders]);

  const totalPending = displayedOrders
    .filter((row) => !["Received", "Cancelled"].includes(rowText(row, "status")))
    .reduce((sum, row) => sum + rowNumber(row, "total_amount"), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeading
          page="purchasing"
          demo={dataMode === "demo"}
          action={() => onAction("order")}
        />
        {canManageInventory && dataMode === "live" && (
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            onClick={() => void onAutoPoLowStock()}
          >
            <Sparkles className="mr-1.5 size-3.5 text-[#FF7A1A]" />
            {t.actions.autoCreatePo}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Purchase orders"
          value={String(displayedOrders.length)}
          hint="Saved POs"
          icon={ClipboardList}
          tone="teal"
        />
        <StatCard
          label="In transit"
          value={String(
            displayedOrders.filter((r) => ["Approved", "Ordered"].includes(rowText(r, "status")))
              .length,
          )}
          hint="Approved / ordered"
          icon={Truck}
          tone="amber"
        />
        <StatCard
          label="Open PO spend"
          value={money(totalPending)}
          hint="Pending delivery"
          icon={CircleDollarSign}
          tone="green"
        />
        <StatCard
          label="Vendors"
          value={String(suppliers.length || vendorVariance.length)}
          hint="Tracked suppliers"
          icon={Users}
          tone="teal"
        />
      </div>

      <Surface className="overflow-hidden">
        <SurfaceHeader>
          <div>
            <h2 className="text-sm font-semibold">Purchase orders</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Advance PO status cleanly through receipt.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => onAction("supplier")}>
            <Plus className="mr-1 size-3.5" /> Add vendor
          </Button>
        </SurfaceHeader>
        {displayedOrders.length ? (
          <TableFrame
            headers={["PO #", "SUPPLIER", "ITEMS", "TOTAL", "EXPECTED", "STATUS", "NEXT"]}
            minimumWidth="820px"
          >
            {displayedOrders.map((order) => {
              const status = rowText(order, "status");
              return (
                <TableRow key={rowText(order, "id", rowText(order, "order_number"))}>
                  <TableCell className="font-mono text-[10px]">
                    {rowText(order, "order_number")}
                  </TableCell>
                  <TableCell className="font-medium">{rowText(order, "supplier_name")}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {rowText(order, "item_summary")}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {money(rowNumber(order, "total_amount"))}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {friendlyDate(rowText(order, "expected_date"))}
                  </TableCell>
                  <TableCell>
                    <StatusBadge label={status} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px]"
                      disabled={!canMoveOrder || dataMode === "demo" || status === "Received"}
                      onClick={() => void onUpdateOrder(order)}
                    >
                      {nextOrderStatus(status)}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableFrame>
        ) : (
          <EmptyRows title={t.empty.noOrdersTitle} note={t.empty.noOrdersDesc} icon={Truck} />
        )}
      </Surface>

      {vendorVariance.length > 0 && (
        <Surface className="overflow-hidden">
          <SurfaceHeader>
            <div>
              <h2 className="text-sm font-semibold">{t.ops.vendorVarianceTitle}</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Flags suppliers when order spend rises &gt;15% above baseline stocked value.
              </p>
            </div>
          </SurfaceHeader>
          <TableFrame
            headers={["SUPPLIER", "ORDERS", "PO SPEND", "STOCK VALUE", "PRICE VARIANCE"]}
            minimumWidth="640px"
          >
            {vendorVariance.map((v) => (
              <TableRow key={v.supplierName}>
                <TableCell className="font-medium">{v.supplierName}</TableCell>
                <TableCell>
                  {v.orderCount} ({v.pendingCount} open)
                </TableCell>
                <TableCell className="font-semibold">{moneyFromPaise(v.totalPaise)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {moneyFromPaise(v.inventoryValuePaise)}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    label={v.varianceStatus === "elevated" ? "Elevated (+15%)" : "Steady"}
                    tone={v.varianceStatus === "elevated" ? "amber" : "green"}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableFrame>
        </Surface>
      )}

      <Surface className="overflow-hidden">
        <SurfaceHeader>
          <div>
            <h2 className="text-sm font-semibold">Vendor directory</h2>
          </div>
        </SurfaceHeader>
        {suppliers.length ? (
          <div className="divide-y">
            {suppliers.map((sup) => (
              <div
                key={rowText(sup, "id", rowText(sup, "name"))}
                className="flex items-center justify-between px-5 py-3 text-xs"
              >
                <div>
                  <p className="font-semibold">{rowText(sup, "name")}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {rowText(sup, "category")} · {rowText(sup, "phone", "No phone")} ·{" "}
                    {rowText(sup, "email", "No email")}
                  </p>
                </div>
                <StatusBadge label={rowText(sup, "status", "Active")} />
              </div>
            ))}
          </div>
        ) : (
          <p className="p-6 text-center text-xs text-muted-foreground">
            No vendors saved yet. Add a vendor above.
          </p>
        )}
      </Surface>
    </div>
  );
}

function ForecastPage({ props }: { props: DashboardProps }) {
  const {
    rows,
    inventoryItems,
    invoices,
    payments,
    feedbackList,
    messSummary,
    cityState,
    dataMode,
    canOperate,
    onAction,
    onSaveForecastEstimate,
  } = props;
  const { language } = useFirebaseAuth();
  const t = TRANSLATIONS[language];

  const [weatherDays, setWeatherDays] = useState<WeatherDayForecast[]>([]);
  const [weatherLocation, setWeatherLocation] = useState(cityState || "New Delhi");
  const [weatherSource, setWeatherSource] = useState<"open-meteo" | "fallback" | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [tomorrowPrediction, setTomorrowPrediction] = useState<TomorrowDemandBreakdown | null>(
    null,
  );
  const [predictLoading, setPredictLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<InsightsResponse | null>(null);
  const [tipsLoading, setTipsLoading] = useState(false);

  const summary =
    messSummary ??
    buildSanitizedMessSummary({
      lang: language,
      inventoryItems,
      rows,
      invoices,
      payments,
      feedbackList,
    });

  const studentsCount = summary.operations.activeStudentsCount || (dataMode === "demo" ? 720 : 0);
  const pastAttendanceAvg = summary.operations.pastAttendanceAvg || (dataMode === "demo" ? 640 : 0);
  const forecasts = rows.filter(
    (row) => typeof row.forecast_date === "string" && row.expected_students !== undefined,
  );
  const displayed =
    dataMode === "demo"
      ? (["Breakfast", "Lunch", "Snacks", "Dinner"].map((meal, idx) => ({
          id: `demo-fc-${meal}`,
          forecast_date: shiftDateKey(1),
          meal_type: meal,
          expected_students: [410, 665, 340, 590][idx],
          confidence: 82,
          method: "sample",
        })) as FoodFlowRow[])
      : forecasts;

  const handleSyncWeather = useCallback(
    async (quiet = false) => {
      setWeatherLoading(true);
      try {
        const res = await fetchOpenMeteoForecast(cityState);
        setWeatherDays(res.days);
        setWeatherLocation(res.locationLabel);
        setWeatherSource(res.source);
        if (!quiet) {
          toast.success(
            res.source === "open-meteo"
              ? `Synced 7-day Open-Meteo weather for ${res.locationLabel} (no API key required).`
              : "Using neutral weather fallback.",
          );
        }
      } finally {
        setWeatherLoading(false);
      }
    },
    [cityState],
  );

  useEffect(() => {
    void handleSyncWeather(true);
  }, [handleSyncWeather]);

  const handlePredictTomorrow = async () => {
    setPredictLoading(true);
    try {
      const tomorrow = shiftDateKey(1);
      const tomorrowDateObj = new Date(`${tomorrow}T12:00:00Z`);
      const weekdayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
        tomorrowDateObj,
      );
      const tomorrowWeather =
        weatherDays.find((d) => d.date === tomorrow) ?? weatherDays[1] ?? weatherDays[0];
      const tomorrowEvent = summary.operations.upcomingHolidays.find((ev) => ev.date === tomorrow);
      const skips = rows.filter(
        (r) =>
          typeof r.meal_type === "string" &&
          rowText(r, "service_date") === tomorrow &&
          rowText(r, "status") === "skipped",
      ).length;

      const prediction = await requestDemandForecastAI({
        targetDate: tomorrow,
        weekdayName,
        lang: language,
        activeStudentsCount: studentsCount || 120,
        pastAttendanceAvg,
        tomorrowSkipsCount: skips,
        guestCount: 0,
        holidayFactor: tomorrowEvent?.attendanceFactor ?? 1,
        holidayNote: tomorrowEvent?.title ?? "Regular academic day",
        weatherTempMaxC: tomorrowWeather?.tempMaxC ?? 30,
        weatherRainMm: tomorrowWeather?.rainMm ?? 0,
        weatherCondition: tomorrowWeather?.conditionLabel ?? "Clear / Pleasant",
        weatherMultiplier: tomorrowWeather?.turnoutMultiplier ?? 1,
      });

      setTomorrowPrediction(prediction);

      if (dataMode === "live" && canOperate) {
        await onSaveForecastEstimate({
          forecastDate: tomorrow,
          mealType: "Lunch",
          expectedStudents: prediction.lunchPortions,
          confidence: prediction.confidence,
          method:
            prediction.source === "formula-fallback" ? "formula_fallback" : "gemini_open_meteo",
          weatherNote: tomorrowWeather
            ? `${tomorrowWeather.conditionLabel} (${tomorrowWeather.tempMaxC}°C, ${tomorrowWeather.rainMm}mm rain)`
            : "Baseline",
        });
      }
    } finally {
      setPredictLoading(false);
    }
  };

  const handleGenerateTips = async () => {
    setTipsLoading(true);
    try {
      const res = await requestInsightsAI({ kind: "menu_suggestions", summary });
      setAiInsights(res);
    } finally {
      setTipsLoading(false);
    }
  };

  const chart = displayed.map((row) => ({
    meal: rowText(row, "meal_type"),
    portions: rowNumber(row, "expected_students"),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeading
          page="forecast"
          demo={dataMode === "demo"}
          action={() => onAction("forecast")}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleSyncWeather()}
            disabled={weatherLoading}
          >
            <CloudRain className="mr-1.5 size-3.5 text-[#087E8B]" />
            {t.actions.refreshWeather}
          </Button>
          <Button
            size="sm"
            className="bg-[#087E8B] text-white"
            onClick={() => void handlePredictTomorrow()}
            disabled={predictLoading}
          >
            {predictLoading ? (
              <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 size-3.5 text-amber-300" />
            )}
            {t.ai.predictTomorrow}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleGenerateTips()}
            disabled={tipsLoading}
          >
            <Sparkles className="mr-1.5 size-3.5 text-[#FF7A1A]" />
            {t.ai.menuSuggestions}
          </Button>
        </div>
      </div>

      {/* Open-Meteo 7-day strip */}
      <Surface className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-[#172B3A]">
            Open-Meteo Free 7-Day Weather ({weatherLocation}) ·{" "}
            <span className="font-normal text-muted-foreground">
              {weatherSource === "open-meteo" ? "Live keyless API" : "Offline baseline"}
            </span>
          </span>
          <Badge variant="outline" className="text-[10px]">
            Free Tier (No API Key)
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {weatherDays.map((d) => (
            <div
              key={d.date}
              className="rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] p-2.5 text-xs"
            >
              <p className="font-semibold text-[#172B3A]">{friendlyDate(d.date)}</p>
              <p className="mt-1 text-sm font-extrabold text-[#087E8B]">
                {Math.round(d.tempMaxC)}°C
              </p>
              <p className="text-[10px] text-muted-foreground">{d.rainMm.toFixed(1)}mm rain</p>
              <p className="mt-1 text-[10px] font-bold text-[#FF7A1A]">
                ×{d.turnoutMultiplier.toFixed(2)} turnout
              </p>
            </div>
          ))}
        </div>
      </Surface>

      {tomorrowPrediction && (
        <Surface className="border-[#087E8B]/30 bg-[#F8FCFC] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-[#087E8B]">
                Tomorrow Meal Demand ({friendlyDate(tomorrowPrediction.targetDate)} ·{" "}
                {tomorrowPrediction.weekdayName})
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {tomorrowPrediction.rationale}
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] capitalize">
              {tomorrowPrediction.source === "formula-fallback"
                ? "Formula Fallback"
                : tomorrowPrediction.source === "cache"
                  ? "Cached Gemini"
                  : "Gemini Free Tier"}{" "}
              · {tomorrowPrediction.confidence}% conf.
            </Badge>
          </div>
          {tomorrowPrediction.notice && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800">
              {tomorrowPrediction.notice}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Breakfast", count: tomorrowPrediction.breakfastPortions },
              { label: "Lunch", count: tomorrowPrediction.lunchPortions },
              { label: "Snacks", count: tomorrowPrediction.snacksPortions },
              { label: "Dinner", count: tomorrowPrediction.dinnerPortions },
            ].map((slot) => (
              <div key={slot.label} className="rounded-xl border border-[#E5EAF0] bg-white p-3">
                <p className="text-[11px] font-semibold text-muted-foreground">{slot.label}</p>
                <p className="mt-1 text-xl font-extrabold tabular-nums text-[#172B3A]">
                  {slot.count.toLocaleString("en-IN")}
                </p>
                <p className="text-[10px] text-[#087E8B]">portions</p>
              </div>
            ))}
          </div>
        </Surface>
      )}

      {aiInsights && (
        <Surface className="border-[#087E8B]/30 bg-[#DDF3EA]/30 p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-[#087E8B]">
              {t.ai.menuSuggestions} · {aiInsights.highlightMetric}
            </p>
            <Badge variant="outline" className="text-[10px] capitalize">
              {aiInsights.source === "formula-fallback" ? "Formula Fallback" : aiInsights.source}
            </Badge>
          </div>
          {aiInsights.notice && (
            <p className="text-[11px] font-medium text-amber-800">{aiInsights.notice}</p>
          )}
          <ul className="space-y-1 text-xs text-[#172B3A]">
            {aiInsights.tips.map((tip, idx) => (
              <li key={idx}>• {tip}</li>
            ))}
          </ul>
        </Surface>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <Surface className="overflow-hidden">
          <SurfaceHeader>
            <div>
              <h2 className="text-sm font-semibold">Upcoming meal demand</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">Expected portions by meal</p>
            </div>
            <DatasetStamp demo={dataMode === "demo"} />
          </SurfaceHeader>
          <div className="h-[250px] p-5">
            {chart.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="meal"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  />
                  <RechartsTooltip />
                  <Bar
                    dataKey="portions"
                    name="Expected portions"
                    fill="var(--primary)"
                    radius={[3, 3, 0, 0]}
                    barSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <BlankChart
                title="No forecasts saved yet"
                note="Click Save Weather Forecast or Add Forecast above."
              />
            )}
          </div>
        </Surface>

        <Surface className="overflow-hidden">
          <SurfaceHeader>
            <div>
              <h2 className="text-sm font-semibold">Saved forecast records</h2>
            </div>
          </SurfaceHeader>
          {displayed.length ? (
            <div className="divide-y">
              {displayed.map((row) => (
                <div
                  key={rowText(row, "id", rowText(row, "meal_type"))}
                  className="flex items-center justify-between px-4 py-3 text-xs"
                >
                  <div>
                    <p className="font-semibold">{rowText(row, "meal_type")}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {friendlyDate(rowText(row, "forecast_date"))} · {rowNumber(row, "confidence")}
                      % confidence
                    </p>
                  </div>
                  <p className="text-sm font-bold tabular-nums">
                    {rowNumber(row, "expected_students")} portions
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyRows
              title="No saved forecasts yet"
              note="Save a weather-adjusted or manual forecast."
              icon={ChartNoAxesCombined}
            />
          )}
        </Surface>
      </div>
    </div>
  );
}

function WastePage({ props }: { props: DashboardProps }) {
  const {
    rows,
    inventoryItems,
    invoices,
    payments,
    feedbackList,
    messSummary,
    dataMode,
    onAction,
  } = props;
  const { language } = useFirebaseAuth();
  const t = TRANSLATIONS[language];
  const [wasteTips, setWasteTips] = useState<InsightsResponse | null>(null);
  const [wasteTipsLoading, setWasteTipsLoading] = useState(false);

  const entries = rows.filter(
    (row) => typeof row.dish_name === "string" && row.wasted_quantity !== undefined,
  );
  const displayed =
    dataMode === "demo"
      ? ([
          {
            id: "dw-1",
            dish_name: "Seasonal sabzi",
            waste_stage: "plate",
            prepared_quantity: 110,
            served_quantity: 102,
            wasted_quantity: 8,
            unit: "kg",
            waste_cost: 720,
            record_date: shiftDateKey(-1),
            meal_type: "Lunch",
          },
          {
            id: "dw-2",
            dish_name: "Dal tadka",
            waste_stage: "prep",
            prepared_quantity: 95,
            served_quantity: 89,
            wasted_quantity: 6,
            unit: "kg",
            waste_cost: 462,
            record_date: shiftDateKey(-2),
            meal_type: "Dinner",
          },
        ] as FoodFlowRow[])
      : entries;

  const prepared = displayed.reduce((sum, row) => sum + rowNumber(row, "prepared_quantity"), 0);
  const wasted = displayed.reduce((sum, row) => sum + rowNumber(row, "wasted_quantity"), 0);
  const prepStageKg = displayed
    .filter((r) => rowText(r, "waste_stage", "plate") === "prep")
    .reduce((sum, r) => sum + rowNumber(r, "wasted_quantity"), 0);
  const plateStageKg = displayed
    .filter((r) => rowText(r, "waste_stage", "plate") !== "prep")
    .reduce((sum, r) => sum + rowNumber(r, "wasted_quantity"), 0);
  const cost = displayed.reduce((sum, row) => sum + rowNumber(row, "waste_cost"), 0);
  const percent = prepared ? (wasted / prepared) * 100 : 0;

  const handleGenerateWasteTips = async () => {
    setWasteTipsLoading(true);
    try {
      const summary =
        messSummary ??
        buildSanitizedMessSummary({
          lang: language,
          inventoryItems,
          rows,
          invoices,
          payments,
          feedbackList,
        });
      const res = await requestInsightsAI({ kind: "waste_tips", summary });
      setWasteTips(res);
    } finally {
      setWasteTipsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeading page="waste" demo={dataMode === "demo"} action={() => onAction("waste")} />
        <Button
          size="sm"
          variant="outline"
          className="h-9"
          onClick={() => void handleGenerateWasteTips()}
          disabled={wasteTipsLoading}
        >
          {wasteTipsLoading ? (
            <LoaderCircle className="mr-1.5 size-3.5 animate-spin text-[#FF7A1A]" />
          ) : (
            <Sparkles className="mr-1.5 size-3.5 text-[#FF7A1A]" />
          )}
          {t.ai.wasteTips}
        </Button>
      </div>

      {wasteTips && (
        <Surface className="border-amber-300/60 bg-amber-50/40 p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-[#172B3A]">
              {t.ai.wasteTips} · {wasteTips.highlightMetric}
            </p>
            <Badge variant="outline" className="text-[10px] capitalize">
              {wasteTips.source === "formula-fallback" ? "Formula Fallback" : wasteTips.source}
            </Badge>
          </div>
          {wasteTips.notice && (
            <p className="text-[11px] font-medium text-amber-800">{wasteTips.notice}</p>
          )}
          <ul className="space-y-1 text-xs text-[#172B3A]">
            {wasteTips.tips.map((tip, idx) => (
              <li key={idx}>• {tip}</li>
            ))}
          </ul>
        </Surface>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Prepared"
          value={`${prepared.toLocaleString("en-IN")} kg`}
          hint="Recorded service"
          icon={CookingPot}
          tone="teal"
        />
        <StatCard
          label="Served"
          value={`${displayed.reduce((s, r) => s + rowNumber(r, "served_quantity"), 0).toLocaleString("en-IN")} kg`}
          hint="Consumed"
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Wasted"
          value={`${wasted.toLocaleString("en-IN")} kg`}
          hint={`${percent.toFixed(1)}% of prepared`}
          icon={Recycle}
          tone="amber"
        />
        <StatCard
          label="Waste cost"
          value={money(cost)}
          hint="Leakage value"
          icon={CircleDollarSign}
          tone="red"
        />
      </div>

      <Surface className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-xs">
        <span className="font-bold text-[#172B3A]">{t.ops.prepVsPlateTitle}:</span>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
            Prep / Kitchen: {prepStageKg.toFixed(1)} kg
          </Badge>
          <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-800">
            Plate / Diner: {plateStageKg.toFixed(1)} kg
          </Badge>
        </div>
      </Surface>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Surface className="overflow-hidden">
          <SurfaceHeader>
            <div>
              <h2 className="text-sm font-semibold">Food waste entries</h2>
            </div>
            <DatasetStamp demo={dataMode === "demo"} />
          </SurfaceHeader>
          {displayed.length ? (
            <TableFrame
              headers={["DATE", "MEAL", "DISH", "STAGE", "PREPARED", "SERVED", "WASTED", "COST"]}
            >
              {displayed.map((row, index) => (
                <TableRow key={rowText(row, "id", String(index))}>
                  <TableCell>{friendlyDate(rowText(row, "record_date"))}</TableCell>
                  <TableCell>
                    <StatusBadge label={rowText(row, "meal_type")} />
                  </TableCell>
                  <TableCell className="font-medium">{rowText(row, "dish_name")}</TableCell>
                  <TableCell>
                    <StatusBadge
                      label={rowText(row, "waste_stage", "plate") === "prep" ? "PREP" : "PLATE"}
                      tone={rowText(row, "waste_stage", "plate") === "prep" ? "amber" : "red"}
                    />
                  </TableCell>
                  <TableCell>
                    {rowNumber(row, "prepared_quantity")} {rowText(row, "unit", "kg")}
                  </TableCell>
                  <TableCell>
                    {rowNumber(row, "served_quantity")} {rowText(row, "unit", "kg")}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {rowNumber(row, "wasted_quantity")} {rowText(row, "unit", "kg")}
                  </TableCell>
                  <TableCell>{money(rowNumber(row, "waste_cost"))}</TableCell>
                </TableRow>
              ))}
            </TableFrame>
          ) : (
            <EmptyRows title={t.empty.noWasteTitle} note={t.empty.noWasteDesc} icon={Recycle} />
          )}
        </Surface>

        <Surface className="overflow-hidden">
          <SurfaceHeader>
            <h2 className="text-sm font-semibold">Served vs wasted</h2>
          </SurfaceHeader>
          <div className="h-[220px] p-4">
            {displayed.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Served", value: Math.max(0, prepared - wasted) },
                      { name: "Wasted", value: wasted },
                    ]}
                    innerRadius={52}
                    outerRadius={76}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill="var(--chart-2)" />
                    <Cell fill="var(--warning)" />
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <BlankChart title="No waste data yet" note="Log waste after meal service" />
            )}
          </div>
        </Surface>
      </div>
    </div>
  );
}

function AnalyticsPage({ props }: { props: DashboardProps }) {
  const { rows, dataMode, onNavigate } = props;
  const actuals = rows.filter(
    (row) => typeof row.service_date === "string" && row.cost_per_serving !== undefined,
  );
  const wasteEntries = rows.filter(
    (row) => row.waste_cost !== undefined && typeof row.dish_name === "string",
  );
  const weekly =
    dataMode === "demo"
      ? sampleTrend
      : actuals.map((row) => ({
          day: friendlyDate(rowText(row, "service_date")),
          served: rowNumber(row, "served_quantity"),
          forecast: rowNumber(row, "prepared_quantity"),
          cost: rowNumber(row, "prepared_quantity") * rowNumber(row, "cost_per_serving"),
        }));
  const costTotal = weekly.reduce((sum, day) => sum + day.cost, 0);
  const wasteTotal = wasteEntries.reduce((sum, row) => sum + rowNumber(row, "waste_cost"), 0);

  return (
    <div className="space-y-6">
      <PageHeading
        page="analytics"
        demo={dataMode === "demo"}
        action={() => onNavigate("reports")}
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Recorded food cost"
          value={money(costTotal)}
          hint="From service actuals"
          icon={CircleDollarSign}
          tone="teal"
        />
        <StatCard
          label="Cost per meal"
          value={
            actuals.length
              ? money(
                  costTotal /
                    Math.max(
                      1,
                      actuals.reduce((s, r) => s + rowNumber(r, "served_quantity"), 0),
                    ),
                )
              : dataMode === "demo"
                ? "₹68"
                : "—"
          }
          hint="Average plate cost"
          icon={Users}
          tone="green"
        />
        <StatCard
          label="Waste cost"
          value={money(wasteTotal)}
          hint="From waste logs"
          icon={Recycle}
          tone="amber"
        />
        <StatCard
          label="Actuals logged"
          value={String(actuals.length)}
          hint="Service entries"
          icon={CheckCircle2}
          tone="teal"
        />
      </div>

      <Surface className="overflow-hidden">
        <SurfaceHeader>
          <h2 className="text-sm font-semibold">Cost & meal service</h2>
          <DatasetStamp demo={dataMode === "demo"} />
        </SurfaceHeader>
        <div className="h-[300px] p-5">
          {weekly.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={weekly} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <YAxis
                  yAxisId="meals"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                />
                <YAxis
                  yAxisId="rupees"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                />
                <RechartsTooltip />
                <Bar
                  yAxisId="meals"
                  dataKey="served"
                  name="Meals served"
                  fill="var(--primary)"
                  radius={[3, 3, 0, 0]}
                  barSize={22}
                />
                <Line
                  yAxisId="rupees"
                  dataKey="cost"
                  name="Food cost (₹)"
                  stroke="var(--chart-4)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <BlankChart
              title="No service actuals recorded yet"
              note="Add service actuals on Kitchen Operations."
            />
          )}
        </div>
      </Surface>
    </div>
  );
}

function NotificationsPage({ props }: { props: DashboardProps }) {
  const {
    inventoryItems,
    notifications,
    dataMode,
    canModerate,
    onNavigate,
    onCreateBroadcastNotice,
  } = props;
  const { language } = useFirebaseAuth();
  const t = TRANSLATIONS[language];
  const [bTitle, setBTitle] = useState("");
  const [bDetail, setBDetail] = useState("");
  const [posting, setPosting] = useState(false);

  const lowItems = inventoryItems.filter((item) => item.quantity <= item.minimum_quantity);
  const expiring = inventoryItems.filter(
    (item) =>
      item.expiry_date && new Date(item.expiry_date).getTime() <= Date.now() + 7 * 86_400_000,
  );
  const notices =
    dataMode === "demo"
      ? [
          {
            title: "Mess Timing Notice: Sunday Special Feast at 12:45 IST",
            detail:
              "Broadcast by Hostel Warden · Extra guest tokens open until Saturday 20:00 IST.",
            time: "Broadcast",
            priority: "High",
            page: "notifications" as FoodFlowPage,
            isBroadcast: true,
          },
          ...sampleNotifications.map((n) => ({ ...n, isBroadcast: false })),
        ]
      : [
          ...notifications.map((n) => ({
            title: n.title,
            detail: n.detail,
            time: n.noticeType === "broadcast" ? "Broadcast" : "Workspace notice",
            priority: n.priority,
            page: (n.page as FoodFlowPage) || "notifications",
            isBroadcast: n.noticeType === "broadcast",
          })),
          ...lowItems.map((item) => ({
            title: `${item.name} is below minimum`,
            detail: `${item.quantity} ${item.unit} remaining · minimum ${item.minimum_quantity} ${item.unit}`,
            time: "Live inventory",
            priority: "High",
            page: "inventory" as FoodFlowPage,
            isBroadcast: false,
          })),
          ...expiring.map((item) => ({
            title: `${item.name} expiring soon (${item.expiry_date})`,
            detail: `${item.quantity} ${item.unit} — prioritize in kitchen FEFO prep`,
            time: "FEFO Alert",
            priority: "High",
            page: "inventory" as FoodFlowPage,
            isBroadcast: false,
          })),
        ];

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bTitle.trim() || !bDetail.trim()) return;
    setPosting(true);
    try {
      await onCreateBroadcastNotice({ title: bTitle, detail: bDetail });
      setBTitle("");
      setBDetail("");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeading page="notifications" demo={dataMode === "demo"} />

      {canModerate && dataMode === "live" && (
        <Surface className="border-amber-300/70 bg-amber-50/40 p-5">
          <form onSubmit={(e) => void handleBroadcastSubmit(e)} className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#172B3A]">
              <Megaphone className="size-4 text-[#FF7A1A]" />
              <span>{t.ops.emergencyBroadcastTitle}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto]">
              <Input
                value={bTitle}
                onChange={(e) => setBTitle(e.target.value)}
                placeholder="Headline (e.g. Dining Hall B maintenance)"
                className="h-9 bg-white text-xs"
                required
              />
              <Input
                value={bDetail}
                onChange={(e) => setBDetail(e.target.value)}
                placeholder="Message visible to all students & mess staff"
                className="h-9 bg-white text-xs"
                required
              />
              <Button
                type="submit"
                size="sm"
                disabled={posting}
                className="h-9 bg-[#FF7A1A] text-[#0F3D3A]"
              >
                {t.ops.postBroadcast}
              </Button>
            </div>
          </form>
        </Surface>
      )}

      <Surface className="overflow-hidden">
        <SurfaceHeader>
          <div>
            <h2 className="text-sm font-semibold">Live Alerts & Notifications</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {notices.length} active alert(s)
            </p>
          </div>
        </SurfaceHeader>
        {notices.length ? (
          <div className="divide-y divide-border">
            {notices.map((notice, idx) => (
              <div
                key={`${notice.title}-${idx}`}
                className={`flex items-start justify-between gap-3 px-5 py-4 text-xs ${
                  notice.isBroadcast ? "bg-amber-50/50" : ""
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {notice.isBroadcast && <Megaphone className="size-3.5 text-[#FF7A1A]" />}
                    <p className="font-semibold">{notice.title}</p>
                    <StatusBadge label={notice.priority} />
                  </div>
                  <p className="mt-1 text-muted-foreground">{notice.detail}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[#087E8B]"
                  onClick={() => onNavigate(notice.page)}
                >
                  Open <ArrowRight className="ml-1 size-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyRows
            title="All clear — no stock or expiry alerts"
            note="Low-stock, hygiene escalations, broadcasts, and FEFO alerts appear automatically."
            icon={CheckCircle2}
          />
        )}
      </Surface>
    </div>
  );
}

function ReportsPage({ props }: { props: DashboardProps }) {
  const { dataMode, rows, inventoryItems, institutionName } = props;
  const totalVal = inventoryItems.reduce((acc, i) => acc + i.quantity * i.unit_cost, 0);

  const handleDownloadCSV = () => {
    exportToCSV(
      `foodflow-inventory-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { key: "name", label: "Ingredient" },
        { key: "category", label: "Category" },
        { key: "quantity", label: "On Hand" },
        { key: "unit", label: "Unit" },
        { key: "minimum_quantity", label: "Minimum" },
        { key: "unit_cost", label: "Unit Cost (INR)" },
        { key: "expiry_date", label: "Expiry Date" },
      ],
      inventoryItems.map((i) => ({
        name: i.name,
        category: i.category,
        quantity: i.quantity,
        unit: i.unit,
        minimum_quantity: i.minimum_quantity,
        unit_cost: i.unit_cost,
        expiry_date: i.expiry_date ?? "",
      })),
    );
  };

  const handleDownloadPDF = () => {
    exportToPrintablePDF({
      title: "Institutional Mess Operational Report",
      institutionName: institutionName || "FoodFlow Workspace",
      subtitle: dataMode === "demo" ? "Sample workspace export" : "Live Firestore verified records",
      dateRange: `As of ${new Date().toLocaleDateString("en-IN")}`,
      headers: ["Ingredient", "Category", "Quantity", "Min Stock", "Unit Cost", "Supplier"],
      rows: inventoryItems.map((item) => [
        item.name,
        item.category,
        `${item.quantity} ${item.unit}`,
        `${item.minimum_quantity} ${item.unit}`,
        money(item.unit_cost),
        item.supplier_name || "—",
      ]),
      summary: [
        { label: "Inventory Items", value: String(inventoryItems.length) },
        { label: "Total Stock Value", value: money(totalVal) },
        { label: "Total Records", value: String(rows.length) },
      ],
    });
  };

  return (
    <div className="space-y-6">
      <PageHeading page="reports" demo={dataMode === "demo"} />
      <Surface className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">Export Workspace Reports</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Download UTF-8 CSV spreadsheets or print PDF audits from current records.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleDownloadPDF}>
              Print / Save PDF
            </Button>
            <Button size="sm" className="bg-[#087E8B] text-white" onClick={handleDownloadCSV}>
              <ArrowDownToLine className="mr-1.5 size-3.5" /> Export CSV
            </Button>
          </div>
        </div>
      </Surface>
    </div>
  );
}

function UsersPage({ props }: { props: DashboardProps }) {
  const {
    workspaceMembers,
    workspaceInvites,
    role,
    dataMode,
    onAction,
    onUpdateMemberRole,
    onToggleMemberStatus,
    onRemoveMember,
    onRevokeInvite,
  } = props;
  const { user, activeWorkspace, language } = useFirebaseAuth();
  const t = TRANSLATIONS[language];
  const isAdmin = role === "admin" && dataMode === "live";

  const copyInviteText = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard.`);
  };

  return (
    <div className="space-y-6">
      <PageHeading
        page="users"
        demo={dataMode === "demo"}
        {...(isAdmin
          ? { action: () => onAction("invite"), customActionLabel: t.actions.inviteTeammate }
          : {})}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Team members"
          value={String(workspaceMembers.length)}
          hint="Active & suspended in workspace"
          icon={Users}
          tone="teal"
        />
        <StatCard
          label="Your role"
          value={formatWorkspaceRole(role, language)}
          hint="Verified from Firestore membership"
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Pending invites"
          value={String(workspaceInvites.filter((i) => i.status === "pending").length)}
          hint="Share code or auto-claim on login"
          icon={UserPlus}
          tone="amber"
        />
        <StatCard
          label="Tenant isolation"
          value="Enforced"
          hint="Firestore Security Rules"
          icon={LockKeyhole}
          tone="green"
        />
      </div>

      {/* Members Table */}
      <Surface className="overflow-hidden">
        <SurfaceHeader
          action={
            isAdmin ? (
              <Button
                size="sm"
                className="bg-[#087E8B] text-white"
                onClick={() => onAction("invite")}
              >
                <Plus className="mr-1.5 size-3.5" /> {t.actions.inviteTeammate}
              </Button>
            ) : null
          }
        >
          <div>
            <h2 className="text-sm font-semibold">Workspace Members</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Stored in workspaces/{activeWorkspace?.id ?? "..."}/members. Admins can change roles,
              suspend, or remove.
            </p>
          </div>
        </SurfaceHeader>

        {workspaceMembers.length > 0 ? (
          <TableFrame
            headers={["MEMBER", "EMAIL", "ROLE", "STATUS", "ACTIONS"]}
            minimumWidth="780px"
          >
            {workspaceMembers.map((member) => {
              const isOwner = activeWorkspace?.ownerUid === member.uid;
              const isSelf = user?.uid === member.uid;
              return (
                <TableRow key={member.uid}>
                  <TableCell>
                    <p className="font-semibold">{member.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {member.uid.slice(0, 10)}…
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{member.email}</TableCell>
                  <TableCell>
                    {isAdmin && !isOwner ? (
                      <Select
                        value={member.role}
                        onValueChange={(next) =>
                          void onUpdateMemberRole(member, next as WorkspaceRole)
                        }
                      >
                        <SelectTrigger className="h-8 w-40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WORKSPACE_ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.labelEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <StatusBadge label={formatWorkspaceRole(member.role, language)} />
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge label={member.status === "suspended" ? "Suspended" : "Active"} />
                  </TableCell>
                  <TableCell>
                    {isAdmin && !isOwner && !isSelf ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px]"
                          onClick={() => void onToggleMemberStatus(member)}
                        >
                          {member.status === "suspended" ? "Reactivate" : "Suspend"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[10px] text-rose-600"
                          onClick={() => void onRemoveMember(member)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        {isOwner ? "Workspace Owner" : isSelf ? "You" : "Admin managed"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableFrame>
        ) : (
          <EmptyRows title={t.empty.noTeamTitle} note={t.empty.noTeamDesc} icon={Users} />
        )}
      </Surface>

      {/* Invites Table */}
      {isAdmin && (
        <Surface className="overflow-hidden">
          <SurfaceHeader>
            <div>
              <h2 className="text-sm font-semibold">Workspace Invites & Join Codes</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Invitees are auto-added on sign-in if invited by email, or can enter the code / open
                the join link.
              </p>
            </div>
          </SurfaceHeader>
          {workspaceInvites.length > 0 ? (
            <TableFrame
              headers={["EMAIL / TARGET", "ROLE", "CODE", "STATUS", "SHARE / REVOKE"]}
              minimumWidth="760px"
            >
              {workspaceInvites.map((inv) => {
                const origin = typeof window !== "undefined" ? window.location.origin : "";
                const joinUrl = `${origin}/join/${inv.code}`;
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">
                      {inv.email || "Any user with code"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge label={formatWorkspaceRole(inv.role, language)} />
                    </TableCell>
                    <TableCell className="font-mono font-bold text-[#087E8B]">{inv.code}</TableCell>
                    <TableCell>
                      <StatusBadge label={inv.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px]"
                          onClick={() => copyInviteText(inv.code, "Invite code")}
                        >
                          <Copy className="mr-1 size-3" /> Copy code
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px]"
                          onClick={() => copyInviteText(joinUrl, "Join link")}
                        >
                          Copy link
                        </Button>
                        {inv.status === "pending" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[10px] text-rose-600"
                            onClick={() => void onRevokeInvite(inv)}
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableFrame>
          ) : (
            <EmptyRows
              title="No invites sent yet"
              note="Click Invite member above to generate an email invite or shareable code."
              icon={UserPlus}
            />
          )}
        </Surface>
      )}
    </div>
  );
}

function SettingsPage({ props }: { props: DashboardProps }) {
  const {
    currentName,
    institutionName,
    institutionId,
    role,
    canManageFinance,
    workspaceSetup,
    onAction,
    onUpdateMessPolicySettings,
    onSignOut,
    dataMode,
  } = props;
  const { language } = useFirebaseAuth();
  const t = TRANSLATIONS[language];
  const aiUsage = useAiUsageToday();
  const [minDaysInput, setMinDaysInput] = useState(String(workspaceSetup.minRebateDays));
  const [savingPolicy, setSavingPolicy] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeading page="settings" demo={dataMode === "demo"} />

      <Suspense fallback={<ModuleSkeleton />}>
        <LazyDataHealthCard />
      </Suspense>

      <Surface className="overflow-hidden">
        <SurfaceHeader
          action={
            <Badge variant="outline" className="font-mono text-[10px]">
              IST {aiUsage.dateKey}
            </Badge>
          }
        >
          <div>
            <h2 className="text-sm font-semibold">{t.ai.usageTitle}</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">{t.ai.usageSubtitle}</p>
          </div>
        </SurfaceHeader>
        <div className="grid gap-3 p-5 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-muted/20 p-3.5">
            <p className="text-[11px] font-medium text-muted-foreground">{t.ai.apiCallsLabel}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#087E8B]">
              {aiUsage.apiCallsToday}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {aiUsage.lastModel ?? "gemini-3.1-flash-lite"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3.5">
            <p className="text-[11px] font-medium text-muted-foreground">{t.ai.cachedHitsLabel}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-emerald-700">
              {aiUsage.cachedHitsToday}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Zero quota spent</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3.5">
            <p className="text-[11px] font-medium text-muted-foreground">
              {t.ai.fallbackCallsLabel}
            </p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-amber-700">
              {aiUsage.formulaFallbacksToday}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {aiUsage.lastStatus === "quota_fallback" ? "Quota protected" : "Ready"}
            </p>
          </div>
        </div>
        <div className="border-t border-border bg-muted/10 px-5 py-2.5 text-[11px] text-muted-foreground">
          {t.ai.freeTierNote}
        </div>
      </Surface>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.76fr)]">
        <Surface className="overflow-hidden">
          <SurfaceHeader>
            <div>
              <h2 className="text-sm font-semibold">Account & Workspace Details</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Connected directly to Firebase Auth & Firestore.
              </p>
            </div>
          </SurfaceHeader>
          <div className="divide-y divide-border">
            <SettingRow label="Display name" value={currentName} action={() => onAction("name")} />
            <SettingRow
              label="Workspace"
              value={institutionName ?? "Not created"}
              action={() => onAction("institution")}
            />
            <SettingRow label="Active role" value={formatWorkspaceRole(role, language)} />
            <SettingRow label="Workspace ID" value={institutionId ?? "None"} />
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
              <div>
                <p className="text-xs font-medium">{t.ops.minRebateRule}</p>
                <p className="text-[10px] text-muted-foreground">
                  Applied to student leave requests & monthly invoice deductions.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={minDaysInput}
                  onChange={(e) => setMinDaysInput(e.target.value)}
                  className="h-8 w-20 text-center text-xs font-semibold"
                  disabled={!canManageFinance || dataMode === "demo"}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={!canManageFinance || dataMode === "demo" || savingPolicy}
                  onClick={async () => {
                    setSavingPolicy(true);
                    try {
                      await onUpdateMessPolicySettings(
                        Math.max(1, Math.min(30, Number(minDaysInput) || 3)),
                      );
                    } finally {
                      setSavingPolicy(false);
                    }
                  }}
                >
                  {t.actions.save}
                </Button>
              </div>
            </div>
          </div>
        </Surface>

        <Surface className="overflow-hidden">
          <SurfaceHeader>
            <div>
              <h2 className="text-sm font-semibold">Security & Session</h2>
            </div>
          </SurfaceHeader>
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-4 text-success" />
                <div>
                  <p className="text-xs font-medium">Firestore Security Rules</p>
                  <p className="text-[10px] text-muted-foreground">Tenant-isolated per workspace</p>
                </div>
              </div>
              <StatusBadge label="Active" />
            </div>
            <div className="p-4">
              <Button variant="outline" className="w-full" onClick={onSignOut}>
                Sign out <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </div>
        </Surface>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: () => void;
}) {
  return (
    <div className="flex items-center gap-4 p-4 sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className="max-w-52 truncate text-right text-xs text-muted-foreground">{value}</p>
      {action && (
        <Button variant="outline" size="sm" className="h-8" onClick={action}>
          Edit
        </Button>
      )}
    </div>
  );
}

function SupplierPage({ props }: { props: DashboardProps }) {
  const rows = props.rows.filter(
    (row) =>
      typeof row.name === "string" &&
      typeof row.category === "string" &&
      row.cost_per_serving === undefined,
  );
  return (
    <div className="space-y-6">
      <PageHeading
        page="suppliers"
        demo={props.dataMode === "demo"}
        action={() => props.onAction("supplier")}
      />
      <Surface className="overflow-hidden">
        <SurfaceHeader>
          <h2 className="text-sm font-semibold">Vendor Directory</h2>
        </SurfaceHeader>
        {rows.length ? (
          <TableFrame headers={["VENDOR", "CATEGORY", "CONTACT", "EMAIL", "PHONE", "STATUS"]}>
            {rows.map((row) => (
              <TableRow key={rowText(row, "id", rowText(row, "name"))}>
                <TableCell className="font-medium">{rowText(row, "name")}</TableCell>
                <TableCell>{rowText(row, "category")}</TableCell>
                <TableCell>{rowText(row, "contact_name")}</TableCell>
                <TableCell className="text-muted-foreground">{rowText(row, "email")}</TableCell>
                <TableCell className="text-muted-foreground">{rowText(row, "phone")}</TableCell>
                <TableCell>
                  <StatusBadge label={rowText(row, "status")} />
                </TableCell>
              </TableRow>
            ))}
          </TableFrame>
        ) : (
          <EmptyRows
            title="No vendors listed yet"
            note="Add your regular grocery, dairy, and produce vendors."
            icon={Truck}
          />
        )}
      </Surface>
    </div>
  );
}

function CalendarEventsPage({ props }: { props: DashboardProps }) {
  const { language } = useFirebaseAuth();
  const t = TRANSLATIONS[language];
  const events = props.rows.filter((row) => typeof row.event_date === "string");
  const studentKey = props.currentName.replaceAll(/\s+/g, "_").toUpperCase();
  return (
    <div className="space-y-6">
      <PageHeading
        page="calendar"
        demo={props.dataMode === "demo"}
        action={() => props.onAction("event")}
      />
      <Surface className="overflow-hidden">
        <SurfaceHeader>
          <h2 className="text-sm font-semibold">Academic & Hostel Events</h2>
        </SurfaceHeader>
        {events.length ? (
          <TableFrame headers={["DATE", "EVENT", "DETAILS", "FACTOR", "RSVPs", "ACTION"]}>
            {events.map((event) => {
              const id = rowText(event, "id");
              const rsvps = Array.isArray(event["rsvp_student_codes"])
                ? (event["rsvp_student_codes"] as string[])
                : [];
              const hasRsvp = rsvps.includes(studentKey);
              return (
                <TableRow key={id}>
                  <TableCell>
                    {friendlyDate(rowText(event, "event_date"), {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="font-medium">{rowText(event, "title")}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {rowText(event, "description")}
                  </TableCell>
                  <TableCell>{rowNumber(event, "attendance_factor", 1).toFixed(2)}×</TableCell>
                  <TableCell>{rsvps.length}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={hasRsvp ? "default" : "outline"}
                      className="h-7 text-[10px]"
                      disabled={props.dataMode === "demo"}
                      onClick={() => void props.onToggleEventRsvp(id, studentKey)}
                    >
                      {hasRsvp ? t.ops.rsvped : t.ops.feastRsvp}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableFrame>
        ) : (
          <EmptyRows
            title="No campus events yet"
            note="Add exams, holidays, or hostel fests to adjust forecast factors."
            icon={CalendarDays}
          />
        )}
      </Surface>
    </div>
  );
}

function HallsPage({ props }: { props: DashboardProps }) {
  const halls = props.rows.filter(
    (row) => typeof row.name === "string" && row.capacity !== undefined,
  );
  return (
    <div className="space-y-6">
      <PageHeading
        page="halls"
        demo={props.dataMode === "demo"}
        action={() => props.onAction("hall")}
      />
      <Surface className="overflow-hidden">
        <SurfaceHeader>
          <h2 className="text-sm font-semibold">Dining Halls</h2>
        </SurfaceHeader>
        {halls.length ? (
          <TableFrame headers={["DINING HALL", "CAPACITY", "STATUS"]}>
            {halls.map((hall) => (
              <TableRow key={rowText(hall, "id")}>
                <TableCell className="font-medium">{rowText(hall, "name")}</TableCell>
                <TableCell>{rowNumber(hall, "capacity").toLocaleString("en-IN")}</TableCell>
                <TableCell>
                  <StatusBadge label="Active" />
                </TableCell>
              </TableRow>
            ))}
          </TableFrame>
        ) : (
          <EmptyRows
            title="No dining halls listed"
            note="Add dining halls to track seating capacity."
            icon={LayoutDashboard}
          />
        )}
      </Surface>
    </div>
  );
}

function GenericRowsPage({
  props,
  title,
  keys,
  headers,
  createKind,
  icon: Icon,
}: {
  props: DashboardProps;
  title: FoodFlowPage;
  keys: { key: string; label: string; format?: (row: FoodFlowRow) => ReactNode }[];
  headers: string[];
  createKind: string;
  icon: typeof Package;
}) {
  const records = props.rows;
  return (
    <div className="space-y-6">
      <PageHeading
        page={title}
        demo={props.dataMode === "demo"}
        action={() => props.onAction(createKind)}
      />
      <Surface className="overflow-hidden">
        <SurfaceHeader>
          <h2 className="text-sm font-semibold">{pageTitle(title)}</h2>
        </SurfaceHeader>
        {records.length ? (
          <TableFrame headers={headers}>
            {records.map((row, index) => (
              <TableRow key={rowText(row, "id", String(index))}>
                {keys.map((key) => (
                  <TableCell key={key.key}>
                    {key.format ? key.format(row) : rowText(row, key.key)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableFrame>
        ) : (
          <EmptyRows
            title={`No ${pageTitle(title).toLowerCase()} recorded yet`}
            note="Records added by your team appear here immediately."
            icon={Icon}
          />
        )}
      </Surface>
    </div>
  );
}

export function FoodFlowContent(props: DashboardProps) {
  const { currentPage, institutionId, dataMode } = props;
  if (
    currentPage !== "overview" &&
    !institutionId &&
    dataMode === "live" &&
    !["settings", "users"].includes(currentPage)
  ) {
    return (
      <SetupPanel
        institutionName={props.institutionName}
        onAction={(kind) => props.onAction(kind)}
      />
    );
  }
  if (currentPage === "overview") return <DashboardOverview props={props} />;
  if (currentPage === "meal-planning" || currentPage === "weekly-menu")
    return <MealPlanningPage props={props} />;
  if (currentPage === "recipes") return <RecipesPage props={props} />;
  if (currentPage === "kitchen") return <KitchenPage props={props} />;
  if (currentPage === "inventory") return <InventoryPage props={props} />;
  if (currentPage === "purchasing") return <PurchasingPage props={props} />;
  if (currentPage === "attendance") return <AttendancePage props={props} />;
  if (currentPage === "students") return <StudentsPage props={props} />;
  if (currentPage === "forecast") return <ForecastPage props={props} />;
  if (currentPage === "waste") return <WastePage props={props} />;
  if (currentPage === "billing") {
    return (
      <Suspense fallback={<ModuleSkeleton />}>
        <LazyBillingModule
          invoices={props.invoices}
          payments={props.payments}
          leaves={props.leaves}
          institutionName={props.institutionName || "FoodFlow Workspace"}
          minRebateDays={props.workspaceSetup.minRebateDays}
          dataMode={props.dataMode}
          canManageFinance={props.canManageFinance}
          onGenerateBills={props.onGenerateBills}
          onRecordPayment={props.onRecordPayment}
          onUpdateLeaveStatus={props.onUpdateLeaveStatus}
        />
      </Suspense>
    );
  }
  if (currentPage === "feedback") {
    return (
      <Suspense fallback={<ModuleSkeleton />}>
        <LazyFeedbackModule
          feedback={props.feedbackList}
          complaints={props.complaintsList}
          institutionName={props.institutionName || "FoodFlow Workspace"}
          {...(props.messSummary ? { messSummary: props.messSummary } : {})}
          dataMode={props.dataMode}
          canModerate={props.canModerate}
          onSubmitFeedback={props.onSubmitFeedback}
          onUpdateFeedbackStatus={props.onUpdateFeedbackStatus}
          onModerateFeedback={props.onModerateFeedback}
          onSubmitComplaint={props.onSubmitComplaint}
          onResolveComplaint={props.onResolveComplaint}
        />
      </Suspense>
    );
  }
  if (currentPage === "analytics") return <AnalyticsPage props={props} />;
  if (currentPage === "notifications") return <NotificationsPage props={props} />;
  if (currentPage === "reports") return <ReportsPage props={props} />;
  if (currentPage === "users") return <UsersPage props={props} />;
  if (currentPage === "settings") return <SettingsPage props={props} />;
  if (currentPage === "calendar") return <CalendarEventsPage props={props} />;
  if (currentPage === "suppliers") return <SupplierPage props={props} />;
  if (currentPage === "halls") return <HallsPage props={props} />;
  if (currentPage === "movements") {
    return (
      <GenericRowsPage
        props={props}
        title="movements"
        keys={[
          { key: "item_name", label: "Item" },
          { key: "quantity_delta", label: "Change" },
          { key: "unit", label: "Unit" },
          { key: "reason", label: "Reason" },
          {
            key: "moved_at",
            label: "Date",
            format: (row) => friendlyDate(rowText(row, "moved_at")),
          },
        ]}
        headers={["ITEM", "CHANGE", "UNIT", "REASON", "DATE"]}
        createKind="movement"
        icon={Package}
      />
    );
  }
  if (currentPage === "actuals") {
    return (
      <GenericRowsPage
        props={props}
        title="actuals"
        keys={[
          {
            key: "service_date",
            label: "Date",
            format: (row) => friendlyDate(rowText(row, "service_date")),
          },
          { key: "meal_type", label: "Meal" },
          { key: "dish_name", label: "Dish" },
          { key: "prepared_quantity", label: "Prepared" },
          { key: "served_quantity", label: "Served" },
          { key: "leftover_quantity", label: "Leftover" },
        ]}
        headers={["DATE", "MEAL", "DISH", "PREPARED", "SERVED", "LEFTOVER"]}
        createKind="actual"
        icon={ClipboardList}
      />
    );
  }
  return <DashboardOverview props={props} />;
}

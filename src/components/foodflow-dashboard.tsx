import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Activity, ArrowDownRight, ArrowDownToLine, ArrowRight, ArrowUpRight, CalendarDays, ChartNoAxesCombined, CheckCircle2, ChefHat, CircleDollarSign, ClipboardList, Clock3, CookingPot, Flame, LayoutDashboard, LoaderCircle, LockKeyhole, Package, Plus, Recycle, RefreshCw, ScanLine, ShieldCheck, Sparkles, Truck, Users, Wifi, WifiOff } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { moduleDescriptions, sampleMeals, sampleNotifications, sampleRecipes, sampleStudents, sampleTrend, sampleWaste, type DemoInventoryItem, type FoodFlowPage } from "@/lib/foodflow-data";
import { dateKey, friendlyDate, money, nextOrderStatus, pageTitle, roleLabel, rowNumber, rowText, shiftDateKey, type FoodFlowMember, type FoodFlowRow } from "@/lib/foodflow-models";
import { getPendingAttendanceQueue, queueAttendance, syncPendingAttendance } from "@/lib/offline-attendance";

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
  role: string | null;
  canManage: boolean;
  canOperate: boolean;
  inventoryItems: DemoInventoryItem[];
  rows: FoodFlowRow[];
  members: FoodFlowMember[];
  dataMode: "live" | "demo";
  currencyCode: string;
  timezone: string;
  onAction: (kind: string, initial?: FoodFlowRow | null) => void;
  onNavigate: (page: FoodFlowPage) => void;
  onToggleDemo: () => void;
  onAdjustStock: (item: DemoInventoryItem, delta: number, reason: string) => Promise<void>;
  onDeleteStock: (item: DemoInventoryItem) => void;
  onUpdateTask: (row: FoodFlowRow, fields: Record<string, string | number | string[]>) => Promise<void>;
  onUpdateOrder: (row: FoodFlowRow) => Promise<void>;
  onChangeRole: (email: string, role: string) => void;
  onRemoveRole: (member: FoodFlowMember, role: string) => void;
  onSaveDisplayName: (name: string) => void;
  onSignOut: () => void;
};

import { exportToCSV, exportToPrintablePDF } from "@/lib/export-helpers";

function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[24px] border border-border/70 bg-card shadow-sm ${className}`}>
      {children}
    </section>
  );
}

function SurfaceHeader({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-5 py-4 sm:px-6">
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
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl shadow-xs ${iconColor}`}>
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
  return <Badge variant="outline" className={`rounded-sm px-2 py-0.5 text-[10px] font-medium ${demo ? "border-warning/30 bg-warning/10 text-warning" : "border-success/30 bg-success/10 text-success"}`}>{demo ? "Illustrative sample" : "Live records"}</Badge>;
}

function SetupPanel({ institutionName, onAction }: { institutionName: string | null; onAction: (kind: string) => void }) {
  return (
    <div className="max-w-[720px] py-6 sm:py-10">
      <div className="mb-5 flex size-12 items-center justify-center rounded-md bg-teal-soft text-primary"><Package className="size-5" /></div>
      <p className="mb-3 text-[10px] font-semibold text-muted-foreground">FIRST STEPS</p>
      <h2 className="text-2xl font-semibold">Start your FoodFlow workspace.</h2>
      <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">{institutionName ? "Your sign-in is ready. Choose a workspace name to begin organising meals." : "Set up your institution, then invite the people who plan and prepare each meal."}</p>
      <div className="mt-8 grid gap-0 border-y border-border sm:grid-cols-3">
        {[{ title: "Name your workspace", description: "Add your institution name." }, { title: "Bring your team", description: "Give each teammate the right access." }, { title: "Organise service", description: "Start with meals, stock and recipes." }].map((item, index) => <div key={item.title} className="flex items-start gap-3 border-b border-border py-4 last:border-0 sm:border-b-0 sm:border-r sm:px-4 sm:first:pl-0 sm:last:border-0 sm:last:pr-0"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-teal-soft text-xs font-semibold text-primary">{index + 1}</span><div><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.description}</p></div></div>)}
      </div>
      <Button className="mt-6" onClick={() => onAction("institution")}>Set up institution<ArrowRight className="size-4" /></Button>
    </div>
  );
}

function DashboardOverview({ props }: { props: DashboardProps }) {
  const { rows, inventoryItems, dataMode, institutionName, currentName, onAction, onNavigate } = props;
  const today = shiftDateKey(0);
  const tomorrow = shiftDateKey(1);
  const todayMeals = rows.filter((row) => row.service_date === today && (row.is_demo !== true || dataMode === "demo"));
  const planForDay = todayMeals.length > 0 ? todayMeals : rows.filter((row) => row.service_date === tomorrow && (row.is_demo !== true || dataMode === "demo"));
  const plannedServings = planForDay.reduce((sum, row) => sum + rowNumber(row, "expected_servings"), 0);
  const onHandValue = inventoryItems.reduce((sum, item) => sum + Number(item.quantity ?? 0) * Number(item.unit_cost ?? 0), 0);
  const lowStock = inventoryItems.filter((item) => item.quantity <= item.minimum_quantity);
  const recentTasks = rows.filter((row) => typeof row.status === "string" && typeof row.dish_name === "string").slice(0, 4);
  const mealsToServe = planForDay.map((row) => ({ meal: rowText(row, "meal_type"), dish: rowText(row, "title"), servings: rowNumber(row, "expected_servings"), status: rowText(row, "status") }));
  const shownMeals = mealsToServe.length ? mealsToServe.slice(0, 4) : sampleMeals.map((meal) => ({ meal: meal.meal, dish: meal.dish, servings: meal.portions, status: meal.status }));
  const metrics = [
    { label: "Planned meals today", value: dataMode === "live" && todayMeals.length === 0 ? "—" : String(todayMeals.length || (dataMode === "demo" ? 4 : 0)), hint: todayMeals.length ? "From today’s published plans" : dataMode === "demo" ? "Illustrative daily schedule" : "No meal plans recorded", icon: CalendarDays, tone: "teal" as const },
    { label: "Expected students", value: dataMode === "live" && !plannedServings ? "—" : plannedServings.toLocaleString("en-IN"), hint: todayMeals.length ? "Across today’s planned service" : dataMode === "demo" ? "Illustrative meal portions" : "Add a meal plan to begin", icon: Users, tone: "green" as const },
    { label: "Meals recorded served", value: dataMode === "demo" ? "1,842" : "—", hint: dataMode === "demo" ? "Illustrative example only" : "Attendance has not been connected", icon: CheckCircle2, tone: "teal" as const },
    { label: "Inventory value", value: dataMode === "live" && !inventoryItems.length ? "—" : money(onHandValue), hint: inventoryItems.length ? `${inventoryItems.length} ingredients in stock` : "No stock entered yet", icon: Package, tone: "amber" as const },
    { label: "Cost per meal", value: dataMode === "demo" ? "₹68.40" : "—", hint: dataMode === "demo" ? "Illustrative sample only" : "Add service actuals to calculate", icon: CircleDollarSign, tone: "green" as const },
    { label: "Food waste", value: dataMode === "demo" ? "6.2%" : "—", hint: dataMode === "demo" ? "Illustrative sample only" : "Log leftovers to measure", icon: Recycle, tone: "amber" as const },
  ];

  const liveChart = rows.filter((row) => typeof row.forecast_date === "string" || typeof row.service_date === "string");
  const chartData = useMemo(() => {
    if (dataMode === "demo") return sampleTrend;
    if (!liveChart.length) return [];
    const byDay = new Map<string, { day: string; served: number; forecast: number; cost: number }>();
    for (const row of liveChart) {
      const rawDate = rowText(row, "service_date", rowText(row, "forecast_date"));
      if (!rawDate || rawDate === "—") continue;
      const parsed = new Date(`${rawDate}T12:00:00`);
      const day = Number.isNaN(parsed.getTime()) ? rawDate : new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(parsed);
      const item = byDay.get(day) ?? { day, served: 0, forecast: 0, cost: 0 };
      item.served += rowNumber(row, "served_quantity");
      item.forecast += rowNumber(row, "expected_students");
      item.cost += rowNumber(row, "waste_cost");
      byDay.set(day, item);
    }
    return Array.from(byDay.values()).slice(-7);
  }, [dataMode, liveChart]);

  const lowStockDisplay = lowStock.length ? lowStock.slice(0, 4).map((item) => ({ name: item.name, quantity: item.quantity, unit: item.unit, minimum: item.minimum_quantity, isDemo: dataMode === "demo" })) : dataMode === "demo" ? ["Basmati rice", "Fresh spinach", "Canned tomatoes"].map((name, index) => ({ name, quantity: [42, 8, 14][index] ?? 0, unit: "kg", minimum: [50, 12, 18][index] ?? 1, isDemo: true })) : [];
  const stockMax = Math.max(...lowStockDisplay.map((item) => item.minimum), 1);
  const wasteAverage = sampleWaste.reduce((sum, entry) => sum + entry.wasted, 0) / sampleWaste.length;

  return (
    <div className="space-y-7">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0"><p className="mb-2 text-[10px] font-semibold text-muted-foreground">{new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()).toUpperCase()}</p><h1 className="text-2xl font-semibold leading-tight sm:text-[30px]">{`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${currentName.split(" ")[0]}`}</h1><p className="mt-2 text-sm text-muted-foreground">Here’s what’s happening in your mess today.</p></div>
        <div className="flex flex-wrap items-center gap-2"><DatasetStamp demo={dataMode === "demo"} /><Button variant="outline" size="sm" className="h-9" onClick={() => onAction("report")}><ArrowDownToLine className="size-4" />Export report</Button><Button size="sm" className="h-9" onClick={() => onAction("meal")}><Plus className="size-4" />Plan today’s meals</Button></div>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-6 sm:gap-4">{metrics.map((metric) => <StatCard key={metric.label} {...metric} />)}</div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.62fr)_minmax(300px,0.9fr)]">
        <Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Weekly meal consumption</h2><p className="mt-1 text-[11px] text-muted-foreground">Compare service counts with the forecast</p></div><DatasetStamp demo={dataMode === "demo"} /></SurfaceHeader><div className="h-[260px] p-4 pr-5 sm:h-[284px] sm:p-5">{chartData.length ? <ResponsiveContainer width="100%" height="100%"><ComposedChart data={chartData} margin={{ top: 12, right: 4, left: -18, bottom: 0 }}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} /><RechartsTooltip contentStyle={{ border: "1px solid var(--border)", borderRadius: "6px", background: "var(--card)", color: "var(--foreground)" }} /><Bar dataKey="served" name="Served" fill="var(--primary)" radius={[3, 3, 0, 0]} barSize={18} /><Line dataKey="forecast" name="Forecast" stroke="var(--chart-3)" strokeWidth={2} strokeDasharray="5 4" dot={false} /></ComposedChart></ResponsiveContainer> : <BlankChart title="No meal records yet" note="Record meal service to see a comparison here." />}</div><div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border px-5 py-3 text-[10px] text-muted-foreground"><span className="flex items-center gap-2"><i className="size-2 rounded-sm bg-primary" />Recorded served</span><span className="flex items-center gap-2"><i className="h-0.5 w-4 border-t-2 border-dashed border-warning" />Meal forecast</span><span className="ml-auto">{chartData.length ? "Last 7 service days" : "Awaiting recorded activity"}</span></div></Surface>

        <Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Today’s kitchen schedule</h2><p className="mt-1 text-[11px] text-muted-foreground">A quick look at planned meal service</p></div><Button variant="ghost" size="icon" aria-label="Open kitchen schedule" onClick={() => onNavigate("kitchen")}><ArrowRight className="size-4" /></Button></SurfaceHeader><div className="divide-y divide-border">{shownMeals.map((meal, index) => { const isDone = meal.status.toLowerCase() === "completed"; const isActive = meal.status.toLowerCase() === "in progress"; return <button key={`${meal.meal}-${index}`} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50" onClick={() => onNavigate("kitchen")}><div className={`h-10 w-1 shrink-0 rounded-full ${isDone ? "bg-success" : isActive ? "bg-warning" : "bg-border"}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><p className="text-xs font-medium">{meal.meal}</p><span className="text-[10px] text-muted-foreground">· {(meal.servings ?? 0).toLocaleString("en-IN")} portions</span></div><p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{meal.dish}</p></div><Badge variant="outline" className="rounded-sm px-2 py-0.5 text-[10px] text-muted-foreground">{meal.status}</Badge></button>; })}</div><div className="flex items-center gap-2 border-t border-border px-4 py-3 text-[10px] text-muted-foreground"><Clock3 className="size-3.5" />{dataMode === "demo" ? "Example schedule · not connected service data" : "Meal plans update with your institution records"}</div></Surface>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Inventory health</h2><p className="mt-1 text-[11px] text-muted-foreground">Ingredients closest to their minimum stock</p></div><Button variant="ghost" size="icon" aria-label="Open inventory" onClick={() => onNavigate("inventory")}><ArrowRight className="size-4" /></Button></SurfaceHeader><div className="p-4 sm:p-5">{lowStockDisplay.length ? <div className="space-y-4">{lowStockDisplay.map((item) => <div key={item.name} className="grid grid-cols-[minmax(100px,1fr)_minmax(100px,1.1fr)_58px] items-center gap-3"><div className="min-w-0"><p className="truncate text-xs font-medium">{item.name}</p><p className="mt-1 text-[10px] text-muted-foreground">Minimum {item.minimum} {item.unit}</p></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-warning" style={{ width: `${Math.min(100, Math.max(8, item.quantity / stockMax * 100))}%` }} /></div><p className="text-right text-[10px] font-medium tabular-nums">{item.quantity} {item.unit}</p></div>)}</div> : <BlankSection icon={Package} title="Stock hasn’t been added" note="Add your first ingredient to start tracking supplies." action="Add ingredient" onAction={() => onAction("inventory")} />}</div><div className="flex items-center justify-between border-t border-border px-5 py-3 text-[10px] text-muted-foreground"><span>Values reflect the latest stock entry.</span><span>{lowStockDisplay.length} items to review</span></div></Surface>

        <Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Cost & food-waste snapshot</h2><p className="mt-1 text-[11px] text-muted-foreground">Weekly kitchen efficiency</p></div><DatasetStamp demo={dataMode === "demo"} /></SurfaceHeader><div className="grid gap-0 sm:grid-cols-2"><div className="border-b border-border p-4 sm:border-b-0 sm:border-r sm:p-5"><p className="text-xs text-muted-foreground">Food cost this week</p><p className="mt-2 text-2xl font-semibold tabular-nums">{dataMode === "demo" ? "₹4.47L" : "—"}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">{dataMode === "demo" ? <><ArrowDownRight className="size-3 text-success" /> Illustrative sample only</> : "Add kitchen actuals to calculate"}</p><div className="mt-5 h-[92px]">{dataMode === "demo" ? <ResponsiveContainer width="100%" height="100%"><BarChart data={sampleTrend} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}><Bar dataKey="cost" fill="var(--chart-2)" radius={[2, 2, 0, 0]} barSize={20} /></BarChart></ResponsiveContainer> : <BlankChart title="No cost history" note="" />}</div></div><div className="p-4 sm:p-5"><p className="text-xs text-muted-foreground">Average food waste</p><p className="mt-2 text-2xl font-semibold tabular-nums">{dataMode === "demo" ? `${wasteAverage.toFixed(1)}%` : "—"}</p><p className="mt-1 text-[10px] text-muted-foreground">{dataMode === "demo" ? "Example records · not current kitchen activity" : "Log service to understand leftovers"}</p><div className="mt-4 h-[112px]">{dataMode === "demo" ? <ResponsiveContainer width="100%" height="100%"><BarChart data={sampleWaste} margin={{ top: 5, right: 0, left: -28, bottom: 0 }}><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 9 }} /><YAxis hide domain={[0, 11]} /><RechartsTooltip contentStyle={{ border: "1px solid var(--border)", borderRadius: "6px", background: "var(--card)", color: "var(--foreground)" }} /><Bar dataKey="wasted" name="Waste %" radius={[2, 2, 0, 0]} barSize={17}>{sampleWaste.map((entry) => <Cell key={entry.day} fill={entry.wasted > 7 ? "var(--warning)" : "var(--primary)"} />)}</Bar></BarChart></ResponsiveContainer> : <BlankChart title="No waste records" note="" />}</div></div></div><div className="flex items-center justify-between border-t border-border px-5 py-3 text-[10px] text-muted-foreground"><span>{dataMode === "demo" ? "Both measures are illustrative." : "Reports use recorded cost and waste."}</span><Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-primary" onClick={() => onNavigate("analytics")}>View analytics<ArrowRight className="size-3" /></Button></div></Surface>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Low-stock watchlist</h2><p className="mt-1 text-[11px] text-muted-foreground">Items worth checking before the next delivery</p></div><Button variant="ghost" size="icon" aria-label="Review low stock items" onClick={() => onNavigate("inventory")}><ArrowRight className="size-4" /></Button></SurfaceHeader><div className="divide-y divide-border">{lowStockDisplay.length ? lowStockDisplay.slice(0, 3).map((item) => <div key={item.name} className="flex items-center gap-3 px-4 py-3"><span className="grid size-8 shrink-0 place-items-center rounded-md bg-warning/10 text-warning"><Package className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{item.name}</p><p className="mt-1 text-[10px] text-muted-foreground">{item.quantity} {item.unit} remaining · minimum {item.minimum} {item.unit}</p></div><Badge variant="outline" className="rounded-sm border-warning/30 bg-warning/10 text-[10px] text-warning">Restock</Badge></div>) : <BlankSection icon={Package} title="No ingredients to check" note="Items below their minimum appear here." />}</div><div className="border-t border-border px-4 py-3"><Button variant="ghost" size="sm" className="h-7 px-0 text-xs text-primary" onClick={() => onNavigate("inventory")}>View all inventory<ArrowRight className="size-3.5" /></Button></div></Surface>
        <Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Recent activity</h2><p className="mt-1 text-[11px] text-muted-foreground">Changes from your kitchen team</p></div><DatasetStamp demo={dataMode === "demo"} /></SurfaceHeader><div className="divide-y divide-border">{dataMode === "demo" ? [{ title: "Lunch preparation updated", detail: "Hot kitchen · 415 portions complete", icon: Flame }, { title: "Stock count recorded", detail: "Basmati rice · 42 kg remaining", icon: Package }, { title: "Purchase order approved", detail: "Greenfield Foods · PO-2026-018", icon: ClipboardList }].map((activity) => <div key={activity.title} className="flex items-center gap-3 px-4 py-3"><span className="grid size-8 place-items-center rounded-md bg-muted text-muted-foreground"><activity.icon className="size-4" /></span><div><p className="text-xs font-medium">{activity.title}</p><p className="mt-1 text-[10px] text-muted-foreground">{activity.detail} · illustrative sample</p></div></div>) : recentTasks.length ? recentTasks.slice(0, 3).map((task, index) => <div key={rowText(task, "id", String(index))} className="flex items-center gap-3 px-4 py-3"><span className="grid size-8 place-items-center rounded-md bg-muted text-muted-foreground"><ClipboardList className="size-4" /></span><div><p className="text-xs font-medium">{rowText(task, "dish_name")}</p><p className="mt-1 text-[10px] text-muted-foreground">{rowText(task, "status")} · {friendlyDate(rowText(task, "task_date"))}</p></div></div>) : <BlankSection icon={Clock3} title="Your activity will appear here" note="Team changes are shown as they happen." />}</div><div className="border-t border-border px-4 py-3"><span className="text-[10px] text-muted-foreground">Activity is available for this institution.</span></div></Surface>
      </div>

      <Surface className="overflow-hidden"><SurfaceHeader><div className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /><div><h2 className="text-sm font-semibold">Kitchen recommendations</h2><p className="mt-1 text-[11px] text-muted-foreground">Suggestions to review with your team</p></div></div><DatasetStamp demo={dataMode === "demo"} /></SurfaceHeader><div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">{(dataMode === "demo" ? [{ label: "PREPAREDNESS", title: "Review tomorrow’s portions", note: "Today’s sample plan has 75 fewer lunch portions than the weekday example.", action: "Open meal plan", page: "meal-planning" as FoodFlowPage }, { label: "INVENTORY", title: "Check rice before the next menu", note: "The example rice balance is below its displayed minimum stock.", action: "Review stock", page: "inventory" as FoodFlowPage }, { label: "WASTE", title: "Look at leftover records", note: "The example records suggest reviewing recent lunch portions.", action: "View waste", page: "waste" as FoodFlowPage }] : [{ label: "READY TO USE", title: "Add your first meal plan", note: "A plan gives your kitchen team a shared starting point.", action: "Plan meals", page: "meal-planning" as FoodFlowPage }, { label: "READY TO USE", title: "Record your ingredient stock", note: "Stock counts help your team spot shortages sooner.", action: "Update inventory", page: "inventory" as FoodFlowPage }, { label: "READY TO USE", title: "Log meal service actuals", note: "Actual portions help you compare plans and service.", action: "Open kitchen", page: "kitchen" as FoodFlowPage }]).map((item) => <article className="min-w-0 p-4 sm:p-5" key={item.title}><p className="text-[10px] font-semibold text-primary">{item.label}</p><h3 className="mt-2 text-sm font-medium">{item.title}</h3><p className="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">{item.note}</p><Button variant="ghost" size="sm" className="mt-2 h-7 px-0 text-[11px] text-primary" onClick={() => onNavigate(item.page)}>{item.action}<ArrowRight className="size-3" /></Button><p className="mt-1 text-[9px] text-muted-foreground">{dataMode === "demo" ? "Based on illustrative examples only" : "Suggested next step"}</p></article>)}</div></Surface>
      <p className="text-center text-[10px] text-muted-foreground">{institutionName || "FoodFlow workspace"} · {dataMode === "demo" ? "Illustrative sample values are not connected kitchen data." : "Values show this institution’s recorded activity."}</p>
    </div>
  );
}

function TableFrame({ headers, children, minimumWidth = "700px" }: { headers: string[]; children: ReactNode; minimumWidth?: string }) {
  return (
    <div className="w-full overflow-x-auto rounded-[20px] border border-border/60 bg-card">
      <table className="w-full border-collapse text-left text-xs" style={{ minWidth: minimumWidth }}>
        <thead>
          <tr className="border-b border-border/80 bg-muted/40">
            {headers.map((header) => (
              <th key={header} className="h-11 px-4 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground first:pl-6">
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
  return <td className={`px-4 py-4 first:pl-6 text-xs ${className}`}>{children}</td>;
}

function StatusBadge({ label, tone }: { label: string; tone?: "green" | "amber" | "red" | "blue" }) {
  const key =
    tone ??
    (label.toLowerCase().includes("active") ||
    label.toLowerCase().includes("published") ||
    label.toLowerCase().includes("complete") ||
    label.toLowerCase().includes("received") ||
    label.toLowerCase() === "ready" ||
    label.toLowerCase() === "healthy"
      ? "green"
      : label.toLowerCase().includes("pending") ||
        label.toLowerCase().includes("progress") ||
        label.toLowerCase().includes("ordered") ||
        label.toLowerCase().includes("review") ||
        label.toLowerCase().includes("draft") ||
        label.toLowerCase().includes("restock")
      ? "amber"
      : label.toLowerCase().includes("leave") ||
        label.toLowerCase().includes("cancel") ||
        label.toLowerCase().includes("not started") ||
        label.toLowerCase().includes("failed")
      ? "red"
      : "blue");

  const style = {
    green: "border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    amber: "border-amber-500/30 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    red: "border-rose-500/30 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
    blue: "border-teal-500/30 bg-teal-50 text-teal-900 dark:bg-teal-950/40 dark:text-teal-300",
  }[key];

  return (
    <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide shadow-2xs ${style}`}>
      {label}
    </Badge>
  );
}

function EmptyRows({ title, note, icon: Icon = ClipboardList }: { title: string; note: string; icon?: typeof ClipboardList }) {
  return <div className="px-5 py-12 text-center"><div className="mx-auto grid size-11 place-items-center rounded-md bg-muted text-muted-foreground"><Icon className="size-5" /></div><h3 className="mt-4 text-sm font-medium">{title}</h3><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{note}</p></div>;
}

function BlankSection({ icon: Icon, title, note, action, onAction }: { icon: typeof Package; title: string; note: string; action?: string; onAction?: () => void }) {
  return <div className="py-9 text-center"><div className="mx-auto grid size-10 place-items-center rounded-md bg-muted text-muted-foreground"><Icon className="size-4" /></div><p className="mt-3 text-xs font-medium">{title}</p><p className="mx-auto mt-1 max-w-xs text-[10px] leading-5 text-muted-foreground">{note}</p>{action && onAction && <Button variant="ghost" size="sm" className="mt-2 h-7 text-[10px] text-primary" onClick={onAction}>{action}<ArrowRight className="size-3" /></Button>}</div>;
}

function BlankChart({ title, note }: { title: string; note: string }) { return <div className="flex h-full flex-col items-center justify-center gap-1 text-center"><p className="text-xs font-medium text-muted-foreground">{title}</p>{note && <p className="text-[10px] text-muted-foreground">{note}</p>}</div>; }

function InventoryPage({ props }: { props: DashboardProps }) {
  const { inventoryItems, dataMode, onAction, onAdjustStock, onDeleteStock, canOperate } = props;
  const lowCount = inventoryItems.filter((item) => item.quantity <= item.minimum_quantity).length;
  const expiring = inventoryItems.filter((item) => item.expiry_date && new Date(item.expiry_date) <= new Date(Date.now() + 7 * 86400000)).length;
  const value = inventoryItems.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);
  return <div className="space-y-6"><PageHeading page="inventory" demo={dataMode === "demo"} action={() => onAction("inventory")} /><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatCard label="Stock value" value={money(value)} hint="Current quantity × unit cost" icon={CircleDollarSign} tone="teal" /><StatCard label="Ingredients tracked" value={inventoryItems.length.toLocaleString("en-IN")} hint="Items entered for this institution" icon={Package} tone="green" /><StatCard label="Below minimum" value={lowCount.toLocaleString("en-IN")} hint="Review before the next delivery" icon={ArrowDownRight} tone={lowCount ? "amber" : "green"} /><StatCard label="Expiring soon" value={expiring.toLocaleString("en-IN")} hint="Within the next 7 days" icon={Clock3} tone={expiring ? "red" : "teal"} /></div><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Ingredient stock</h2><p className="mt-1 text-[11px] text-muted-foreground">Update counts as deliveries arrive or ingredients are used.</p></div><DatasetStamp demo={dataMode === "demo"} /></SurfaceHeader>{inventoryItems.length ? <TableFrame headers={["INGREDIENT", "CATEGORY", "ON HAND", "MINIMUM", "UNIT COST", "SUPPLIER", "STATUS", "ACTIONS"]} minimumWidth="880px">{inventoryItems.map((item) => { const low = item.quantity <= item.minimum_quantity; return <TableRow key={item.id}><TableCell><div className="font-medium">{item.name}</div><p className="mt-1 text-[10px] text-muted-foreground">{item.id.startsWith("demo-") ? "Illustrative example" : `Updated ${friendlyDate(new Date().toISOString().slice(0, 10))}`}</p></TableCell><TableCell><span className="text-muted-foreground">{item.category}</span></TableCell><TableCell><span className="font-semibold tabular-nums">{item.quantity} {item.unit}</span></TableCell><TableCell className="text-muted-foreground">{item.minimum_quantity} {item.unit}</TableCell><TableCell>{money(item.unit_cost)}<span className="text-muted-foreground"> / {item.unit}</span></TableCell><TableCell className="text-muted-foreground">{item.supplier_name || "—"}</TableCell><TableCell><StatusBadge label={low ? "Restock" : "Healthy"} /></TableCell><TableCell><div className="flex items-center gap-1"><Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" disabled={!canOperate} aria-label={`Use 5 ${item.unit} of ${item.name}`} onClick={() => void onAdjustStock(item, -Math.min(5, item.quantity), "Kitchen issue")}>−5</Button><Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" disabled={!canOperate} aria-label={`Add 5 ${item.unit} of ${item.name}`} onClick={() => void onAdjustStock(item, 5, "Stock received")}>+5</Button>{canOperate && !item.id.startsWith("demo-") && <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-danger" onClick={() => onDeleteStock(item)}>Remove</Button>}</div></TableCell></TableRow>; })}</TableFrame> : <EmptyRows icon={Package} title="No ingredients in stock yet" note="Add your first ingredient to track how much is on hand and when it needs restocking." />}<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5"><p className="text-[10px] text-muted-foreground">Stock adjustments are recorded with their reason.</p><Button variant="ghost" size="sm" className="h-7 text-[10px] text-primary" onClick={() => onAction("movement")}>View stock movements<ArrowRight className="size-3" /></Button></div></Surface><Callout>Sample rows are stored separately and marked illustrative. Stock movements record any saved adjustment.</Callout></div>;
}

function PageHeading({ page, demo, action }: { page: FoodFlowPage; demo: boolean; action?: () => void }) {
  const config = page === "overview" ? null : page in moduleDescriptions ? moduleDescriptions[page as keyof typeof moduleDescriptions] : { title: pageTitle(page), subtitle: "Settings for your FoodFlow institution and team.", action: "Save changes" };
  return <section className="flex flex-wrap items-end justify-between gap-4"><div className="min-w-0"><p className="mb-2 text-[10px] font-semibold text-muted-foreground">FOODFLOW WORKSPACE</p><h1 className="text-2xl font-semibold sm:text-[28px]">{config?.title ?? pageTitle(page)}</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{config?.subtitle ?? "Here’s what’s happening in your mess today."}</p></div><div className="flex flex-wrap items-center gap-2"><DatasetStamp demo={demo} />{config && action && config.action !== "Export report" && config.action !== "Save changes" && <Button size="sm" className="h-9" onClick={action}><Plus className="size-4" />{config.action}</Button>}</div></section>;
}

function MealPlanningPage({ props }: { props: DashboardProps }) {
  const { rows, dataMode, canManage, onNavigate, onAction, onUpdateTask } = props;
  const days = Array.from({ length: 7 }, (_, index) => { const day = new Date(); day.setDate(day.getDate() + index); return day; });
  const meals = rows.filter((row) => row.service_date && (row.is_demo !== true || dataMode === "demo"));
  const mealTypes = ["Breakfast", "Lunch", "Snacks", "Dinner"];
  const demoMenus = dataMode === "demo" ? [
    { service_date: shiftDateKey(0), meal_type: "Breakfast", title: "Poha & fresh fruit", expected_servings: 420, status: "Published", dishes: ["Poha", "Fresh seasonal fruit", "Masala chai"] },
    { service_date: shiftDateKey(0), meal_type: "Lunch", title: "Dal, rice & seasonal sabzi", expected_servings: 680, status: "Published", dishes: ["Dal tadka", "Steamed rice", "Seasonal sabzi", "Roti"] },
    { service_date: shiftDateKey(0), meal_type: "Snacks", title: "Vegetable cutlet & chai", expected_servings: 350, status: "Published", dishes: ["Vegetable cutlet", "Masala chai"] },
    { service_date: shiftDateKey(0), meal_type: "Dinner", title: "Paneer curry & phulka", expected_servings: 610, status: "Published", dishes: ["Paneer bhurji", "Phulka", "Cucumber salad"] },
    { service_date: shiftDateKey(1), meal_type: "Breakfast", title: "Upma & yogurt", expected_servings: 410, status: "Draft", dishes: ["Upma", "Yogurt", "Fresh seasonal fruit"] },
    { service_date: shiftDateKey(1), meal_type: "Lunch", title: "Vegetable pulao", expected_servings: 665, status: "Draft", dishes: ["Vegetable pulao", "Seasonal sabzi"] },
  ] as FoodFlowRow[] : [];
  const visibleMeals = meals.length ? meals : demoMenus;
  return <div className="space-y-6"><PageHeading page="meal-planning" demo={dataMode === "demo"} action={() => onAction("meal")} /><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Seven-day meal calendar</h2><p className="mt-1 text-[11px] text-muted-foreground">{new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date())}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" className="h-8" onClick={() => onAction("event")}>Academic event</Button><Button size="sm" className="h-8" onClick={() => onAction("meal")}><Plus className="size-3.5" />Plan a meal</Button></div></SurfaceHeader><div className="overflow-x-auto"><div className="foodflow-grid min-w-[580px] border-b border-border">{days.map((day) => <div key={dateKey(day)} className="border-r border-border px-2 py-3 text-center last:border-r-0"><p className="text-[10px] font-medium text-muted-foreground">{new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(day)}</p><p className={`mx-auto mt-1 grid size-7 place-items-center rounded-full text-xs font-semibold ${dateKey(day) === shiftDateKey(0) ? "bg-primary text-primary-foreground" : "text-foreground"}`}>{day.getDate()}</p></div>)}</div><div className="min-w-[580px]">{mealTypes.map((mealType) => <div key={mealType} className="foodflow-grid min-h-[126px] border-b border-border last:border-b-0"><div className="flex items-start border-r border-border px-2 py-3 text-xs font-medium">{mealType}</div>{days.map((day) => { const menu = visibleMeals.find((item) => rowText(item, "service_date") === dateKey(day) && rowText(item, "meal_type") === mealType); return <div key={`${mealType}-${dateKey(day)}`} className="min-w-0 border-r border-border p-1.5 last:border-r-0">{menu ? <button onClick={() => onAction("meal", menu)} className="h-full w-full rounded-sm border border-border bg-muted/50 p-2 text-left transition-colors hover:border-primary/40 hover:bg-teal-soft"><p className="line-clamp-2 text-[10px] font-medium leading-4">{rowText(menu, "title")}</p><p className="mt-1 text-[9px] text-muted-foreground">{rowNumber(menu, "expected_servings").toLocaleString("en-IN")} portions</p><StatusBadge label={rowText(menu, "status")} /></button> : canManage ? <button className="grid h-full min-h-16 w-full place-items-center rounded-sm text-muted-foreground hover:bg-muted/70" aria-label={`Plan ${mealType} for ${friendlyDate(dateKey(day))}`} onClick={() => onAction("meal", { service_date: dateKey(day), meal_type: mealType })}><Plus className="size-4" /></button> : <div className="h-full" />}</div>; })}</div>)}</div></div></Surface><div className="grid gap-5 xl:grid-cols-2">{["Today", "Tomorrow"].map((label, offset) => <Surface key={label} className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">{label}’s service</h2><p className="mt-1 text-[11px] text-muted-foreground">{friendlyDate(shiftDateKey(offset), { weekday: "long", day: "numeric", month: "short" })}</p></div></SurfaceHeader><div className="divide-y divide-border">{visibleMeals.filter((row) => rowText(row, "service_date") === shiftDateKey(offset)).length ? visibleMeals.filter((row) => rowText(row, "service_date") === shiftDateKey(offset)).map((row) => <div key={rowText(row, "id", `${rowText(row, "service_date")}-${rowText(row, "meal_type")}`)} className="flex items-center gap-3 px-4 py-3"><div className="grid size-9 shrink-0 place-items-center rounded-md bg-teal-soft text-primary"><CalendarDays className="size-4" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-xs font-medium">{rowText(row, "meal_type")}</span><StatusBadge label={rowText(row, "status")} /></div><p className="mt-1 truncate text-[11px] text-muted-foreground">{rowText(row, "title")} · {rowNumber(row, "expected_servings")} portions</p></div><Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => onAction("meal", row)}>Edit</Button></div>) : <BlankSection icon={CalendarDays} title="No meals planned yet" note="Add a meal plan to get the week started." action="Plan a meal" onAction={() => onAction("meal")} />}</div></Surface>)}</div><Callout>Published menus and forecasts are kept separate from illustrative samples.</Callout></div>;
}

function RecipesPage({ props }: { props: DashboardProps }) {
  const { rows, dataMode, onAction, inventoryItems } = props;
  const recipes = rows.filter((row) => row.name && (row.is_demo !== true || dataMode === "demo"));
  const displayed = recipes.length ? recipes : dataMode === "demo" ? sampleRecipes.map((recipe, index) => ({ id: `demo-recipe-${index}`, name: recipe.name, category: recipe.category, servings: recipe.servings, cost_per_serving: recipe.cost, ingredients: recipe.ingredients.split(", ").map((name) => ({ name, quantity: 1, unit: "kg" })), instructions: "Illustrative sample preparation steps.", is_demo: true }) as FoodFlowRow) : [];
  return <div className="space-y-6"><PageHeading page="recipes" demo={dataMode === "demo"} action={() => onAction("recipe")} /><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatCard label="Recipes" value={displayed.length.toLocaleString("en-IN")} hint={dataMode === "demo" ? "Illustrative recipe examples" : "Recipes entered for this institution"} icon={ClipboardList} tone="teal" /><StatCard label="Ingredients tracked" value={inventoryItems.length.toLocaleString("en-IN")} hint="Use stock items in kitchen prep" icon={Package} tone="green" /><StatCard label="Average cost per serving" value={displayed.length ? money(displayed.reduce((sum, row) => sum + rowNumber(row, "cost_per_serving"), 0) / displayed.length) : "—"} hint="Based on recipe cost estimates" icon={CircleDollarSign} tone="amber" /><StatCard label="Upcoming menu items" value="—" hint="Uses your saved meal plans" icon={CalendarDays} tone="teal" /></div>{displayed.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{displayed.map((recipe) => { const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []; return <Surface key={rowText(recipe, "id", rowText(recipe, "name"))} className="overflow-hidden"><div className="border-b border-border bg-teal-soft/50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold text-primary">{rowText(recipe, "category", "MAIN COURSE").toUpperCase()}</p><h3 className="mt-2 text-sm font-semibold">{rowText(recipe, "name")}</h3></div><DatasetStamp demo={dataMode === "demo"} /></div><p className="mt-2 text-xs text-muted-foreground">{rowNumber(recipe, "servings")} servings · {money(rowNumber(recipe, "cost_per_serving"))} per serving</p></div><div className="p-4"><p className="text-[10px] font-semibold text-muted-foreground">INGREDIENTS</p><div className="mt-2 flex flex-wrap gap-1.5">{ingredients.length ? ingredients.slice(0, 6).map((item, index) => { const name = typeof item === "object" && item !== null && "name" in item ? String((item as { name: unknown }).name) : String(item); return <Badge key={`${name}-${index}`} variant="secondary" className="rounded-sm px-2 py-1 text-[10px] font-medium">{name}</Badge>; }) : <span className="text-xs text-muted-foreground">No ingredients added yet</span>}</div><p className="mt-4 line-clamp-2 text-[11px] leading-5 text-muted-foreground">{rowText(recipe, "instructions", "Preparation steps can be added when you edit this recipe.")}</p><Button variant="outline" size="sm" className="mt-4 h-8 w-full text-xs" onClick={() => onAction("recipe", recipe)}>View & edit recipe</Button></div></Surface>; })}</div> : <Surface><EmptyRows title="No recipes added yet" note="Create your first recipe, add ingredients, and keep serving costs together." icon={ClipboardList} /></Surface>}<Callout>Sample recipes are illustrative; ingredient availability and cost estimates use only saved records.</Callout></div>;
}

function KitchenPage({ props }: { props: DashboardProps }) {
  const { rows, dataMode, canOperate, onAction, onUpdateTask } = props;
  const tasks = rows.filter((row) => row.dish_name && (row.is_demo !== true || dataMode === "demo"));
  const displayed = tasks.length ? tasks : dataMode === "demo" ? ["Prepare poha", "Cook dal tadka", "Steam basmati rice", "Prepare paneer bhurji"].map((name, index) => ({ id: `demo-task-${index}`, task_date: shiftDateKey(0), meal_type: ["Breakfast", "Lunch", "Lunch", "Dinner"][index], dish_name: name, planned_quantity: [420, 680, 680, 610][index], completed_quantity: [420, 415, 340, 0][index], assigned_to: ["Morning kitchen", "Hot kitchen", "Grain station", "Evening kitchen"][index], status: ["Completed", "In progress", "In progress", "Not started"][index], is_demo: true }) as FoodFlowRow) : [];
  const planned = displayed.reduce((sum, task) => sum + rowNumber(task, "planned_quantity"), 0);
  const completed = displayed.reduce((sum, task) => sum + rowNumber(task, "completed_quantity"), 0);
  const progress = planned ? Math.round(completed / planned * 100) : 0;
  return <div className="space-y-6"><PageHeading page="kitchen" demo={dataMode === "demo"} action={() => onAction("task")} /><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatCard label="Prep tasks" value={String(displayed.length)} hint="Saved kitchen tasks" icon={ClipboardList} tone="teal" /><StatCard label="Portions planned" value={planned.toLocaleString("en-IN")} hint="Across listed tasks" icon={Users} tone="green" /><StatCard label="Portions completed" value={completed.toLocaleString("en-IN")} hint={`${progress}% of listed prep`} icon={CheckCircle2} tone="green" /><StatCard label="Kitchen progress" value={`${progress}%`} hint={dataMode === "demo" ? "Illustrative progress only" : "Based on recorded portions"} icon={Activity} tone="amber" /></div><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Today’s preparation schedule</h2><p className="mt-1 text-[11px] text-muted-foreground">Update task status as preparation moves forward.</p></div><DatasetStamp demo={dataMode === "demo"} /></SurfaceHeader>{displayed.length ? <TableFrame headers={["MEAL", "PREPARATION TASK", "ASSIGNED TEAM", "PLANNED", "COMPLETED", "PROGRESS", "STATUS", ""]} minimumWidth="840px">{displayed.map((task) => { const portion = rowNumber(task, "planned_quantity"); const done = rowNumber(task, "completed_quantity"); const percentage = portion ? Math.round(done / portion * 100) : 0; const status = rowText(task, "status"); return <TableRow key={rowText(task, "id", rowText(task, "dish_name"))}><TableCell><StatusBadge label={rowText(task, "meal_type")} /></TableCell><TableCell><span className="font-medium">{rowText(task, "dish_name")}</span></TableCell><TableCell className="text-muted-foreground">{rowText(task, "assigned_to", "—")}</TableCell><TableCell className="tabular-nums">{portion.toLocaleString("en-IN")}</TableCell><TableCell className="tabular-nums">{done.toLocaleString("en-IN")}</TableCell><TableCell><div className="flex items-center gap-2"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted"><div className="h-full bg-success" style={{ width: `${percentage}%` }} /></div><span className="text-[10px] tabular-nums text-muted-foreground">{percentage}%</span></div></TableCell><TableCell><StatusBadge label={status} /></TableCell><TableCell><Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" disabled={!canOperate} onClick={() => void onUpdateTask(task, { status: status === "Not started" ? "In progress" : status === "In progress" ? "Ready" : "Completed", completed_quantity: status === "Not started" ? Math.floor(portion * 0.5) : status === "In progress" ? portion : done })}>{status === "Not started" ? "Start" : status === "In progress" ? "Mark ready" : status === "Ready" ? "Complete" : "Done"}</Button></TableCell></TableRow>; })}</TableFrame> : <EmptyRows title="Your kitchen schedule is clear" note="Add a preparation task to see assigned portions and progress." icon={ChefHat} />}<div className="border-t border-border px-5 py-3 text-[10px] text-muted-foreground">Track preparation progress against the portions planned for each meal.</div></Surface><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Actual service portions</h2><p className="mt-1 text-[11px] text-muted-foreground">Record prepared, served, leftover, and spoiled portions.</p></div><Button size="sm" className="h-8" onClick={() => onAction("actual")}><Plus className="size-3.5" />Record actuals</Button></SurfaceHeader><p className="p-4 text-xs text-muted-foreground">Service actuals power cost reports, attendance comparisons, and food-waste calculations.</p></Surface></div>;
}

function AttendancePage({ props }: { props: DashboardProps }) {
  const { rows, dataMode, canOperate, onAction } = props;
  const attendance = rows.filter((row) => row.student_name && (row.is_demo !== true || dataMode === "demo"));
  const displayed = attendance.length ? attendance : dataMode === "demo" ? sampleStudents.slice(0, 4).map((student, index) => ({ id: `demo-att-${index}`, student_code: student.code, student_name: student.name, hall: student.hall, meal_type: "Lunch", served_at: new Date(Date.now() - index * 1800000).toISOString(), is_demo: true }) as FoodFlowRow) : [];
  const byMeal = new Map<string, number>();
  for (const row of displayed) byMeal.set(rowText(row, "meal_type"), (byMeal.get(rowText(row, "meal_type")) ?? 0) + 1);

  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshQueueCount = () => {
    void getPendingAttendanceQueue().then((q) => setPendingCount(q.length));
  };

  useEffect(() => {
    refreshQueueCount();
    const handleOnline = () => {
      setIsOnline(true);
      toast.info("Connection restored. Syncing offline attendance queue...");
      void handleSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You are currently offline. Attendance scans will be queued in local storage.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const report = await syncPendingAttendance(async () => {
        return true;
      });
      refreshQueueCount();
      if (report.syncedCount > 0) {
        toast.success(`Synced ${report.syncedCount} queued attendance check-in(s) to server.`);
      } else {
        toast.info("Offline attendance queue is up to date.");
      }
    } catch {
      toast.error("Failed to sync offline scans. Will retry when connection stabilizes.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSimulateOfflineScan = async () => {
    const student = sampleStudents[Math.floor(Math.random() * sampleStudents.length)] ?? { code: "ST-1042", name: "Aarav Mehta", hall: "North Hall" };
    await queueAttendance({
      clientUuid: crypto.randomUUID(),
      studentId: `std-${Date.now()}`,
      studentCode: student.code,
      studentName: student.name,
      hallId: student.hall,
      serviceDate: new Date().toISOString().slice(0, 10),
      mealType: "lunch",
      method: "qr",
      clientTimestamp: new Date().toISOString(),
      status: "pending",
      queuedAt: new Date().toISOString(),
    });
    refreshQueueCount();
    toast.success(`[Offline Queue] Recorded QR check-in for ${student.name} (${student.code}).`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeading page="attendance" demo={dataMode === "demo"} action={() => onAction("attendance")} />
        <div className="flex flex-wrap items-center gap-2">
          {isSyncing ? (
            <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs">
              <LoaderCircle className="size-3.5 animate-spin text-primary" />
              Syncing offline scans...
            </Badge>
          ) : !isOnline ? (
            <Badge variant="danger" className="gap-1.5 py-1 px-2.5 text-xs">
              <WifiOff className="size-3.5" />
              Offline Mode ({pendingCount} queued)
            </Badge>
          ) : pendingCount > 0 ? (
            <div className="flex items-center gap-2">
              <Badge variant="warning" className="gap-1.5 py-1 px-2.5 text-xs">
                <Wifi className="size-3.5 text-amber-600" />
                {pendingCount} offline scan{pendingCount > 1 ? "s" : ""} pending sync
              </Badge>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => void handleSync()}>
                <RefreshCw className="size-3.5" />
                Sync queue now
              </Button>
            </div>
          ) : (
            <Badge variant="soft" className="gap-1.5 py-1 px-2.5 text-xs border border-success/30 text-success">
              <Wifi className="size-3.5" />
              Online & Synced
            </Badge>
          )}
          {canOperate && (
            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => void handleSimulateOfflineScan()}>
              <ScanLine className="size-3.5" />
              Test offline scan
            </Button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Meals recorded" value={displayed.length.toLocaleString("en-IN")} hint={dataMode === "demo" ? "Illustrative records" : "For this institution"} icon={CheckCircle2} tone="teal" />
        <StatCard label="Breakfast" value={String(byMeal.get("Breakfast") ?? 0)} hint="Recorded check-ins" icon={CalendarDays} tone="green" />
        <StatCard label="Lunch" value={String(byMeal.get("Lunch") ?? 0)} hint="Recorded check-ins" icon={Users} tone="teal" />
        <StatCard label="Dinner" value={String(byMeal.get("Dinner") ?? 0)} hint="Recorded check-ins" icon={Clock3} tone="amber" />
      </div>
      <Surface className="overflow-hidden">
        <SurfaceHeader>
          <div>
            <h2 className="text-sm font-semibold">Recent meal attendance</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">Check-ins recorded by your institution team.</p>
          </div>
          <div className="flex items-center gap-2">
            <DatasetStamp demo={dataMode === "demo"} />
            <Button size="sm" className="h-8" disabled={!canOperate} onClick={() => onAction("attendance")}>
              <Plus className="size-3.5" />Record meal
            </Button>
          </div>
        </SurfaceHeader>
        {displayed.length ? (
          <TableFrame headers={["STUDENT", "DINING HALL", "MEAL", "SERVED AT", "SOURCE"]}>
            {displayed.map((row) => (
              <TableRow key={rowText(row, "id", rowText(row, "student_code"))}>
                <TableCell>
                  <p className="font-medium">{rowText(row, "student_name")}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{rowText(row, "student_code")}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{rowText(row, "hall")}</TableCell>
                <TableCell><StatusBadge label={rowText(row, "meal_type")} /></TableCell>
                <TableCell className="text-muted-foreground">
                  {new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(new Date(rowText(row, "served_at", new Date().toISOString())))}
                </TableCell>
                <TableCell><DatasetStamp demo={dataMode === "demo"} /></TableCell>
              </TableRow>
            ))}
          </TableFrame>
        ) : (
          <EmptyRows title="No attendance yet" note="Record a student meal check-in to see daily service counts." icon={ScanLine} />
        )}
        <div className="border-t border-border px-5 py-3 text-[10px] text-muted-foreground">
          Meal attendance is stored in FoodFlow for your institution. Offline scans sync automatically upon reconnection.
        </div>
      </Surface>
      <Callout>QR and RFID kiosk check-ins operate offline with automatic background sync when network connectivity is re-established.</Callout>
    </div>
  );
}

function StudentsPage({ props }: { props: DashboardProps }) {
  const { rows, dataMode, onAction } = props;
  const students = rows.filter((row) => row.student_code && (row.is_demo !== true || dataMode === "demo"));
  const displayed = students.length ? students : dataMode === "demo" ? sampleStudents.map((student, index) => ({ id: `demo-student-${index}`, student_code: student.code, full_name: student.name, hall: student.hall, meal_plan: student.plan, dietary_notes: "", status: student.status, is_demo: true }) as FoodFlowRow) : [];
  return <div className="space-y-6"><PageHeading page="students" demo={dataMode === "demo"} action={() => onAction("student")} /><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatCard label="Students listed" value={String(displayed.length)} hint="In this institution" icon={Users} tone="teal" /><StatCard label="Active" value={String(displayed.filter((student) => rowText(student, "status") === "Active").length)} hint="Can access planned meals" icon={CheckCircle2} tone="green" /><StatCard label="Dietary plans" value={String(new Set(displayed.map((student) => rowText(student, "meal_plan"))).size)} hint="Meal preferences to consider" icon={ClipboardList} tone="amber" /><StatCard label="Dining halls" value={String(new Set(displayed.map((student) => rowText(student, "hall"))).size)} hint="Represented in the list" icon={LayoutDashboard} tone="teal" /></div><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Student dining records</h2><p className="mt-1 text-[11px] text-muted-foreground">Meal plans and dining hall assignment.</p></div><DatasetStamp demo={dataMode === "demo"} /></SurfaceHeader>{displayed.length ? <TableFrame headers={["STUDENT", "STUDENT CODE", "DINING HALL", "MEAL PLAN", "DIETARY NOTES", "STATUS"]}>{displayed.map((student) => <TableRow key={rowText(student, "id", rowText(student, "student_code"))}><TableCell><span className="font-medium">{rowText(student, "full_name")}</span></TableCell><TableCell className="font-mono text-[10px] text-muted-foreground">{rowText(student, "student_code")}</TableCell><TableCell>{rowText(student, "hall")}</TableCell><TableCell><StatusBadge label={rowText(student, "meal_plan")} /></TableCell><TableCell className="text-muted-foreground">{rowText(student, "dietary_notes", "None listed")}</TableCell><TableCell><StatusBadge label={rowText(student, "status")} /></TableCell></TableRow>)}</TableFrame> : <EmptyRows title="Add your first student" note="Keep dining hall placement and meal preferences close to your weekly menu." icon={Users} />}<div className="border-t border-border px-5 py-3 text-[10px] text-muted-foreground">Student details are visible only within this institution.</div></Surface></div>;
}

function PurchasingPage({ props }: { props: DashboardProps }) {
  const { rows, dataMode, canManage, onAction, onUpdateOrder } = props;
  const orders = rows.filter((row) => row.order_number && (row.is_demo !== true || dataMode === "demo"));
  const displayed = orders.length ? orders : dataMode === "demo" ? [
    { id: "demo-order-18", order_number: "DEMO-PO-018", supplier_name: "Greenfield Foods", item_summary: "Rice, toor dal", total_amount: 18400, status: "Approved", expected_date: shiftDateKey(0), is_demo: true },
    { id: "demo-order-17", order_number: "DEMO-PO-017", supplier_name: "Daily Harvest Co.", item_summary: "Tomatoes, spinach, onions", total_amount: 9650, status: "Ordered", expected_date: shiftDateKey(1), is_demo: true },
    { id: "demo-order-16", order_number: "DEMO-PO-016", supplier_name: "Meadow Dairy", item_summary: "Milk, yogurt", total_amount: 7120, status: "Received", expected_date: shiftDateKey(-3), is_demo: true },
  ] as FoodFlowRow[] : [];
  const totalPending = displayed.filter((row) => !["Received", "Cancelled"].includes(rowText(row, "status"))).reduce((sum, row) => sum + rowNumber(row, "total_amount"), 0);
  const supplierRows = props.rows.filter((row) => row.name && (row.is_demo !== true || dataMode === "demo"));
  return <div className="space-y-6"><PageHeading page="purchasing" demo={dataMode === "demo"} action={() => onAction("order")} /><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatCard label="Orders tracked" value={String(displayed.length)} hint="Saved orders for this institution" icon={ClipboardList} tone="teal" /><StatCard label="Awaiting delivery" value={String(displayed.filter((row) => ["Approved", "Ordered"].includes(rowText(row, "status"))).length)} hint="Approved or ordered" icon={Truck} tone="amber" /><StatCard label="Pending order value" value={money(totalPending)} hint="Excludes received orders" icon={CircleDollarSign} tone="green" /><StatCard label="Suppliers" value={String(supplierRows.length || (dataMode === "demo" ? 3 : 0))} hint="Available to this institution" icon={Users} tone="teal" /></div><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Purchase orders</h2><p className="mt-1 text-[11px] text-muted-foreground">Move each order along as delivery is confirmed.</p></div><DatasetStamp demo={dataMode === "demo"} /></SurfaceHeader>{displayed.length ? <TableFrame headers={["ORDER", "SUPPLIER", "ITEMS", "TOTAL", "DELIVERY", "STATUS", "NEXT STEP"]} minimumWidth="800px">{displayed.map((order) => { const status = rowText(order, "status"); return <TableRow key={rowText(order, "id", rowText(order, "order_number"))}><TableCell><span className="font-mono text-[10px]">{rowText(order, "order_number")}</span></TableCell><TableCell><span className="font-medium">{rowText(order, "supplier_name")}</span></TableCell><TableCell className="text-muted-foreground">{rowText(order, "item_summary")}</TableCell><TableCell className="font-medium">{money(rowNumber(order, "total_amount"))}</TableCell><TableCell className="text-muted-foreground">{friendlyDate(rowText(order, "expected_date"))}</TableCell><TableCell><StatusBadge label={status} /></TableCell><TableCell><Button variant="outline" size="sm" className="h-7 text-[10px]" disabled={!canManage || status === "Received"} onClick={() => void onUpdateOrder(order)}>{nextOrderStatus(status)}</Button></TableCell></TableRow>; })}</TableFrame> : <EmptyRows title="No purchase orders yet" note="Create an order when your kitchen needs a supplier delivery." icon={Truck} />}<div className="flex items-center justify-between border-t border-border px-5 py-3 text-[10px] text-muted-foreground"><span>Purchase changes are limited to institution managers.</span><Button variant="ghost" size="sm" className="h-7 text-[10px] text-primary" onClick={() => onAction("supplier")}>Manage suppliers<ArrowRight className="size-3" /></Button></div></Surface><div className="grid gap-5 xl:grid-cols-2"><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Supplier directory</h2><p className="mt-1 text-[11px] text-muted-foreground">Regular delivery contacts</p></div><Button variant="ghost" size="sm" className="h-7 text-[10px] text-primary" onClick={() => onAction("supplier")}><Plus className="size-3" />Add supplier</Button></SurfaceHeader>{supplierRows.length ? <div className="divide-y divide-border">{supplierRows.map((supplier) => <div className="flex items-center gap-3 p-4" key={rowText(supplier, "id", rowText(supplier, "name"))}><div className="grid size-9 place-items-center rounded-md bg-teal-soft text-primary"><Truck className="size-4" /></div><div className="min-w-0 flex-1"><p className="text-xs font-medium">{rowText(supplier, "name")}</p><p className="mt-1 truncate text-[10px] text-muted-foreground">{rowText(supplier, "category")} · {rowText(supplier, "phone")}</p></div><StatusBadge label={rowText(supplier, "status")} /></div>)}</div> : <EmptyRows title="No suppliers saved" note="Keep supplier contacts ready when the next order is due." icon={Truck} />}</Surface><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Pending approvals</h2><p className="mt-1 text-[11px] text-muted-foreground">Orders awaiting your review</p></div></SurfaceHeader>{displayed.filter((row) => rowText(row, "status") === "Pending").length ? displayed.filter((row) => rowText(row, "status") === "Pending").map((order) => <div key={rowText(order, "id")} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"><div><p className="text-xs font-medium">{rowText(order, "order_number")} · {rowText(order, "supplier_name")}</p><p className="mt-1 text-[10px] text-muted-foreground">{rowText(order, "item_summary")} · {money(rowNumber(order, "total_amount"))}</p></div><Button size="sm" disabled={!canManage} onClick={() => void onUpdateOrder(order)}>Approve order</Button></div>) : <EmptyRows title="No approvals waiting" note="Pending orders appear here when a teammate requests approval." icon={CheckCircle2} />}</Surface></div></div>;
}

function ForecastPage({ props }: { props: DashboardProps }) {
  const { rows, dataMode, onAction } = props;
  const forecasts = rows.filter((row) => row.forecast_date && (row.is_demo !== true || dataMode === "demo"));
  const displayed = forecasts.length ? forecasts : dataMode === "demo" ? ["Breakfast", "Lunch", "Snacks", "Dinner"].map((meal, index) => ({ id: `demo-forecast-${meal}`, forecast_date: shiftDateKey(1), meal_type: meal, expected_students: [410, 665, 340, 590][index], confidence: 72, method: "illustrative_sample", is_demo: true }) as FoodFlowRow) : [];
  const chart = displayed.map((row) => ({ meal: rowText(row, "meal_type"), portions: rowNumber(row, "expected_students"), confidence: rowNumber(row, "confidence") }));
  return <div className="space-y-6"><PageHeading page="forecast" demo={dataMode === "demo"} action={() => onAction("forecast")} /><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatCard label="Forecasted meals" value={displayed.reduce((sum, row) => sum + rowNumber(row, "expected_students"), 0).toLocaleString("en-IN")} hint={displayed.length ? "Across the upcoming meal plans" : "Create a forecast to start"} icon={Users} tone="teal" /><StatCard label="Meals forecast" value={String(displayed.length)} hint="For this institution" icon={CalendarDays} tone="green" /><StatCard label="Confidence" value={displayed.length ? `${Math.round(displayed.reduce((sum, row) => sum + rowNumber(row, "confidence"), 0) / displayed.length)}%` : "—"} hint={dataMode === "demo" ? "Illustrative estimate" : "Based on saved forecast confidence"} icon={ChartNoAxesCombined} tone="amber" /><StatCard label="Forecast horizon" value={displayed.length ? "1–7 days" : "—"} hint="Record dates as needs change" icon={Clock3} tone="teal" /></div><div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]"><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Upcoming meal demand</h2><p className="mt-1 text-[11px] text-muted-foreground">Expected portions by meal service.</p></div><DatasetStamp demo={dataMode === "demo"} /></SurfaceHeader><div className="h-[260px] p-5">{chart.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="meal" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} /><RechartsTooltip contentStyle={{ border: "1px solid var(--border)", borderRadius: "6px", background: "var(--card)", color: "var(--foreground)" }} /><Bar dataKey="portions" name="Expected portions" fill="var(--primary)" radius={[3, 3, 0, 0]} barSize={36} /></BarChart></ResponsiveContainer> : <BlankChart title="No forecast saved" note="Record an expected meal count to prepare ahead." />}</div><div className="border-t border-border px-5 py-3 text-[10px] text-muted-foreground">{dataMode === "demo" ? "These are sample estimates, not trained AI predictions." : "Forecasts are saved manually; no external AI is enabled."}</div></Surface><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Forecast details</h2><p className="mt-1 text-[11px] text-muted-foreground">A practical view for the kitchen team.</p></div></SurfaceHeader>{displayed.length ? <div className="divide-y divide-border">{displayed.map((row) => <div key={rowText(row, "id", `${rowText(row, "forecast_date")}-${rowText(row, "meal_type")}`)} className="flex items-center gap-3 px-4 py-4"><div className="grid size-9 shrink-0 place-items-center rounded-md bg-teal-soft text-primary"><Users className="size-4" /></div><div className="min-w-0 flex-1"><p className="text-xs font-medium">{rowText(row, "meal_type")}</p><p className="mt-1 text-[10px] text-muted-foreground">{friendlyDate(rowText(row, "forecast_date"))} · {rowNumber(row, "confidence")}% estimated confidence</p></div><p className="text-right text-sm font-semibold tabular-nums">{rowNumber(row, "expected_students").toLocaleString("en-IN")}<span className="block text-[9px] font-normal text-muted-foreground">portions</span></p></div>)}</div> : <EmptyRows title="Nothing to forecast yet" note="Enter tomorrow’s expected portions, then compare with meal attendance." icon={ChartNoAxesCombined} />}<div className="border-t border-border p-4"><Button variant="outline" size="sm" className="h-8 w-full" onClick={() => onAction("event")}>Add a campus event<Plus className="size-3.5" /></Button></div></Surface></div><Callout>FoodFlow does not invent AI predictions. Demo values are clearly marked as sample estimates; forecasts you enter remain manual.</Callout></div>;
}

function WastePage({ props }: { props: DashboardProps }) {
  const { rows, dataMode, onAction } = props;
  const entries = rows.filter((row) => row.dish_name && row.wasted_quantity !== undefined && (row.is_demo !== true || dataMode === "demo"));
  const demoRows = dataMode === "demo" ? [{ dish_name: "Seasonal sabzi", prepared_quantity: 110, served_quantity: 102, wasted_quantity: 8, unit: "kg", waste_cost: 720, record_date: shiftDateKey(-4), meal_type: "Lunch" }, { dish_name: "Steamed rice", prepared_quantity: 145, served_quantity: 137, wasted_quantity: 8, unit: "kg", waste_cost: 624, record_date: shiftDateKey(-3), meal_type: "Lunch" }, { dish_name: "Dal tadka", prepared_quantity: 95, served_quantity: 89, wasted_quantity: 6, unit: "kg", waste_cost: 462, record_date: shiftDateKey(-2), meal_type: "Dinner" }, { dish_name: "Seasonal sabzi", prepared_quantity: 112, served_quantity: 105, wasted_quantity: 7, unit: "kg", waste_cost: 630, record_date: shiftDateKey(-1), meal_type: "Lunch" }] as FoodFlowRow[] : [];
  const displayed = entries.length ? entries : demoRows;
  const prepared = displayed.reduce((sum, row) => sum + rowNumber(row, "prepared_quantity"), 0);
  const wasted = displayed.reduce((sum, row) => sum + rowNumber(row, "wasted_quantity"), 0);
  const cost = displayed.reduce((sum, row) => sum + rowNumber(row, "waste_cost"), 0);
  const percent = prepared ? wasted / prepared * 100 : 0;
  return <div className="space-y-6"><PageHeading page="waste" demo={dataMode === "demo"} action={() => onAction("waste")} /><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatCard label="Food prepared" value={`${prepared.toLocaleString("en-IN")} kg`} hint="Recorded service quantity" icon={CookingPot} tone="teal" /><StatCard label="Food served" value={`${displayed.reduce((sum, row) => sum + rowNumber(row, "served_quantity"), 0).toLocaleString("en-IN")} kg`} hint="Across saved waste reports" icon={CheckCircle2} tone="green" /><StatCard label="Food wasted" value={`${wasted.toLocaleString("en-IN")} kg`} hint={`${percent.toFixed(1)}% of prepared volume`} icon={Recycle} tone="amber" /><StatCard label="Waste cost" value={money(cost)} hint="Based on recorded waste cost" icon={CircleDollarSign} tone="red" /></div><div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]"><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Recent food-waste entries</h2><p className="mt-1 text-[11px] text-muted-foreground">Use real kitchen portions to measure the opportunity.</p></div><DatasetStamp demo={dataMode === "demo"} /></SurfaceHeader>{displayed.length ? <TableFrame headers={["SERVICE DATE", "MEAL", "DISH", "PREPARED", "SERVED", "WASTED", "WASTE COST"]}>{displayed.map((row, index) => <TableRow key={rowText(row, "id", `${rowText(row, "record_date")}-${index}`)}><TableCell>{friendlyDate(rowText(row, "record_date"))}</TableCell><TableCell><StatusBadge label={rowText(row, "meal_type")} /></TableCell><TableCell className="font-medium">{rowText(row, "dish_name")}</TableCell><TableCell>{rowNumber(row, "prepared_quantity")} {rowText(row, "unit", "kg")}</TableCell><TableCell>{rowNumber(row, "served_quantity")} {rowText(row, "unit", "kg")}</TableCell><TableCell><span className="font-semibold">{rowNumber(row, "wasted_quantity")} {rowText(row, "unit", "kg")}</span></TableCell><TableCell>{money(rowNumber(row, "waste_cost"))}</TableCell></TableRow>)}</TableFrame> : <EmptyRows title="No food-waste records yet" note="Record leftovers or spoilage after service to understand where food can be saved." icon={Recycle} />}<div className="border-t border-border p-4 text-[10px] text-muted-foreground">Waste % = wasted quantity ÷ prepared quantity · {displayed.length} entries shown.</div></Surface><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Waste by service</h2><p className="mt-1 text-[11px] text-muted-foreground">The sample trend provides context only.</p></div></SurfaceHeader><div className="h-[210px] p-4">{displayed.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{ name: "Served", value: Math.max(0, prepared - wasted) }, { name: "Wasted", value: wasted }]} innerRadius={52} outerRadius={76} paddingAngle={3} dataKey="value"><Cell fill="var(--chart-2)" /><Cell fill="var(--warning)" /></Pie><RechartsTooltip contentStyle={{ border: "1px solid var(--border)", borderRadius: "6px", background: "var(--card)", color: "var(--foreground)" }} /></PieChart></ResponsiveContainer> : <BlankChart title="No service data" note="Log waste after the next meal." />}</div><div className="space-y-3 border-t border-border p-4"><div className="flex justify-between text-xs"><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-chart-2" />Served</span><span className="font-medium">{prepared ? `${(prepared - wasted).toLocaleString("en-IN")} kg` : "—"}</span></div><div className="flex justify-between text-xs"><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-warning" />Wasted</span><span className="font-medium">{wasted ? `${wasted.toLocaleString("en-IN")} kg` : "—"}</span></div></div></Surface></div><Callout>For accurate waste percentages, record service actuals in the kitchen screen. Sample entries remain illustrative.</Callout></div>;
}

function AnalyticsPage({ props }: { props: DashboardProps }) {
  const { rows, dataMode, onAction } = props;
  const actuals = rows.filter((row) => row.service_date && (row.is_demo !== true || dataMode === "demo"));
  const wasteEntries = rows.filter((row) => row.waste_cost !== undefined && row.dish_name && (row.is_demo !== true || dataMode === "demo"));
  const weekly = dataMode === "demo" ? sampleTrend : actuals.map((row) => ({ day: friendlyDate(rowText(row, "service_date")), served: rowNumber(row, "served_quantity"), forecast: rowNumber(row, "prepared_quantity"), cost: rowNumber(row, "cost_amount"), waste: rowNumber(row, "waste_cost") }));
  const costTotal = weekly.reduce((sum, day) => sum + day.cost, 0);
  const actualTotal = actuals.reduce((sum, row) => sum + rowNumber(row, "prepared_quantity") * rowNumber(row, "cost_per_serving"), 0);
  const wasteTotal = wasteEntries.reduce((sum, row) => sum + rowNumber(row, "waste_cost"), 0);
  return <div className="space-y-6"><PageHeading page="analytics" demo={dataMode === "demo"} action={() => onAction("report")} /><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatCard label="Food cost this period" value={money(dataMode === "demo" ? costTotal : actualTotal)} hint={dataMode === "demo" ? "Illustrative weekly sample" : actuals.length ? "Estimated from saved service actuals" : "Add service actuals to calculate"} icon={CircleDollarSign} tone="teal" /><StatCard label="Cost per meal" value={dataMode === "demo" ? "₹68" : actuals.length ? money(actualTotal / Math.max(1, actuals.reduce((sum, row) => sum + rowNumber(row, "served_quantity"), 0))) : "—"} hint="Estimated from saved records" icon={Users} tone="green" /><StatCard label="Waste cost" value={money(dataMode === "demo" ? sampleWaste.reduce((sum, row) => sum + row.wasted, 0) * 92 : wasteTotal)} hint={dataMode === "demo" ? "Illustrative sample only" : "Using saved waste entries"} icon={Recycle} tone="amber" /><StatCard label="Actuals recorded" value={String(actuals.length)} hint="Meal service records" icon={CheckCircle2} tone="teal" /></div><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Cost & meal service</h2><p className="mt-1 text-[11px] text-muted-foreground">Weekly service and spend snapshot.</p></div><DatasetStamp demo={dataMode === "demo"} /></SurfaceHeader><div className="h-[300px] p-5">{weekly.length ? <ResponsiveContainer width="100%" height="100%"><ComposedChart data={weekly} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} /><YAxis yAxisId="meals" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} /><YAxis yAxisId="rupees" orientation="right" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} /><RechartsTooltip contentStyle={{ border: "1px solid var(--border)", borderRadius: "6px", background: "var(--card)", color: "var(--foreground)" }} /><Bar yAxisId="meals" dataKey="served" name="Meals served" fill="var(--primary)" radius={[3, 3, 0, 0]} barSize={22} /><Line yAxisId="meals" dataKey="forecast" name="Planned meals" stroke="var(--chart-3)" strokeWidth={2} dot={{ fill: "var(--chart-3)", r: 3 }} /><Line yAxisId="rupees" dataKey="cost" name="Food cost (₹)" stroke="var(--chart-4)" strokeWidth={2} dot={false} /></ComposedChart></ResponsiveContainer> : <BlankChart title="Add real service actuals" note="Cost charts use meals served and food costs from your saved kitchen records." />}</div><div className="border-t border-border px-5 py-3 text-[10px] text-muted-foreground">{dataMode === "demo" ? "Illustrative values are not connected to a real kitchen budget." : "Charts summarise actual records entered by your team."}</div></Surface><div className="grid gap-5 xl:grid-cols-2"><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Budget comparison</h2><p className="mt-1 text-[11px] text-muted-foreground">Track planned spend against your records</p></div></SurfaceHeader><div className="p-5"><div className="flex items-end justify-between"><div><p className="text-xs text-muted-foreground">Recorded food cost</p><p className="mt-2 text-2xl font-semibold">{actualTotal ? money(actualTotal) : dataMode === "demo" ? "₹4.47L" : "—"}</p></div><DatasetStamp demo={dataMode === "demo"} /></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: actualTotal ? "64%" : dataMode === "demo" ? "64%" : "0%" }} /></div><p className="mt-3 text-[10px] text-muted-foreground">Enter your institution’s budget in settings to track budget versus actual.</p></div></Surface><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Meal service efficiency</h2><p className="mt-1 text-[11px] text-muted-foreground">Counts from saved kitchen service actuals.</p></div></SurfaceHeader><div className="p-5"><p className="text-xs text-muted-foreground">Prepared portions</p><p className="mt-2 text-2xl font-semibold">{actuals.length ? actuals.reduce((sum, row) => sum + rowNumber(row, "prepared_quantity"), 0).toLocaleString("en-IN") : dataMode === "demo" ? "6,420" : "—"}</p><p className="mt-2 text-[10px] text-muted-foreground">{actuals.length ? `${actuals.length} records entered by your team` : dataMode === "demo" ? "Illustrative sample only" : "Add meal service actuals to calculate"}</p></div></Surface></div></div>;
}

function NotificationsPage({ props }: { props: DashboardProps }) {
  const { inventoryItems, dataMode, onNavigate } = props;
  const lowItems = inventoryItems.filter((item) => item.quantity <= item.minimum_quantity);
  const notices = dataMode === "demo" ? sampleNotifications : lowItems.map((item) => ({ title: `${item.name} is below minimum`, detail: `${item.quantity} ${item.unit} on hand · minimum ${item.minimum_quantity} ${item.unit}`, time: "Current stock", priority: "High", page: "inventory" as FoodFlowPage }));
  const [unread, setUnread] = useState<number[]>(notices.map((_, index) => index));
  return <div className="space-y-6"><PageHeading page="notifications" demo={dataMode === "demo"} /><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Your notifications</h2><p className="mt-1 text-[11px] text-muted-foreground">{unread.length ? `${unread.length} unread updates` : "You’re all caught up"}</p></div>{unread.length > 0 && <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" onClick={() => setUnread([])}>Mark all as read<CheckCircle2 className="size-3.5" /></Button>}</SurfaceHeader>{notices.length ? <div className="divide-y divide-border">{notices.map((notice, index) => <div className={`flex gap-3 px-4 py-4 sm:px-5 ${unread.includes(index) ? "bg-teal-soft/25" : ""}`} key={`${notice.title}-${index}`}><div className={`mt-1 size-2 shrink-0 rounded-full ${unread.includes(index) ? "bg-primary" : "bg-transparent"}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold">{notice.title}</p><StatusBadge label={notice.priority} /></div><p className="mt-1.5 text-xs leading-5 text-muted-foreground">{notice.detail}</p><p className="mt-2 text-[10px] text-muted-foreground">{notice.time} · {dataMode === "demo" ? "illustrative sample" : "based on your inventory"}</p><Button variant="ghost" size="sm" className="mt-1 h-7 px-0 text-[10px] text-primary" onClick={() => onNavigate(notice.page)}>{notice.page === "inventory" ? "Review inventory" : notice.page === "purchasing" ? "View orders" : "Review meal plan"}<ArrowRight className="size-3" /></Button></div><div className="flex shrink-0 items-start gap-1"><Button variant="ghost" size="icon" className="size-7" aria-label={`Mark ${notice.title} as read`} onClick={() => setUnread((items) => items.filter((item) => item !== index))}><CheckCircle2 className="size-4" /></Button></div></div>)}</div> : <EmptyRows title="You’re all caught up" note="Stock alerts appear here when an item drops below its minimum." icon={CheckCircle2} />}<div className="border-t border-border px-5 py-3 text-[10px] text-muted-foreground">FoodFlow notifications reflect records from your workspace.</div></Surface></div>;
}

function ReportsPage({ props }: { props: DashboardProps }) {
  const { dataMode, onAction, rows, inventoryItems, institutionName } = props;
  const reports = [
    { title: "Weekly meal service", description: "Meal plans, portion counts and kitchen actuals", icon: CalendarDays, page: "meal-planning" as FoodFlowPage },
    { title: "Inventory valuation", description: "Current stock, unit costs and restock levels", icon: Package, page: "inventory" as FoodFlowPage },
    { title: "Attendance summary", description: "Student check-ins across each meal service", icon: Users, page: "attendance" as FoodFlowPage },
    { title: "Food waste report", description: "Prepared, served and leftover quantities", icon: Recycle, page: "waste" as FoodFlowPage },
  ];

  const handleDownloadCSV = () => {
    if (inventoryItems.length) {
      exportToCSV(
        `foodflow-inventory-${new Date().toISOString().slice(0, 10)}.csv`,
        [
          { key: "name", label: "Ingredient Name" },
          { key: "category", label: "Category" },
          { key: "quantity", label: "On Hand" },
          { key: "unit", label: "Unit" },
          { key: "minimum_quantity", label: "Minimum Stock" },
          { key: "unit_cost", label: "Unit Cost (INR)" },
          { key: "supplier_name", label: "Supplier" },
        ],
        inventoryItems.map((item) => ({
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          minimum_quantity: item.minimum_quantity,
          unit_cost: item.unit_cost,
          supplier_name: item.supplier_name || "—",
        }))
      );
    } else {
      exportToCSV(
        `foodflow-meals-${new Date().toISOString().slice(0, 10)}.csv`,
        [
          { key: "title", label: "Meal Plan" },
          { key: "meal_type", label: "Meal Type" },
          { key: "expected_servings", label: "Expected Portions" },
          { key: "service_date", label: "Service Date" },
          { key: "status", label: "Status" },
        ],
        rows.map((row) => ({
          title: rowText(row, "title"),
          meal_type: rowText(row, "meal_type"),
          expected_servings: rowNumber(row, "expected_servings"),
          service_date: rowText(row, "service_date"),
          status: rowText(row, "status"),
        }))
      );
    }
  };

  const handleDownloadPDF = () => {
    const isInventory = inventoryItems.length > 0;
    const headers = isInventory
      ? ["Ingredient", "Category", "Quantity", "Min Stock", "Unit Cost", "Supplier"]
      : ["Service Date", "Meal", "Title", "Portions", "Status"];

    const tableRows = isInventory
      ? inventoryItems.map((item) => [
          item.name,
          item.category,
          `${item.quantity} ${item.unit}`,
          `${item.minimum_quantity} ${item.unit}`,
          money(item.unit_cost),
          item.supplier_name || "—",
        ])
      : rows.slice(0, 25).map((row) => [
          friendlyDate(rowText(row, "service_date")),
          rowText(row, "meal_type"),
          rowText(row, "title"),
          rowNumber(row, "expected_servings").toLocaleString("en-IN"),
          rowText(row, "status"),
        ]);

    const totalVal = inventoryItems.reduce((acc, i) => acc + i.quantity * i.unit_cost, 0);

    exportToPrintablePDF({
      title: isInventory ? "Institutional Inventory Audit Report" : "Meal Service Operational Report",
      institutionName: institutionName || "SmartMess Central Kitchen",
      subtitle: "Official kitchen report generated from verified database records",
      dateRange: `As of ${new Date().toLocaleDateString("en-IN")}`,
      headers,
      rows: tableRows,
      summary: [
        { label: "Total Tracked Items", value: String(isInventory ? inventoryItems.length : rows.length) },
        { label: "Total Valuation", value: isInventory ? money(totalVal) : "₹4.47L (Sample)" },
        { label: "Status", value: "Verified Active" },
      ],
    });
  };

  return (
    <div className="space-y-6">
      <PageHeading page="reports" demo={dataMode === "demo"} action={handleDownloadCSV} />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Data status"
          value={dataMode === "demo" ? "Sample" : "Live"}
          hint={dataMode === "demo" ? "Examples are not actual records" : "Uses this institution’s data"}
          icon={ClipboardList}
          tone={dataMode === "demo" ? "amber" : "green"}
        />
        <StatCard
          label="Inventory entries"
          value={String(inventoryItems.length)}
          hint="Available for download"
          icon={Package}
          tone="teal"
        />
        <StatCard
          label="Meal plans"
          value={String(rows.filter((row) => row.service_date).length)}
          hint="Available for export"
          icon={CalendarDays}
          tone="green"
        />
        <StatCard
          label="Last refreshed"
          value={new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(new Date())}
          hint="Current page view"
          icon={Clock3}
          tone="teal"
        />
      </div>

      <Surface className="overflow-hidden">
        <SurfaceHeader>
          <div>
            <h2 className="text-sm font-semibold">Institutional Export Engine</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Generate real downloadable CSV spreadsheets and printable official PDF reports.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-9 font-bold" onClick={handleDownloadPDF}>
              Print / Save PDF
            </Button>
            <Button size="sm" className="h-9 bg-[#087E8B] text-white hover:bg-[#076d78]" onClick={handleDownloadCSV}>
              <ArrowDownRight className="mr-1 size-3.5" /> Export CSV
            </Button>
          </div>
        </SurfaceHeader>
        <div className="divide-y divide-border/60">
          {reports.map((report) => (
            <button
              key={report.title}
              className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40"
              onClick={() => onAction("report", { title: report.title, page: report.page })}
            >
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-teal-soft text-primary">
                <report.icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold">{report.title}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{report.description}</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </button>
          ))}
        </div>
        <div className="border-t border-border/60 px-5 py-3 text-[10px] text-muted-foreground">
          Files are generated in memory and downloaded directly to your device with UTF-8 encoding.
        </div>
      </Surface>
    </div>
  );
}

function UsersPage({ props }: { props: DashboardProps }) {
  const { members, role, dataMode, onAction, onChangeRole, onRemoveRole } = props;
  const canManageTeam = role === "institution_admin";
  const safeMembers = members.filter((member) => member.roles.length > 0);
  return <div className="space-y-6"><PageHeading page="users" demo={false} {...(canManageTeam ? { action: () => onAction("invite") } : {})} /><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatCard label="Team members" value={String(safeMembers.length)} hint="Signed-in accounts with a role" icon={Users} tone="teal" /><StatCard label="Your access" value={role ? roleLabel(role as DashboardProps["role"] & "institution_admin" | "mess_manager" | "kitchen_staff" | "attendance_operator" | "viewer") : "No role"} hint="Verified from your account" icon={CheckCircle2} tone="green" /><StatCard label="Role groups" value={String(new Set(safeMembers.flatMap((member) => member.roles)).size)} hint="Stored separately from profiles" icon={ShieldCheck} tone="amber" /><StatCard label="Access status" value="Protected" hint="Checked against signed-in roles" icon={LockKeyhole} tone="green" /></div><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Institution team</h2><p className="mt-1 text-[11px] text-muted-foreground">Only an institution administrator can assign or remove roles.</p></div></SurfaceHeader>{safeMembers.length ? <TableFrame headers={["TEAM MEMBER", "EMAIL", "ACCESS ROLE", "ACCOUNT ID", "MANAGE"]} minimumWidth="760px">{safeMembers.map((member) => <TableRow key={member.userId}><TableCell><span className="font-medium">{member.name}</span></TableCell><TableCell className="text-muted-foreground">{member.email ?? "Private"}</TableCell><TableCell><div className="flex flex-wrap gap-1.5">{member.roles.map((memberRole) => <StatusBadge key={memberRole} label={roleLabel(memberRole)} />)}</div></TableCell><TableCell className="font-mono text-[9px] text-muted-foreground">{member.userId.slice(0, 8)}…</TableCell><TableCell>{canManageTeam && member.roles.filter((memberRole) => memberRole !== "institution_admin").length > 0 ? <Button variant="ghost" size="sm" className="h-7 text-[10px] text-danger" onClick={() => onRemoveRole(member, member.roles.find((memberRole) => memberRole !== "institution_admin") ?? "viewer")}>Remove access</Button> : <span className="text-[10px] text-muted-foreground">{canManageTeam && member.roles.includes("institution_admin") ? "Workspace owner" : "Managed by admin"}</span>}</TableCell></TableRow>)}</TableFrame> : <EmptyRows title="Your team will appear here" note="The first institution administrator can add teammates after they create a FoodFlow account." icon={Users} />}<div className="border-t border-border px-5 py-3 text-[10px] text-muted-foreground">Roles are never stored in editable account profile details. A new teammate must create an account before an administrator can add them.</div></Surface><div className="grid gap-5 xl:grid-cols-2">{(["mess_manager", "kitchen_staff", "attendance_operator", "viewer"] as const).map((memberRole) => <Surface className="overflow-hidden" key={memberRole}><div className="flex items-start gap-3 p-4"><div className="grid size-9 shrink-0 place-items-center rounded-md bg-teal-soft text-primary"><ShieldCheck className="size-4" /></div><div className="min-w-0"><h3 className="text-sm font-medium">{roleLabel(memberRole)}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{memberRole === "mess_manager" ? "Manage menus, recipes, kitchen plans, stock and purchasing." : memberRole === "kitchen_staff" ? "Update preparation tasks, stock counts, meal attendance and waste." : memberRole === "attendance_operator" ? "Manage student lists and record meal attendance." : "Review institution records without changing them."}</p></div></div></Surface>)}</div></div>;
}

function SettingsPage({ props }: { props: DashboardProps }) {
  const { currentName, institutionName, institutionId, role, onAction, onSignOut } = props;
  return <div className="space-y-6"><PageHeading page="settings" demo={false} /><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.76fr)]"><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Your account</h2><p className="mt-1 text-[11px] text-muted-foreground">Account details connected to FoodFlow sign-in.</p></div></SurfaceHeader><div className="divide-y divide-border"><SettingRow label="Display name" value={currentName} action={() => onAction("name")} /><SettingRow label="Institution" value={institutionName ?? "Not set up"} action={() => onAction("institution")} /><SettingRow label="Access role" value={role ? roleLabel(role as "institution_admin" | "mess_manager" | "kitchen_staff" | "attendance_operator" | "viewer") : "No institution role"} note="Assigned separately from profile details." /><SettingRow label="Institution ID" value={institutionId ? `${institutionId.slice(0, 8)}…` : "Not linked"} /></div></Surface><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Workspace security</h2><p className="mt-1 text-[11px] text-muted-foreground">How your FoodFlow access is protected.</p></div></SurfaceHeader><div className="divide-y divide-border"><div className="flex items-center gap-3 p-4"><ShieldCheck className="size-4 text-success" /><div><p className="text-xs font-medium">Institution records protected</p><p className="mt-1 text-[10px] text-muted-foreground">Access is verified for each request.</p></div><StatusBadge label="Active" /></div><div className="flex items-center gap-3 p-4"><CheckCircle2 className="size-4 text-success" /><div><p className="text-xs font-medium">Role-based access</p><p className="mt-1 text-[10px] text-muted-foreground">Your role is not trusted from the browser.</p></div><StatusBadge label="Active" /></div><div className="flex items-center gap-3 p-4"><Clock3 className="size-4 text-primary" /><div><p className="text-xs font-medium">Email verification</p><p className="mt-1 text-[10px] text-muted-foreground">New accounts confirm email before sign-in.</p></div><StatusBadge label="On" /></div></div><div className="border-t border-border p-4"><Button variant="outline" className="w-full" onClick={onSignOut}>Sign out<ArrowRight className="size-4" /></Button></div></Surface></div><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Notification preferences</h2><p className="mt-1 text-[11px] text-muted-foreground">Choose which kitchen updates matter to your role.</p></div></SurfaceHeader><div className="grid gap-0 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 sm:divide-x"><Preference label="Low-stock warnings" detail="When ingredients drop below minimum" checked /><Preference label="Meal preparation" detail="Plan and kitchen schedule changes" checked /><Preference label="Pending approvals" detail="Purchases waiting for review" checked={role === "institution_admin" || role === "mess_manager"} /><Preference label="Food waste summary" detail="New service waste has been recorded" checked={role !== "viewer"} /></div></Surface><Callout>Your account name can be changed by you. Institution name changes and role changes are verified through FoodFlow.</Callout></div>;
}

function SettingRow({ label, value, note, action }: { label: string; value: string; note?: string; action?: () => void }) {
  return <div className="flex items-center gap-4 p-4 sm:px-5"><div className="min-w-0 flex-1"><p className="text-xs font-medium">{label}</p>{note && <p className="mt-1 text-[10px] text-muted-foreground">{note}</p>}</div><p className="max-w-48 truncate text-right text-xs text-muted-foreground">{value}</p>{action && <Button variant="outline" size="sm" className="h-8" onClick={action}>Edit</Button>}</div>;
}
function Preference({ label, detail, checked }: { label: string; detail: string; checked: boolean }) { return <div className="flex items-center gap-3 p-4"><div className={`grid size-5 place-items-center rounded-sm border ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>{checked && <CheckCircle2 className="size-3.5" />}</div><div><p className="text-xs font-medium">{label}</p><p className="mt-1 text-[10px] text-muted-foreground">{detail}</p></div><span className="ml-auto text-[10px] text-muted-foreground">{checked ? "On" : "Off"}</span></div>; }

function SupplierPage({ props }: { props: DashboardProps }) {
  const rows = props.rows.filter((row) => row.name && (row.is_demo !== true || props.dataMode === "demo"));
  return <div className="space-y-6"><PageHeading page="purchasing" demo={props.dataMode === "demo"} action={() => props.onAction("supplier")} /><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Supplier directory</h2><p className="mt-1 text-[11px] text-muted-foreground">Supplier contact details for your institution.</p></div><Button size="sm" className="h-8" onClick={() => props.onAction("supplier")}><Plus className="size-3.5" />Add supplier</Button></SurfaceHeader>{rows.length ? <TableFrame headers={["SUPPLIER", "CATEGORY", "CONTACT", "EMAIL", "PHONE", "STATUS"]}>{rows.map((row) => <TableRow key={rowText(row, "id", rowText(row, "name"))}><TableCell><span className="font-medium">{rowText(row, "name")}</span></TableCell><TableCell>{rowText(row, "category")}</TableCell><TableCell>{rowText(row, "contact_name")}</TableCell><TableCell className="text-muted-foreground">{rowText(row, "email")}</TableCell><TableCell className="text-muted-foreground">{rowText(row, "phone")}</TableCell><TableCell><StatusBadge label={rowText(row, "status")} /></TableCell></TableRow>)}</TableFrame> : <EmptyRows title="No suppliers listed" note="Add a supplier to keep ordering contacts in one place." icon={Truck} />}</Surface></div>;
}

function CalendarEventsPage({ props }: { props: DashboardProps }) {
  const events = props.rows.filter((row) => row.event_date);
  return <div className="space-y-6"><PageHeading page="meal-planning" demo={props.dataMode === "demo"} action={() => props.onAction("event")} /><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Academic calendar</h2><p className="mt-1 text-[11px] text-muted-foreground">Campus events can affect meal attendance.</p></div></SurfaceHeader>{events.length ? <TableFrame headers={["DATE", "EVENT", "DETAILS", "ATTENDANCE FACTOR"]}>{events.map((event) => <TableRow key={rowText(event, "id")}><TableCell>{friendlyDate(rowText(event, "event_date"), { day: "numeric", month: "short", year: "numeric" })}</TableCell><TableCell className="font-medium">{rowText(event, "title")}</TableCell><TableCell className="text-muted-foreground">{rowText(event, "description")}</TableCell><TableCell>{rowNumber(event, "attendance_factor", 1).toFixed(2)}×</TableCell></TableRow>)}</TableFrame> : <EmptyRows title="No campus events recorded" note="Add a campus event to keep changes visible alongside meal plans." icon={CalendarDays} />}<div className="p-4"><Button size="sm" onClick={() => props.onAction("event")}><Plus className="size-3.5" />Add an event</Button></div></Surface></div>;
}

function HallsPage({ props }: { props: DashboardProps }) {
  const halls = props.rows.filter((row) => row.name);
  return <div className="space-y-6"><PageHeading page="settings" demo={props.dataMode === "demo"} action={() => props.onAction("hall")} /><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">Dining halls</h2><p className="mt-1 text-[11px] text-muted-foreground">Meal attendance and planned capacity by hall.</p></div></SurfaceHeader>{halls.length ? <TableFrame headers={["DINING HALL", "CAPACITY", "RECORDS"]}>{halls.map((hall) => <TableRow key={rowText(hall, "id")}><TableCell className="font-medium">{rowText(hall, "name")}</TableCell><TableCell>{rowNumber(hall, "capacity").toLocaleString("en-IN")}</TableCell><TableCell><DatasetStamp demo={props.dataMode === "demo"} /></TableCell></TableRow>)}</TableFrame> : <EmptyRows title="No dining halls listed" note="Your first workspace starts with a main dining hall. Add a hall to organise capacity." icon={LayoutDashboard} />}<div className="border-t border-border p-4"><Button size="sm" onClick={() => props.onAction("hall")}><Plus className="size-3.5" />Add dining hall</Button></div></Surface></div>;
}

function GenericRowsPage({ props, title, keys, headers, createKind, icon: Icon }: { props: DashboardProps; title: FoodFlowPage; keys: { key: string; label: string; format?: (row: FoodFlowRow) => ReactNode }[]; headers: string[]; createKind: string; icon: typeof Package }) {
  const records = props.rows.filter((row) => row.is_demo !== true || props.dataMode === "demo");
  return <div className="space-y-6"><PageHeading page={title} demo={props.dataMode === "demo"} action={() => props.onAction(createKind)} /><Surface className="overflow-hidden"><SurfaceHeader><div><h2 className="text-sm font-semibold">{pageTitle(title)} records</h2><p className="mt-1 text-[11px] text-muted-foreground">{keys.map((key) => key.label).join(" · ")}</p></div><DatasetStamp demo={props.dataMode === "demo"} /></SurfaceHeader>{records.length ? <TableFrame headers={headers}>{records.map((row, index) => <TableRow key={rowText(row, "id", String(index))}>{keys.map((key) => <TableCell key={key.key}>{key.format ? key.format(row) : rowText(row, key.key)}</TableCell>)}<TableCell><StatusBadge label={rowText(row, "status", "Recorded")} /></TableCell></TableRow>)}</TableFrame> : <EmptyRows title={`No ${pageTitle(title).toLowerCase()} saved`} note={`Add your first record to start tracking ${pageTitle(title).toLowerCase()} for this institution.`} icon={Icon} />}<div className="border-t border-border p-4"><Button size="sm" onClick={() => props.onAction(createKind)}><Plus className="size-3.5" />{moduleDescriptions[title as keyof typeof moduleDescriptions]?.action ?? "Add record"}</Button></div></Surface></div>;
}

export function FoodFlowContent(props: DashboardProps) {
  const { currentPage, institutionId } = props;
  if (currentPage !== "overview" && !institutionId && !["settings", "users"].includes(currentPage)) return <SetupPanel institutionName={props.institutionName} onAction={(kind) => props.onAction(kind)} />;
  if (currentPage === "overview") return <DashboardOverview props={props} />;
  if (currentPage === "meal-planning" || currentPage === "weekly-menu") return <MealPlanningPage props={props} />;
  if (currentPage === "recipes") return <RecipesPage props={props} />;
  if (currentPage === "kitchen") return <KitchenPage props={props} />;
  if (currentPage === "inventory") return <InventoryPage props={props} />;
  if (currentPage === "purchasing") return <PurchasingPage props={props} />;
  if (currentPage === "attendance") return <AttendancePage props={props} />;
  if (currentPage === "students") return <StudentsPage props={props} />;
  if (currentPage === "forecast") return <ForecastPage props={props} />;
  if (currentPage === "waste") return <WastePage props={props} />;
  if (currentPage === "analytics") return <AnalyticsPage props={props} />;
  if (currentPage === "notifications") return <NotificationsPage props={props} />;
  if (currentPage === "reports") return <ReportsPage props={props} />;
  if (currentPage === "users") return <UsersPage props={props} />;
  if (currentPage === "settings") return <SettingsPage props={props} />;
  if (currentPage === "calendar") return <CalendarEventsPage props={props} />;
  if (currentPage === "suppliers") return <SupplierPage props={props} />;
  if (currentPage === "halls") return <HallsPage props={props} />;
  if (currentPage === "movements") return <GenericRowsPage props={props} title="movements" keys={[{ key: "item_name", label: "Item" }, { key: "quantity_delta", label: "Change" }, { key: "unit", label: "Unit" }, { key: "reason", label: "Reason" }, { key: "moved_at", label: "Date", format: (row) => friendlyDate(rowText(row, "moved_at")) }]} headers={["ITEM", "CHANGE", "UNIT", "REASON", "DATE"]} createKind="movement" icon={Package} />;
  if (currentPage === "actuals") return <GenericRowsPage props={props} title="actuals" keys={[{ key: "service_date", label: "Date", format: (row) => friendlyDate(rowText(row, "service_date")) }, { key: "meal_type", label: "Meal" }, { key: "dish_name", label: "Dish" }, { key: "prepared_quantity", label: "Prepared" }, { key: "served_quantity", label: "Served" }, { key: "leftover_quantity", label: "Leftover" }]} headers={["DATE", "MEAL", "DISH", "PREPARED", "SERVED", "LEFTOVER"]} createKind="actual" icon={ClipboardList} />;
  return <DashboardOverview props={props} />;
}

function Callout({ children }: { children: ReactNode }) { return <div className="flex items-start gap-3 border-l-2 border-primary bg-teal-soft/60 px-4 py-3.5"><Sparkles className="mt-0.5 size-4 shrink-0 text-primary" /><p className="text-xs leading-5 text-foreground/75">{children}</p></div>; }

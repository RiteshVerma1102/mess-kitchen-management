import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Beaker,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  ChefHat,
  ChartNoAxesCombined,
  ChartPie,
  ChevronDown,
  CircleHelp,
  Command,
  CookingPot,
  Database,
  FileBarChart,
  ForkKnife,
  Globe,
  GraduationCap,
  History,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Package,
  QrCode,
  Recycle,
  ScanLine,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Truck,
  UserRoundCog,
  Users,
  X,
} from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";

import { BrandLogo } from "@/features/marketing/brand";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FoodFlowPage } from "@/lib/foodflow-data";
import { navigationGroups, systemNavigation } from "@/lib/foodflow-data";

type FoodFlowShellProps = {
  children: React.ReactNode;
  currentPage: FoodFlowPage;
  currentName: string;
  institutionName: string | null;
  unreadCount: number;
  dataMode: "live" | "demo";
  onToggleDemo: () => void;
  onSignOut: () => void;
};

const routeForPage = (page: FoodFlowPage) => (page === "overview" ? "/" : `/${page}`);

function SidebarContents({
  currentPage,
  institutionName,
  onNavigate,
}: {
  currentPage: FoodFlowPage;
  institutionName: string | null;
  onNavigate?: () => void;
}) {
  return (
    <>
      {/* Brand Header */}
      <div className="flex h-20 items-center justify-between border-b border-sidebar-border px-5">
        <BrandLogo />
      </div>

      {/* Institution Switcher Card */}
      <div className="mx-3 mt-4">
        <Button
          variant="ghost"
          className="h-auto w-full justify-start gap-3 rounded-2xl border border-sidebar-border bg-sidebar-accent/50 p-3 text-left transition-colors hover:bg-sidebar-accent"
        >
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <LayoutDashboard className="size-4" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-xs font-bold text-sidebar-foreground">
              {institutionName || "Apex Hostel & Mess"}
            </span>
            <span className="truncate text-[10px] font-medium text-muted-foreground">
              3 Halls &bull; Main Mess Campus
            </span>
          </div>
        </Button>
      </div>

      {/* Navigation Group Links */}
      <div className="foodflow-nav-scroll flex-1 space-y-6 overflow-y-auto px-3 pb-6 pt-5">
        {navigationGroups.map((group) => (
          <section key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80">
              {group.label}
            </p>
            <nav aria-label={group.label.toLowerCase()} className="space-y-1">
              {group.items.map((item) => {
                const Icon = iconMap[item.icon] ?? Activity;
                const active = currentPage === item.page;
                return (
                  <Link
                    key={item.page}
                    to={routeForPage(item.page)}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-10 items-center gap-3 rounded-xl px-3.5 text-xs font-semibold transition-all ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 font-bold"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </section>
        ))}

        {/* Quick Portal Switcher */}
        <section>
          <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80">
            COUNTERS &amp; PORTAL
          </p>
          <nav className="space-y-1">
            <Link
              to="/attendance"
              onClick={onNavigate}
              className="flex h-10 items-center gap-3 rounded-xl px-3.5 text-xs font-bold text-[#FF7A1A] hover:bg-[#FFE1D0]/40 transition-colors"
            >
              <QrCode className="size-4 shrink-0 text-[#FF7A1A]" />
              <span>Live Scanner Kiosk</span>
            </Link>
            <Link
              to="/students"
              onClick={onNavigate}
              className="flex h-10 items-center gap-3 rounded-xl px-3.5 text-xs font-bold text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <GraduationCap className="size-4 shrink-0 text-primary" />
              <span>Student Directory</span>
            </Link>
            <Link
              to="/student"
              onClick={onNavigate}
              className="flex h-10 items-center gap-3 rounded-xl px-3.5 text-xs font-bold text-[#087E8B] hover:bg-[#DDF3EA]/60 transition-colors"
            >
              <ForkKnife className="size-4 shrink-0 text-[#087E8B]" />
              <span>Student Dining Portal</span>
            </Link>
            <Link
              to="/audit"
              onClick={onNavigate}
              className="flex h-10 items-center gap-3 rounded-xl px-3.5 text-xs font-bold text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <History className="size-4 shrink-0 text-muted-foreground" />
              <span>System Audit Log</span>
            </Link>
          </nav>
        </section>

        {/* System Settings Links */}
        <section>
          <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80">
            SYSTEM &amp; CONTROLS
          </p>
          <nav className="space-y-1">
            {systemNavigation.map((item) => {
              const Icon = iconMap[item.icon] ?? Activity;
              const active = currentPage === item.page;
              return (
                <Link
                  key={item.page}
                  to={routeForPage(item.page)}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-10 items-center gap-3 rounded-xl px-3.5 text-xs font-semibold transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 font-bold"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </section>
      </div>

      {/* Pro Max Footer Badge */}
      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-2xl bg-sidebar-accent/50 p-3 text-xs border border-sidebar-border/50">
          <div className="flex items-center gap-2 font-bold text-sidebar-foreground">
            <Sparkles className="size-3.5 text-saffron" />
            <span>AI Demand Forecast</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
            Multi-factor model active with weekday + calendar + weather weights.
          </p>
        </div>
      </div>
    </>
  );
}

export function FoodFlowShell({
  children,
  currentPage,
  currentName,
  institutionName,
  unreadCount,
  dataMode,
  onToggleDemo,
  onSignOut,
}: FoodFlowShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [language, setLanguage] = useState<"en" | "hi">("en");

  // AI Chat History
  const [aiChat, setAiChat] = useState<{ role: "user" | "assistant"; text: string }[]>([
    {
      role: "assistant",
      text: "Hello! I am Ask FoodFlow, your kitchen AI copilot. I can analyze food waste, suggest recipe ingredient substitutions, or predict Friday rice requirements.",
    },
  ]);

  const location = useRouterState({ select: (router) => router.location.pathname });
  const navigate = useNavigate();

  const links = useMemo(
    () =>
      navigationGroups
        .flatMap((group) => group.items)
        .concat(systemNavigation)
        .concat([
          { label: "Student Dining Portal", page: "students", icon: "ForkKnife" },
          { label: "System Audit Log", page: "overview", icon: "History" },
        ]),
    []
  );

  const searchLink = links.find((item) => routeForPage(item.page) === location);
  const initials = currentName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Global Cmd/Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleAskAI = (prompt?: string) => {
    const textToAsk = prompt || aiQuestion;
    if (!textToAsk.trim()) return;

    setAiChat((prev) => [
      ...prev,
      { role: "user", text: textToAsk },
      {
        role: "assistant",
        text: textToAsk.toLowerCase().includes("waste")
          ? "Analysis: Waste peaked on Thursday lunch (+18%) due to excess rice preparation after 42 students skipped without notice. Recommendation: Adjust safety buffer from 8% to 5% and send student meal skip reminders via SMS."
          : textToAsk.toLowerCase().includes("rice")
          ? "Calculation: For Friday Lunch across 3 halls (North Hall: 420, South Hall: 310, Exec: 95 = 825 expected diners), required Basmati Rice is 82.5 kg dry weight (100g/portion) plus 5% buffer = 86.6 kg. Current stock on hand: 140 kg (Sufficient)."
          : "Based on current menu costing, replacing Cashews with Roasted Peanuts in Dal Makhani saves ₹4.80 per plate while maintaining protein content. All changes respect your vegetarian dining guidelines.",
      },
    ]);
    setAiQuestion("");
  };

  const filteredCommands = links.filter((item) =>
    item.label.toLowerCase().includes(commandQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Permanent Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <SidebarContents currentPage={currentPage} institutionName={institutionName} />
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[285px] bg-sidebar p-0" aria-describedby={undefined}>
          <SheetTitle className="sr-only">FoodFlow Menu</SheetTitle>
          <div className="flex h-full flex-col">
            <SidebarContents
              currentPage={currentPage}
              institutionName={institutionName}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Command Palette Dialog (Cmd/Ctrl+K) */}
      <Dialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden rounded-3xl border-[#E5EAF0] shadow-2xl">
          <DialogHeader className="border-b border-[#E5EAF0] px-4 py-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Search className="size-4 text-primary" />
              <Input
                autoFocus
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                placeholder="Type a command or jump to page... (e.g. Recipes, Forecast, Student)"
                className="border-none shadow-none text-sm focus-visible:ring-0 h-9 p-0"
              />
              <Badge className="bg-muted text-muted-foreground font-mono text-[10px]">ESC</Badge>
            </div>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto p-2 space-y-1">
            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Navigation &amp; Pages
            </p>
            {filteredCommands.map((item) => {
              const Icon = iconMap[item.icon] ?? Activity;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    setCommandPaletteOpen(false);
                    void navigate({ to: routeForPage(item.page) });
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors text-left"
                >
                  <div className="grid size-7 place-items-center rounded-lg bg-muted text-primary">
                    <Icon className="size-3.5" />
                  </div>
                  <span>{item.label}</span>
                  <ArrowRight className="ml-auto size-3 text-muted-foreground opacity-50" />
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Ask FoodFlow AI Assistant Drawer */}
      <Sheet open={aiDrawerOpen} onOpenChange={setAiDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-white">
          <SheetHeader className="border-b border-[#E5EAF0] p-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-[#087E8B] text-white">
                <Sparkles className="size-4 text-amber-300" />
              </div>
              <div>
                <SheetTitle className="font-display text-base font-bold text-[#172B3A]">
                  Ask FoodFlow AI
                </SheetTitle>
                <span className="text-[11px] text-[#718096]">Kitchen Copilot &bull; Zero Tenant Leakage</span>
              </div>
            </div>
          </SheetHeader>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {aiChat.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#DDF3EA] text-[#087E8B]">
                    <Bot className="size-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#087E8B] text-white rounded-tr-xs"
                      : "bg-[#F5F8FA] border border-[#E5EAF0] text-[#172B3A] rounded-tl-xs"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Prompts */}
          <div className="border-t border-[#E5EAF0] p-3 bg-[#F5F8FA] space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#718096]">Suggested Queries</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Why did waste rise last week?",
                "Forecast rice for Friday",
                "Suggest cheaper protein",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => handleAskAI(q)}
                  className="rounded-full border border-[#E5EAF0] bg-white px-2.5 py-1 text-[11px] font-medium text-[#172B3A] hover:border-[#087E8B] hover:text-[#087E8B] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskAI();
              }}
              className="flex gap-2 pt-1"
            >
              <Input
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="Ask about inventory, recipes, forecast..."
                className="h-10 text-xs rounded-xl bg-white border-[#E5EAF0]"
              />
              <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-xl bg-[#087E8B] text-white">
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main App Content Viewport */}
      <div className="min-w-0 md:pl-[264px]">
        {/* Sticky App Header */}
        <header className="sticky top-0 z-20 flex h-20 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <MenuIcon className="size-5" />
          </Button>

          {/* Breadcrumbs */}
          <div className="hidden min-w-0 items-center gap-2 text-xs font-semibold text-muted-foreground sm:flex">
            <span className="text-foreground">SmartMess</span>
            <span className="text-border">/</span>
            <span className="truncate text-primary">{searchLink?.label ?? "Overview"}</span>
          </div>

          {/* Top Bar Action Tools */}
          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            {/* Command Palette Trigger (Cmd/Ctrl+K) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommandPaletteOpen(true)}
              className="h-10 w-48 justify-start gap-2 rounded-full border-border bg-background px-3 text-xs font-semibold text-muted-foreground sm:flex hidden"
            >
              <Search className="size-3.5" />
              <span>Search modules...</span>
              <span className="ml-auto flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                <Command className="size-2.5" />K
              </span>
            </Button>

            {/* Ask FoodFlow AI Trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAiDrawerOpen(true)}
              className="h-9 gap-1.5 rounded-full border-[#087E8B]/30 bg-[#DDF3EA]/60 px-3 text-xs font-bold text-[#087E8B] hover:bg-[#DDF3EA]"
            >
              <Sparkles className="size-3.5 text-[#16A36A]" />
              <span className="hidden sm:inline">Ask FoodFlow</span>
            </Button>

            {/* Language Switcher */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === "en" ? "hi" : "en")}
              className="h-9 rounded-full border border-border px-2.5 text-xs font-bold"
              title="Toggle English / हिंदी"
            >
              <Globe className="mr-1 size-3.5 text-primary" />
              <span>{language === "en" ? "हिंदी" : "EN"}</span>
            </Button>

            {/* Notifications Bell */}
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="relative rounded-full"
              aria-label={`Notifications, ${unreadCount} unread`}
            >
              <Link to="/notifications">
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive ring-2 ring-background" />
                )}
              </Link>
            </Button>

            {/* Data Mode Switcher */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-full px-3 text-xs font-bold"
              onClick={onToggleDemo}
              title={
                dataMode === "demo"
                  ? "Showing illustrative sample records - click to switch to Live DB"
                  : "Showing live Supabase records"
              }
            >
              {dataMode === "demo" ? (
                <>
                  <Beaker className="size-3.5 text-warning" />
                  <span className="text-warning">Sample Mode</span>
                </>
              ) : (
                <>
                  <Database className="size-3.5 text-success" />
                  <span className="text-success">Live Mode</span>
                </>
              )}
            </Button>

            <span className="mx-1 hidden h-6 w-px bg-border sm:block" />

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 gap-2.5 rounded-full px-2">
                  <Avatar className="size-8 rounded-full border border-border">
                    <AvatarFallback className="bg-primary text-xs font-extrabold text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-36 truncate text-xs font-bold sm:block">
                    {currentName}
                  </span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 rounded-2xl p-1.5">
                <DropdownMenuLabel className="p-2 font-normal">
                  <span className="block truncate text-xs font-bold">{currentName}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {institutionName || "Apex Hostel & Mess"}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-xl text-xs font-medium cursor-pointer"
                  onClick={() => void navigate({ to: "/student" })}
                >
                  <ForkKnife className="mr-2 size-4 text-[#087E8B]" />
                  Student Dining Portal
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-xl text-xs font-medium cursor-pointer"
                  onClick={() => void navigate({ to: "/audit" })}
                >
                  <History className="mr-2 size-4 text-muted-foreground" />
                  System Audit Log
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-xl text-xs font-medium cursor-pointer"
                  onClick={() => void navigate({ to: "/onboarding" })}
                >
                  <Sparkles className="mr-2 size-4 text-saffron" />
                  Run Setup Wizard
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-xl text-xs font-medium cursor-pointer"
                  onClick={() => void navigate({ to: "/settings" })}
                >
                  <Settings2 className="mr-2 size-4 text-muted-foreground" />
                  Institution Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-xl text-xs font-medium cursor-pointer"
                  onClick={() => void navigate({ to: "/users" })}
                >
                  <UserRoundCog className="mr-2 size-4 text-muted-foreground" />
                  Team &amp; Roles
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-xl text-xs font-medium text-destructive cursor-pointer"
                  onClick={onSignOut}
                >
                  <LogOut className="mr-2 size-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="mx-auto min-h-[calc(100vh-80px)] w-full max-w-[1540px] px-4 pb-12 pt-8 sm:px-6 sm:pt-10 lg:px-8">
          {children}
        </main>
        <div aria-live="polite" className="sr-only">
          {currentName}, {institutionName ?? "no institution selected"}
        </div>
      </div>
    </div>
  );
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Activity,
  Bell,
  BookOpen,
  CalendarDays,
  ChefHat,
  ChartNoAxesCombined,
  ChartPie,
  CircleHelp,
  CookingPot,
  FileBarChart,
  LayoutDashboard,
  Package,
  Recycle,
  ScanLine,
  Settings2,
  Truck,
  UserRoundCog,
  Users,
  QrCode,
  GraduationCap,
  History,
  ForkKnife,
};

export function getIcon(name: string) {
  return iconMap[name] ?? Activity;
}

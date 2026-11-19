import { useMemo, useState } from "react";
import {
  Activity,
  Bell,
  BookOpen,
  CalendarDays,
  ChefHat,
  ChartNoAxesCombined,
  ChartPie,
  ChevronDown,
  CircleHelp,
  Command,
  CookingPot,
  FileBarChart,
  LayoutDashboard,
  Menu as MenuIcon,
  Package,
  Recycle,
  ScanLine,
  Search,
  Settings2,
  Sparkles,
  Truck,
  UserRoundCog,
  Users,
  LogOut,
  Database,
  Beaker,
  ForkKnife,
  QrCode,
  GraduationCap,
} from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
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
      <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary text-white shadow-md shadow-primary/25">
          <ForkKnife className="size-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-display text-lg font-extrabold tracking-tight text-sidebar-foreground">
            SmartMess
          </span>
          <span className="text-[10px] font-bold tracking-wider uppercase text-primary">
            FoodFlow Pro Max
          </span>
        </div>
        <Badge className="ml-auto rounded-full bg-saffron px-2 py-0.5 text-[9px] font-bold text-forest">
          v2.4
        </Badge>
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
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-sidebar-foreground">
              {institutionName || "Select Institution"}
            </p>
            <p className="text-[10px] text-muted-foreground">Central Mess Operations</p>
          </div>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
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
                    className={`flex h-10 items-center gap-3 rounded-xl px-3.5 text-xs font-bold transition-all ${
                      active
                        ? "bg-primary text-white shadow-sm shadow-primary/20"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
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
              <QrCode className="size-4 shrink-0" />
              <span className="truncate">Live Scanner Kiosk</span>
            </Link>
            <Link
              to="/students"
              onClick={onNavigate}
              className="flex h-10 items-center gap-3 rounded-xl px-3.5 text-xs font-bold text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <GraduationCap className="size-4 shrink-0" />
              <span className="truncate">Student Directory &amp; Bills</span>
            </Link>
          </nav>
        </section>

        {/* System & Settings */}
        <section>
          <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80">
            WORKSPACE CONFIG
          </p>
          <nav className="space-y-1" aria-label="workspace">
            {systemNavigation.map((item) => {
              const Icon = iconMap[item.icon] ?? Activity;
              const active = currentPage === item.page;
              return (
                <Link
                  key={item.page}
                  to={routeForPage(item.page)}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-10 items-center gap-3 rounded-xl px-3.5 text-xs font-bold transition-all ${
                    active
                      ? "bg-primary text-white shadow-sm shadow-primary/20"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </section>
      </div>

      {/* Pro Max Badge Footer */}
      <div className="border-t border-sidebar-border p-3.5">
        <div className="flex items-center gap-3 rounded-2xl bg-cream p-3 text-forest">
          <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-saffron text-forest font-black">
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold">FoodFlow Pro Max</p>
            <p className="text-[10px] opacity-75">Multi-Tenant Verified</p>
          </div>
          <CircleHelp className="ml-auto size-4 shrink-0 opacity-50" />
        </div>
      </div>
    </>
  );
}

export const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Activity,
  CalendarDays,
  CookingPot,
  BookOpen,
  ChefHat,
  Package,
  Truck,
  ScanLine,
  Users,
  ChartNoAxesCombined,
  Recycle,
  ChartPie,
  FileBarChart,
  Bell,
  UserRoundCog,
  Settings2,
};

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
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useRouterState({ select: (router) => router.location.pathname });
  const links = useMemo(
    () =>
      navigationGroups
        .flatMap((group) => group.items)
        .concat(systemNavigation)
        .filter((item) => item.page !== "overview" || currentPage !== "overview"),
    [currentPage]
  );
  const searchLink = links.find((item) => routeForPage(item.page) === location);
  const navigate = useNavigate();
  const initials =
    currentName
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "FF";

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-saffron selection:text-forest">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-sidebar-border bg-sidebar md:flex shadow-sm">
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
            {/* Quick Search */}
            {searchOpen ? (
              <div className="relative min-w-0">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  aria-label="Search FoodFlow modules"
                  className="h-10 w-44 rounded-full pl-9 pr-4 text-xs font-medium sm:w-64"
                  placeholder="Jump to module..."
                  onChange={(event) => {
                    const value = event.target.value.trim().toLowerCase();
                    if (!value) return;
                    const match = links.find((item) => item.label.toLowerCase().includes(value));
                    if (match) void navigate({ to: routeForPage(match.page) });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setSearchOpen(false);
                  }}
                />
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="hidden h-10 w-52 justify-start gap-2 rounded-full border-border bg-background px-3 text-xs font-semibold text-muted-foreground sm:flex"
                aria-label="Search FoodFlow"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="size-3.5" /> Search modules...
                <span className="ml-auto flex items-center gap-1 text-[10px] opacity-60">
                  <Command className="size-3" />K
                </span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              aria-label="Search FoodFlow"
              className="sm:hidden"
              onClick={() => setSearchOpen((open) => !open)}
            >
              <Search className="size-4" />
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
              <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
                <DropdownMenuLabel className="p-2 font-normal">
                  <span className="block truncate text-xs font-bold">{currentName}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {institutionName || "SmartMess FoodFlow"}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-xl text-xs font-medium"
                  onClick={() => void navigate({ to: "/settings" })}
                >
                  <Settings2 className="mr-2 size-4 text-muted-foreground" />
                  Institution Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-xl text-xs font-medium"
                  onClick={() => void navigate({ to: "/users" })}
                >
                  <UserRoundCog className="mr-2 size-4 text-muted-foreground" />
                  Team &amp; Roles
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="rounded-xl text-xs font-medium text-destructive" onClick={onSignOut}>
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

export function getIcon(name: string) {
  return iconMap[name] ?? Activity;
}

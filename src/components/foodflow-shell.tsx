import { useMemo, useState } from "react";
import { Activity, Bell, BookOpen, CalendarDays, ChefHat, ChartNoAxesCombined, ChartPie, ChevronDown, CircleHelp, Command, CookingPot, FileBarChart, LayoutDashboard, Menu as MenuIcon, Package, Recycle, ScanLine, Search, Settings2, Sparkles, Truck, UserRoundCog, Users, LogOut, Database, Beaker } from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

const routeForPage = (page: FoodFlowPage) => page === "overview" ? "/" : `/${page}`;

function SidebarContents({ currentPage, institutionName, onNavigate }: { currentPage: FoodFlowPage; institutionName: string | null; onNavigate?: () => void }) {
  return (
    <>
      <div className="flex h-[68px] items-center gap-3 border-b border-sidebar-border px-5">
        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"><Activity className="size-5" /></div>
        <span className="text-lg font-semibold tracking-normal text-sidebar-foreground">FoodFlow</span>
        <Badge variant="outline" className="ml-auto rounded-sm px-1.5 py-0 text-[9px] font-medium text-muted-foreground">BETA</Badge>
      </div>

      <Button variant="ghost" className="mx-3 mt-4 h-auto justify-start gap-3 rounded-md border border-sidebar-border p-3 text-left transition-colors hover:bg-sidebar-accent">
        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground"><LayoutDashboard className="size-4" /></div>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-sidebar-foreground">{institutionName || "Set up your institution"}</p><p className="mt-0.5 text-xs text-muted-foreground">Institution workspace</p></div>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </Button>

      <div className="foodflow-nav-scroll flex-1 space-y-6 overflow-y-auto px-3 pb-4 pt-6">
        {navigationGroups.map((group) => (
          <section key={group.label}>
            <p className="mb-2 px-2 text-[10px] font-semibold text-muted-foreground">{group.label}</p>
            <nav aria-label={group.label.toLowerCase()} className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = iconMap[item.icon] ?? Activity;
                const active = currentPage === item.page;
                return (
          <Link
                    key={item.page}
                    to={routeForPage(item.page)}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors ${active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </section>
        ))}
        <section>
          <p className="mb-2 px-2 text-[10px] font-semibold text-muted-foreground">WORKSPACE</p>
          <nav className="space-y-0.5" aria-label="workspace">
            {systemNavigation.map((item) => {
              const Icon = iconMap[item.icon] ?? Activity;
              const active = currentPage === item.page;
              return <Link key={item.page} to={routeForPage(item.page)} onClick={onNavigate} aria-current={active ? "page" : undefined} className={`flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors ${active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}><Icon className="size-4 shrink-0" /><span className="truncate">{item.label}</span></Link>;
            })}
          </nav>
        </section>
      </div>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-md bg-sidebar-accent/60 p-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"><Sparkles className="size-4" /></div>
          <div className="min-w-0"><p className="text-xs font-medium text-sidebar-foreground">FoodFlow workspace</p><p className="mt-0.5 text-[10px] text-muted-foreground">Connected to your account</p></div>
          <CircleHelp className="ml-auto size-4 shrink-0 text-muted-foreground" />
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

export function FoodFlowShell({ children, currentPage, currentName, institutionName, unreadCount, dataMode, onToggleDemo, onSignOut }: FoodFlowShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useRouterState({ select: (router) => router.location.pathname });
  const links = useMemo(() => navigationGroups.flatMap((group) => group.items).concat(systemNavigation).filter((item) => item.page !== "overview" || currentPage !== "overview"), [currentPage]);
  const searchLink = links.find((item) => routeForPage(item.page) === location);
  const navigate = useNavigate();
  const initials = currentName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "FF";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[256px] flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <SidebarContents currentPage={currentPage} institutionName={institutionName} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[285px] bg-sidebar p-0" aria-describedby={undefined}>
          <SheetTitle className="sr-only">FoodFlow menu</SheetTitle>
          <div className="flex h-full flex-col"><SidebarContents currentPage={currentPage} institutionName={institutionName} onNavigate={() => setMobileOpen(false)} /></div>
        </SheetContent>
      </Sheet>

      <div className="min-w-0 md:pl-[256px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" onClick={() => setMobileOpen(true)}><MenuIcon className="size-5" /></Button>
          <div className="hidden min-w-0 items-center gap-2 text-xs text-muted-foreground sm:flex">
            <span>FoodFlow</span><span className="text-border">/</span><span className="truncate text-foreground">{searchLink?.label ?? "Overview"}</span>
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-3">
            {searchOpen ? <div className="relative min-w-0"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input autoFocus aria-label="Search FoodFlow pages" className="h-9 w-36 pl-9 sm:w-56" placeholder="Search FoodFlow" onChange={(event) => { const value = event.target.value.trim().toLowerCase(); if (!value) return; const match = links.find((item) => item.label.toLowerCase().includes(value)); if (match) void navigate({ to: routeForPage(match.page) }); }} onKeyDown={(event) => { if (event.key === "Escape") setSearchOpen(false); }} /></div> : <Button variant="outline" size="sm" className="hidden h-9 w-56 justify-start gap-2 text-muted-foreground sm:flex" aria-label="Search FoodFlow" onClick={() => setSearchOpen(true)}><Search className="size-4" /> Search <span className="ml-auto flex items-center gap-1 text-[10px]"><Command className="size-3" />K</span></Button>}
            <Button variant="ghost" size="icon" aria-label="Search FoodFlow" className="sm:hidden" onClick={() => setSearchOpen((open) => !open)}><Search className="size-4" /></Button>
            <Button asChild variant="ghost" size="icon" className="relative" aria-label={`Notifications, ${unreadCount} unread`}><Link to="/notifications"><Bell className="size-[18px]" />{unreadCount > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger ring-2 ring-background" />}</Link></Button>
            <Button variant="outline" size="sm" className="hidden h-8 px-2.5 text-[10px] sm:inline-flex" onClick={onToggleDemo} title={dataMode === "demo" ? "Show saved workspace records" : "Show illustrative sample records"}>{dataMode === "demo" ? <Beaker className="size-3.5" /> : <Database className="size-3.5" />}{dataMode === "demo" ? "Sample" : "Live"}</Button>
            <span className="mx-1 hidden h-7 w-px bg-border sm:block" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" className="h-10 gap-2 px-1.5"><Avatar className="size-8 rounded-md"><AvatarFallback className="rounded-md bg-teal-soft text-xs font-semibold text-primary">{initials}</AvatarFallback></Avatar><span className="hidden max-w-36 truncate text-sm font-medium sm:block">{currentName}</span><ChevronDown className="size-4 text-muted-foreground" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal"><span className="block truncate text-xs font-medium">{currentName}</span><span className="mt-1 block truncate text-[10px] text-muted-foreground">{institutionName || "FoodFlow account"}</span></DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void navigate({ to: "/settings" })}><Settings2 className="size-4" />Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => void navigate({ to: "/users" })}><UserRoundCog className="size-4" />User management</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onSignOut}><LogOut className="size-4" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto min-h-[calc(100vh-68px)] w-full max-w-[1540px] px-4 pb-10 pt-7 sm:px-6 sm:pt-8 lg:px-8">{children}</main>
        <div aria-live="polite" className="sr-only">{currentName}, {institutionName ?? "no institution selected"}</div>
      </div>
    </div>
  );
}

export function getIcon(name: string) {
  return iconMap[name] ?? Activity;
}
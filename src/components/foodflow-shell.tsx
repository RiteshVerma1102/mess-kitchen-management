import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Beaker,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
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
  IndianRupee,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu as MenuIcon,
  MessageSquareHeart,
  Package,
  Plus,
  QrCode,
  Recycle,
  ScanLine,
  Search,
  Settings2,
  Sparkles,
  Truck,
  UserRoundCog,
  Users,
} from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";

import { BrandLogo } from "@/features/marketing/brand";
import { AskFoodFlowDrawer } from "@/components/ask-foodflow-drawer";
import { useFirebaseAuth } from "@/components/firebase-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { formatWorkspaceRole, isPageAllowedForRole } from "@/lib/domain/workspace-types";
import type { FoodFlowPage } from "@/lib/foodflow-data";
import { navigationGroups, systemNavigation } from "@/lib/foodflow-data";
import { TRANSLATIONS } from "@/lib/i18n";

type FoodFlowShellProps = {
  children: React.ReactNode;
  currentPage: FoodFlowPage;
  currentName: string;
  institutionName: string | null;
  hallCount?: number;
  unreadCount: number;
  dataMode: "live" | "demo";
  savingStatus?: "idle" | "saving" | "saved";
  messSummary?: import("@/lib/ai-client").SanitizedMessSummary;
  onToggleDemo: () => void;
  onSignOut: () => void;
};

const routeForPage = (page: FoodFlowPage) => (page === "overview" ? "/overview" : `/${page}`);

function SidebarContents({
  currentPage,
  institutionName,
  hallCount,
  dataMode,
  onNavigate,
}: {
  currentPage: FoodFlowPage;
  institutionName: string | null;
  hallCount?: number;
  dataMode: "live" | "demo";
  onNavigate?: () => void;
}) {
  const { memberships, activeWorkspace, role, workspaceLoading, language, switchWorkspace } =
    useFirebaseAuth();
  const navigate = useNavigate();
  const t = TRANSLATIONS[language];

  const roleDisplay = role
    ? formatWorkspaceRole(role, language)
    : workspaceLoading
      ? t.ops.loadingRole
      : formatWorkspaceRole(null, language);

  const subtitle =
    dataMode === "demo"
      ? `${t.sampleMode} · Preview`
      : activeWorkspace
        ? `${hallCount ?? 0} ${hallCount === 1 ? "Hall" : "Halls"} · ${roleDisplay}`
        : workspaceLoading
          ? t.ops.loadingRole
          : "No workspace selected";

  return (
    <>
      <div className="flex h-20 items-center justify-between border-b border-sidebar-border px-5">
        <BrandLogo />
      </div>

      {/* Workspace Switcher Dropdown */}
      <div className="mx-3 mt-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto w-full justify-start gap-3 rounded-2xl border border-sidebar-border bg-sidebar-accent/50 p-3 text-left transition-colors hover:bg-sidebar-accent"
            >
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <LayoutDashboard className="size-4" />
              </div>
              <div className="min-w-0 flex-1 flex-col overflow-hidden">
                <span className="block truncate text-xs font-bold text-sidebar-foreground">
                  {institutionName || activeWorkspace?.name || "FoodFlow Workspace"}
                </span>
                <span className="block truncate text-[10px] font-medium text-muted-foreground">
                  {subtitle}
                </span>
              </div>
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60 rounded-2xl p-1.5">
            <DropdownMenuLabel className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Your Workspaces
            </DropdownMenuLabel>
            {memberships.length > 0 ? (
              memberships.map((m) => (
                <DropdownMenuItem
                  key={m.workspaceId}
                  className="cursor-pointer rounded-xl text-xs font-medium"
                  onClick={() => {
                    void switchWorkspace(m.workspaceId);
                    onNavigate?.();
                  }}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{m.workspaceName}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatWorkspaceRole(m.role, language)}
                    </span>
                  </div>
                  {activeWorkspace?.id === m.workspaceId && (
                    <Check className="size-3.5 text-[#087E8B]" />
                  )}
                </DropdownMenuItem>
              ))
            ) : (
              <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
                No live workspaces linked yet
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer rounded-xl text-xs font-bold text-[#087E8B]"
              onClick={() => {
                onNavigate?.();
                void navigate({ to: "/onboarding" });
              }}
            >
              <Plus className="mr-2 size-3.5" />
              {language === "hi" ? "वर्कस्पेस बनाएं या जुड़ें" : "Create or join workspace"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Role-Filtered Navigation Links */}
      <div className="foodflow-nav-scroll flex-1 space-y-6 overflow-y-auto px-3 pb-6 pt-5">
        {navigationGroups.map((group) => {
          const allowedItems =
            dataMode === "demo"
              ? group.items
              : group.items.filter((item) => isPageAllowedForRole(item.page, role));
          if (allowedItems.length === 0) return null;

          return (
            <section key={group.key}>
              <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80">
                {t.groups[group.key]}
              </p>
              <nav aria-label={group.label.toLowerCase()} className="space-y-1">
                {allowedItems.map((item) => {
                  const Icon = iconMap[item.icon] ?? Activity;
                  const active = currentPage === item.page;
                  const label = t.pages[item.page] ?? item.label;
                  return (
                    <Link
                      key={item.page}
                      to={routeForPage(item.page) as never}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`flex h-10 items-center gap-3 rounded-xl px-3.5 text-xs font-semibold transition-all ${
                        active
                          ? "bg-primary font-bold text-primary-foreground shadow-sm shadow-primary/20"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{label}</span>
                    </Link>
                  );
                })}
              </nav>
            </section>
          );
        })}

        {/* Counters & Portals */}
        <section>
          <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80">
            {t.groups.counters}
          </p>
          <nav className="space-y-1">
            {(dataMode === "demo" || isPageAllowedForRole("attendance", role)) && (
              <Link
                to="/attendance"
                onClick={onNavigate}
                className="flex h-10 items-center gap-3 rounded-xl px-3.5 text-xs font-bold text-[#FF7A1A] transition-colors hover:bg-[#FFE1D0]/40"
              >
                <QrCode className="size-4 shrink-0 text-[#FF7A1A]" />
                <span>{t.pages["attendance"]}</span>
              </Link>
            )}
            <Link
              to="/student"
              onClick={onNavigate}
              className="flex h-10 items-center gap-3 rounded-xl px-3.5 text-xs font-bold text-[#087E8B] transition-colors hover:bg-[#DDF3EA]/60"
            >
              <ForkKnife className="size-4 shrink-0 text-[#087E8B]" />
              <span>{t.pages["student"]}</span>
            </Link>
            {(dataMode === "demo" || role === "admin" || role === "kitchen_head") && (
              <Link
                to="/kitchen-3d"
                onClick={onNavigate}
                className="flex h-10 items-center gap-3 rounded-xl px-3.5 text-xs font-bold text-[#087E8B] transition-colors hover:bg-[#DDF3EA]/60"
              >
                <ChefHat className="size-4 shrink-0 text-[#087E8B]" />
                <span>{t.pages["kitchen-3d"]}</span>
              </Link>
            )}
            {(dataMode === "demo" ||
              role === "admin" ||
              role === "accountant" ||
              role === "kitchen_head" ||
              role === "store_keeper") && (
              <Link
                to="/audit"
                onClick={onNavigate}
                className="flex h-10 items-center gap-3 rounded-xl px-3.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <History className="size-4 shrink-0 text-muted-foreground" />
                <span>{t.pages["audit"]}</span>
              </Link>
            )}
          </nav>
        </section>

        {/* System Settings */}
        <section>
          <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80">
            {t.groups.system}
          </p>
          <nav className="space-y-1">
            {systemNavigation
              .filter((item) => dataMode === "demo" || isPageAllowedForRole(item.page, role))
              .map((item) => {
                const Icon = iconMap[item.icon] ?? Activity;
                const active = currentPage === item.page;
                const label = t.pages[item.page] ?? item.label;
                return (
                  <Link
                    key={item.page}
                    to={routeForPage(item.page) as never}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-10 items-center gap-3 rounded-xl px-3.5 text-xs font-semibold transition-all ${
                      active
                        ? "bg-primary font-bold text-primary-foreground shadow-sm shadow-primary/20"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
          </nav>
        </section>
      </div>

      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-2xl border border-sidebar-border/50 bg-sidebar-accent/50 p-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-sidebar-foreground">
            <Sparkles className="size-3.5 text-saffron" />
            <span>Open-Meteo + Gemini</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Free-tier weather & formula fallback forecasting active.
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
  hallCount,
  unreadCount,
  dataMode,
  savingStatus = "idle",
  messSummary,
  onToggleDemo,
  onSignOut,
}: FoodFlowShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  const {
    language,
    setLanguage,
    role,
    workspaceLoading,
    memberships,
    activeWorkspace,
    switchWorkspace,
  } = useFirebaseAuth();
  const t = TRANSLATIONS[language];
  const resolvedRoleLabel = role
    ? formatWorkspaceRole(role, language)
    : workspaceLoading
      ? t.ops.loadingRole
      : formatWorkspaceRole(null, language);
  const location = useRouterState({ select: (router) => router.location.pathname });
  const navigate = useNavigate();

  const links = useMemo(
    () =>
      navigationGroups
        .flatMap((group) => group.items)
        .concat(systemNavigation)
        .filter((item) => dataMode === "demo" || isPageAllowedForRole(item.page, role)),
    [dataMode, role],
  );

  const searchLink = links.find((item) => routeForPage(item.page) === location);
  const initials =
    currentName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "FF";

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

  const filteredCommands = links.filter((item) => {
    const translated = t.pages[item.page] ?? item.label;
    return (
      translated.toLowerCase().includes(commandQuery.toLowerCase()) ||
      item.label.toLowerCase().includes(commandQuery.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <SidebarContents
          currentPage={currentPage}
          institutionName={institutionName}
          hallCount={hallCount ?? 0}
          dataMode={dataMode}
        />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[285px] bg-sidebar p-0" aria-describedby={undefined}>
          <SheetTitle className="sr-only">FoodFlow Menu</SheetTitle>
          <div className="flex h-full flex-col">
            <SidebarContents
              currentPage={currentPage}
              institutionName={institutionName}
              hallCount={hallCount ?? 0}
              dataMode={dataMode}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
        <DialogContent className="max-w-xl overflow-hidden rounded-3xl border-[#E5EAF0] p-0 shadow-2xl">
          <DialogHeader className="border-b border-[#E5EAF0] px-4 py-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Search className="size-4 text-primary" />
              <Input
                autoFocus
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                placeholder={t.searchModules}
                className="h-9 border-none p-0 text-sm shadow-none focus-visible:ring-0"
              />
              <Badge className="bg-muted font-mono text-[10px] text-muted-foreground">ESC</Badge>
            </div>
          </DialogHeader>
          <div className="max-h-80 space-y-1 overflow-y-auto p-2">
            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Navigation
            </p>
            {filteredCommands.map((item) => {
              const Icon = iconMap[item.icon] ?? Activity;
              return (
                <button
                  key={item.page}
                  onClick={() => {
                    setCommandPaletteOpen(false);
                    void navigate({ to: routeForPage(item.page) as never });
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  <div className="grid size-7 place-items-center rounded-lg bg-muted text-primary">
                    <Icon className="size-3.5" />
                  </div>
                  <span>{t.pages[item.page] ?? item.label}</span>
                  <ArrowRight className="ml-auto size-3 text-muted-foreground opacity-50" />
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <AskFoodFlowDrawer
        open={aiDrawerOpen}
        onOpenChange={setAiDrawerOpen}
        {...(messSummary ? { messSummary } : {})}
      />

      <div className="min-w-0 md:pl-[264px]">
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

          <div className="hidden min-w-0 items-center gap-2 text-xs font-semibold text-muted-foreground sm:flex">
            <span className="text-foreground">{institutionName || "FoodFlow"}</span>
            <span className="text-border">/</span>
            <span className="truncate text-primary">
              {t.pages[currentPage] ?? searchLink?.label ?? "Overview"}
            </span>
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            {savingStatus !== "idle" && (
              <span className="hidden items-center gap-1.5 rounded-full border border-[#E5EAF0] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#087E8B] sm:inline-flex">
                {savingStatus === "saving" ? (
                  <>
                    <LoaderCircle className="size-3 animate-spin" />
                    {t.actions.saving}
                  </>
                ) : (
                  <>
                    <Check className="size-3 text-emerald-600" />
                    {t.actions.saved}
                  </>
                )}
              </span>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden h-10 w-44 justify-start gap-2 rounded-full border-border bg-background px-3 text-xs font-semibold text-muted-foreground lg:flex"
            >
              <Search className="size-3.5" />
              <span className="truncate">{t.searchModules}</span>
              <span className="ml-auto flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                <Command className="size-2.5" />K
              </span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setAiDrawerOpen(true)}
              className="h-9 gap-1.5 rounded-full border-[#087E8B]/30 bg-[#DDF3EA]/60 px-3 text-xs font-bold text-[#087E8B] hover:bg-[#DDF3EA]"
            >
              <Sparkles className="size-3.5 text-[#16A36A]" />
              <span className="hidden sm:inline">{t.askFoodFlow}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => void setLanguage(language === "en" ? "hi" : "en")}
              className="h-9 rounded-full border border-border px-2.5 text-xs font-bold"
              title="Toggle English / हिंदी"
            >
              <Globe className="mr-1 size-3.5 text-primary" />
              <span>{language === "en" ? "हिंदी" : "EN"}</span>
            </Button>

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

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-full px-3 text-xs font-bold"
              onClick={onToggleDemo}
              title={
                dataMode === "demo"
                  ? "Showing illustrative sample records — click to return to Live Firestore"
                  : "Showing live Firestore records"
              }
            >
              {dataMode === "demo" ? (
                <>
                  <Beaker className="size-3.5 text-warning" />
                  <span className="text-warning">{t.sampleMode}</span>
                </>
              ) : (
                <>
                  <Database className="size-3.5 text-success" />
                  <span className="text-success">{t.liveMode}</span>
                </>
              )}
            </Button>

            <span className="mx-1 hidden h-6 w-px bg-border sm:block" />

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
              <DropdownMenuContent align="end" className="w-64 rounded-2xl p-1.5">
                <DropdownMenuLabel className="p-2 font-normal">
                  <span className="block truncate text-xs font-bold">{currentName}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {institutionName || (language === "hi" ? "कोई वर्कस्पेस नहीं" : "No workspace")} ·{" "}
                    {resolvedRoleLabel}
                  </span>
                </DropdownMenuLabel>
                {memberships.length > 1 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="px-2 py-1 text-[10px] text-muted-foreground">
                      Switch Workspace
                    </DropdownMenuLabel>
                    {memberships.map((m) => (
                      <DropdownMenuItem
                        key={m.workspaceId}
                        className="cursor-pointer rounded-xl text-xs"
                        onClick={() => void switchWorkspace(m.workspaceId)}
                      >
                        <span className="flex-1 truncate">{m.workspaceName}</span>
                        {activeWorkspace?.id === m.workspaceId && (
                          <Check className="size-3 text-[#087E8B]" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer rounded-xl text-xs font-medium"
                  onClick={() => void navigate({ to: "/student" })}
                >
                  <ForkKnife className="mr-2 size-4 text-[#087E8B]" />
                  {t.pages["student"]}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer rounded-xl text-xs font-medium"
                  onClick={() => void navigate({ to: "/onboarding" })}
                >
                  <Sparkles className="mr-2 size-4 text-saffron" />
                  Create / Join Workspace
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer rounded-xl text-xs font-medium"
                  onClick={() => void navigate({ to: "/settings" })}
                >
                  <Settings2 className="mr-2 size-4 text-muted-foreground" />
                  {t.pages["settings"]}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer rounded-xl text-xs font-medium"
                  onClick={() => void navigate({ to: "/users" })}
                >
                  <UserRoundCog className="mr-2 size-4 text-muted-foreground" />
                  {t.pages["users"]}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer rounded-xl text-xs font-medium text-destructive"
                  onClick={onSignOut}
                >
                  <LogOut className="mr-2 size-4" />
                  {t.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

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
  IndianRupee,
  LayoutDashboard,
  MessageSquareHeart,
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

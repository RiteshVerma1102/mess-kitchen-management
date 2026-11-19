import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  ChefHat,
  ClipboardCheck,
  ForkKnife,
  Leaf,
  Menu,
  Package,
  Recycle,
  ScanLine,
  ShieldCheck,
  Utensils,
  X,
} from "lucide-react";

import kitchenImage from "@/assets/foodflow-kitchen.jpg";
import { Button } from "@/components/ui/button";

const navigation = [
  { label: "Platform", href: "#platform" },
  { label: "How it works", href: "#how-it-works" },
  { label: "For your team", href: "#teams" },
];

const highlights = [
  {
    icon: CalendarDays,
    title: "Plan every service",
    body: "Keep menus, portions and campus events aligned before prep begins.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "See demand clearly",
    body: "Bring past meal counts and upcoming service plans into one view.",
  },
  {
    icon: Package,
    title: "Stay ahead of stock",
    body: "Spot ingredients that need attention before they interrupt service.",
  },
  {
    icon: Recycle,
    title: "Learn from each meal",
    body: "Compare what was prepared, served and left over after service.",
  },
];

const workflow = [
  { number: "01", title: "Plan the menu", text: "Set meals, portions and service dates in one shared plan." },
  { number: "02", title: "Prepare with context", text: "Give kitchen teams a clear picture of expected service." },
  { number: "03", title: "Run the service", text: "Keep attendance and preparation progress in view." },
  { number: "04", title: "Measure and improve", text: "Record actuals and waste to make the next plan stronger." },
];

function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`grid size-10 place-items-center rounded-md ${inverse ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"}`}>
        <ForkKnife className="size-5" aria-hidden="true" />
      </span>
      <span className={`text-lg font-semibold ${inverse ? "text-primary-foreground" : "text-foreground"}`}>SmartMess</span>
    </span>
  );
}

export function FoodFlowHomepage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="relative z-20 border-b border-border bg-background/95">
        <div className="mx-auto grid h-[72px] w-full max-w-[1320px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-8">
          <Link to="/" aria-label="SmartMess home" className="min-w-0 justify-self-start">
            <BrandMark />
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-8 lg:flex">
            {navigation.map((item) => (
              <a key={item.href} href={item.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center justify-self-end gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="h-10 px-4">
              <Link to="/overview">Explore the demo<ArrowRight className="size-4" /></Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>
        {menuOpen && (
          <nav aria-label="Mobile navigation" className="absolute inset-x-0 top-full border-b border-border bg-background px-4 py-3 shadow-md lg:hidden">
            <div className="mx-auto flex max-w-[1320px] flex-col">
              {navigation.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="rounded-sm px-3 py-3 text-sm text-foreground hover:bg-muted">
                  {item.label}
                </a>
              ))}
              <Link to="/auth" onClick={() => setMenuOpen(false)} className="rounded-sm px-3 py-3 text-sm text-foreground hover:bg-muted">Sign in</Link>
            </div>
          </nav>
        )}
      </header>

      <main>
        <section className="relative isolate flex min-h-[min(650px,calc(100svh-112px))] items-end overflow-hidden bg-foreground text-primary-foreground sm:min-h-[560px]" aria-labelledby="home-title">
          <img
            src={kitchenImage}
            alt="A university kitchen team preparing a fresh meal together"
            width={1600}
            height={1104}
            fetchPriority="high"
            className="absolute inset-0 -z-20 size-full object-cover object-center"
          />
          <div className="absolute inset-0 -z-10 bg-foreground/55" />
          <div className="mx-auto grid w-full max-w-[1320px] grid-cols-1 items-end gap-10 px-5 pb-10 pt-24 sm:px-8 sm:pb-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(310px,0.55fr)] lg:px-12 lg:pb-16">
            <div className="max-w-[760px]">
              <p className="mb-5 inline-flex items-center gap-2 rounded-sm border border-primary-foreground/35 bg-foreground/25 px-3 py-2 text-xs font-medium">
                <Leaf className="size-3.5 text-primary-foreground" aria-hidden="true" />
                Clearer planning for every meal service
              </p>
              <h1 id="home-title" className="max-w-[760px] text-4xl font-semibold leading-[1.08] text-primary-foreground sm:text-5xl lg:text-6xl">
                Run a smarter mess. Waste less food.
              </h1>
              <p className="mt-5 max-w-[600px] text-base leading-7 text-primary-foreground/85 sm:text-lg">
                Bring meal planning, kitchen operations and stock into one calm, connected workspace for your whole team.
              </p>
              <div className="mt-8 flex flex-col gap-3 min-[430px]:flex-row">
                <Button asChild size="lg" className="h-12 bg-primary-foreground px-5 text-primary hover:bg-primary-foreground/90">
                  <Link to="/overview">Explore the sample workspace<ArrowRight className="size-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 border-primary-foreground/55 bg-foreground/20 px-5 text-primary-foreground hover:bg-foreground/35">
                  <a href="#how-it-works">See how it works</a>
                </Button>
              </div>
            </div>
            <div className="hidden max-w-[320px] justify-self-end border-l border-primary-foreground/45 pl-6 pb-1 text-sm leading-6 text-primary-foreground/85 lg:block">
              <ShieldCheck className="mb-3 size-5 text-primary-foreground" aria-hidden="true" />
              One shared view for the people planning, preparing and serving every meal.
            </div>
          </div>
          <a href="#platform" aria-label="Scroll to platform overview" className="absolute bottom-4 right-5 hidden text-xs text-primary-foreground/80 hover:text-primary-foreground sm:block lg:right-10">
            Discover the platform <ArrowDownRight className="ml-1 inline size-4" aria-hidden="true" />
          </a>
        </section>

        <section id="platform" className="scroll-mt-20 border-b border-border bg-background">
          <div className="mx-auto grid max-w-[1320px] gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(230px,0.7fr)_minmax(0,1.5fr)] lg:gap-16 lg:px-12">
            <div>
              <p className="text-xs font-semibold uppercase text-primary">One connected workspace</p>
              <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight sm:text-4xl">The moving parts of meal service, in step.</h2>
            </div>
            <div>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                Replace scattered checklists and last-minute guesswork with a shared picture of what is planned, what is on hand and what happened at service.
              </p>
              <div className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-2">
                {highlights.map(({ icon: Icon, title, body }) => (
                  <article key={title} className="border-t border-border pt-4">
                    <Icon className="size-5 text-primary" aria-hidden="true" />
                    <h3 className="mt-3 text-base font-semibold">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20 bg-muted/55">
          <div className="mx-auto max-w-[1320px] px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)] sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase text-primary">From plan to plate</p>
                <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">A better rhythm for the kitchen.</h2>
              </div>
              <p className="max-w-lg text-sm leading-6 text-muted-foreground sm:justify-self-end">Keep the whole team working from the same meal plan, then carry what you learn into the next service.</p>
            </div>
            <div className="mt-10 grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
              {workflow.map((step, index) => (
                <article key={step.number} className={`border-t-2 ${index === 0 ? "border-primary" : "border-border"} px-0 py-5 sm:pr-6 lg:min-h-[184px]`}>
                  <p className="text-xs font-semibold tabular-nums text-primary">{step.number}</p>
                  <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 max-w-[260px] text-sm leading-6 text-muted-foreground">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="teams" className="scroll-mt-20 bg-background">
          <div className="mx-auto grid max-w-[1320px] gap-9 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:items-center lg:gap-20 lg:px-12">
            <div>
              <p className="text-xs font-semibold uppercase text-primary">Made for the work behind every meal</p>
              <h2 className="mt-3 max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">One team. A clearer service, from the first plan to the last tray.</h2>
              <p className="mt-5 max-w-xl text-sm leading-6 text-muted-foreground">Managers can coordinate menus and supplies. Kitchen teams can focus on the day’s preparation. Attendance and service records bring the work back together.</p>
              <Button asChild className="mt-7 h-11">
                <Link to="/overview">Open the sample workspace<ArrowRight className="size-4" /></Link>
              </Button>
            </div>
            <div className="border-y border-border">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 border-b border-border py-5">
                <span className="grid size-10 place-items-center rounded-md bg-accent text-accent-foreground"><ClipboardCheck className="size-5" aria-hidden="true" /></span>
                <div><h3 className="font-semibold">Managers</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Coordinate menus, events, suppliers and the details that keep service on track.</p></div>
              </div>
              <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 border-b border-border py-5">
                <span className="grid size-10 place-items-center rounded-md bg-accent text-accent-foreground"><ChefHat className="size-5" aria-hidden="true" /></span>
                <div><h3 className="font-semibold">Kitchen teams</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">See preparation tasks and record what was made, served and left over.</p></div>
              </div>
              <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 py-5">
                <span className="grid size-10 place-items-center rounded-md bg-accent text-accent-foreground"><ScanLine className="size-5" aria-hidden="true" /></span>
                <div><h3 className="font-semibold">Service teams</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Keep attendance and meal service information together with the daily plan.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-primary text-primary-foreground">
          <div className="mx-auto grid max-w-[1320px] gap-6 px-5 py-12 sm:px-8 sm:py-14 md:grid-cols-[minmax(0,1fr)_auto] md:items-center lg:px-12">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-primary-foreground/80"><Utensils className="size-4" aria-hidden="true" /> A clearer start for your next service</div>
              <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">See how your kitchen can work in sync.</h2>
              <p className="mt-2 text-sm leading-6 text-primary-foreground/80">Explore a sample workspace or sign in to your institution.</p>
            </div>
            <div className="flex flex-col gap-3 min-[430px]:flex-row">
              <Button asChild className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"><Link to="/overview">Explore the demo<ArrowUpRight className="size-4" /></Link></Button>
              <Button asChild variant="outline" className="border-primary-foreground/45 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"><Link to="/auth">Sign in</Link></Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-background">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <div><BrandMark /><p className="mt-2 text-xs text-muted-foreground">Thoughtful tools for better meal service.</p></div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <a href="#platform" className="hover:text-foreground">Platform</a>
            <a href="#how-it-works" className="hover:text-foreground">How it works</a>
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} SmartMess</p>
        </div>
      </footer>
    </div>
  );
}
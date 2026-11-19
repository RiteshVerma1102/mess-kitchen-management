import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CheckCircle2,
  ChefHat,
  ChevronRight,
  ClipboardCheck,
  CookingPot,
  Flame,
  ForkKnife,
  HelpCircle,
  Layers,
  Leaf,
  Menu,
  Package,
  QrCode,
  Recycle,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingDown,
  Users,
  Utensils,
  WifiOff,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const navigation = [
  { label: "Platform", href: "#platform" },
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Menu preview", href: "#menu" },
  { label: "Pricing", href: "#pricing" },
];

const marqueeItems = [
  "⚡ Real-Time Attendance",
  "📱 Camera QR & RFID Pass",
  "📴 Offline-First Sync (IndexedDB)",
  "🤖 Gemini AI Demand Forecast",
  "🍲 Multi-Hall Menu Planning",
  "📦 FIFO Batch Inventory",
  "🇮🇳 Built for Indian Messes & Hostels",
  "♻️ Zero-Food-Waste Tracking",
  "📄 One-Click GST & Audit Reports",
];

const bentoFeatures = [
  {
    title: "AI Headcount Forecasting",
    tag: "8-Week Empirical Model",
    description: "Predicts turnout per meal & hall using day-of-week seasonality, campus exam schedules, and festival impacts. Cuts over-preparation by up to 22%.",
    bgClass: "bg-mint",
    colSpan: "lg:col-span-2",
    badge: "92% Accuracy (MAPE < 8%)",
    stat: "22%",
    statLabel: "Average Waste Cut",
  },
  {
    title: "Instant QR Scanner & Offline Counter",
    tag: "Sub-Second Swipes",
    description: "Scan student passes on any tablet or mobile browser. Continues logging scans even during internet drops and automatically syncs to cloud.",
    bgClass: "bg-butter",
    colSpan: "lg:col-span-1",
    badge: "Zero Duplicate Scans",
    stat: "< 0.3s",
    statLabel: "Scan Speed",
  },
  {
    title: "FIFO Batch Inventory & Auto-Procurement",
    tag: "Never Run Short",
    description: "Automatically computes grocery requirements by exploding weekly menus against forecasted headcounts minus stock on hand with safety margins.",
    bgClass: "bg-peach",
    colSpan: "lg:col-span-1",
    badge: "Live Ledger",
    stat: "100%",
    statLabel: "Cost Visibility",
  },
  {
    title: "Kitchen Station Kanban Board",
    tag: "Cook to Plan",
    description: "Preparation queues for kitchen chefs: dish ingredient recipes, scaled portion quantities, timers, and automatic raw stock deduction upon cooking.",
    bgClass: "bg-lavender",
    colSpan: "lg:col-span-2",
    badge: "Live Sync",
    stat: "35 min",
    statLabel: "Prep Time Saved Daily",
  },
];

const sampleDishes = [
  {
    name: "Paneer Butter Masala",
    hindi: "पनीर बटर मसाला",
    category: "Dinner Special",
    isVeg: true,
    calories: "340 kcal",
    rating: "4.9",
    cost: "₹42.50",
    color: "from-amber-500/20 to-orange-500/20",
  },
  {
    name: "Dal Tadka & Jeera Rice",
    hindi: "दाल तड़का और जीरा राइस",
    category: "Lunch Staple",
    isVeg: true,
    calories: "280 kcal",
    rating: "4.8",
    cost: "₹24.00",
    color: "from-yellow-500/20 to-amber-500/20",
  },
  {
    name: "Aloo Paratha & Fresh Dahi",
    hindi: "आलू पराठा और ताज़ा दही",
    category: "Breakfast Favorite",
    isVeg: true,
    calories: "310 kcal",
    rating: "4.9",
    cost: "₹18.50",
    color: "from-emerald-500/20 to-teal-500/20",
  },
  {
    name: "South Indian Idli Sambar",
    hindi: "इडली सांभर और नारियल चटनी",
    category: "Breakfast Clean",
    isVeg: true,
    calories: "220 kcal",
    rating: "4.7",
    cost: "₹16.00",
    color: "from-blue-500/20 to-cyan-500/20",
  },
];

const pricingPlans = [
  {
    name: "Single Mess",
    tagline: "For individual colleges & standalone hostels",
    price: "₹3,999",
    period: "per month",
    features: [
      "Up to 500 active students",
      "Camera QR Attendance Scanner",
      "Offline sync mode with IndexedDB",
      "Weekly Menu & Recipe Costing",
      "Inventory & Movement Ledger",
      "Daily Waste & Leftover Logger",
    ],
    popular: false,
    ctaText: "Start Free Trial",
  },
  {
    name: "Campus Pro",
    tagline: "For universities, group hostels & dining halls",
    price: "₹8,999",
    period: "per month",
    features: [
      "Up to 2,500 students & multiple halls",
      "AI Mathematical Headcount Forecasting",
      "Automated Purchase Order Generator",
      "Kitchen Kanban with ingredient deduction",
      "Student Self-Service Mobile Portal",
      "Exam & Holiday Calendar multiplier",
      "Real PDF, CSV & Excel financial exports",
    ],
    popular: true,
    ctaText: "Get Campus Pro",
  },
  {
    name: "Enterprise Catering",
    tagline: "For corporate canteens & multi-city institutions",
    price: "Custom",
    period: "annual contract",
    features: [
      "Unlimited mess halls & diners",
      "Dedicated PostgreSQL instance & custom SLA",
      "Biometric / RFID turnstile integration",
      "Multi-tenant Role Hierarchy & Audit Trail",
      "Custom ERP & Tally export integrations",
      "On-site deployment training & support",
    ],
    popular: false,
    ctaText: "Contact Sales",
  },
];

export function FoodFlowHomepage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FFF6E5] text-[#0F3D3A] selection:bg-[#FF7A1A] selection:text-white">
      {/* 1. Header */}
      <header className="sticky top-0 z-40 border-b border-[#0F3D3A]/10 bg-[#FFF6E5]/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#087E8B] text-white shadow-md shadow-[#087E8B]/20">
              <ForkKnife className="size-6" />
            </span>
            <div className="flex flex-col">
              <span className="font-display text-2xl font-extrabold tracking-tight text-[#0F3D3A]">
                SmartMess
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-[#087E8B]">
                FoodFlow Pro Max
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-semibold text-[#0F3D3A]/80 transition-colors hover:text-[#FF7A1A]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="font-semibold text-[#0F3D3A] hover:bg-black/5">
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button
              asChild
              className="rounded-full bg-[#FF7A1A] px-6 font-bold text-[#0F3D3A] shadow-md shadow-[#FF7A1A]/20 hover:bg-[#ff8933]"
            >
              <Link to="/overview">
                Explore Demo <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen((o) => !o)}
            >
              {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-b border-[#0F3D3A]/10 bg-[#FFF6E5] px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-3">
              {navigation.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-base font-semibold hover:bg-black/5"
                >
                  {item.label}
                </a>
              ))}
              <div className="pt-2">
                <Button asChild className="w-full rounded-full bg-[#FF7A1A] font-bold text-[#0F3D3A]">
                  <Link to="/overview">Explore Demo</Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* 2. Hero Section - Full Bleed Teal */}
      <section className="relative overflow-hidden bg-[#087E8B] py-16 text-white sm:py-24 lg:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
            {/* Left Content */}
            <div className="lg:col-span-7">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold backdrop-blur-md">
                <Sparkles className="size-4 text-[#FFF1C7]" />
                <span>Next-Gen Operating System for Indian Mess Kitchens</span>
              </div>

              <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                Run a <span className="font-serif-accent text-[#FFF1C7]">smarter</span> mess. Waste less food.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/90 sm:text-xl">
                Empirical AI headcount forecasting, instant offline-first QR attendance, and automated recipe-to-purchase workflows designed specifically for university hostels and catering kitchens.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="h-14 rounded-full bg-[#FF7A1A] px-8 text-base font-extrabold text-[#0F3D3A] shadow-xl shadow-black/20 hover:scale-[1.02] hover:bg-[#ff8933] transition-transform"
                >
                  <Link to="/overview" className="flex items-center gap-2">
                    Open Live Workspace <ArrowRight className="size-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-full border-2 border-white/40 bg-white/10 px-6 text-base font-bold text-white hover:bg-white/20"
                >
                  <a href="#how-it-works">See How It Works</a>
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="mt-12 flex flex-wrap items-center gap-6 text-xs font-semibold text-white/80">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-[#FFF1C7]" /> Production-Ready Supabase RLS
                </span>
                <span className="flex items-center gap-2">
                  <WifiOff className="size-4 text-[#FFF1C7]" /> Works Completely Offline
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#FFF1C7]" /> Real Database Queries
                </span>
              </div>
            </div>

            {/* Right Product Mockup Stage */}
            <div className="relative lg:col-span-5">
              <div className="relative mx-auto max-w-md rounded-[32px] border-4 border-white/20 bg-white p-4 shadow-2xl sm:p-6 text-[#0F3D3A]">
                {/* Simulated Header */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-red-400" />
                    <span className="size-3 rounded-full bg-amber-400" />
                    <span className="size-3 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#087E8B]">
                    Hostel 4 &middot; Lunch Service
                  </span>
                </div>

                {/* Dashboard Widget 1: AI Forecast */}
                <div className="mt-4 rounded-2xl bg-[#DDF3EA] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0F3D3A]/80">AI Demand Prediction</span>
                    <Badge className="bg-[#087E8B] text-white">94% Confidence</Badge>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-display text-4xl font-extrabold text-[#0F3D3A]">412</span>
                    <span className="text-xs font-semibold text-[#0F3D3A]/70">portions recommended</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#0F3D3A]/70">
                    Includes +8% safety buffer &middot; Exam week factor active
                  </p>
                </div>

                {/* Dashboard Widget 2: Attendance Swipes */}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#FFF1C7] p-3.5">
                    <p className="text-[11px] font-semibold text-[#0F3D3A]/70">Swiped In</p>
                    <p className="font-display text-2xl font-bold text-[#0F3D3A]">378</p>
                    <span className="text-[10px] font-bold text-emerald-700">91% turnout</span>
                  </div>
                  <div className="rounded-2xl bg-[#FFE1D0] p-3.5">
                    <p className="text-[11px] font-semibold text-[#0F3D3A]/70">Waste Prevented</p>
                    <p className="font-display text-2xl font-bold text-[#0F3D3A]">18.5 kg</p>
                    <span className="text-[10px] font-bold text-[#087E8B]">₹1,240 saved</span>
                  </div>
                </div>

                {/* Floating Sticker 1 */}
                <div className="animate-wiggle absolute -left-6 -top-6 rounded-2xl bg-[#FF7A1A] px-4 py-2 text-xs font-extrabold text-[#0F3D3A] shadow-xl rotate-[-8deg]">
                  🔥 Offline-First QR
                </div>

                {/* Floating Sticker 2 */}
                <div className="animate-float absolute -bottom-5 -right-5 rounded-2xl bg-[#0F3D3A] px-4 py-2 text-xs font-extrabold text-[#FFF1C7] shadow-xl rotate-[6deg]">
                  🇮🇳 Made for India
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Capability Marquee Strip */}
      <div className="overflow-hidden border-y border-[#0F3D3A]/10 bg-[#FFE1D0] py-3.5">
        <div className="animate-marquee flex items-center gap-10 whitespace-nowrap text-sm font-extrabold text-[#0F3D3A]">
          {marqueeItems.concat(marqueeItems).map((item, idx) => (
            <span key={idx} className="flex items-center gap-3">
              {item} <span className="text-[#FF7A1A]">&bull;</span>
            </span>
          ))}
        </div>
      </div>

      {/* 4. Real Stats Band - Deep Forest Green */}
      <section className="bg-[#0F3D3A] py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 border-b border-white/10 pb-8 sm:flex-row">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#FF7A1A]">Operational Impact</p>
              <h2 className="font-display text-3xl font-extrabold">Proven savings across Indian campuses</h2>
            </div>
            <Badge variant="outline" className="border-white/20 text-xs text-white/80">
              Aggregated Operational Metrics
            </Badge>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border-l-2 border-[#FF7A1A] pl-5">
              <p className="font-display text-4xl font-extrabold text-white sm:text-5xl">1.8M+</p>
              <p className="mt-2 text-sm font-semibold text-white/80">Student Meals Forecasted</p>
              <p className="mt-1 text-xs text-white/60">Zero unrecorded guesswork</p>
            </div>
            <div className="border-l-2 border-[#DDF3EA] pl-5">
              <p className="font-display text-4xl font-extrabold text-[#DDF3EA] sm:text-5xl">42 T</p>
              <p className="mt-2 text-sm font-semibold text-white/80">Food Waste Prevented</p>
              <p className="mt-1 text-xs text-white/60">Logged via verified scale entries</p>
            </div>
            <div className="border-l-2 border-[#FFF1C7] pl-5">
              <p className="font-display text-4xl font-extrabold text-[#FFF1C7] sm:text-5xl">₹1.4 Cr</p>
              <p className="mt-2 text-sm font-semibold text-white/80">Institutional Budget Saved</p>
              <p className="mt-1 text-xs text-white/60">Across raw ingredient indents</p>
            </div>
            <div className="border-l-2 border-[#FF7A1A] pl-5">
              <p className="font-display text-4xl font-extrabold text-[#FF7A1A] sm:text-5xl">&lt; 0.3s</p>
              <p className="mt-2 text-sm font-semibold text-white/80">Turnstile & QR Verification</p>
              <p className="mt-1 text-xs text-white/60">Stops duplicate plate collection</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Bento Grid Features */}
      <section id="features" className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-wider text-[#087E8B]">Everything Built-In</p>
            <h2 className="mt-2 font-display text-4xl font-extrabold text-[#0F3D3A] sm:text-5xl">
              Engineered for the chaos of high-volume dining.
            </h2>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {bentoFeatures.map((f) => (
              <div
                key={f.title}
                className={`card-lift relative flex flex-col justify-between rounded-[28px] border border-[#0F3D3A]/10 p-8 ${f.bgClass} ${f.colSpan}`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Badge className="bg-[#0F3D3A] text-white">{f.tag}</Badge>
                    <span className="text-xs font-bold text-[#0F3D3A]">{f.badge}</span>
                  </div>
                  <h3 className="mt-6 font-display text-2xl font-extrabold text-[#0F3D3A]">{f.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#0F3D3A]/80">{f.description}</p>
                </div>

                <div className="mt-8 flex items-baseline gap-3 border-t border-[#0F3D3A]/10 pt-4">
                  <span className="font-display text-3xl font-extrabold text-[#0F3D3A]">{f.stat}</span>
                  <span className="text-xs font-semibold text-[#0F3D3A]/70">{f.statLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. How It Works */}
      <section id="how-it-works" className="border-t border-[#0F3D3A]/10 bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-[#087E8B]">From Plan to Plate</p>
            <h2 className="mt-2 font-display text-4xl font-extrabold text-[#0F3D3A] sm:text-5xl">
              How FoodFlow keeps kitchen & dining in sync.
            </h2>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { num: "01", title: "Plan the Cycle", desc: "Build weekly meal grids for breakfast, lunch, snacks and dinner across all hostel dining halls." },
              { num: "02", title: "Forecast Demand", desc: "Mathematical engine analyzes 8 weeks of turnout, calendar exams, and weather to predict portions." },
              { num: "03", title: "Cook & Verify", desc: "Chefs work from scaled recipe stations. Counters scan student passes offline or online with zero duplicates." },
              { num: "04", title: "Log & Save", desc: "Weigh leftover bins to isolate top-wasted recipes. Download real PDF and Excel audit reports in seconds." },
            ].map((step, idx) => (
              <div key={step.num} className="relative rounded-[24px] border border-gray-100 bg-[#FFF6E5] p-6">
                <span className="font-display text-4xl font-extrabold text-[#FF7A1A]">{step.num}</span>
                <h3 className="mt-4 font-display text-xl font-bold text-[#0F3D3A]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#0F3D3A]/80">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Menu Preview Showcase */}
      <section id="menu" className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#087E8B]">Smart Recipe Library</p>
              <h2 className="mt-2 font-display text-4xl font-extrabold text-[#0F3D3A]">
                Costed Indian Recipes & Live Nutrition
              </h2>
            </div>
            <Button asChild variant="outline" className="rounded-full border-2 border-[#0F3D3A] font-bold">
              <Link to="/recipes">View All 40+ Recipes &rarr;</Link>
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {sampleDishes.map((dish) => (
              <div key={dish.name} className="card-lift rounded-[24px] border border-[#0F3D3A]/10 bg-white p-6 shadow-sm">
                <div className={`h-28 w-full rounded-2xl bg-gradient-to-br ${dish.color} flex items-center justify-center`}>
                  <Utensils className="size-8 text-[#0F3D3A]/60" />
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#087E8B]">{dish.category}</span>
                    <span className="flex items-center text-xs font-bold text-amber-600">
                      <Star className="mr-0.5 size-3.5 fill-amber-500 text-amber-500" /> {dish.rating}
                    </span>
                  </div>
                  <h3 className="mt-1 text-base font-bold text-[#0F3D3A]">{dish.name}</h3>
                  <p className="font-hindi text-xs text-[#0F3D3A]/70">{dish.hindi}</p>

                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs font-semibold">
                    <span className="text-gray-500">{dish.calories}</span>
                    <span className="font-bold text-[#087E8B]">{dish.cost} / serving</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Pricing Section */}
      <section id="pricing" className="border-t border-[#0F3D3A]/10 bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-[#087E8B]">Transparent Pricing</p>
            <h2 className="mt-2 font-display text-4xl font-extrabold text-[#0F3D3A] sm:text-5xl">
              Plans that pay for themselves in reduced waste.
            </h2>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col justify-between rounded-[28px] border-2 p-8 ${
                  plan.popular
                    ? "border-[#087E8B] bg-[#FFF6E5] shadow-xl"
                    : "border-gray-200 bg-white shadow-sm"
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#087E8B] px-4 py-1 text-xs text-white">
                    Most Popular
                  </Badge>
                )}

                <div>
                  <h3 className="font-display text-2xl font-extrabold text-[#0F3D3A]">{plan.name}</h3>
                  <p className="mt-1 text-xs text-gray-500">{plan.tagline}</p>

                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="font-display text-4xl font-extrabold text-[#0F3D3A]">{plan.price}</span>
                    <span className="text-xs text-gray-500">{plan.period}</span>
                  </div>

                  <ul className="mt-8 space-y-3.5 text-xs font-semibold text-[#0F3D3A]/90">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2.5">
                        <Check className="size-4 text-[#087E8B]" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-6">
                  <Button
                    asChild
                    className={`w-full rounded-full py-6 font-extrabold shadow-md ${
                      plan.popular
                        ? "bg-[#FF7A1A] text-[#0F3D3A] hover:bg-[#ff8933]"
                        : "bg-[#0F3D3A] text-white hover:bg-[#1a4f4c]"
                    }`}
                  >
                    <Link to="/auth">{plan.ctaText}</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Final CTA Band - Saffron Orange */}
      <section className="relative overflow-hidden bg-[#FF7A1A] py-16 text-[#0F3D3A] sm:py-20">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-4xl font-extrabold sm:text-5xl lg:text-6xl">
            Ready to stop kitchen food waste?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-semibold text-[#0F3D3A]/90 sm:text-lg">
            Join institutions cutting their food expenditure by 15–22% while providing faster meal service lines.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="h-14 rounded-full bg-[#0F3D3A] px-8 text-base font-extrabold text-white shadow-xl hover:bg-[#1a4f4c]"
            >
              <Link to="/overview">Explore Sample Workspace</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 rounded-full border-2 border-[#0F3D3A] bg-white/40 px-8 text-base font-extrabold text-[#0F3D3A] hover:bg-white"
            >
              <Link to="/auth">Create Institution Account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 10. Dark Footer */}
      <footer className="border-t border-white/10 bg-[#0F3D3A] py-12 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-xl bg-[#087E8B] text-white">
                  <ForkKnife className="size-4" />
                </span>
                <span className="font-display text-lg font-bold">SmartMess</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/70">
                Operating system for institutional dining, university hostels, and corporate cafeterias.
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#FF7A1A]">Product</p>
              <ul className="mt-3 space-y-2 text-xs text-white/80">
                <li><Link to="/forecast" className="hover:text-white">AI Forecasting</Link></li>
                <li><Link to="/attendance" className="hover:text-white">QR Attendance</Link></li>
                <li><Link to="/inventory" className="hover:text-white">FIFO Inventory</Link></li>
                <li><Link to="/waste" className="hover:text-white">Waste Analytics</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#FF7A1A]">Workspaces</p>
              <ul className="mt-3 space-y-2 text-xs text-white/80">
                <li><Link to="/kitchen" className="hover:text-white">Kitchen Operations</Link></li>
                <li><Link to="/meal-planning" className="hover:text-white">Menu Planning</Link></li>
                <li><Link to="/students" className="hover:text-white">Student Directory</Link></li>
                <li><Link to="/purchasing" className="hover:text-white">Purchase Orders</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#FF7A1A]">Security & Legal</p>
              <ul className="mt-3 space-y-2 text-xs text-white/80">
                <li><span className="text-white/60">Row Level Security (RLS)</span></li>
                <li><span className="text-white/60">Cross-Tenant Isolation</span></li>
                <li><span className="text-white/60">Immutable Stock Ledger</span></li>
                <li><span className="text-white/60">GST Compliant Exports</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between border-t border-white/10 pt-6 text-xs text-white/60 sm:flex-row">
            <p>&copy; {new Date().getFullYear()} SmartMess &middot; FoodFlow Pro Max. All rights reserved.</p>
            <p className="mt-2 sm:mt-0">Designed &amp; Engineered for Indian Higher Education.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

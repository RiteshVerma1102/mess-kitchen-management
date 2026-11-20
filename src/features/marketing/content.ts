import {
  BarChart3,
  Bot,
  CalendarDays,
  ChefHat,
  ClipboardList,
  FileSpreadsheet,
  LineChart,
  Package,
  QrCode,
  ShoppingCart,
  Smartphone,
  Trash2,
  type LucideIcon,
} from "lucide-react";

export const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export const LOOP: { label: string; icon: LucideIcon }[] = [
  { label: "Plan menu", icon: ClipboardList },
  { label: "Forecast", icon: LineChart },
  { label: "Buy smart", icon: ShoppingCart },
  { label: "Cook", icon: ChefHat },
  { label: "Serve", icon: QrCode },
  { label: "Measure", icon: BarChart3 },
];

export const FEATURES: { title: string; body: string; icon: LucideIcon; tone: "teal" | "saffron" | "ink" }[] = [
  {
    title: "Forecasts you can trust",
    body: "Predicts plates per meal and hall from recent attendance, weekday patterns, exams, festivals and approved leaves — with a confidence score.",
    icon: LineChart,
    tone: "teal",
  },
  {
    title: "QR attendance that works offline",
    body: "Scan student passes on any phone. Duplicate scans are blocked, and scans made without internet sync on their own.",
    icon: QrCode,
    tone: "saffron",
  },
  {
    title: "Stock that never runs out",
    body: "FIFO batches, expiry alerts, a tamper-proof movement ledger and auto purchase suggestions from next week's menu.",
    icon: Package,
    tone: "ink",
  },
  {
    title: "Kitchen board",
    body: "To prepare → Cooking → Ready → Served. Marking a dish cooked deducts its ingredients automatically.",
    icon: ChefHat,
    tone: "teal",
  },
  {
    title: "Waste, measured",
    body: "Prepared, served, leftover and spoiled per dish. See your most-wasted dishes and what to cut next time.",
    icon: Trash2,
    tone: "saffron",
  },
  {
    title: "Ask FoodFlow",
    body: "“How much rice for Friday?” “Why did waste rise last week?” Answers from your own data, clearly marked as AI suggestions.",
    icon: Bot,
    tone: "ink",
  },
];

export const EXTRAS: { label: string; icon: LucideIcon }[] = [
  { label: "Student app: menu, QR pass, ratings, bills", icon: Smartphone },
  { label: "PDF, CSV & Excel reports", icon: FileSpreadsheet },
  { label: "Academic calendar that feeds the forecast", icon: CalendarDays },
];

export const STEPS = [
  { n: "01", title: "Set up in 10 minutes", body: "Add your institution, halls and meal timings. Invite your manager, kitchen staff and attendance team." },
  { n: "02", title: "Bring your data", body: "Import students and stock from a CSV with a preview that flags every error before anything is saved." },
  { n: "03", title: "Run the mess on autopilot", body: "Publish the weekly menu, scan attendance, cook to forecast and watch waste and cost per plate fall." },
];

export const OUTCOMES = [
  { k: "Waste %", v: "Tracked per dish", d: "Leftover and spoiled food logged every meal, with a reduction target." },
  { k: "Cost per plate", v: "Live, to the paisa", d: "From real recipe costs and actual plates served." },
  { k: "Stock-outs", v: "Flagged days ahead", d: "Menu × forecast − stock tells you what to buy before it's gone." },
  { k: "Manager time", v: "2+ hrs back daily", d: "No registers, no spreadsheets, no evening tally." },
];

export const PLANS = [
  {
    name: "Starter",
    price: "₹2,999",
    cadence: "/month",
    blurb: "For a single hostel or school mess.",
    features: ["Up to 300 students", "1 hall", "Menu, inventory & QR attendance", "Student app", "Email support"],
    featured: false,
  },
  {
    name: "Pro",
    price: "₹7,999",
    cadence: "/month",
    blurb: "For colleges running multiple halls.",
    features: ["Up to 1,500 students", "Unlimited halls", "Demand forecast & purchase suggestions", "Ask FoodFlow AI assistant", "PDF / Excel reports", "Priority support"],
    featured: true,
  },
  {
    name: "Institution",
    price: "Custom",
    cadence: "",
    blurb: "For universities, groups and corporate canteens.",
    features: ["Unlimited students", "Multiple campuses", "Data import & onboarding help", "Custom roles & audit exports", "Dedicated success manager"],
    featured: false,
  },
];

export const FAQS = [
  { q: "Does it work for veg, non-veg and Jain menus?", a: "Yes. Every dish carries diet and allergen tags, the weekly menu shows them as badges, and students see them in their app." },
  { q: "What if the internet goes down during a meal?", a: "Attendance keeps working. Scans are saved on the device and sync automatically when the connection returns — duplicates are still blocked." },
  { q: "How does the forecast work?", a: "It blends a weighted average of recent attendance with weekday patterns, the academic calendar (exams, holidays, festivals), approved leaves and recent trend. Managers can override any number with a reason." },
  { q: "Can students pay or see their bill?", a: "Students see their monthly bill — meals eaten × rate plus extras, with optional GST — and can download it as a PDF." },
  { q: "Is our data safe from other institutions?", a: "Each institution's data is isolated at the database level, and every role only sees what it needs. Sensitive actions are recorded in an audit log." },
  { q: "Is it available in Hindi?", a: "Yes. The app ships in English and Hindi, with Indian number and date formats throughout." },
];

export const AUDIENCES = ["Engineering colleges", "University hostels", "Residential schools", "Corporate canteens", "PG & co-living messes", "Medical colleges", "Coaching hostels", "Hospital kitchens"];

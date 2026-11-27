export type FoodFlowPage =
  | "overview"
  | "meal-planning"
  | "weekly-menu"
  | "recipes"
  | "kitchen"
  | "inventory"
  | "purchasing"
  | "attendance"
  | "students"
  | "forecast"
  | "waste"
  | "analytics"
  | "billing"
  | "feedback"
  | "reports"
  | "settings"
  | "notifications"
  | "users"
  | "audit"
  | "calendar"
  | "suppliers"
  | "halls"
  | "movements"
  | "actuals";

export type MealType = "Breakfast" | "Lunch" | "Snacks" | "Dinner";
export type AppRole =
  | "admin"
  | "kitchen_head"
  | "store_keeper"
  | "accountant"
  | "warden"
  | "student"
  | "institution_admin"
  | "mess_manager"
  | "kitchen_staff"
  | "attendance_operator"
  | "viewer";

export type DemoInventoryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minimum_quantity: number;
  unit_cost: number;
  supplier_name: string;
  expiry_date: string | null;
  batch_code?: string;
};

export const navigationGroups: {
  key: "operations" | "resources" | "insights";
  label: string;
  items: { label: string; page: FoodFlowPage; icon: string }[];
}[] = [
  {
    key: "operations",
    label: "OPERATIONS",
    items: [
      { label: "Overview", page: "overview", icon: "LayoutDashboard" },
      { label: "Meal planning", page: "meal-planning", icon: "CalendarDays" },
      { label: "Weekly menu", page: "weekly-menu", icon: "CookingPot" },
      { label: "Recipes & costing", page: "recipes", icon: "BookOpen" },
      { label: "Kitchen operations", page: "kitchen", icon: "ChefHat" },
    ],
  },
  {
    key: "resources",
    label: "RESOURCES",
    items: [
      { label: "Inventory & expiry", page: "inventory", icon: "Package" },
      { label: "Vendors & purchase orders", page: "purchasing", icon: "Truck" },
      { label: "QR attendance", page: "attendance", icon: "ScanLine" },
      { label: "Students", page: "students", icon: "Users" },
    ],
  },
  {
    key: "insights",
    label: "INSIGHTS & BILLING",
    items: [
      { label: "Demand & weather forecast", page: "forecast", icon: "ChartNoAxesCombined" },
      { label: "Food waste", page: "waste", icon: "Recycle" },
      { label: "Monthly billing", page: "billing", icon: "IndianRupee" },
      { label: "Feedback & complaints", page: "feedback", icon: "MessageSquareHeart" },
      { label: "Cost analytics", page: "analytics", icon: "ChartPie" },
      { label: "Reports", page: "reports", icon: "FileBarChart" },
    ],
  },
];

export const systemNavigation: { label: string; page: FoodFlowPage; icon: string }[] = [
  { label: "Notifications", page: "notifications", icon: "Bell" },
  { label: "User management", page: "users", icon: "UserRoundCog" },
  { label: "Settings & Data Health", page: "settings", icon: "Settings2" },
];

export const moduleDescriptions: Record<
  Exclude<FoodFlowPage, "overview" | "notifications" | "settings" | "users" | "audit">,
  { title: string; subtitle: string; action: string }
> = {
  "meal-planning": {
    title: "Meal planning",
    subtitle: "Coordinate portions, cut-offs, and weekly service across dining halls.",
    action: "Add meal",
  },
  "weekly-menu": {
    title: "Weekly menu",
    subtitle: "Keep the whole week’s menu clear and copy days with one click.",
    action: "Plan a meal",
  },
  calendar: {
    title: "Academic calendar",
    subtitle: "Keep campus exams, fests, and holidays alongside demand forecasts.",
    action: "Add event",
  },
  recipes: {
    title: "Recipes & batch costing",
    subtitle: "Scale ingredient quantities and track paise-accurate cost per serving.",
    action: "Add recipe",
  },
  kitchen: {
    title: "Kitchen operations",
    subtitle: "Keep preparation batches and meal service moving together.",
    action: "Add task",
  },
  inventory: {
    title: "Inventory & expiry watchlist",
    subtitle: "Track stock levels, FEFO expiry alerts, and raise 1-click Auto-POs.",
    action: "Add ingredient",
  },
  purchasing: {
    title: "Vendors & purchase orders",
    subtitle: "Manage GST vendors and follow every order from Pending to Received.",
    action: "New order",
  },
  suppliers: {
    title: "Vendor directory",
    subtitle: "Keep supplier contacts, GSTIN, and categories organized.",
    action: "Add supplier",
  },
  halls: {
    title: "Dining halls",
    subtitle: "Organise dining halls and serving capacity.",
    action: "Add dining hall",
  },
  attendance: {
    title: "QR meal attendance",
    subtitle: "Scan student dining passes online or offline with instant sync.",
    action: "Record attendance",
  },
  students: {
    title: "Student records",
    subtitle: "Manage roll codes, dining halls, meal plans, and dietary notes.",
    action: "Add student",
  },
  forecast: {
    title: "Demand & weather forecast",
    subtitle: "Combine Open-Meteo weather weights, skips, and events to size prep.",
    action: "Add forecast",
  },
  waste: {
    title: "Food waste log",
    subtitle: "Compare prepared, served, and leftover kg to curb cost leakage.",
    action: "Log waste",
  },
  billing: {
    title: "Monthly billing & payments",
    subtitle: "Generate student bills with leave rebates + GST and record UPI/cash payments.",
    action: "Generate monthly bills",
  },
  feedback: {
    title: "Feedback & complaints",
    subtitle: "Monitor meal satisfaction heatmap and resolve student complaints within SLA.",
    action: "Submit feedback",
  },
  analytics: {
    title: "Cost analytics",
    subtitle: "Track food spend, cost per plate, and waste efficiency.",
    action: "Export report",
  },
  reports: {
    title: "Reports & charts",
    subtitle: "Export real CSV spreadsheets and printable PDF summaries.",
    action: "Export report",
  },
  movements: {
    title: "Stock movements",
    subtitle: "Review every recorded stock adjustment and its reason.",
    action: "Adjust stock",
  },
  actuals: {
    title: "Service actuals",
    subtitle: "Compare prepared, served, leftover, and spoiled portions.",
    action: "Record actuals",
  },
};

export const sampleInventory: DemoInventoryItem[] = [
  {
    id: "demo-1",
    name: "Basmati rice",
    category: "Grains",
    quantity: 42,
    unit: "kg",
    minimum_quantity: 50,
    unit_cost: 78,
    supplier_name: "Greenfield Foods",
    expiry_date: null,
  },
  {
    id: "demo-2",
    name: "Red tomatoes",
    category: "Produce",
    quantity: 18,
    unit: "kg",
    minimum_quantity: 15,
    unit_cost: 42,
    supplier_name: "Daily Harvest Co.",
    expiry_date: null,
  },
  {
    id: "demo-3",
    name: "Whole milk",
    category: "Dairy",
    quantity: 26,
    unit: "L",
    minimum_quantity: 18,
    unit_cost: 56,
    supplier_name: "Meadow Dairy",
    expiry_date: null,
  },
  {
    id: "demo-4",
    name: "Toor dal",
    category: "Pulses",
    quantity: 33,
    unit: "kg",
    minimum_quantity: 24,
    unit_cost: 132,
    supplier_name: "Greenfield Foods",
    expiry_date: null,
  },
  {
    id: "demo-5",
    name: "Fresh spinach",
    category: "Produce",
    quantity: 8,
    unit: "kg",
    minimum_quantity: 12,
    unit_cost: 38,
    supplier_name: "Daily Harvest Co.",
    expiry_date: null,
  },
  {
    id: "demo-6",
    name: "Yogurt",
    category: "Dairy",
    quantity: 13,
    unit: "kg",
    minimum_quantity: 10,
    unit_cost: 64,
    supplier_name: "Meadow Dairy",
    expiry_date: null,
  },
  {
    id: "demo-7",
    name: "Sunflower oil",
    category: "Pantry",
    quantity: 29,
    unit: "L",
    minimum_quantity: 20,
    unit_cost: 145,
    supplier_name: "Cedar Supply",
    expiry_date: null,
  },
];

export const sampleMeals = [
  { time: "07:30", meal: "Breakfast", dish: "Poha & fresh fruit", portions: 420, status: "Ready" },
  {
    time: "12:30",
    meal: "Lunch",
    dish: "Dal, steamed rice & seasonal sabzi",
    portions: 680,
    status: "In progress",
  },
  {
    time: "16:00",
    meal: "Evening snack",
    dish: "Vegetable cutlet & chai",
    portions: 350,
    status: "Upcoming",
  },
  {
    time: "19:30",
    meal: "Dinner",
    dish: "Chapati, paneer curry & salad",
    portions: 610,
    status: "Upcoming",
  },
];

export const sampleStudents = [
  { code: "ST-1042", name: "Aarav Mehta", hall: "North Hall", plan: "Standard", status: "Active" },
  { code: "ST-1088", name: "Ananya Rao", hall: "East Hall", plan: "Vegetarian", status: "Active" },
  { code: "ST-1136", name: "Kabir Shah", hall: "North Hall", plan: "Standard", status: "Active" },
  {
    code: "ST-1194",
    name: "Meera Iyer",
    hall: "Garden Hall",
    plan: "Dairy-free",
    status: "Active",
  },
  {
    code: "ST-1235",
    name: "Vihaan Kapoor",
    hall: "East Hall",
    plan: "Standard",
    status: "On leave",
  },
];

export const sampleRecipes = [
  {
    name: "Vegetable pulao",
    category: "Main course",
    servings: 100,
    cost: 26.5,
    ingredients: "Rice, seasonal vegetables, cumin",
  },
  {
    name: "Dal tadka",
    category: "Main course",
    servings: 100,
    cost: 19.25,
    ingredients: "Toor dal, tomato, onion, spices",
  },
  {
    name: "Paneer bhurji",
    category: "Main course",
    servings: 80,
    cost: 34,
    ingredients: "Paneer, tomato, onion, herbs",
  },
  {
    name: "Fresh fruit bowl",
    category: "Side",
    servings: 120,
    cost: 17.5,
    ingredients: "Seasonal fruit, lime",
  },
];

export const sampleOrders = [
  {
    number: "PO-2026-018",
    supplier: "Greenfield Foods",
    items: "Rice, toor dal",
    total: 18400,
    status: "Approved",
    delivery: "Today",
  },
  {
    number: "PO-2026-017",
    supplier: "Daily Harvest Co.",
    items: "Tomatoes, spinach, onions",
    total: 9650,
    status: "Ordered",
    delivery: "Tomorrow",
  },
  {
    number: "PO-2026-016",
    supplier: "Meadow Dairy",
    items: "Milk, yogurt",
    total: 7120,
    status: "Received",
    delivery: "Nov 12",
  },
];

export const sampleNotifications = [
  {
    title: "Basmati rice below minimum",
    detail: "42 kg remaining · 50 kg minimum · Greenfield Foods",
    time: "12 min ago",
    priority: "High",
    page: "inventory" as FoodFlowPage,
  },
  {
    title: "Tomorrow’s lunch plan needs review",
    detail: "Menu is ready; expected portions still need confirmation.",
    time: "48 min ago",
    priority: "Medium",
    page: "meal-planning" as FoodFlowPage,
  },
  {
    title: "Purchase approval pending",
    detail: "PO-2026-019 · Seasonal produce · ₹8,250",
    time: "2 hours ago",
    priority: "Medium",
    page: "purchasing" as FoodFlowPage,
  },
];

export const sampleTrend = [
  { day: "Mon", served: 1810, forecast: 2020, cost: 58400 },
  { day: "Tue", served: 1865, forecast: 2040, cost: 60200 },
  { day: "Wed", served: 1825, forecast: 2030, cost: 58900 },
  { day: "Thu", served: 1890, forecast: 2060, cost: 61100 },
  { day: "Fri", served: 1842, forecast: 2060, cost: 59400 },
  { day: "Sat", served: 1620, forecast: 1790, cost: 52300 },
  { day: "Sun", served: 1510, forecast: 1680, cost: 48800 },
];

export const sampleWaste = [
  { day: "Mon", prepared: 205, wasted: 14.8, pct: 7.2 },
  { day: "Tue", prepared: 205, wasted: 13.1, pct: 6.4 },
  { day: "Wed", prepared: 208, wasted: 15.6, pct: 7.5 },
  { day: "Thu", prepared: 204, wasted: 12.4, pct: 6.1 },
  { day: "Fri", prepared: 205, wasted: 14.0, pct: 6.8 },
  { day: "Sat", prepared: 188, wasted: 10.5, pct: 5.6 },
  { day: "Sun", prepared: 176, wasted: 9.2, pct: 5.2 },
];

export const getMealType = (value: string): MealType => {
  if (value === "Breakfast" || value === "Lunch" || value === "Snacks" || value === "Dinner")
    return value;
  return "Lunch";
};

export const formatRupees = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

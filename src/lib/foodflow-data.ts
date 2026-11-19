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
  | "reports"
  | "settings"
  | "notifications"
  | "users"
  | "calendar"
  | "suppliers"
  | "halls"
  | "movements"
  | "actuals";

export type MealType = "Breakfast" | "Lunch" | "Snacks" | "Dinner";
export type AppRole =
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
};

export const navigationGroups: { label: string; items: { label: string; page: FoodFlowPage; icon: string }[] }[] = [
  {
    label: "OPERATIONS",
    items: [
      { label: "Overview", page: "overview", icon: "LayoutDashboard" },
      { label: "Meal planning", page: "meal-planning", icon: "CalendarDays" },
      { label: "Weekly menu", page: "weekly-menu", icon: "CookingPot" },
      { label: "Recipes & ingredients", page: "recipes", icon: "BookOpen" },
      { label: "Kitchen operations", page: "kitchen", icon: "ChefHat" },
    ],
  },
  {
    label: "RESOURCES",
    items: [
      { label: "Inventory", page: "inventory", icon: "Package" },
      { label: "Suppliers & purchasing", page: "purchasing", icon: "Truck" },
      { label: "Attendance", page: "attendance", icon: "ScanLine" },
      { label: "Students", page: "students", icon: "Users" },
    ],
  },
  {
    label: "INSIGHTS",
    items: [
      { label: "Demand forecast", page: "forecast", icon: "ChartNoAxesCombined" },
      { label: "Food waste", page: "waste", icon: "Recycle" },
      { label: "Cost analytics", page: "analytics", icon: "ChartPie" },
      { label: "Reports", page: "reports", icon: "FileBarChart" },
    ],
  },
];

export const systemNavigation: { label: string; page: FoodFlowPage; icon: string }[] = [
  { label: "Notifications", page: "notifications", icon: "Bell" },
  { label: "User management", page: "users", icon: "UserRoundCog" },
  { label: "Settings", page: "settings", icon: "Settings2" },
];

export const moduleDescriptions: Record<Exclude<FoodFlowPage, "overview" | "notifications" | "settings" | "users">, { title: string; subtitle: string; action: string }> = {
  "meal-planning": { title: "Meal planning", subtitle: "Coordinate portions and service across the week.", action: "Add meal" },
  "weekly-menu": { title: "Weekly menu", subtitle: "Keep the whole week’s menu clear and up to date.", action: "Plan a meal" },
  calendar: { title: "Academic calendar", subtitle: "Keep campus events in view alongside the kitchen plan.", action: "Add event" },
  recipes: { title: "Recipes & ingredients", subtitle: "Plan kitchen recipes, serving sizes, and costs.", action: "Add recipe" },
  kitchen: { title: "Kitchen operations", subtitle: "Keep preparation and service moving together.", action: "Add task" },
  inventory: { title: "Inventory management", subtitle: "See what’s in stock, what’s running low, and what expires soon.", action: "Add ingredient" },
  purchasing: { title: "Suppliers & purchasing", subtitle: "Track suppliers and follow every order through delivery.", action: "New order" },
  suppliers: { title: "Supplier directory", subtitle: "Keep purchasing contacts and delivery details together.", action: "Add supplier" },
  halls: { title: "Dining halls", subtitle: "Organise dining spaces and meal service capacity.", action: "Add dining hall" },
  attendance: { title: "Student attendance", subtitle: "Record today’s meal service and keep student counts accurate.", action: "Record attendance" },
  students: { title: "Student records", subtitle: "Find meal plans, dining halls, and student preferences.", action: "Add student" },
  forecast: { title: "Demand forecast", subtitle: "Review expected meal counts before preparing tomorrow.", action: "Add forecast" },
  waste: { title: "Food waste", subtitle: "Compare prepared, served, and leftover portions.", action: "Log waste" },
  analytics: { title: "Cost analytics", subtitle: "Keep food spend and cost per meal in view.", action: "Export report" },
  reports: { title: "Reports", subtitle: "Create a clear snapshot of your kitchen operations.", action: "Export report" },
  movements: { title: "Stock movements", subtitle: "Review every recorded stock adjustment and its reason.", action: "Adjust stock" },
  actuals: { title: "Service actuals", subtitle: "Compare prepared, served, leftover, and spoiled portions.", action: "Record actuals" },
};

export const sampleInventory: DemoInventoryItem[] = [
  { id: "demo-1", name: "Basmati rice", category: "Grains", quantity: 42, unit: "kg", minimum_quantity: 50, unit_cost: 78, supplier_name: "Greenfield Foods", expiry_date: null },
  { id: "demo-2", name: "Red tomatoes", category: "Produce", quantity: 18, unit: "kg", minimum_quantity: 15, unit_cost: 42, supplier_name: "Daily Harvest Co.", expiry_date: null },
  { id: "demo-3", name: "Whole milk", category: "Dairy", quantity: 26, unit: "L", minimum_quantity: 18, unit_cost: 56, supplier_name: "Meadow Dairy", expiry_date: null },
  { id: "demo-4", name: "Toor dal", category: "Pulses", quantity: 33, unit: "kg", minimum_quantity: 24, unit_cost: 132, supplier_name: "Greenfield Foods", expiry_date: null },
  { id: "demo-5", name: "Fresh spinach", category: "Produce", quantity: 8, unit: "kg", minimum_quantity: 12, unit_cost: 38, supplier_name: "Daily Harvest Co.", expiry_date: null },
  { id: "demo-6", name: "Yogurt", category: "Dairy", quantity: 13, unit: "kg", minimum_quantity: 10, unit_cost: 64, supplier_name: "Meadow Dairy", expiry_date: null },
  { id: "demo-7", name: "Sunflower oil", category: "Pantry", quantity: 29, unit: "L", minimum_quantity: 20, unit_cost: 145, supplier_name: "Cedar Supply", expiry_date: null },
];

export const sampleMeals = [
  { time: "07:30", meal: "Breakfast", dish: "Poha & fresh fruit", portions: 420, status: "Ready" },
  { time: "12:30", meal: "Lunch", dish: "Dal, steamed rice & seasonal sabzi", portions: 680, status: "In progress" },
  { time: "16:00", meal: "Evening snack", dish: "Vegetable cutlet & chai", portions: 350, status: "Upcoming" },
  { time: "19:30", meal: "Dinner", dish: "Chapati, paneer curry & salad", portions: 610, status: "Upcoming" },
];

export const sampleStudents = [
  { code: "ST-1042", name: "Aarav Mehta", hall: "North Hall", plan: "Standard", status: "Active" },
  { code: "ST-1088", name: "Ananya Rao", hall: "East Hall", plan: "Vegetarian", status: "Active" },
  { code: "ST-1136", name: "Kabir Shah", hall: "North Hall", plan: "Standard", status: "Active" },
  { code: "ST-1194", name: "Meera Iyer", hall: "Garden Hall", plan: "Dairy-free", status: "Active" },
  { code: "ST-1235", name: "Vihaan Kapoor", hall: "East Hall", plan: "Standard", status: "On leave" },
];

export const sampleRecipes = [
  { name: "Vegetable pulao", category: "Main course", servings: 100, cost: 26.5, ingredients: "Rice, seasonal vegetables, cumin" },
  { name: "Dal tadka", category: "Main course", servings: 100, cost: 19.25, ingredients: "Toor dal, tomato, onion, spices" },
  { name: "Paneer bhurji", category: "Main course", servings: 80, cost: 34, ingredients: "Paneer, tomato, onion, herbs" },
  { name: "Fresh fruit bowl", category: "Side", servings: 120, cost: 17.5, ingredients: "Seasonal fruit, lime" },
];

export const sampleOrders = [
  { number: "PO-2026-018", supplier: "Greenfield Foods", items: "Rice, toor dal", total: 18400, status: "Approved", delivery: "Today" },
  { number: "PO-2026-017", supplier: "Daily Harvest Co.", items: "Tomatoes, spinach, onions", total: 9650, status: "Ordered", delivery: "Tomorrow" },
  { number: "PO-2026-016", supplier: "Meadow Dairy", items: "Milk, yogurt", total: 7120, status: "Received", delivery: "Nov 12" },
];

export const sampleNotifications = [
  { title: "Basmati rice below minimum", detail: "42 kg remaining · 50 kg minimum · Greenfield Foods", time: "12 min ago", priority: "High", page: "inventory" as FoodFlowPage },
  { title: "Tomorrow’s lunch plan needs review", detail: "Menu is ready; expected portions still need confirmation.", time: "48 min ago", priority: "Medium", page: "meal-planning" as FoodFlowPage },
  { title: "Purchase approval pending", detail: "PO-2026-019 · Seasonal produce · ₹8,250", time: "2 hours ago", priority: "Medium", page: "purchasing" as FoodFlowPage },
];

export const sampleTrend = [
  { day: "Mon", served: 1980, forecast: 2050, cost: 61200 },
  { day: "Tue", served: 2210, forecast: 2180, cost: 68400 },
  { day: "Wed", served: 2140, forecast: 2210, cost: 65100 },
  { day: "Thu", served: 2320, forecast: 2290, cost: 71900 },
  { day: "Fri", served: 2090, forecast: 2160, cost: 64800 },
  { day: "Sat", served: 1760, forecast: 1810, cost: 55800 },
  { day: "Sun", served: 1530, forecast: 1600, cost: 49300 },
];

export const sampleWaste = [
  { day: "Mon", prepared: 100, wasted: 7.2 },
  { day: "Tue", prepared: 100, wasted: 6.4 },
  { day: "Wed", prepared: 100, wasted: 8.1 },
  { day: "Thu", prepared: 100, wasted: 5.9 },
  { day: "Fri", prepared: 100, wasted: 6.8 },
  { day: "Sat", prepared: 100, wasted: 5.2 },
  { day: "Sun", prepared: 100, wasted: 4.8 },
];

export const getMealType = (value: string): MealType => {
  if (value === "Breakfast" || value === "Lunch" || value === "Snacks" || value === "Dinner") return value;
  return "Lunch";
};

export const formatRupees = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
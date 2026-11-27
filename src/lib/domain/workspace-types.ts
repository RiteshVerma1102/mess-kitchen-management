export type WorkspaceRole =
  "admin" | "kitchen_head" | "store_keeper" | "accountant" | "warden" | "student";

export type MemberStatus = "active" | "suspended";

export type SupportedLanguage = "en" | "hi";

export interface UserProfileDoc {
  uid: string;
  name: string;
  email: string;
  photo: string;
  defaultWorkspaceId: string | null;
  language?: SupportedLanguage;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WorkspaceDoc {
  id: string;
  name: string;
  ownerUid: string;
  institutionType: string;
  cityState: string;
  plan: string;
  timezone: string;
  language: SupportedLanguage;
  monthlyFeePaise: number;
  perDayRebatePaise: number;
  guestMealUnitPaise: number;
  wasteTargetPct: number;
  dailyPlatesEstimate: number;
  minRebateDays?: number;
  setupChecklistDismissed?: boolean;
  cycleMenuWeek?: "A" | "B";
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WorkspaceMemberDoc {
  uid: string;
  workspaceId: string;
  role: WorkspaceRole;
  status: MemberStatus;
  invitedBy: string;
  joinedAt?: unknown;
  name: string;
  email: string;
  hallId?: string;
  studentCode?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WorkspaceInviteDoc {
  id: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: WorkspaceRole;
  code: string;
  status: "pending" | "claimed" | "revoked";
  expiresAt: string;
  claimedBy?: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface HallDoc {
  id: string;
  workspaceId: string;
  name: string;
  capacity: number;
  active: boolean;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StudentRecordDoc {
  id: string;
  workspaceId: string;
  studentCode: string;
  name: string;
  email?: string;
  hallId: string;
  hallName: string;
  mealPlan: string;
  dietaryNotes: string;
  status: "Active" | "On leave" | "Suspended";
  uid?: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MealSlotConfigDoc {
  id: string;
  workspaceId: string;
  slot: "breakfast" | "lunch" | "snacks" | "dinner";
  label: string;
  timing: string;
  cutoffIst: string;
  enabled: boolean;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MenuPlanDoc {
  id: string;
  workspaceId: string;
  serviceDate: string;
  mealType: "Breakfast" | "Lunch" | "Snacks" | "Dinner";
  title: string;
  dishes: string[];
  expectedServings: number;
  status: "Draft" | "Published" | "Completed";
  calories?: string;
  allergens?: string[];
  plateCostPaise?: number;
  cycleWeek?: "A" | "B";
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface RecipeDoc {
  id: string;
  workspaceId: string;
  name: string;
  category: string;
  servings: number;
  costPerServingPaise: number;
  ingredients: { name: string; quantity: number; unit: string }[];
  instructions: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface InventoryItemDoc {
  id: string;
  workspaceId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minimumQuantity: number;
  unitCostPaise: number;
  supplierName: string;
  expiryDate: string | null;
  batchCode?: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StockMovementDoc {
  id: string;
  workspaceId: string;
  itemId: string;
  itemName: string;
  quantityDelta: number;
  unit: string;
  reason: string;
  movedAt: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface VendorDoc {
  id: string;
  workspaceId: string;
  name: string;
  category: string;
  contactName: string;
  email: string;
  phone: string;
  gstin?: string;
  status: "Active" | "Inactive";
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PurchaseOrderDoc {
  id: string;
  workspaceId: string;
  orderNumber: string;
  supplierName: string;
  itemSummary: string;
  totalPaise: number;
  status: "Pending" | "Approved" | "Ordered" | "Received" | "Cancelled";
  expectedDate: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BookingDoc {
  id: string;
  workspaceId: string;
  userId: string;
  studentCode: string;
  serviceDate: string;
  mealType: "breakfast" | "lunch" | "snacks" | "dinner";
  status: "booked" | "skipped" | "locked";
  guestCount: number;
  tiffinRequested?: boolean;
  note?: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AttendanceDoc {
  id: string;
  workspaceId: string;
  studentCode: string;
  studentName: string;
  hallName: string;
  mealType: string;
  serviceDate: string;
  method: "qr" | "manual" | "rfid";
  servedAt: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WasteLogDoc {
  id: string;
  workspaceId: string;
  recordDate: string;
  mealType: string;
  dishName: string;
  preparedQuantity: number;
  servedQuantity: number;
  wastedQuantity: number;
  unit: string;
  wasteCostPaise: number;
  wasteStage?: "prep" | "plate";
  reason?: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface InvoiceDoc {
  id: string;
  workspaceId: string;
  studentCode: string;
  studentName: string;
  studentUid?: string;
  monthKey: string;
  baseProratedPaise: number;
  leaveRebatePaise: number;
  guestChargesPaise: number;
  gstPaise: number;
  totalPayablePaise: number;
  paidPaise: number;
  status: "unpaid" | "partial" | "paid";
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PaymentDoc {
  id: string;
  workspaceId: string;
  invoiceId: string;
  studentName: string;
  studentUid?: string;
  amountPaise: number;
  method: "upi" | "cash" | "bank_transfer" | "card";
  referenceNo: string;
  paidAt: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FeedbackDoc {
  id: string;
  workspaceId: string;
  userId: string;
  studentName: string;
  mealType: string;
  serviceDate: string;
  rating: number;
  category: "taste" | "hygiene" | "portion" | "timing" | "other";
  tags?: string[];
  dishRatings?: { dish: string; rating: number }[];
  isAnonymous?: boolean;
  moderationStatus?: "approved" | "flagged" | "hidden";
  comment: string;
  status: "open" | "acknowledged" | "resolved";
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ComplaintDoc {
  id: string;
  workspaceId: string;
  userId: string;
  studentName: string;
  category: string;
  subject: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "resolved";
  photoDataUrl?: string;
  assignedTo?: string;
  slaDeadlineAt?: string;
  escalatedToRoles?: string[];
  resolutionNote?: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface NotificationDoc {
  id: string;
  workspaceId: string;
  title: string;
  detail: string;
  priority: "High" | "Medium" | "Low";
  noticeType?: "alert" | "broadcast";
  page: string;
  readBy: string[];
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AuditLogDoc {
  id: string;
  workspaceId: string;
  actorUid: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "ROLE" | "INVITE" | "PAYMENT";
  targetCollection: string;
  targetId: string;
  summary: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface KitchenTaskDoc {
  id: string;
  workspaceId: string;
  taskDate: string;
  mealType: string;
  dishName: string;
  plannedQuantity: number;
  completedQuantity: number;
  assignedTo: string;
  status: "Not started" | "In progress" | "Ready" | "Completed";
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ForecastDoc {
  id: string;
  workspaceId: string;
  forecastDate: string;
  mealType: string;
  expectedStudents: number;
  confidence: number;
  method: string;
  weatherNote?: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CalendarEventDoc {
  id: string;
  workspaceId: string;
  eventDate: string;
  title: string;
  description: string;
  attendanceFactor: number;
  rsvpStudentCodes?: string[];
  guestTokenQuota?: number;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ServiceActualDoc {
  id: string;
  workspaceId: string;
  serviceDate: string;
  mealType: string;
  dishName: string;
  preparedQuantity: number;
  servedQuantity: number;
  leftoverQuantity: number;
  spoiledQuantity: number;
  costPerServingPaise: number;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface LeaveRequestDoc {
  id: string;
  workspaceId: string;
  userId: string;
  studentCode: string;
  studentName: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  rebatePaise: number;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export const WORKSPACE_ROLES: {
  value: WorkspaceRole;
  labelEn: string;
  labelHi: string;
  descEn: string;
}[] = [
  {
    value: "admin",
    labelEn: "Admin",
    labelHi: "प्रशासक (Admin)",
    descEn: "Full workspace, team, billing, purchasing, kitchen, and audit access.",
  },
  {
    value: "kitchen_head",
    labelEn: "Kitchen Head",
    labelHi: "रसोई प्रमुख (Kitchen Head)",
    descEn: "Menus, recipes, kitchen prep, waste logs, attendance, feedback, and forecasts.",
  },
  {
    value: "store_keeper",
    labelEn: "Store Keeper",
    labelHi: "भंडारपाल (Store Keeper)",
    descEn: "Inventory stock, expiry alerts, vendors, purchase orders, and stock movements.",
  },
  {
    value: "accountant",
    labelEn: "Accountant",
    labelHi: "लेखाकार (Accountant)",
    descEn:
      "Monthly student billing, rebates, payments ledger, PO cost reviews, and financial reports.",
  },
  {
    value: "warden",
    labelEn: "Hostel Warden",
    labelHi: "हॉस्टल वार्डन (Warden)",
    descEn:
      "Student directory, leave approvals, hygiene escalations, feedback moderation, and emergency broadcasts.",
  },
  {
    value: "student",
    labelEn: "Student",
    labelHi: "छात्र (Student)",
    descEn:
      "View menus, skip meals before cut-off, display QR pass, request leave, and view own bill.",
  },
];

export function formatWorkspaceRole(
  role: string | null | undefined,
  lang: SupportedLanguage = "en",
): string {
  const match = WORKSPACE_ROLES.find((r) => r.value === role);
  if (match) return lang === "hi" ? match.labelHi : match.labelEn;
  // Backward compatibility if any legacy string appears
  if (role === "institution_admin") return lang === "hi" ? "प्रशासक (Admin)" : "Admin";
  if (role === "mess_manager") return lang === "hi" ? "रसोई प्रमुख" : "Kitchen Head";
  return lang === "hi" ? "कोई भूमिका नहीं" : "No role";
}

export function isPageAllowedForRole(page: string, role: WorkspaceRole | null): boolean {
  if (!role) return page === "settings" || page === "overview";
  if (role === "admin") return true;
  if (role === "kitchen_head") {
    return [
      "overview",
      "meal-planning",
      "weekly-menu",
      "recipes",
      "kitchen",
      "inventory",
      "attendance",
      "students",
      "forecast",
      "waste",
      "feedback",
      "reports",
      "notifications",
      "settings",
      "calendar",
      "halls",
      "movements",
      "actuals",
    ].includes(page);
  }
  if (role === "store_keeper") {
    return [
      "overview",
      "inventory",
      "purchasing",
      "suppliers",
      "movements",
      "recipes",
      "waste",
      "reports",
      "notifications",
      "settings",
    ].includes(page);
  }
  if (role === "accountant") {
    return [
      "overview",
      "billing",
      "purchasing",
      "suppliers",
      "analytics",
      "reports",
      "students",
      "waste",
      "notifications",
      "settings",
    ].includes(page);
  }
  if (role === "warden") {
    return [
      "overview",
      "students",
      "halls",
      "attendance",
      "feedback",
      "weekly-menu",
      "calendar",
      "reports",
      "notifications",
      "settings",
    ].includes(page);
  }
  // student
  return ["overview", "weekly-menu", "billing", "feedback", "notifications", "settings"].includes(
    page,
  );
}

export function canRoleWriteCollection(
  role: WorkspaceRole | null,
  collectionName: string,
): boolean {
  if (!role) return false;
  if (role === "admin") return true;
  if (role === "kitchen_head") {
    return [
      "menus",
      "recipes",
      "kitchenTasks",
      "serviceActuals",
      "wasteLogs",
      "forecasts",
      "calendarEvents",
      "attendance",
      "students",
      "mealSlots",
      "halls",
      "feedback",
      "complaints",
      "notifications",
    ].includes(collectionName);
  }
  if (role === "store_keeper") {
    return [
      "inventoryItems",
      "stockMovements",
      "vendors",
      "purchaseOrders",
      "wasteLogs",
      "notifications",
    ].includes(collectionName);
  }
  if (role === "accountant") {
    return ["invoices", "payments", "purchaseOrders", "leaveRequests", "notifications"].includes(
      collectionName,
    );
  }
  if (role === "warden") {
    return [
      "feedback",
      "complaints",
      "leaveRequests",
      "notifications",
      "calendarEvents",
      "students",
    ].includes(collectionName);
  }
  if (role === "student") {
    return ["bookings", "feedback", "complaints", "leaveRequests"].includes(collectionName);
  }
  return false;
}

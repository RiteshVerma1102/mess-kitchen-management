import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Clock3,
  Download,
  Globe,
  Lock,
  LogIn,
  Megaphone,
  MessageSquareWarning,
  Minus,
  PackageCheck,
  Plus,
  QrCode,
  Receipt,
  ShieldAlert,
  Sparkles,
  Star,
  User,
  UserPlus,
  Utensils,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useFirebaseAuth } from "@/components/firebase-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BrandMark } from "@/features/marketing/brand";
import {
  checkFeedbackEligibility,
  computeComplaintSlaDeadline,
  evaluateLeaveRebateEligibility,
  FEEDBACK_TAGS,
  formatSlaRemaining,
  moderateFeedbackContent,
  normalizeComplaintPriorityAndEscalation,
} from "@/lib/domain/feedback-ops";
import {
  canModifyMealSelection,
  computeMonthlyMessBillPaise,
  formatISTDateKey,
  generateDynamicDiningPassToken,
  type MealSlot,
} from "@/lib/domain/mess-ops";
import { fromPaise } from "@/lib/domain/money";
import type {
  AttendanceDoc,
  BookingDoc,
  CalendarEventDoc,
  ComplaintDoc,
  FeedbackDoc,
  InvoiceDoc,
  LeaveRequestDoc,
  MealSlotConfigDoc,
  MenuPlanDoc,
  NotificationDoc,
} from "@/lib/domain/workspace-types";
import { exportToPrintablePDF } from "@/lib/export-helpers";
import { foodFlowHead } from "@/lib/foodflow-route-head";
import { formatINR } from "@/lib/formatters";
import { compressImageFileToDataUrl } from "@/lib/image-compress";
import {
  createSubDoc,
  subscribeSubcollection,
  updateSubDoc,
  upsertWorkspaceBooking,
  type AuditActor,
} from "@/lib/workspace-firestore";

export const Route = createFileRoute("/student")({
  head: () =>
    foodFlowHead(
      "Student Dining Portal | FoodFlow",
      "3-tap meal skip before IST cut-off, sick/late tiffin request, guest meal booking, rotating QR pass, and paise-accurate mess bill.",
    ),
  component: StudentPortalPage,
});

type Tab = "menu" | "pass" | "leave" | "bill" | "support";

interface MealMenuItem {
  slot: MealSlot;
  typeEn: string;
  typeHi: string;
  timing: string;
  cutoffLabel?: string | undefined;
  items: string[];
  calories?: string | undefined;
  plateCostPaise?: number | undefined;
  allergens?: string[] | undefined;
}

const SAMPLE_MEALS: MealMenuItem[] = [
  {
    slot: "breakfast",
    typeEn: "Breakfast",
    typeHi: "नाश्ता",
    timing: "07:30 - 09:30 IST",
    items: ["Aloo Paratha with Curd", "Poha with Roasted Peanuts", "Masala Chai / Fresh Milk"],
    calories: "450 kcal",
    plateCostPaise: 3500,
    allergens: ["Gluten", "Dairy"],
  },
  {
    slot: "lunch",
    typeEn: "Lunch",
    typeHi: "दोपहर का भोजन",
    timing: "12:30 - 14:30 IST",
    items: ["Paneer Butter Masala", "Dal Tadka", "Steamed Basmati Rice", "Tawa Roti & Raita"],
    calories: "720 kcal",
    plateCostPaise: 6200,
    allergens: ["Dairy"],
  },
  {
    slot: "snacks",
    typeEn: "Evening Snacks",
    typeHi: "शाम का नाश्ता",
    timing: "17:00 - 18:30 IST",
    items: ["Veg Samosa with Mint Chutney", "Ginger Cardamom Chai"],
    calories: "280 kcal",
    plateCostPaise: 2400,
    allergens: ["Gluten"],
  },
  {
    slot: "dinner",
    typeEn: "Dinner",
    typeHi: "रात्रि भोजन",
    timing: "20:00 - 22:00 IST",
    items: ["Rajma Masala", "Jeera Rice", "Phulka Roti", "Gulab Jamun (1 pc)"],
    calories: "680 kcal",
    plateCostPaise: 5800,
    allergens: ["Dairy"],
  },
];

const UI_COPY = {
  en: {
    brandSubSample: "Sample Preview · Sign in for Live Mess",
    tabs: { menu: "Menu", pass: "QR Pass", leave: "Leave", bill: "Bill", support: "Support" },
    today: "Today's Meals",
    tomorrow: "Tomorrow (IST)",
    skipMeal: "Skip Meal",
    skipped: "Skipped",
    locked: "Cut-off Passed",
    guestLabel: "Guest Meals",
    tiffinLabel: "Sick / Late Tiffin",
    rateMeal: "Rate Meal",
    qrBadge: "Active Digital Dining Pass",
    qrHint: "Hold this rotating QR code in front of the dining hall kiosk scanner.",
    leaveTitle: "Mess Leave & Rebate Request",
    submitLeave: "Submit Leave Request",
    billTitle: "Monthly Mess Bill",
    downloadBill: "Download Itemised Bill Summary",
    supportTitle: "Report Dining Issue / Complaint",
    submitComplaint: "Submit Ticket",
    feastTitle: "Upcoming Hostel Feasts & Events",
    feastRsvp: "RSVP for Feast",
    feastRsvped: "RSVP Confirmed",
  },
  hi: {
    brandSubSample: "सैंपल पूर्वावलोकन · लाइव मेस के लिए साइन इन करें",
    tabs: { menu: "मेनू", pass: "QR पास", leave: "छुट्टी", bill: "बिल", support: "शिकायत" },
    today: "आज का भोजन",
    tomorrow: "कल (IST)",
    skipMeal: "भोजन स्किप करें",
    skipped: "स्किप किया गया",
    locked: "समय सीमा समाप्त",
    guestLabel: "अतिथि भोजन",
    tiffinLabel: "टिफिन / बीमार ट्रे",
    rateMeal: "रेटिंग दें",
    qrBadge: "सक्रिय डिजिटल डाइनिंग पास",
    qrHint: "उपस्थिति दर्ज करने के लिए इस क्यूआर कोड को डाइनिंग हॉल स्कैनर के सामने रखें।",
    leaveTitle: "मेस अवकाश और छूट अनुरोध",
    submitLeave: "अवकाश अनुरोध भेजें",
    billTitle: "मासिक मेस बिल",
    downloadBill: "विस्तृत बिल सारांश डाउनलोड करें",
    supportTitle: "भोजन या स्वच्छता शिकायत दर्ज करें",
    submitComplaint: "शिकायत दर्ज करें",
    feastTitle: "आगामी विशेष भोज और कार्यक्रम",
    feastRsvp: "भोज के लिए RSVP करें",
    feastRsvped: "RSVP पुष्टि हुई",
  },
} as const;

function slotFromMealType(raw: string): MealSlot {
  const lower = raw.toLowerCase();
  if (lower.includes("break")) return "breakfast";
  if (lower.includes("snack")) return "snacks";
  if (lower.includes("din")) return "dinner";
  return "lunch";
}

export function StudentPortalPage() {
  const {
    user,
    activeWorkspace,
    activeMember,
    language,
    setLanguage,
    signInWithGoogle,
    markWriteRecorded,
  } = useFirebaseAuth();

  const [activeTab, setActiveTab] = useState<Tab>("menu");
  const [menuDay, setMenuDay] = useState<"today" | "tomorrow">("today");
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const [liveMenus, setLiveMenus] = useState<MenuPlanDoc[]>([]);
  const [mealSlots, setMealSlots] = useState<MealSlotConfigDoc[]>([]);
  const [liveBookings, setLiveBookings] = useState<BookingDoc[]>([]);
  const [liveLeaves, setLiveLeaves] = useState<LeaveRequestDoc[]>([]);
  const [liveInvoices, setLiveInvoices] = useState<InvoiceDoc[]>([]);
  const [liveAttendance, setLiveAttendance] = useState<AttendanceDoc[]>([]);
  const [liveFeedback, setLiveFeedback] = useState<FeedbackDoc[]>([]);
  const [liveComplaints, setLiveComplaints] = useState<ComplaintDoc[]>([]);
  const [liveNotifications, setLiveNotifications] = useState<NotificationDoc[]>([]);
  const [liveEvents, setLiveEvents] = useState<CalendarEventDoc[]>([]);

  const [sampleSelections, setSampleSelections] = useState<
    Record<string, { status: "booked" | "skipped"; guestCount: number; tiffinRequested: boolean }>
  >({});
  const [sampleLeaves, setSampleLeaves] = useState<number>(0);
  const [sampleCheckIns, setSampleCheckIns] = useState<Record<string, string>>({});
  const [sampleFeedback, setSampleFeedback] = useState<FeedbackDoc[]>([]);
  const [sampleComplaints, setSampleComplaints] = useState<ComplaintDoc[]>([]);
  const [sampleEventRsvps, setSampleEventRsvps] = useState<string[]>([]);
  const [dismissedBroadcastId, setDismissedBroadcastId] = useState<string | null>(null);

  // Rating State
  const [ratingMeal, setRatingMeal] = useState<MealSlot | null>(null);
  const [selectedStars, setSelectedStars] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(["taste"]);
  const [ratedDish, setRatedDish] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);

  // Leave State
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [savingLeave, setSavingLeave] = useState(false);

  // Support / Complaint State
  const [compCategory, setCompCategory] = useState("Hygiene");
  const [compPriority, setCompPriority] = useState<ComplaintDoc["priority"]>("medium");
  const [compSubject, setCompSubject] = useState("");
  const [compDescription, setCompDescription] = useState("");
  const [compPhotoDataUrl, setCompPhotoDataUrl] = useState<string | undefined>(undefined);
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [savingComplaint, setSavingComplaint] = useState(false);

  const isLiveWorkspace = Boolean(user?.uid && user.emailVerified && activeWorkspace?.id);

  // Tick every 1s for IST cut-off & rotating 60s QR pass countdown
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Subscribe to active workspace student collections
  useEffect(() => {
    const wsId = activeWorkspace?.id;
    const uid = user?.uid;
    if (!wsId || !uid || !user?.emailVerified) {
      setLiveMenus([]);
      setMealSlots([]);
      setLiveBookings([]);
      setLiveLeaves([]);
      setLiveInvoices([]);
      setLiveAttendance([]);
      setLiveFeedback([]);
      setLiveComplaints([]);
      setLiveNotifications([]);
      setLiveEvents([]);
      return;
    }

    const unsubs = [
      subscribeSubcollection<MenuPlanDoc>(wsId, "menus", setLiveMenus, {
        orderByField: "serviceDate",
      }),
      subscribeSubcollection<MealSlotConfigDoc>(wsId, "mealSlots", setMealSlots),
      subscribeSubcollection<BookingDoc>(wsId, "bookings", setLiveBookings, {
        uidFilterField: "userId",
        uid,
      }),
      subscribeSubcollection<LeaveRequestDoc>(wsId, "leaveRequests", setLiveLeaves, {
        uidFilterField: "userId",
        uid,
      }),
      subscribeSubcollection<InvoiceDoc>(wsId, "invoices", setLiveInvoices, {
        uidFilterField: "studentUid",
        uid,
      }),
      subscribeSubcollection<AttendanceDoc>(wsId, "attendance", setLiveAttendance, {
        maxRows: 120,
      }),
      subscribeSubcollection<FeedbackDoc>(wsId, "feedback", setLiveFeedback, {
        uidFilterField: "userId",
        uid,
      }),
      subscribeSubcollection<ComplaintDoc>(wsId, "complaints", setLiveComplaints, {
        uidFilterField: "userId",
        uid,
      }),
      subscribeSubcollection<NotificationDoc>(wsId, "notifications", setLiveNotifications, {
        maxRows: 30,
      }),
      subscribeSubcollection<CalendarEventDoc>(wsId, "calendarEvents", setLiveEvents, {
        orderByField: "eventDate",
      }),
    ];
    return () => {
      for (const u of unsubs) u();
    };
  }, [activeWorkspace?.id, user?.emailVerified, user?.uid]);

  const nowDate = useMemo(() => new Date(nowMs), [nowMs]);
  const todayIST = useMemo(() => formatISTDateKey(nowDate), [nowDate]);
  const tomorrowIST = useMemo(
    () => formatISTDateKey(new Date(nowMs + 24 * 60 * 60 * 1000)),
    [nowMs],
  );
  const activeDateKey = menuDay === "today" ? todayIST : tomorrowIST;

  const studentName =
    activeMember?.name || user?.displayName || user?.email?.split("@")[0] || "Sample Student";
  const studentCode =
    activeMember?.studentCode ||
    (user?.uid ? `FF-${user.uid.slice(0, 6).toUpperCase()}` : "SAMPLE-01");

  const actor: AuditActor | null = useMemo(() => {
    if (!user?.uid) return null;
    return {
      uid: user.uid,
      name: studentName,
      email: user.email || "",
      role: activeMember?.role || "student",
    };
  }, [activeMember?.role, studentName, user?.email, user?.uid]);

  const selectionMap = useMemo(() => {
    if (!isLiveWorkspace) return sampleSelections;
    const map: Record<
      string,
      { status: "booked" | "skipped"; guestCount: number; tiffinRequested: boolean }
    > = {};
    for (const b of liveBookings) {
      map[`${b.serviceDate}:${b.mealType}`] = {
        status: b.status === "skipped" ? "skipped" : "booked",
        guestCount: b.guestCount || 0,
        tiffinRequested: Boolean(b.tiffinRequested),
      };
    }
    return map;
  }, [isLiveWorkspace, liveBookings, sampleSelections]);

  const visibleMeals = useMemo<MealMenuItem[]>(() => {
    if (!isLiveWorkspace) return SAMPLE_MEALS;
    const forDay = liveMenus.filter((m) => m.serviceDate === activeDateKey);
    const slotMap = new Map(mealSlots.map((s) => [s.slot, s]));
    if (forDay.length === 0) {
      const defaults: { slot: MealSlot; en: string; hi: string; timing: string }[] = [
        { slot: "breakfast", en: "Breakfast", hi: "नाश्ता", timing: "07:30 - 09:30 IST" },
        { slot: "lunch", en: "Lunch", hi: "दोपहर का भोजन", timing: "12:30 - 14:30 IST" },
        { slot: "snacks", en: "Evening Snacks", hi: "शाम का नाश्ता", timing: "17:00 - 18:30 IST" },
        { slot: "dinner", en: "Dinner", hi: "रात्रि भोजन", timing: "20:00 - 22:00 IST" },
      ];
      return defaults.map((d) => {
        const cfg = slotMap.get(d.slot);
        return {
          slot: d.slot,
          typeEn: cfg?.label || d.en,
          typeHi: d.hi,
          timing: cfg?.timing || d.timing,
          cutoffLabel: cfg?.cutoffIst,
          items: [],
        };
      });
    }
    return forDay.map((m) => {
      const slot = slotFromMealType(m.mealType);
      const cfg = slotMap.get(slot);
      return {
        slot,
        typeEn: `${m.mealType} — ${m.title}`,
        typeHi: `${m.mealType} — ${m.title}`,
        timing: cfg?.timing || "Scheduled service",
        cutoffLabel: cfg?.cutoffIst,
        items: m.dishes || [],
        calories: m.calories,
        plateCostPaise: m.plateCostPaise,
        allergens: m.allergens,
      };
    });
  }, [activeDateKey, isLiveWorkspace, liveMenus, mealSlots]);

  const activeBroadcast = useMemo(() => {
    if (isLiveWorkspace) {
      return (
        liveNotifications.find(
          (n) => n.noticeType === "broadcast" && n.id !== dismissedBroadcastId,
        ) ?? null
      );
    }
    if (dismissedBroadcastId === "sample-broadcast") return null;
    return {
      id: "sample-broadcast",
      title:
        language === "hi"
          ? "रविवार विशेष भोज · डाइनिंग हॉल A (12:30 PM IST)"
          : "Sunday Special Feast · Dining Hall A (12:30 PM IST)",
      detail:
        language === "hi"
          ? "शाम के नाश्ते से पहले RSVP की पुष्टि करें। मेहमान पास की सीमा 2 है।"
          : "Confirm your Feast RSVP below before evening snacks cut-off. Max 2 guest tokens per student.",
    };
  }, [dismissedBroadcastId, isLiveWorkspace, language, liveNotifications]);

  const totalExtraGuests = useMemo(
    () => Object.values(selectionMap).reduce((sum, item) => sum + (item.guestCount || 0), 0),
    [selectionMap],
  );

  const approvedLeaveDays = useMemo(() => {
    if (!isLiveWorkspace) return sampleLeaves;
    return liveLeaves
      .filter((l) => l.status === "approved")
      .reduce((sum, l) => sum + (l.days || 0), 0);
  }, [isLiveWorkspace, liveLeaves, sampleLeaves]);

  const dynamicPass = useMemo(
    () =>
      generateDynamicDiningPassToken(
        studentCode,
        activeWorkspace?.id?.slice(0, 6).toUpperCase() || "HALL",
        nowMs,
      ),
    [activeWorkspace?.id, nowMs, studentCode],
  );

  const planMonthlyPaise = activeWorkspace?.monthlyFeePaise ?? 420_000;
  const perDayRebatePaise = activeWorkspace?.perDayRebatePaise ?? 8_500;
  const guestMealUnitPaise = activeWorkspace?.guestMealUnitPaise ?? 9_000;
  const minRebateDays = activeWorkspace?.minRebateDays ?? 3;

  const pendingLeaveDaysPreview = useMemo(() => {
    if (!leaveStart || !leaveEnd) return 0;
    const startMs = Date.parse(leaveStart);
    const endMs = Date.parse(leaveEnd);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return 0;
    return Math.max(1, Math.round((endMs - startMs) / (24 * 60 * 60 * 1000)) + 1);
  }, [leaveEnd, leaveStart]);

  const leaveRebatePreview = useMemo(() => {
    if (!pendingLeaveDaysPreview) return null;
    return evaluateLeaveRebateEligibility({
      days: pendingLeaveDaysPreview,
      minRebateDays,
      perDayRebatePaise,
    });
  }, [minRebateDays, pendingLeaveDaysPreview, perDayRebatePaise]);

  const monthlyBill = useMemo(
    () =>
      computeMonthlyMessBillPaise({
        planMonthlyPaise,
        daysInMonth: 30,
        activeDays: 30,
        approvedLeaveDays,
        perDayRebatePaise,
        guestMealCount: totalExtraGuests,
        guestMealUnitPaise,
        gstRateBps: 500,
      }),
    [approvedLeaveDays, guestMealUnitPaise, perDayRebatePaise, planMonthlyPaise, totalExtraGuests],
  );

  const effectiveAttendance = useMemo(() => {
    if (isLiveWorkspace) return liveAttendance;
    return Object.entries(sampleCheckIns).map(([key, servedAt]) => {
      const [serviceDate = todayIST, mealType = "lunch"] = key.split(":");
      return { studentCode, serviceDate, mealType, servedAt };
    });
  }, [isLiveWorkspace, liveAttendance, sampleCheckIns, studentCode, todayIST]);

  const effectiveFeedback = isLiveWorkspace ? liveFeedback : sampleFeedback;
  const effectiveComplaints = isLiveWorkspace ? liveComplaints : sampleComplaints;

  const updateMealSelection = async (
    slot: MealSlot,
    nextStatus: "booked" | "skipped",
    nextGuests: number,
    nextTiffin: boolean,
  ) => {
    const cutoff = canModifyMealSelection(slot, activeDateKey, nowDate);
    if (!cutoff.allowed) {
      toast.error(`Cut-off time (${cutoff.cutoffIstLabel}) has already passed for ${slot}.`);
      return;
    }

    const boundedGuests = Math.max(0, Math.min(5, nextGuests));
    const key = `${activeDateKey}:${slot}`;

    if (!isLiveWorkspace || !activeWorkspace?.id || !actor) {
      setSampleSelections((prev) => ({
        ...prev,
        [key]: { status: nextStatus, guestCount: boundedGuests, tiffinRequested: nextTiffin },
      }));
      toast.success(`Sample preview: ${slot} set to ${nextStatus}.`);
      return;
    }

    try {
      await upsertWorkspaceBooking(activeWorkspace.id, actor, {
        studentCode,
        serviceDate: activeDateKey,
        mealType: slot,
        status: nextStatus,
        guestCount: boundedGuests,
        tiffinRequested: nextTiffin,
      });
      markWriteRecorded();
      toast.success(
        nextStatus === "skipped"
          ? `Skipped ${slot} on ${activeDateKey}. Kitchen demand updated.`
          : nextTiffin
            ? `Tiffin/sick tray requested for ${slot}.`
            : `Updated ${slot} (${boundedGuests} guest${boundedGuests === 1 ? "" : "s"}).`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save meal preference.");
    }
  };

  const toggleFeedbackTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag].slice(0, 5),
    );
  };

  const handleRateSubmit = async (meal: MealMenuItem) => {
    const mod = moderateFeedbackContent(feedbackText);
    const dishRatings = ratedDish.trim()
      ? [{ dish: ratedDish.trim(), rating: selectedStars }]
      : undefined;

    if (!isLiveWorkspace || !activeWorkspace?.id || !actor) {
      setSampleFeedback((prev) => [
        {
          id: `sample-fb-${Date.now()}`,
          workspaceId: "sample",
          userId: "sample-student",
          studentName,
          mealType: meal.slot,
          serviceDate: activeDateKey,
          rating: selectedStars,
          category: "taste",
          tags: selectedTags,
          ...(dishRatings ? { dishRatings } : {}),
          isAnonymous,
          moderationStatus: mod.moderationStatus,
          comment: feedbackText.trim() || "Rated via Sample Preview",
          status: "open",
          createdBy: "sample-student",
        },
        ...prev,
      ]);
      toast.success(
        mod.moderationStatus === "flagged"
          ? "Sample rating queued for moderation review."
          : `Sample preview: ${selectedStars}-star rating saved.`,
      );
      setRatingMeal(null);
      setFeedbackText("");
      setRatedDish("");
      return;
    }

    setSavingFeedback(true);
    try {
      await createSubDoc(
        activeWorkspace.id,
        "feedback",
        actor,
        {
          userId: actor.uid,
          studentName,
          mealType: meal.slot,
          serviceDate: activeDateKey,
          rating: selectedStars,
          category: "taste",
          tags: selectedTags,
          ...(dishRatings ? { dishRatings } : {}),
          isAnonymous,
          moderationStatus: mod.moderationStatus,
          comment: feedbackText.trim() || "Rated via Student Portal",
          status: "open",
        },
        { auditSummary: `Student rated ${meal.slot} ${selectedStars}/5.` },
      );
      markWriteRecorded();
      toast.success(
        mod.moderationStatus === "flagged"
          ? "Rating saved and held for moderator review."
          : `Thank you! ${selectedStars}-star rating saved to Firestore.`,
      );
      setRatingMeal(null);
      setFeedbackText("");
      setRatedDish("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save meal feedback.");
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd) {
      toast.error("Please select both start and end dates.");
      return;
    }
    const startMs = Date.parse(leaveStart);
    const endMs = Date.parse(leaveEnd);
    const days =
      Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs
        ? Math.max(1, Math.round((endMs - startMs) / (24 * 60 * 60 * 1000)) + 1)
        : 1;
    const rebateCheck = evaluateLeaveRebateEligibility({
      days,
      minRebateDays,
      perDayRebatePaise,
    });

    if (!isLiveWorkspace || !activeWorkspace?.id || !actor) {
      if (rebateCheck.rebateEligible) {
        setSampleLeaves((prev) => prev + days);
      }
      toast.success(`Sample preview: ${rebateCheck.noteEn}`);
      setLeaveStart("");
      setLeaveEnd("");
      setLeaveReason("");
      return;
    }

    setSavingLeave(true);
    try {
      await createSubDoc(
        activeWorkspace.id,
        "leaveRequests",
        actor,
        {
          userId: actor.uid,
          studentCode,
          studentName,
          startDate: leaveStart,
          endDate: leaveEnd,
          days,
          reason: leaveReason.trim(),
          status: "pending",
          rebatePaise: rebateCheck.rebatePaise,
        },
        {
          auditSummary: `Submitted ${days}-day mess leave (${leaveStart} to ${leaveEnd}; rebate=${rebateCheck.rebateEligible ? "yes" : "below min days"}).`,
        },
      );
      markWriteRecorded();
      toast.success(rebateCheck.noteEn);
      setLeaveStart("");
      setLeaveEnd("");
      setLeaveReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit leave request.");
    } finally {
      setSavingLeave(false);
    }
  };

  const handleComplaintPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressingPhoto(true);
    try {
      const compactUrl = await compressImageFileToDataUrl(file);
      setCompPhotoDataUrl(compactUrl);
      toast.success("Photo compressed and attached.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not attach photo.");
    } finally {
      setCompressingPhoto(false);
      e.target.value = "";
    }
  };

  const handleComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compSubject.trim() || !compDescription.trim()) return;
    const esc = normalizeComplaintPriorityAndEscalation(compCategory, compPriority);
    const slaDeadlineAt = computeComplaintSlaDeadline(new Date().toISOString(), esc.priority);

    if (!isLiveWorkspace || !activeWorkspace?.id || !actor) {
      setSampleComplaints((prev) => [
        {
          id: `sample-comp-${Date.now()}`,
          workspaceId: "sample",
          userId: "sample-student",
          studentName,
          category: compCategory,
          subject: compSubject.trim(),
          description: compDescription.trim(),
          priority: esc.priority,
          status: "open",
          slaDeadlineAt,
          ...(esc.escalatedToRoles.length ? { escalatedToRoles: esc.escalatedToRoles } : {}),
          ...(compPhotoDataUrl ? { photoDataUrl: compPhotoDataUrl } : {}),
          createdBy: "sample-student",
        },
        ...prev,
      ]);
      toast.success(
        esc.autoEscalated
          ? "Sample ticket auto-escalated to Admin & Warden (4h SLA)."
          : "Sample complaint ticket logged.",
      );
      setCompSubject("");
      setCompDescription("");
      setCompPhotoDataUrl(undefined);
      return;
    }

    setSavingComplaint(true);
    try {
      await createSubDoc(
        activeWorkspace.id,
        "complaints",
        actor,
        {
          userId: actor.uid,
          studentName,
          category: compCategory,
          subject: compSubject.trim(),
          description: compDescription.trim(),
          priority: esc.priority,
          status: "open",
          slaDeadlineAt,
          ...(esc.escalatedToRoles.length ? { escalatedToRoles: esc.escalatedToRoles } : {}),
          ...(compPhotoDataUrl ? { photoDataUrl: compPhotoDataUrl } : {}),
        },
        { auditSummary: `Student filed ${compCategory} ticket "${compSubject.trim()}".` },
      );

      if (esc.autoEscalated) {
        await createSubDoc(activeWorkspace.id, "notifications", actor, {
          title: `Hygiene Escalation: ${compSubject.trim()}`.slice(0, 140),
          detail:
            `${studentName} (${studentCode}) raised a Hygiene ticket auto-escalated to Admin & Warden.`.slice(
              0,
              500,
            ),
          priority: "High",
          noticeType: "alert",
          page: "feedback",
          readBy: [],
        });
      }

      markWriteRecorded();
      toast.success(
        esc.autoEscalated
          ? "Hygiene ticket auto-escalated to Admin & Warden (4h SLA)."
          : "Complaint ticket submitted with SLA tracking.",
      );
      setCompSubject("");
      setCompDescription("");
      setCompPhotoDataUrl(undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit complaint.");
    } finally {
      setSavingComplaint(false);
    }
  };

  const handleFeastRsvp = async (eventId: string, currentCodes: string[]) => {
    if (!isLiveWorkspace || !activeWorkspace?.id || !actor) {
      setSampleEventRsvps((prev) =>
        prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId],
      );
      toast.success("Sample Feast RSVP updated.");
      return;
    }
    const nextCodes = currentCodes.includes(studentCode)
      ? currentCodes.filter((c) => c !== studentCode)
      : [...currentCodes, studentCode];
    try {
      await updateSubDoc(
        activeWorkspace.id,
        "calendarEvents",
        eventId,
        actor,
        { rsvpStudentCodes: nextCodes },
        `Student ${studentCode} updated Feast RSVP (${nextCodes.length}).`,
      );
      markWriteRecorded();
      toast.success(
        currentCodes.includes(studentCode) ? "RSVP cancelled." : "Feast RSVP confirmed!",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update RSVP.");
    }
  };

  const handleDownloadBillSummary = () => {
    exportToPrintablePDF({
      title: `Monthly Mess Bill Summary`,
      institutionName: activeWorkspace?.name || "FoodFlow Sample Dining Hall",
      subtitle: `Student: ${studentName} (${studentCode})`,
      dateRange: todayIST.slice(0, 7),
      summary: [
        { label: "Subscription Fee", value: formatINR(fromPaise(monthlyBill.baseProratedPaise)) },
        {
          label: `Leave Rebate (${approvedLeaveDays}d)`,
          value: `- ${formatINR(fromPaise(monthlyBill.leaveRebatePaise))}`,
        },
        {
          label: `Guest Meals (${totalExtraGuests})`,
          value: `+ ${formatINR(fromPaise(monthlyBill.guestChargesPaise))}`,
        },
        {
          label: "Total Payable (incl. 5% GST)",
          value: formatINR(fromPaise(monthlyBill.totalPayablePaise)),
        },
      ],
      headers: ["Line Item", "Calculation", "Amount (INR)"],
      rows: [
        [
          "Standard Monthly Mess Subscription",
          "30 days active",
          formatINR(fromPaise(monthlyBill.baseProratedPaise)),
        ],
        [
          "Approved Hostel Leave Rebate",
          `${approvedLeaveDays} days @ ${formatINR(fromPaise(perDayRebatePaise))}/day`,
          `- ${formatINR(fromPaise(monthlyBill.leaveRebatePaise))}`,
        ],
        [
          "Guest Meals",
          `${totalExtraGuests} plate(s) @ ${formatINR(fromPaise(guestMealUnitPaise))}`,
          `+ ${formatINR(fromPaise(monthlyBill.guestChargesPaise))}`,
        ],
        [
          "GST (5%)",
          "On net taxable mess charges",
          `+ ${formatINR(fromPaise(monthlyBill.gstPaise))}`,
        ],
        [
          "Total Payable",
          "Integer paise verified",
          formatINR(fromPaise(monthlyBill.totalPayablePaise)),
        ],
      ],
    });
  };

  const copy = UI_COPY[language];
  const initials = studentName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const displayedEvents: CalendarEventDoc[] = useMemo(() => {
    if (isLiveWorkspace) return liveEvents;
    return [
      {
        id: "sample-feast-1",
        workspaceId: "sample",
        eventDate: tomorrowIST,
        title: language === "hi" ? "रविवार विशेष थाली भोज" : "Sunday Special Thali Feast",
        description:
          language === "hi"
            ? "पनीर टिक्का मसाला, दाल मखनी, पुलाव और गुलाब जामुन।"
            : "Paneer Tikka Masala, Dal Makhani, Veg Pulao & Gulab Jamun.",
        attendanceFactor: 1.2,
        rsvpStudentCodes: sampleEventRsvps.includes("sample-feast-1")
          ? [studentCode, "ST-102", "ST-109"]
          : ["ST-102", "ST-109"],
        createdBy: "sample",
      },
    ];
  }, [isLiveWorkspace, language, liveEvents, sampleEventRsvps, studentCode, tomorrowIST]);

  return (
    <div className="min-h-screen bg-[#F5F8FA] pb-24 lg:pb-10">
      <header className="sticky top-0 z-30 border-b border-[#E5EAF0] bg-white px-4 py-3 shadow-xs">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <Link to="/overview" className="shrink-0" title="Back to Mess Operations">
              <BrandMark className="size-9 rounded-xl shadow-xs" />
            </Link>
            <div className="min-w-0">
              <span className="block truncate whitespace-nowrap font-display text-sm font-bold text-[#172B3A]">
                FoodFlow Dining
              </span>
              <span className="block truncate text-[10px] font-semibold text-[#16A36A]">
                {isLiveWorkspace ? `${activeWorkspace?.name} (Live)` : copy.brandSubSample}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {!user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void signInWithGoogle()}
                className="h-8 shrink-0 rounded-full border-[#087E8B]/30 px-2.5 text-[11px] font-bold text-[#087E8B]"
              >
                <LogIn className="mr-1 size-3" />
                <span className="hidden sm:inline">Google Sign-In</span>
                <span className="sm:hidden">Sign In</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void setLanguage(language === "en" ? "hi" : "en")}
              className="h-8 shrink-0 rounded-full border border-[#E5EAF0] px-2.5 text-xs font-bold text-[#172B3A]"
            >
              <Globe className="mr-1 size-3.5 text-[#087E8B]" />
              {language === "en" ? "हिंदी" : "English"}
            </Button>
            <div
              title={studentName}
              className="grid size-8 shrink-0 place-items-center rounded-full bg-[#DDF3EA] text-xs font-bold text-[#087E8B]"
            >
              {initials}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pt-4">
        {!isLiveWorkspace && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl border border-amber-300/60 bg-amber-50 px-3.5 py-2.5 text-[11px] text-[#0F3D3A]">
            <span>
              <strong>Sample preview:</strong> Sign in and join your mess workspace to sync skips,
              QR pass, and bills.
            </span>
            <Link to="/onboarding" className="shrink-0 font-bold text-[#087E8B] underline">
              Join Mess
            </Link>
          </div>
        )}

        {activeBroadcast && (
          <div className="mb-3 flex items-start justify-between gap-2 rounded-2xl border border-[#FF7A1A]/40 bg-[#FFF1C7] px-3.5 py-2.5 text-xs text-[#0F3D3A]">
            <div className="flex items-start gap-2">
              <Megaphone className="mt-0.5 size-4 shrink-0 text-[#FF7A1A]" />
              <div>
                <p className="font-bold">{activeBroadcast.title}</p>
                <p className="text-[11px] opacity-90">{activeBroadcast.detail}</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Dismiss announcement"
              onClick={() => setDismissedBroadcastId(activeBroadcast.id)}
              className="rounded-full p-1 text-[#0F3D3A]/60 hover:bg-black/5 hover:text-[#0F3D3A]"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        <div className="mb-4 grid grid-cols-5 gap-1 rounded-2xl border border-[#E5EAF0] bg-white p-1.5 shadow-xs">
          {(
            [
              { id: "menu", label: copy.tabs.menu, icon: Utensils },
              { id: "pass", label: copy.tabs.pass, icon: QrCode },
              { id: "leave", label: copy.tabs.leave, icon: Calendar },
              { id: "bill", label: copy.tabs.bill, icon: Receipt },
              { id: "support", label: copy.tabs.support, icon: MessageSquareWarning },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-bold transition-all sm:text-[11px] ${
                  active
                    ? "bg-[#087E8B] text-white shadow-xs"
                    : "text-[#718096] hover:bg-[#F5F8FA] hover:text-[#172B3A]"
                }`}
              >
                <Icon className="size-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: MENU + 3-TAP SKIP + TIFFIN + GUEST MEAL + CHECK-IN GATED RATING + FEAST RSVP */}
        {activeTab === "menu" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex rounded-xl bg-[#E5EAF0] p-1">
                <button
                  type="button"
                  onClick={() => setMenuDay("today")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                    menuDay === "today" ? "bg-white text-[#172B3A] shadow-xs" : "text-[#718096]"
                  }`}
                >
                  {copy.today}
                </button>
                <button
                  type="button"
                  onClick={() => setMenuDay("tomorrow")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                    menuDay === "tomorrow" ? "bg-white text-[#172B3A] shadow-xs" : "text-[#718096]"
                  }`}
                >
                  {copy.tomorrow}
                </button>
              </div>
              <Badge className="border-none bg-[#DDF3EA] text-[10px] font-bold text-[#087E8B]">
                {activeDateKey} &bull; IST
              </Badge>
            </div>

            {visibleMeals.map((meal) => {
              const selKey = `${activeDateKey}:${meal.slot}`;
              const current = selectionMap[selKey] ?? {
                status: "booked" as const,
                guestCount: 0,
                tiffinRequested: false,
              };
              const cutoff = canModifyMealSelection(meal.slot, activeDateKey, nowDate);
              const isSkipped = current.status === "skipped";
              const eligibility = checkFeedbackEligibility({
                attendanceRecords: effectiveAttendance,
                existingFeedback: effectiveFeedback,
                userId: user?.uid ?? "sample-student",
                studentCode,
                serviceDate: activeDateKey,
                mealType: meal.slot,
                nowMs,
              });

              return (
                <div
                  key={meal.slot}
                  className={`overflow-hidden rounded-3xl border p-5 shadow-xs transition-all ${
                    isSkipped
                      ? "border-amber-200 bg-amber-50/40"
                      : "border-[#E5EAF0] bg-white hover:shadow-sm"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5EAF0] pb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2.5 rounded-full ${
                          isSkipped ? "bg-amber-500" : "bg-[#16A36A]"
                        }`}
                      />
                      <h3 className="font-display text-base font-bold text-[#172B3A]">
                        {language === "hi" ? meal.typeHi : meal.typeEn}
                      </h3>
                      {isSkipped && (
                        <Badge className="border-none bg-amber-100 text-[10px] font-bold text-amber-800">
                          {copy.skipped}
                        </Badge>
                      )}
                      {current.tiffinRequested && !isSkipped && (
                        <Badge className="border-none bg-[#DDF3EA] text-[10px] font-bold text-[#087E8B]">
                          Tiffin Tray
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#718096]">
                      <Clock className="size-3.5 text-[#087E8B]" />
                      {meal.timing}
                    </div>
                  </div>

                  <div className="py-3">
                    {meal.items.length > 0 ? (
                      <ul className="space-y-1.5">
                        {meal.items.map((item, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-2 text-xs font-medium text-[#172B3A]"
                          >
                            <span className="size-1 rounded-full bg-[#FF7A1A]" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-[#718096]">
                        Menu dishes not published for this date yet — you can still skip or request
                        a tiffin before cut-off.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#F5F8FA] p-2.5 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        disabled={!cutoff.allowed}
                        variant={isSkipped ? "default" : "outline"}
                        onClick={() =>
                          void updateMealSelection(
                            meal.slot,
                            isSkipped ? "booked" : "skipped",
                            isSkipped ? current.guestCount : 0,
                            false,
                          )
                        }
                        className={`h-8 rounded-full px-3 text-[11px] font-bold ${
                          isSkipped
                            ? "bg-amber-600 text-white hover:bg-amber-700"
                            : "border-[#E5EAF0] bg-white text-[#172B3A]"
                        }`}
                      >
                        {!cutoff.allowed ? (
                          <>
                            <Lock className="mr-1 size-3" />
                            {copy.locked}
                          </>
                        ) : isSkipped ? (
                          <>
                            <CheckCircle2 className="mr-1 size-3" />
                            Re-book
                          </>
                        ) : (
                          copy.skipMeal
                        )}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        disabled={!cutoff.allowed || isSkipped}
                        variant={current.tiffinRequested ? "default" : "outline"}
                        onClick={() =>
                          void updateMealSelection(
                            meal.slot,
                            "booked",
                            current.guestCount,
                            !current.tiffinRequested,
                          )
                        }
                        className={`h-8 rounded-full px-2.5 text-[11px] font-semibold ${
                          current.tiffinRequested ? "bg-[#087E8B] text-white" : "bg-white"
                        }`}
                      >
                        <PackageCheck className="mr-1 size-3" />
                        {copy.tiffinLabel}
                      </Button>

                      <span className="text-[10px] text-[#718096]">
                        Cut-off: {meal.cutoffLabel || cutoff.cutoffIstLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <UserPlus className="size-3.5 text-[#087E8B]" />
                      <span className="text-[11px] font-semibold text-[#172B3A]">
                        {copy.guestLabel}:
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove guest from ${meal.typeEn}`}
                        disabled={!cutoff.allowed || isSkipped || current.guestCount <= 0}
                        onClick={() =>
                          void updateMealSelection(
                            meal.slot,
                            "booked",
                            current.guestCount - 1,
                            current.tiffinRequested,
                          )
                        }
                        className="grid size-6 place-items-center rounded-full border border-[#E5EAF0] bg-white text-[#172B3A] disabled:opacity-40"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="w-4 text-center font-mono text-xs font-bold">
                        {current.guestCount}
                      </span>
                      <button
                        type="button"
                        aria-label={`Add guest to ${meal.typeEn}`}
                        disabled={!cutoff.allowed || isSkipped || current.guestCount >= 5}
                        onClick={() =>
                          void updateMealSelection(
                            meal.slot,
                            "booked",
                            current.guestCount + 1,
                            current.tiffinRequested,
                          )
                        }
                        className="grid size-6 place-items-center rounded-full border border-[#E5EAF0] bg-white text-[#172B3A] disabled:opacity-40"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E5EAF0] pt-3 text-[11px]">
                    <div className="flex flex-wrap items-center gap-2 text-[#718096]">
                      {meal.plateCostPaise ? (
                        <span className="font-semibold text-[#087E8B]">
                          ₹{Math.round(meal.plateCostPaise / 100)}/plate
                        </span>
                      ) : null}
                      {meal.calories && <span>{meal.calories}</span>}
                      {meal.allergens && meal.allergens.length > 0 && (
                        <span>Allergens: {meal.allergens.join(", ")}</span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRatingMeal(ratingMeal === meal.slot ? null : meal.slot)}
                      className="h-7 rounded-full border-[#087E8B] text-[11px] font-bold text-[#087E8B] hover:bg-[#DDF3EA]"
                    >
                      <Star className="mr-1 size-3 fill-amber-400 text-amber-400" />
                      {copy.rateMeal}
                    </Button>
                  </div>

                  {ratingMeal === meal.slot && (
                    <div className="mt-4 space-y-3 rounded-2xl border border-[#E5EAF0] bg-[#F5F8FA] p-3.5">
                      {!eligibility.eligible ? (
                        <div className="space-y-2.5 text-xs">
                          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[#0F3D3A]">
                            <Lock className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                            <span>
                              {language === "hi" ? eligibility.messageHi : eligibility.messageEn}
                            </span>
                          </div>
                          {!isLiveWorkspace && eligibility.reasonCode === "not_checked_in" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px]"
                              onClick={() => {
                                setSampleCheckIns((prev) => ({
                                  ...prev,
                                  [selKey]: new Date().toISOString(),
                                }));
                                toast.success(
                                  "Sample QR check-in recorded — 1-tap rating unlocked!",
                                );
                              }}
                            >
                              Simulate QR Check-In (Sample Preview)
                            </Button>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-xs font-bold text-[#172B3A]">
                            <span>Rate {meal.typeEn} (Check-in Verified)</span>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setSelectedStars(star)}
                                  className="text-amber-400 transition-transform hover:scale-110"
                                >
                                  <Star
                                    className={`size-4 ${
                                      star <= selectedStars
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-gray-300"
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {FEEDBACK_TAGS.map((tag) => {
                              const active = selectedTags.includes(tag);
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => toggleFeedbackTag(tag)}
                                  className={`rounded-lg border px-2 py-0.5 text-[10px] font-semibold capitalize ${
                                    active
                                      ? "border-[#087E8B] bg-[#DDF3EA] text-[#087E8B]"
                                      : "border-[#E5EAF0] bg-white text-[#718096]"
                                  }`}
                                >
                                  #{tag}
                                </button>
                              );
                            })}
                          </div>

                          {meal.items.length > 0 && (
                            <Select
                              value={ratedDish || "__none__"}
                              onValueChange={(v) => setRatedDish(v === "__none__" ? "" : v)}
                            >
                              <SelectTrigger className="h-8 bg-white text-xs">
                                <SelectValue placeholder="Optional: tag specific dish..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Entire meal thali</SelectItem>
                                {meal.items.map((item) => (
                                  <SelectItem key={item} value={item}>
                                    {item}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          <Textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Was the food hot, fresh, and tasty? Any suggestions for chef?"
                            className="rounded-xl bg-white text-xs"
                            rows={2}
                          />

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-[#718096]">
                              <input
                                type="checkbox"
                                checked={isAnonymous}
                                onChange={(e) => setIsAnonymous(e.target.checked)}
                                className="size-3.5 accent-[#087E8B]"
                              />
                              Post anonymously
                            </label>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRatingMeal(null)}
                                className="h-7 text-xs font-bold"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                disabled={savingFeedback}
                                onClick={() => void handleRateSubmit(meal)}
                                className="h-7 rounded-full bg-[#087E8B] text-xs font-bold text-white"
                              >
                                {savingFeedback ? "Saving..." : "Submit Feedback"}
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {displayedEvents.length > 0 && (
              <div className="space-y-3 rounded-3xl border border-[#E5EAF0] bg-white p-5 shadow-xs">
                <h3 className="flex items-center gap-2 font-display text-sm font-bold text-[#172B3A]">
                  <Sparkles className="size-4 text-[#FF7A1A]" />
                  {copy.feastTitle}
                </h3>
                <div className="space-y-2.5">
                  {displayedEvents.slice(0, 4).map((ev) => {
                    const rsvps = ev.rsvpStudentCodes ?? [];
                    const hasRsvp = rsvps.includes(studentCode);
                    return (
                      <div
                        key={ev.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-3 text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#172B3A]">{ev.title}</p>
                          <p className="text-[11px] text-[#718096]">
                            {ev.eventDate} &bull; {rsvps.length} attending
                          </p>
                          {ev.description && (
                            <p className="mt-0.5 text-[11px] text-[#475569]">{ev.description}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant={hasRsvp ? "default" : "outline"}
                          className={
                            hasRsvp
                              ? "h-8 rounded-full bg-[#087E8B] text-[11px] font-bold text-white"
                              : "h-8 rounded-full border-[#087E8B] text-[11px] font-bold text-[#087E8B]"
                          }
                          onClick={() => void handleFeastRsvp(ev.id, rsvps)}
                        >
                          {hasRsvp ? copy.feastRsvped : copy.feastRsvp}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ROTATING 60s QR DINING PASS */}
        {activeTab === "pass" && (
          <div className="space-y-4 text-center">
            <div className="space-y-5 rounded-3xl border border-[#E5EAF0] bg-white p-6 shadow-sm sm:p-8">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#DDF3EA] px-3.5 py-1 text-xs font-bold text-[#087E8B]">
                <Sparkles className="size-3.5 text-[#16A36A]" /> {copy.qrBadge}
              </div>

              <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-[#087E8B] text-white shadow-lg shadow-[#087E8B]/20">
                <User className="size-10" />
              </div>

              <div>
                <h2 className="font-display text-xl font-bold text-[#172B3A]">{studentName}</h2>
                <p className="font-mono text-xs font-semibold text-[#718096]">
                  ID: {studentCode} &bull; {activeWorkspace?.name || "Sample Dining Hall"}
                </p>
              </div>

              <div className="mx-auto flex max-w-[240px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#087E8B] bg-[#F5F8FA] p-6 shadow-inner">
                <QrCode className="size-40 text-[#172B3A]" />
                <span className="mt-3 font-mono text-xs font-bold tracking-widest text-[#087E8B]">
                  {dynamicPass.token}
                </span>
              </div>

              <div className="rounded-2xl bg-[#FFF1C7] p-3 text-xs font-semibold text-[#0F3D3A]">
                Token rotates in{" "}
                <span className="font-mono font-bold">
                  00:{String(dynamicPass.expiresInSeconds).padStart(2, "0")}
                </span>{" "}
                sec to prevent screenshot sharing
              </div>

              <p className="text-[11px] text-[#718096]">{copy.qrHint}</p>
            </div>
          </div>
        )}

        {/* TAB 3: LEAVE / REBATE REQUEST */}
        {activeTab === "leave" && (
          <div className="space-y-5 rounded-3xl border border-[#E5EAF0] bg-white p-6 shadow-sm">
            <div className="space-y-1">
              <h2 className="font-display text-lg font-bold text-[#172B3A]">{copy.leaveTitle}</h2>
              <p className="text-xs text-[#718096]">
                Rebate of {formatINR(fromPaise(perDayRebatePaise))}/day applies when approved leave
                is <strong>&ge; {minRebateDays} consecutive days</strong>.
              </p>
            </div>

            <form onSubmit={(e) => void handleLeaveSubmit(e)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#172B3A]">Start Date</Label>
                  <Input
                    type="date"
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    className="h-10 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#172B3A]">End Date</Label>
                  <Input
                    type="date"
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    className="h-10 rounded-xl"
                    required
                  />
                </div>
              </div>

              {leaveRebatePreview && (
                <div
                  className={`rounded-xl border p-3 text-xs font-medium ${
                    leaveRebatePreview.rebateEligible
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-amber-200 bg-amber-50 text-amber-900"
                  }`}
                >
                  {language === "hi" ? leaveRebatePreview.noteHi : leaveRebatePreview.noteEn}
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#172B3A]">Reason for Absence</Label>
                <Input
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="e.g. Home visit / Academic conference / Medical"
                  className="h-10 rounded-xl"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={savingLeave}
                className="h-11 w-full rounded-full bg-[#087E8B] text-xs font-bold text-white hover:bg-[#07545B]"
              >
                {savingLeave ? "Submitting..." : copy.submitLeave}
              </Button>
            </form>

            {isLiveWorkspace && (
              <div className="space-y-2 border-t border-[#E5EAF0] pt-4">
                <p className="text-xs font-bold text-[#172B3A]">
                  Your leave history ({liveLeaves.length})
                </p>
                {liveLeaves.length === 0 ? (
                  <p className="text-xs text-[#718096]">No leave requests submitted yet.</p>
                ) : (
                  liveLeaves.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between rounded-xl border border-[#E5EAF0] p-2.5 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-[#172B3A]">
                          {l.startDate} to {l.endDate} ({l.days}d)
                        </p>
                        <p className="text-[11px] text-[#718096]">{l.reason}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {l.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PAISE-ACCURATE ITEMISED MONTHLY BILL */}
        {activeTab === "bill" && (
          <div className="space-y-5 rounded-3xl border border-[#E5EAF0] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-[#172B3A]">{copy.billTitle}</h2>
                <span className="text-xs text-[#718096]">
                  Student: {studentName} ({studentCode})
                </span>
              </div>
              <Badge className="bg-[#DDF3EA] font-bold text-[#16A36A]">Integer Paise Ledger</Badge>
            </div>

            {isLiveWorkspace && liveInvoices.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-[#172B3A]">Issued Invoices</p>
                {liveInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] p-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold">{inv.monthKey}</p>
                      <p className="text-[11px] text-[#718096]">
                        Paid {formatINR(fromPaise(inv.paidPaise))} of{" "}
                        {formatINR(fromPaise(inv.totalPayablePaise))}
                      </p>
                    </div>
                    <Badge className="capitalize">{inv.status}</Badge>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-[#F5F8FA] py-1">
                <span className="text-[#718096]">Standard Monthly Subscription (30 days):</span>
                <span className="font-semibold text-[#172B3A]">
                  {formatINR(fromPaise(monthlyBill.baseProratedPaise))}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#F5F8FA] py-1">
                <span className="text-[#718096]">
                  Approved Leave Rebate ({approvedLeaveDays} days @{" "}
                  {formatINR(fromPaise(perDayRebatePaise))}):
                </span>
                <span className="font-semibold text-[#16A36A]">
                  - {formatINR(fromPaise(monthlyBill.leaveRebatePaise))}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#F5F8FA] py-1">
                <span className="text-[#718096]">
                  Extra Guest Meals ({totalExtraGuests} @ {formatINR(fromPaise(guestMealUnitPaise))}
                  ):
                </span>
                <span className="font-semibold text-[#172B3A]">
                  + {formatINR(fromPaise(monthlyBill.guestChargesPaise))}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#F5F8FA] py-1">
                <span className="text-[#718096]">GST (5%):</span>
                <span className="font-semibold text-[#172B3A]">
                  + {formatINR(fromPaise(monthlyBill.gstPaise))}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#E5EAF0] py-2 text-sm font-bold text-[#172B3A]">
                <span>Estimated Payable Amount:</span>
                <span className="font-display text-base text-[#087E8B]">
                  {formatINR(fromPaise(monthlyBill.totalPayablePaise))}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleDownloadBillSummary}
              className="h-11 w-full rounded-full border-[#087E8B] text-xs font-bold text-[#087E8B] hover:bg-[#DDF3EA]"
            >
              <Download className="mr-2 size-4" /> {copy.downloadBill}
            </Button>
          </div>
        )}

        {/* TAB 5: SUPPORT / COMPLAINT TICKETS WITH PHOTO & SLA */}
        {activeTab === "support" && (
          <div className="space-y-4">
            <form
              onSubmit={(e) => void handleComplaintSubmit(e)}
              className="space-y-4 rounded-3xl border border-[#E5EAF0] bg-white p-6 shadow-sm"
            >
              <div>
                <h2 className="font-display text-lg font-bold text-[#172B3A]">
                  {copy.supportTitle}
                </h2>
                <p className="mt-0.5 text-xs text-[#718096]">
                  Tickets are tracked with live SLA timers (4h High / 24h Medium / 48h Low).
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Select value={compCategory} onValueChange={setCompCategory}>
                  <SelectTrigger className="h-10 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Hygiene", "Quality", "Billing", "Timing", "Staff"].map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={compPriority}
                  onValueChange={(v) => setCompPriority(v as ComplaintDoc["priority"])}
                >
                  <SelectTrigger className="h-10 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Priority (48h SLA)</SelectItem>
                    <SelectItem value="medium">Medium Priority (24h SLA)</SelectItem>
                    <SelectItem value="high">High Priority (4h SLA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {compCategory === "Hygiene" && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] font-medium text-amber-900">
                  <ShieldAlert className="size-4 shrink-0 text-amber-600" />
                  Hygiene tickets auto-escalate to Admin & Warden with a 4-hour SLA.
                </div>
              )}

              <Input
                value={compSubject}
                onChange={(e) => setCompSubject(e.target.value)}
                placeholder="Short summary (e.g. Dining Hall B plate sanitation)"
                className="h-10 rounded-xl text-xs"
                required
              />

              <Textarea
                value={compDescription}
                onChange={(e) => setCompDescription(e.target.value)}
                placeholder="Describe counter number, meal slot, and details..."
                className="rounded-xl text-xs"
                rows={3}
                required
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#E5EAF0] px-3 py-1.5 text-[11px] font-semibold text-[#172B3A] hover:bg-[#F5F8FA]">
                    <Camera className="size-3.5 text-[#087E8B]" />
                    {compressingPhoto ? "Compressing..." : "Attach Photo (< 90 KB)"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => void handleComplaintPhoto(e)}
                    />
                  </label>
                  {compPhotoDataUrl && (
                    <div className="flex items-center gap-1.5">
                      <img
                        src={compPhotoDataUrl}
                        alt="Attachment"
                        className="size-8 rounded-md border object-cover"
                      />
                      <button
                        type="button"
                        aria-label="Remove photo"
                        onClick={() => setCompPhotoDataUrl(undefined)}
                        className="rounded-full bg-[#F5F8FA] p-1 text-[#718096]"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={savingComplaint || compressingPhoto}
                  className="h-10 rounded-full bg-[#FF7A1A] px-5 text-xs font-bold text-[#0F3D3A] hover:bg-[#e56e17]"
                >
                  {savingComplaint ? "Submitting..." : copy.submitComplaint}
                </Button>
              </div>
            </form>

            <div className="space-y-2.5 rounded-3xl border border-[#E5EAF0] bg-white p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#718096]">
                Your Ticket History ({effectiveComplaints.length})
              </h3>
              {effectiveComplaints.length === 0 ? (
                <p className="py-4 text-center text-xs text-[#718096]">No complaints filed yet.</p>
              ) : (
                effectiveComplaints.map((c) => {
                  const sla = formatSlaRemaining(c.slaDeadlineAt, c.status, nowMs);
                  return (
                    <div
                      key={c.id}
                      className="space-y-1.5 rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-3.5 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold text-[#172B3A]">
                          {c.subject}{" "}
                          <span className="font-normal text-[#718096]">({c.category})</span>
                        </p>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {c.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-[#475569]">{c.description}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            sla.tone === "red"
                              ? "border-rose-300 bg-rose-50 text-rose-700"
                              : sla.tone === "amber"
                                ? "border-amber-300 bg-amber-50 text-amber-800"
                                : "border-emerald-300 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          <Clock3 className="mr-1 size-2.5" />
                          {sla.label}
                        </Badge>
                        {c.escalatedToRoles && c.escalatedToRoles.length > 0 && (
                          <Badge
                            variant="outline"
                            className="border-rose-300 bg-rose-50 text-[10px] text-rose-700"
                          >
                            <AlertTriangle className="mr-1 size-2.5" />
                            Escalated: {c.escalatedToRoles.join(", ")}
                          </Badge>
                        )}
                      </div>
                      {c.photoDataUrl && (
                        <img
                          src={c.photoDataUrl}
                          alt={`Evidence for ${c.subject}`}
                          className="mt-1 h-16 w-24 rounded-lg border object-cover"
                        />
                      )}
                      {c.resolutionNote && (
                        <p className="text-[11px] font-semibold text-emerald-700">
                          Resolution: {c.resolutionNote}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

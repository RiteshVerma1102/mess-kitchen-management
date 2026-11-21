import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Flame,
  ForkKnife,
  Globe,
  Heart,
  Moon,
  QrCode,
  Receipt,
  RotateCw,
  Send,
  Sparkles,
  Star,
  Sun,
  User,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { foodFlowHead } from "@/lib/foodflow-route-head";
import { formatINR } from "@/lib/formatters";

export const Route = createFileRoute("/student")({
  head: () =>
    foodFlowHead(
      "Student Dining Portal | FoodFlow",
      "Check daily mess menus, display your personal QR dining pass, rate meals, and submit leave skips."
    ),
  component: StudentPortalPage,
});

type Tab = "menu" | "pass" | "leave" | "bill";

export function StudentPortalPage() {
  const [activeTab, setActiveTab] = useState<Tab>("menu");
  const [menuDay, setMenuDay] = useState<"today" | "tomorrow">("today");
  const [language, setLanguage] = useState<"en" | "hi">("en");

  // Rating State
  const [ratingMeal, setRatingMeal] = useState<string | null>(null);
  const [selectedStars, setSelectedStars] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");

  // Leave State
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  const handleRateSubmit = (mealName: string) => {
    toast.success(`Thank you! Your ${selectedStars}-star rating for ${mealName} has been submitted.`);
    setRatingMeal(null);
    setFeedbackText("");
  };

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd) {
      toast.error("Please select both start and end dates.");
      return;
    }
    toast.success("Mess leave request submitted to manager for approval. Rebate will apply upon confirmation.");
    setLeaveStart("");
    setLeaveEnd("");
    setLeaveReason("");
  };

  const sampleMeals = [
    {
      type: "Breakfast",
      timing: "07:30 - 09:30 AM",
      items: ["Aloo Paratha with Curd", "Poha with Roasted Peanuts", "Boiled Eggs (Optional)", "Masala Chai / Fresh Milk"],
      diet: "veg",
      calories: "450 kcal",
      allergens: ["Gluten", "Dairy"],
    },
    {
      type: "Lunch",
      timing: "12:30 - 02:30 PM",
      items: ["Paneer Butter Masala", "Dal Tadka", "Steamed Basmati Rice", "Tawa Butter Roti", "Mixed Green Salad & Boondi Raita"],
      diet: "veg",
      calories: "720 kcal",
      allergens: ["Dairy"],
    },
    {
      type: "Evening Snacks",
      timing: "05:00 - 06:30 PM",
      items: ["Hot Veg Samosa with Mint Chutney", "Ginger Cardamom Chai"],
      diet: "veg",
      calories: "280 kcal",
      allergens: ["Gluten"],
    },
    {
      type: "Dinner",
      timing: "08:00 - 10:00 PM",
      items: ["Rajma Masala (Slow Cooked)", "Jeera Rice", "Phulka Roti (Fresh)", "Gulab Jamun (1 pc)", "Cucumber Salad"],
      diet: "veg",
      calories: "680 kcal",
      allergens: ["Dairy"],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F8FA] pb-24 lg:pb-10">
      {/* Student Top Header */}
      <header className="sticky top-0 z-30 border-b border-[#E5EAF0] bg-white px-4 py-3 shadow-xs">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-[#087E8B] text-white">
              <ForkKnife className="size-4" />
            </div>
            <div>
              <span className="font-display text-sm font-bold text-[#172B3A]">
                SmartMess Dining
              </span>
              <span className="block text-[10px] font-semibold text-[#16A36A]">
                ● North Dining Hall (Active)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === "en" ? "hi" : "en")}
              className="h-8 rounded-full border border-[#E5EAF0] px-2.5 text-xs font-bold text-[#172B3A]"
            >
              <Globe className="mr-1 size-3.5 text-[#087E8B]" />
              {language === "en" ? "हिंदी" : "English"}
            </Button>
            <div className="grid size-8 place-items-center rounded-full bg-[#DDF3EA] text-xs font-bold text-[#087E8B]">
              RS
            </div>
          </div>
        </div>
      </header>

      {/* Main Student Card Content */}
      <main className="mx-auto max-w-xl px-4 pt-4">
        {/* Navigation Tabs (Top pill bar) */}
        <div className="mb-4 grid grid-cols-4 gap-1.5 rounded-2xl bg-white p-1.5 border border-[#E5EAF0] shadow-xs">
          {(
            [
              { id: "menu", label: "Menu", icon: Utensils },
              { id: "pass", label: "QR Pass", icon: QrCode },
              { id: "leave", label: "Leave", icon: Calendar },
              { id: "bill", label: "Mess Bill", icon: Receipt },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-bold transition-all ${
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

        {/* TAB 1: MENU */}
        {activeTab === "menu" && (
          <div className="space-y-4">
            {/* Day Switcher */}
            <div className="flex items-center justify-between">
              <div className="flex rounded-xl bg-[#E5EAF0] p-1">
                <button
                  onClick={() => setMenuDay("today")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                    menuDay === "today" ? "bg-white text-[#172B3A] shadow-xs" : "text-[#718096]"
                  }`}
                >
                  Today's Meals
                </button>
                <button
                  onClick={() => setMenuDay("tomorrow")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                    menuDay === "tomorrow" ? "bg-white text-[#172B3A] shadow-xs" : "text-[#718096]"
                  }`}
                >
                  Tomorrow
                </button>
              </div>
              <Badge className="bg-[#DDF3EA] text-[#087E8B] border-none text-[10px] font-bold">
                100% Nutri-Balanced
              </Badge>
            </div>

            {/* Meal Cards */}
            {sampleMeals.map((meal) => (
              <div
                key={meal.type}
                className="overflow-hidden rounded-3xl border border-[#E5EAF0] bg-white p-5 shadow-xs transition-all hover:shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-3 items-center justify-center rounded-full bg-[#16A36A]/20">
                      <span className="size-1.5 rounded-full bg-[#16A36A]" />
                    </span>
                    <h3 className="font-display text-base font-bold text-[#172B3A]">{meal.type}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#718096]">
                    <Clock className="size-3.5 text-[#087E8B]" />
                    {meal.timing}
                  </div>
                </div>

                <div className="py-3">
                  <ul className="space-y-1.5">
                    {meal.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs font-medium text-[#172B3A]">
                        <span className="size-1 rounded-full bg-[#FF7A1A]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E5EAF0] pt-3 text-[11px]">
                  <div className="flex items-center gap-2 text-[#718096]">
                    <span>{meal.calories}</span>
                    <span>&bull;</span>
                    <span>Allergens: {meal.allergens.join(", ")}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRatingMeal(meal.type)}
                    className="h-7 rounded-full border-[#087E8B] text-[11px] font-bold text-[#087E8B] hover:bg-[#DDF3EA]"
                  >
                    <Star className="mr-1 size-3 fill-amber-400 text-amber-400" />
                    Rate Meal
                  </Button>
                </div>

                {/* Rating Input Modal/Drawer */}
                {ratingMeal === meal.type && (
                  <div className="mt-4 rounded-2xl bg-[#F5F8FA] p-3.5 border border-[#E5EAF0] space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-[#172B3A]">
                      <span>Rate {meal.type}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setSelectedStars(star)}
                            className="text-amber-400 hover:scale-110 transition-transform"
                          >
                            <Star
                              className={`size-4 ${
                                star <= selectedStars ? "fill-amber-400 text-amber-400" : "text-gray-300"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <Textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Was the food hot, fresh, and tasty? Any suggestions for chef?"
                      className="text-xs bg-white rounded-xl"
                      rows={2}
                    />
                    <div className="flex justify-end gap-2">
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
                        onClick={() => handleRateSubmit(meal.type)}
                        className="h-7 rounded-full bg-[#087E8B] text-xs font-bold text-white"
                      >
                        Submit Feedback
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: QR DINING PASS */}
        {activeTab === "pass" && (
          <div className="space-y-4 text-center">
            <div className="rounded-3xl border border-[#E5EAF0] bg-white p-6 shadow-sm sm:p-8 space-y-5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#DDF3EA] px-3.5 py-1 text-xs font-bold text-[#087E8B]">
                <Sparkles className="size-3.5 text-[#16A36A]" /> Active Digital Dining Pass
              </div>

              <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-[#087E8B] text-white shadow-lg shadow-[#087E8B]/20">
                <User className="size-10" />
              </div>

              <div>
                <h2 className="font-display text-xl font-bold text-[#172B3A]">
                  Rahul Sharma
                </h2>
                <p className="text-xs font-mono font-semibold text-[#718096]">
                  Roll: 21CS042 &bull; Hall: North Dining Hall
                </p>
              </div>

              {/* QR Code Container */}
              <div className="mx-auto flex max-w-[240px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#087E8B] bg-[#F5F8FA] p-6 shadow-inner">
                <QrCode className="size-44 text-[#172B3A]" />
                <span className="mt-3 font-mono text-xs font-bold tracking-widest text-[#087E8B]">
                  FF-8942-RS-2026
                </span>
              </div>

              <div className="rounded-2xl bg-[#FFF1C7] p-3 text-xs font-semibold text-[#0F3D3A]">
                ⏱ Token automatically refreshes in <span className="font-mono font-bold">04:12</span> min for security
              </div>

              <p className="text-[11px] text-[#718096]">
                Hold this QR code steady in front of the dining hall kiosk scanner to log attendance.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: LEAVE / SKIP MEAL */}
        {activeTab === "leave" && (
          <div className="rounded-3xl border border-[#E5EAF0] bg-white p-6 shadow-sm space-y-5">
            <div className="space-y-1">
              <h2 className="font-display text-lg font-bold text-[#172B3A]">
                Mess Leave & Meal Skip Request
              </h2>
              <p className="text-xs text-[#718096]">
                Submitting a leave notice 12 hours in advance automatically credits ₹85/day mess rebate to your monthly bill.
              </p>
            </div>

            <form onSubmit={handleLeaveSubmit} className="space-y-4">
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

              <div className="rounded-2xl bg-[#DDF3EA] p-3 text-xs font-medium text-[#087E8B]">
                ✓ AI forecast updates automatically to reduce overcooked portions when leaves are confirmed.
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-full bg-[#087E8B] text-xs font-bold text-white hover:bg-[#07545B]"
              >
                Submit Leave Notice
              </Button>
            </form>
          </div>
        )}

        {/* TAB 4: MONTHLY BILL */}
        {activeTab === "bill" && (
          <div className="rounded-3xl border border-[#E5EAF0] bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-[#172B3A]">
                  Mess Bill &mdash; November 2026
                </h2>
                <span className="text-xs text-[#718096]">Student: Rahul Sharma (21CS042)</span>
              </div>
              <Badge className="bg-[#DDF3EA] text-[#16A36A] font-bold">
                Generated
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-[#F5F8FA]">
                <span className="text-[#718096]">Standard Monthly Subscription (30 days):</span>
                <span className="font-semibold text-[#172B3A]">{formatINR(4200)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F5F8FA]">
                <span className="text-[#718096]">Approved Leave Rebate (4 days @ ₹85):</span>
                <span className="font-semibold text-[#16A36A]">- {formatINR(340)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F5F8FA]">
                <span className="text-[#718096]">Extra Guest Meals Logged (2):</span>
                <span className="font-semibold text-[#172B3A]">+ {formatINR(180)}</span>
              </div>
              <div className="flex justify-between py-2 text-sm font-bold border-t border-[#E5EAF0] text-[#172B3A]">
                <span>Total Payable Amount:</span>
                <span className="text-[#087E8B] font-display text-base">{formatINR(4040)}</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => toast.success("Downloading official monthly bill receipt PDF...")}
              className="w-full h-11 rounded-full border-[#087E8B] text-xs font-bold text-[#087E8B] hover:bg-[#DDF3EA]"
            >
              <Download className="mr-2 size-4" /> Download Official Receipt (PDF)
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

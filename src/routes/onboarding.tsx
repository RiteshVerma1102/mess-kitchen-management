import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ChefHat,
  LoaderCircle,
  ShieldCheck,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/features/marketing/brand";
import { toast } from "sonner";

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
import { foodFlowHead } from "@/lib/foodflow-route-head";
import { useFirebaseAuth } from "@/components/firebase-provider";
import { claimInviteByCodeAtomic, createWorkspaceAtomic } from "@/lib/workspace-firestore";
import type { WorkspaceRole } from "@/lib/domain/workspace-types";

export const Route = createFileRoute("/onboarding")({
  head: () =>
    foodFlowHead(
      "Get Started | FoodFlow Onboarding",
      "Set up your institutional kitchen or join an existing dining hall on FoodFlow.",
    ),
  component: OnboardingPage,
});

type OnboardingPath = "select" | "manager" | "joiner";

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, language, refreshWorkspaceContext } = useFirebaseAuth();

  const [path, setPath] = useState<OnboardingPath>("select");
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Path 1: Manager Wizard Data
  const [instName, setInstName] = useState("");
  const [instType, setInstType] = useState("College Hostel");
  const [cityState, setCityState] = useState("New Delhi");
  const [halls, setHalls] = useState([{ name: "Main Dining Hall", capacity: 350 }]);
  const [mealTimings, setMealTimings] = useState({
    breakfast: "07:30 - 09:30",
    lunch: "12:15 - 14:15",
    snacks: "16:30 - 17:45",
    dinner: "19:30 - 21:30",
  });
  const [monthlyFeeRupees, setMonthlyFeeRupees] = useState("4200");
  const [perDayRebateRupees, setPerDayRebateRupees] = useState("85");
  const [defaultPlates, setDefaultPlates] = useState("350");
  const [wasteTarget, setWasteTarget] = useState("5");
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("kitchen_head");

  // Path 2: Joiner Data
  const [joinCode, setJoinCode] = useState("");
  const [studentCode, setStudentCode] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || !user.emailVerified)) {
      void navigate({ to: "/login", search: { redirect: "/onboarding" } });
    }
  }, [authLoading, user, navigate]);

  const handleCreateWorkspace = async () => {
    if (!user) {
      void navigate({ to: "/login" });
      return;
    }
    if (!instName.trim()) {
      toast.error("Please enter your institution or mess name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedInvites = inviteEmails
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes("@"))
        .map((email) => ({ email, role: inviteRole }));

      const result = await createWorkspaceAtomic(user, {
        name: instName.trim(),
        institutionType: instType,
        cityState: cityState.trim() || "India",
        language,
        monthlyFeeRupees: Number(monthlyFeeRupees) || 4200,
        perDayRebateRupees: Number(perDayRebateRupees) || 85,
        guestMealRupees: 90,
        wasteTargetPct: Number(wasteTarget) || 5,
        dailyPlatesEstimate: Number(defaultPlates) || 0,
        halls: halls.filter((h) => h.name.trim()),
        mealSlots: [
          {
            slot: "breakfast",
            label: "Breakfast",
            timing: mealTimings.breakfast,
            cutoffIst: "21:30 prev day",
            enabled: true,
          },
          {
            slot: "lunch",
            label: "Lunch",
            timing: mealTimings.lunch,
            cutoffIst: "09:30 same day",
            enabled: true,
          },
          {
            slot: "snacks",
            label: "Evening Snacks",
            timing: mealTimings.snacks,
            cutoffIst: "13:30 same day",
            enabled: true,
          },
          {
            slot: "dinner",
            label: "Dinner",
            timing: mealTimings.dinner,
            cutoffIst: "16:30 same day",
            enabled: true,
          },
        ],
        initialInvites: parsedInvites,
      });

      await refreshWorkspaceContext();
      toast.success(
        `Workspace created! You are Admin.${result.inviteCodes.length ? ` Created ${result.inviteCodes.length} invite(s).` : ""}`,
      );
      void navigate({ to: "/overview" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to initialize workspace.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinWithCode = async () => {
    if (!user) {
      void navigate({ to: "/login" });
      return;
    }
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) {
      toast.error("Please enter your mess invite code.");
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedStudent = studentCode.trim();
      const joined = await claimInviteByCodeAtomic(
        user,
        cleanCode,
        trimmedStudent ? { studentCode: trimmedStudent } : undefined,
      );
      await refreshWorkspaceContext();
      toast.success(`Joined ${joined.workspaceName} as ${joined.role}!`);
      void navigate({ to: joined.role === "student" ? "/student" : "/overview" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid or expired join code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F8FA]">
        <LoaderCircle className="size-8 animate-spin text-[#087E8B]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F8FA]">
      <header className="border-b border-[#E5EAF0] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo />
            <span className="rounded-full bg-[#DDF3EA] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#087E8B]">
              Live Workspace Setup
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#718096]">
            <ShieldCheck className="size-4 text-[#16A36A]" />
            Firestore Multi-Tenant Isolated
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center p-6 sm:p-10">
        {path === "select" && (
          <div className="w-full space-y-8 text-center">
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#172B3A] sm:text-4xl">
                How will you use FoodFlow?
              </h1>
              <p className="text-sm text-[#718096]">
                Signed in as <span className="font-semibold text-[#172B3A]">{user.email}</span>.
                Create a new live mess workspace or claim an invite code.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPath("manager")}
                className="group relative flex flex-col items-start rounded-3xl border-2 border-[#E5EAF0] bg-white p-7 text-left shadow-sm transition-all hover:border-[#087E8B] hover:shadow-md"
              >
                <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-[#DDF3EA] text-[#087E8B] transition-transform group-hover:scale-110">
                  <ChefHat className="size-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-[#172B3A]">
                  Create a new mess workspace
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#718096]">
                  Become workspace Admin in Firestore, configure dining halls, meal cut-off windows,
                  monthly fees, and invite your kitchen & hostel team.
                </p>
                <div className="mt-6 flex items-center gap-2 text-xs font-bold text-[#087E8B]">
                  Configure New Workspace{" "}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPath("joiner")}
                className="group relative flex flex-col items-start rounded-3xl border-2 border-[#E5EAF0] bg-white p-7 text-left shadow-sm transition-all hover:border-[#FF7A1A] hover:shadow-md"
              >
                <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-[#FFF1C7] text-[#FF7A1A] transition-transform group-hover:scale-110">
                  <Users className="size-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-[#172B3A]">
                  Join with an invite code
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#718096]">
                  Have a code from your Admin or Hostel Warden (e.g. FF-A7K9M2)? Enter it to
                  activate your assigned staff or student role.
                </p>
                <div className="mt-6 flex items-center gap-2 text-xs font-bold text-[#FF7A1A]">
                  Enter Invite Code{" "}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            </div>
          </div>
        )}

        {path === "manager" && (
          <div className="w-full rounded-3xl border border-[#E5EAF0] bg-white p-8 shadow-sm sm:p-10">
            <div className="mb-8">
              <div className="flex items-center justify-between text-xs font-semibold text-[#718096]">
                <span>Step {step} of 5</span>
                <span>
                  {step === 1
                    ? "Institution Details"
                    : step === 2
                      ? "Dining Halls"
                      : step === 3
                        ? "Meal Timings & Fees"
                        : step === 4
                          ? "Capacity & Targets"
                          : "Review & Launch Live Workspace"}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E5EAF0]">
                <div
                  className="h-full bg-[#087E8B] transition-all duration-300"
                  style={{ width: `${(step / 5) * 100}%` }}
                />
              </div>
            </div>

            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h2 className="font-display text-xl font-bold text-[#172B3A]">
                    Tell us about your hostel or mess
                  </h2>
                  <p className="text-xs text-[#718096]">
                    Creates an isolated Firestore tenant where you start with empty live tables
                    ready for real operations.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#172B3A]">
                    Institution / Mess Name
                  </Label>
                  <Input
                    value={instName}
                    onChange={(e) => setInstName(e.target.value)}
                    placeholder="e.g. Hostel 7 Central Mess"
                    className="h-11 rounded-xl border-[#E5EAF0]"
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#172B3A]">Type</Label>
                    <Select value={instType} onValueChange={setInstType}>
                      <SelectTrigger className="h-11 rounded-xl border-[#E5EAF0]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "College Hostel",
                          "University Mess",
                          "PG / Co-living",
                          "Corporate Canteen",
                          "School Kitchen",
                        ].map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#172B3A]">
                      City (for Open-Meteo Weather)
                    </Label>
                    <Input
                      value={cityState}
                      onChange={(e) => setCityState(e.target.value)}
                      placeholder="e.g. Pune, Maharashtra"
                      className="h-11 rounded-xl border-[#E5EAF0]"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h2 className="font-display text-xl font-bold text-[#172B3A]">Dining Halls</h2>
                  <p className="text-xs text-[#718096]">Add dining halls or serving counters.</p>
                </div>
                <div className="space-y-3">
                  {halls.map((h, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-2xl border border-[#E5EAF0] p-3"
                    >
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#DDF3EA] text-[#087E8B]">
                        <Building2 className="size-4" />
                      </div>
                      <Input
                        value={h.name}
                        onChange={(e) => {
                          const updated = [...halls];
                          if (updated[idx]) {
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            setHalls(updated);
                          }
                        }}
                        className="h-9 border-none bg-transparent font-medium"
                      />
                      <div className="flex items-center gap-1.5 text-xs text-[#718096]">
                        <span>Cap:</span>
                        <Input
                          type="number"
                          value={h.capacity}
                          onChange={(e) => {
                            const updated = [...halls];
                            if (updated[idx]) {
                              updated[idx] = { ...updated[idx], capacity: Number(e.target.value) };
                              setHalls(updated);
                            }
                          }}
                          className="h-8 w-20 rounded-lg text-center"
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setHalls([
                        ...halls,
                        { name: `Dining Hall ${halls.length + 1}`, capacity: 250 },
                      ])
                    }
                    className="w-full rounded-xl border-dashed border-[#087E8B] text-xs font-bold text-[#087E8B]"
                  >
                    + Add Another Dining Hall
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h2 className="font-display text-xl font-bold text-[#172B3A]">
                    Meal Service Windows & Billing
                  </h2>
                  <p className="text-xs text-[#718096]">
                    Sets IST cut-off defaults and monthly student rebate pricing.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#172B3A]">Breakfast</Label>
                    <Input
                      value={mealTimings.breakfast}
                      onChange={(e) =>
                        setMealTimings({ ...mealTimings, breakfast: e.target.value })
                      }
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#172B3A]">Lunch</Label>
                    <Input
                      value={mealTimings.lunch}
                      onChange={(e) => setMealTimings({ ...mealTimings, lunch: e.target.value })}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#172B3A]">Evening Snacks</Label>
                    <Input
                      value={mealTimings.snacks}
                      onChange={(e) => setMealTimings({ ...mealTimings, snacks: e.target.value })}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#172B3A]">Dinner</Label>
                    <Input
                      value={mealTimings.dinner}
                      onChange={(e) => setMealTimings({ ...mealTimings, dinner: e.target.value })}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#172B3A]">Monthly Mess Fee (₹)</Label>
                    <Input
                      type="number"
                      value={monthlyFeeRupees}
                      onChange={(e) => setMonthlyFeeRupees(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#172B3A]">
                      Approved Leave Rebate / Day (₹)
                    </Label>
                    <Input
                      type="number"
                      value={perDayRebateRupees}
                      onChange={(e) => setPerDayRebateRupees(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h2 className="font-display text-xl font-bold text-[#172B3A]">
                    Capacity & Waste Targets
                  </h2>
                  <p className="text-xs text-[#718096]">
                    Baseline targets used in forecasts and alerts.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#172B3A]">
                      Estimated Daily Portions
                    </Label>
                    <Input
                      type="number"
                      value={defaultPlates}
                      onChange={(e) => setDefaultPlates(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#172B3A]">
                      Max Food Waste Target (%)
                    </Label>
                    <Input
                      type="number"
                      value={wasteTarget}
                      onChange={(e) => setWasteTarget(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h2 className="font-display text-xl font-bold text-[#172B3A]">
                    Ready to Launch Live Workspace
                  </h2>
                  <p className="text-xs text-[#718096]">
                    Opens cleanly in Live Mode with zero fake numbers so you can add real students,
                    stock, and menus.
                  </p>
                </div>
                <div className="space-y-2 rounded-2xl border border-[#E5EAF0] bg-[#F5F8FA] p-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#718096]">Workspace Name:</span>
                    <span className="font-bold text-[#172B3A]">{instName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#718096]">Your Role:</span>
                    <span className="font-bold text-[#087E8B]">Admin</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#718096]">Halls:</span>
                    <span className="font-bold text-[#172B3A]">
                      {halls.map((h) => h.name).join(", ")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#718096]">Monthly Fee / Rebate:</span>
                    <span className="font-bold text-[#172B3A]">
                      ₹{monthlyFeeRupees} / ₹{perDayRebateRupees} per day
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#172B3A]">
                      Invite Team Emails (optional)
                    </Label>
                    <Input
                      value={inviteEmails}
                      onChange={(e) => setInviteEmails(e.target.value)}
                      placeholder="chef@mess.edu, store@mess.edu"
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#172B3A]">Invited Role</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(v) => setInviteRole(v as WorkspaceRole)}
                    >
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kitchen_head">Kitchen Head</SelectItem>
                        <SelectItem value="store_keeper">Store Keeper</SelectItem>
                        <SelectItem value="accountant">Accountant</SelectItem>
                        <SelectItem value="warden">Hostel Warden</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between border-t border-[#E5EAF0] pt-4">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(step - 1)}
                  className="rounded-xl text-xs font-bold"
                >
                  <ArrowLeft className="mr-1 size-4" /> Back
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setPath("select")}
                  className="rounded-xl text-xs font-bold text-[#718096]"
                >
                  Cancel
                </Button>
              )}

              {step < 5 ? (
                <Button
                  type="button"
                  onClick={() => {
                    if (step === 1 && !instName.trim()) {
                      toast.error("Please enter an institution name.");
                      return;
                    }
                    setStep(step + 1);
                  }}
                  className="rounded-full bg-[#087E8B] px-6 text-xs font-bold text-white hover:bg-[#07545B]"
                >
                  Next <ArrowRight className="ml-1 size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleCreateWorkspace()}
                  className="rounded-full bg-[#FF7A1A] px-8 text-xs font-bold text-[#0F3D3A] hover:bg-[#E56E17]"
                >
                  {isSubmitting ? (
                    <>
                      <LoaderCircle className="mr-2 size-4 animate-spin" /> Creating Workspace...
                    </>
                  ) : (
                    "Create Live Workspace"
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {path === "joiner" && (
          <div className="w-full space-y-6 rounded-3xl border border-[#E5EAF0] bg-white p-8 shadow-sm sm:p-10">
            <button
              type="button"
              onClick={() => setPath("select")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#718096] hover:text-[#172B3A]"
            >
              <ArrowLeft className="size-4" /> Choose different option
            </button>

            <div className="space-y-1">
              <h2 className="font-display text-2xl font-bold text-[#172B3A]">
                Join an Existing Mess Workspace
              </h2>
              <p className="text-xs text-[#718096]">
                Enter the invite code shared by your workspace Admin (for example FF-A7K9M2).
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#172B3A]">Invite Code</Label>
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="FF-XXXXXX"
                  maxLength={24}
                  className="h-12 rounded-xl border-[#E5EAF0] text-center font-mono text-lg font-bold tracking-widest uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#172B3A]">
                  Roll / Staff Code (optional)
                </Label>
                <Input
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder="e.g. ST-1042"
                  maxLength={32}
                  className="h-10 rounded-xl border-[#E5EAF0]"
                />
              </div>
            </div>

            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => void handleJoinWithCode()}
              className="h-11 w-full rounded-full bg-[#087E8B] text-xs font-bold text-white hover:bg-[#07545B]"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="mr-2 size-4 animate-spin" /> Joining Workspace...
                </>
              ) : (
                "Claim Invite & Enter Workspace"
              )}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

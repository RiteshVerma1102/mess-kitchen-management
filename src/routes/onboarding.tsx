import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChefHat,
  Clock,
  ForkKnife,
  HelpCircle,
  LoaderCircle,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  UtensilsCrossed,
} from "lucide-react";
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
import { createFoodFlowInstitution } from "@/lib/foodflow.functions";

export const Route = createFileRoute("/onboarding")({
  head: () =>
    foodFlowHead(
      "Get Started | FoodFlow Onboarding",
      "Set up your institutional kitchen or join an existing dining hall on FoodFlow."
    ),
  component: OnboardingPage,
});

type OnboardingPath = "select" | "manager" | "joiner";

export function OnboardingPage() {
  const navigate = useNavigate();
  const [path, setPath] = useState<OnboardingPath>("select");
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Path 1: Manager Wizard Data
  const [instName, setInstName] = useState("");
  const [instType, setInstType] = useState("College");
  const [cityState, setCityState] = useState("");
  const [halls, setHalls] = useState([
    { name: "Main Dining Hall", capacity: 450 },
    { name: "Executive Mess", capacity: 120 },
  ]);
  const [mealTimings, setMealTimings] = useState({
    breakfast: "07:30 - 09:30 AM",
    lunch: "12:30 - 02:30 PM",
    snacks: "05:00 - 06:30 PM",
    dinner: "08:00 - 10:00 PM",
  });
  const [defaultPlates, setDefaultPlates] = useState("500");
  const [wasteTarget, setWasteTarget] = useState("5");
  const [loadDemoData, setLoadDemoData] = useState(true);
  const [inviteEmails, setInviteEmails] = useState("");

  // Path 2: Joiner Data
  const [joinCode, setJoinCode] = useState("");

  const handleCreateInstitution = async () => {
    if (!instName.trim()) {
      toast.error("Please enter your institution or mess name.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createFoodFlowInstitution({ data: { name: instName.trim() } });
      toast.success("Welcome! Your FoodFlow institution has been configured.");
      void navigate({ to: "/overview" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to initialize workspace.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinWithCode = async () => {
    if (!joinCode.trim()) {
      toast.error("Please enter a 6-character mess join code.");
      return;
    }
    setIsSubmitting(true);
    try {
      // Simulate/Trigger join
      toast.success("Successfully joined institution dining hall!");
      void navigate({ to: "/student" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid or expired join code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F8FA]">
      {/* Top Brand Bar */}
      <header className="border-b border-[#E5EAF0] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-[#087E8B] text-white shadow-md shadow-[#087E8B]/20">
              <ForkKnife className="size-5" />
            </div>
            <div>
              <span className="font-display text-lg font-extrabold tracking-tight text-[#172B3A]">
                SmartMess FoodFlow
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#087E8B]">
                Workspace Setup
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#718096]">
            <ShieldCheck className="size-4 text-[#16A36A]" />
            Tenant Isolated
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center p-6 sm:p-10">
        {path === "select" && (
          <div className="w-full space-y-8 text-center">
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#172B3A] sm:text-4xl">
                How do you plan to use FoodFlow?
              </h1>
              <p className="text-sm text-[#718096]">
                Choose your role to configure the correct permissions and interface.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {/* Option A: Run a Mess */}
              <button
                type="button"
                onClick={() => setPath("manager")}
                className="group relative flex flex-col items-start rounded-3xl border-2 border-[#E5EAF0] bg-white p-7 text-left shadow-sm transition-all hover:border-[#087E8B] hover:shadow-md"
              >
                <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-[#DDF3EA] text-[#087E8B] transition-transform group-hover:scale-110">
                  <ChefHat className="size-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-[#172B3A]">
                  I run a mess / canteen
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#718096]">
                  Set up a new institution, manage multi-hall capacity, coordinate daily meal
                  timings, recipe costs, inventory, and staff roles.
                </p>
                <div className="mt-6 flex items-center gap-2 text-xs font-bold text-[#087E8B]">
                  Configure New Workspace <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </div>
              </button>

              {/* Option B: Join existing */}
              <button
                type="button"
                onClick={() => setPath("joiner")}
                className="group relative flex flex-col items-start rounded-3xl border-2 border-[#E5EAF0] bg-white p-7 text-left shadow-sm transition-all hover:border-[#FF7A1A] hover:shadow-md"
              >
                <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-[#FFF1C7] text-[#FF7A1A] transition-transform group-hover:scale-110">
                  <Users className="size-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-[#172B3A]">
                  I am a student / diner
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#718096]">
                  Join your college hostel or institutional canteen using an invite code or QR link
                  to view daily menus, skip meals, and display your dining pass.
                </p>
                <div className="mt-6 flex items-center gap-2 text-xs font-bold text-[#FF7A1A]">
                  Enter Join Code <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Path 1: Manager 5-Step Wizard */}
        {path === "manager" && (
          <div className="w-full rounded-3xl border border-[#E5EAF0] bg-white p-8 shadow-sm sm:p-10">
            {/* Step Progress Indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-between text-xs font-semibold text-[#718096]">
                <span>Step {step} of 5</span>
                <span>{step === 1 ? "Institution Details" : step === 2 ? "Dining Halls" : step === 3 ? "Meal Timings" : step === 4 ? "Capacity & Waste" : "Review & Launch"}</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E5EAF0]">
                <div
                  className="h-full bg-[#087E8B] transition-all duration-300"
                  style={{ width: `${(step / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Step 1: Institution Name & Location */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h2 className="font-display text-xl font-bold text-[#172B3A]">
                    Tell us about your institution
                  </h2>
                  <p className="text-xs text-[#718096]">
                    This will be the parent workspace for all dining halls and kitchens.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#172B3A]">Institution / Mess Name</Label>
                  <Input
                    value={instName}
                    onChange={(e) => setInstName(e.target.value)}
                    placeholder="e.g. IIT Bombay Dining Services or Apex Hostel Mess"
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
                        {["College", "University", "Hostel", "Corporate Canteen", "Hospital Kitchen"].map(
                          (t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#172B3A]">City & State</Label>
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

            {/* Step 2: Dining Halls */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h2 className="font-display text-xl font-bold text-[#172B3A]">
                    Set up your dining halls
                  </h2>
                  <p className="text-xs text-[#718096]">
                    Add one or more dining halls or serving lines.
                  </p>
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
                          updated[idx].name = e.target.value;
                          setHalls(updated);
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
                            updated[idx].capacity = Number(e.target.value);
                            setHalls(updated);
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
                        { name: `Hall ${halls.length + 1}`, capacity: 300 },
                      ])
                    }
                    className="w-full rounded-xl border-dashed border-[#087E8B] text-xs font-bold text-[#087E8B]"
                  >
                    + Add Another Dining Hall
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Meal Timings */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h2 className="font-display text-xl font-bold text-[#172B3A]">
                    Default Meal Service Windows
                  </h2>
                  <p className="text-xs text-[#718096]">
                    These windows control when meal attendance check-in is active.
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
                      onChange={(e) =>
                        setMealTimings({ ...mealTimings, lunch: e.target.value })
                      }
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#172B3A]">Evening Snacks</Label>
                    <Input
                      value={mealTimings.snacks}
                      onChange={(e) =>
                        setMealTimings({ ...mealTimings, snacks: e.target.value })
                      }
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#172B3A]">Dinner</Label>
                    <Input
                      value={mealTimings.dinner}
                      onChange={(e) =>
                        setMealTimings({ ...mealTimings, dinner: e.target.value })
                      }
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Plates & Waste Target */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h2 className="font-display text-xl font-bold text-[#172B3A]">
                    Capacity & Targets
                  </h2>
                  <p className="text-xs text-[#718096]">
                    Baseline parameters used by the AI demand forecasting engine.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#172B3A]">Expected Default Daily Portions</Label>
                    <Input
                      type="number"
                      value={defaultPlates}
                      onChange={(e) => setDefaultPlates(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#172B3A]">Maximum Food Waste Target (%)</Label>
                    <Input
                      type="number"
                      value={wasteTarget}
                      onChange={(e) => setWasteTarget(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>
                <div className="rounded-2xl bg-[#FFF1C7] p-4 text-xs font-medium text-[#0F3D3A]">
                  💡 FoodFlow's mathematical demand engine will automatically flag preparation indents that exceed your {wasteTarget}% target.
                </div>
              </div>
            )}

            {/* Step 5: Review & Demo Data */}
            {step === 5 && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h2 className="font-display text-xl font-bold text-[#172B3A]">
                    Ready to Launch
                  </h2>
                  <p className="text-xs text-[#718096]">
                    Review setup summary and invite team members.
                  </p>
                </div>
                <div className="rounded-2xl border border-[#E5EAF0] bg-[#F5F8FA] p-4 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#718096]">Institution:</span>
                    <span className="font-bold text-[#172B3A]">{instName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#718096]">Halls:</span>
                    <span className="font-bold text-[#172B3A]">{halls.map((h) => h.name).join(", ")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#718096]">Daily Portions:</span>
                    <span className="font-bold text-[#172B3A]">{defaultPlates} plates</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#172B3A]">Invite Kitchen Staff or Managers (optional)</Label>
                  <Input
                    value={inviteEmails}
                    onChange={(e) => setInviteEmails(e.target.value)}
                    placeholder="manager@mess.edu, chef@mess.edu (comma separated)"
                    className="h-11 rounded-xl"
                  />
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-[#E5EAF0] p-4 cursor-pointer hover:bg-[#F5F8FA]">
                  <input
                    type="checkbox"
                    checked={loadDemoData}
                    onChange={(e) => setLoadDemoData(e.target.checked)}
                    className="size-4 rounded text-[#087E8B]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#172B3A] block">
                      Pre-populate realistic Indian mess demo data
                    </span>
                    <span className="text-[11px] text-[#718096]">
                      Loads ~40 Indian recipes (Paneer Butter Masala, Dal Tadka), 60 inventory items, and sample turnout history.
                    </span>
                  </div>
                </label>
              </div>
            )}

            {/* Wizard Navigation Buttons */}
            <div className="mt-8 flex items-center justify-between pt-4 border-t border-[#E5EAF0]">
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
                  onClick={handleCreateInstitution}
                  className="rounded-full bg-[#FF7A1A] px-8 text-xs font-bold text-[#0F3D3A] hover:bg-[#E56E17]"
                >
                  {isSubmitting ? (
                    <>
                      <LoaderCircle className="mr-2 size-4 animate-spin" /> Setting Up...
                    </>
                  ) : (
                    "Launch FoodFlow Workspace"
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Path 2: Joiner with Code */}
        {path === "joiner" && (
          <div className="w-full rounded-3xl border border-[#E5EAF0] bg-white p-8 shadow-sm sm:p-10 space-y-6">
            <button
              type="button"
              onClick={() => setPath("select")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#718096] hover:text-[#172B3A]"
            >
              <ArrowLeft className="size-4" /> Choose different role
            </button>

            <div className="space-y-1">
              <h2 className="font-display text-2xl font-bold text-[#172B3A]">
                Join Your Institution Mess
              </h2>
              <p className="text-xs text-[#718096]">
                Enter the 6-character code provided by your hostel or dining warden.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#172B3A]">Institution / Mess Code</Label>
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. IITB01 or HOSTEL7"
                maxLength={10}
                className="h-12 rounded-xl text-center text-lg font-bold tracking-widest uppercase border-[#E5EAF0]"
              />
            </div>

            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleJoinWithCode}
              className="w-full h-11 rounded-full bg-[#087E8B] text-xs font-bold text-white hover:bg-[#07545B]"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="mr-2 size-4 animate-spin" /> Verifying Code...
                </>
              ) : (
                "Join Dining Hall"
              )}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

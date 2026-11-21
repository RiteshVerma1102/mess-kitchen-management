import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, LoaderCircle, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/features/marketing/brand";
import { foodFlowHead } from "@/lib/foodflow-route-head";

export const Route = createFileRoute("/join/$code")({
  head: () =>
    foodFlowHead(
      "Join Dining Hall | FoodFlow",
      "Claim your student dining pass and access institutional daily mess menus."
    ),
  component: JoinCodePage,
});

export function JoinCodePage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [dietaryPreference, setDietaryPreference] = useState("Veg");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !rollNumber.trim()) {
      toast.error("Please enter your name and student roll number.");
      return;
    }
    setIsSubmitting(true);
    try {
      toast.success(`Successfully joined dining hall using code ${code}!`);
      void navigate({ to: "/student" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join dining hall.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F8FA] p-6">
      <div className="w-full max-w-md rounded-3xl border border-[#E5EAF0] bg-white p-8 shadow-sm sm:p-10">
        <div className="mb-6 flex items-center gap-3">
          <BrandMark className="size-12 shadow-md" />
          <div>
            <h1 className="font-display text-xl font-bold text-[#172B3A]">
              Join Dining Hall
            </h1>
            <span className="text-xs font-semibold text-[#087E8B]">
              Code: <span className="font-mono font-bold uppercase">{code}</span>
            </span>
          </div>
        </div>

        <p className="mb-6 text-xs text-[#718096]">
          Register your student dining profile to activate your digital meal pass and start receiving daily menus.
        </p>

        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#172B3A]">Full Name</Label>
            <Input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="h-11 rounded-xl"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#172B3A]">Student Roll / Registration No.</Label>
            <Input
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. 21CS042"
              className="h-11 rounded-xl"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#172B3A]">Dietary Preference</Label>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {["Veg", "Non-Veg", "Jain"].map((diet) => (
                <button
                  type="button"
                  key={diet}
                  onClick={() => setDietaryPreference(diet)}
                  className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                    dietaryPreference === diet
                      ? "border-[#087E8B] bg-[#DDF3EA] text-[#087E8B]"
                      : "border-[#E5EAF0] text-[#718096] hover:bg-[#F5F8FA]"
                  }`}
                >
                  {diet}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 rounded-full bg-[#FF7A1A] text-xs font-bold text-[#0F3D3A] hover:bg-[#E56E17] mt-2"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="mr-2 size-4 animate-spin" /> Activating Profile...
              </>
            ) : (
              "Activate Student Pass & Enter Portal"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/features/marketing/brand";
import { foodFlowHead } from "@/lib/foodflow-route-head";
import { useFirebaseAuth } from "@/components/firebase-provider";
import { claimInviteByCodeAtomic } from "@/lib/workspace-firestore";

export const Route = createFileRoute("/join/$code")({
  head: () =>
    foodFlowHead(
      "Join Dining Hall | FoodFlow",
      "Claim your invite and access your FoodFlow mess workspace.",
    ),
  component: JoinCodePage,
});

export function JoinCodePage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshWorkspaceContext } = useFirebaseAuth();

  const [rollNumber, setRollNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      void navigate({ to: "/login", search: { redirect: `/join/${code}` } });
    }
  }, [authLoading, user, code, navigate]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      void navigate({ to: "/login", search: { redirect: `/join/${code}` } });
      return;
    }
    if (!user.emailVerified) {
      toast.error("Please verify your email address first before claiming an invite.");
      void navigate({ to: "/login", search: { redirect: `/join/${code}` } });
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedCode = rollNumber.trim();
      const joined = await claimInviteByCodeAtomic(
        user,
        code,
        trimmedCode ? { studentCode: trimmedCode } : undefined,
      );
      await refreshWorkspaceContext();
      toast.success(`Joined ${joined.workspaceName} as ${joined.role}!`);
      void navigate({ to: joined.role === "student" ? "/student" : "/overview" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join workspace.");
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
    <div className="flex min-h-screen items-center justify-center bg-[#F5F8FA] p-6">
      <div className="w-full max-w-md rounded-3xl border border-[#E5EAF0] bg-white p-8 shadow-sm sm:p-10">
        <div className="mb-6 flex items-center gap-3">
          <BrandMark className="size-12 shadow-md" />
          <div>
            <h1 className="font-display text-xl font-bold text-[#172B3A]">Join Mess Workspace</h1>
            <span className="text-xs font-semibold text-[#087E8B]">
              Invite Code: <span className="font-mono font-bold uppercase">{code}</span>
            </span>
          </div>
        </div>

        <p className="mb-6 text-xs text-[#718096]">
          Signed in as <span className="font-semibold text-[#172B3A]">{user.email}</span>. Claim
          this invite to unlock your workspace role.
        </p>

        <form onSubmit={(e) => void handleJoin(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#172B3A]">Roll / Staff ID (optional)</Label>
            <Input
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. 21CS042"
              className="h-11 rounded-xl"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 h-11 w-full rounded-full bg-[#FF7A1A] text-xs font-bold text-[#0F3D3A] hover:bg-[#E56E17]"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="mr-2 size-4 animate-spin" /> Joining Workspace...
              </>
            ) : (
              "Claim Invite & Enter Workspace"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

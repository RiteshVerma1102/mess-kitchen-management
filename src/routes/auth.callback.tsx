import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { BrandLogo } from "@/features/marketing/brand";
import { useFirebaseAuth } from "@/components/firebase-provider";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Authenticating | FoodFlow" },
      { name: "description", content: "Completing FoodFlow Firebase authentication." },
    ],
  }),
  component: AuthCallbackComponent,
});

function AuthCallbackComponent() {
  const navigate = useNavigate();
  const { user, loading, workspaceLoading, memberships, role } = useFirebaseAuth();

  useEffect(() => {
    if (loading || workspaceLoading) return;
    if (!user) {
      void navigate({ to: "/login" });
      return;
    }
    if (!user.emailVerified) {
      void navigate({ to: "/login" });
      return;
    }
    if (memberships.length > 0) {
      void navigate({ to: (role === "student" ? "/student" : "/overview") as never });
    } else {
      void navigate({ to: "/onboarding" });
    }
  }, [loading, workspaceLoading, user, memberships.length, role, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F8FA] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#E5EAF0] bg-white p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <BrandLogo />
        </div>
        <Loader2 className="mx-auto size-9 animate-spin text-[#087E8B]" />
        <h2 className="mt-4 font-display text-xl font-semibold text-[#172B3A]">
          Completing sign-in...
        </h2>
        <p className="mt-2 text-sm text-[#718096]">
          Resolving your Firebase session and mess workspace.
        </p>
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/features/marketing/brand";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapWorkspace } from "@/lib/foodflow-bootstrap";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Authenticating | FoodFlow" },
      { name: "description", content: "Completing FoodFlow authentication." },
    ],
  }),
  component: AuthCallbackComponent,
});

function AuthCallbackComponent() {
  const navigate = useNavigate();
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [timedOut, setTimedOut] = useState(false);

  const processCallback = async () => {
    setIsProcessing(true);
    setErrorState(null);
    setTimedOut(false);

    // 15 second safety timeout
    const timeoutId = setTimeout(() => {
      setTimedOut(true);
      setIsProcessing(false);
    }, 15000);

    try {
      // 1. Check for error parameters in URL (search or hash)
      const url = new URL(window.location.href);
      const urlError = url.searchParams.get("error_description") || url.searchParams.get("error");
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const hashError = hashParams.get("error_description") || hashParams.get("error");

      const reportedError = urlError || hashError;
      if (reportedError) {
        if (
          reportedError.includes("missing OAuth secret") ||
          reportedError.includes("validation_failed") ||
          reportedError.includes("unsupported_provider")
        ) {
          throw new Error("Google sign-in is not yet enabled for this Supabase project. Please use email and password.");
        }
        throw new Error(decodeURIComponent(reportedError));
      }

      // 2. Exchange code or detect existing session
      const code = url.searchParams.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      }

      // Check current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!session) {
        throw new Error("No authentication session was found. Please sign in again.");
      }

      // 3. Bootstrap workspace and route by role
      const result = await bootstrapWorkspace();
      clearTimeout(timeoutId);

      if (result.status === "ready") {
        void navigate({ to: result.destination });
      } else if (result.status === "needs_onboarding") {
        void navigate({ to: "/onboarding" });
      } else {
        void navigate({ to: "/login" });
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("[auth] Callback error:", err);
      setErrorState(err instanceof Error ? err.message : "Authentication failed.");
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    void processCallback();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl text-center">
        <div className="flex justify-center mb-6">
          <BrandLogo />
        </div>

        {isProcessing && (
          <div className="space-y-4">
            <Loader2 className="mx-auto size-9 animate-spin text-primary" />
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Verifying credentials...
            </h2>
            <p className="text-sm text-muted-foreground">
              Securing your session and setting up your mess workspace.
            </p>
          </div>
        )}

        {timedOut && !errorState && (
          <div className="space-y-4">
            <AlertCircle className="mx-auto size-9 text-amber-500" />
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Taking longer than expected
            </h2>
            <p className="text-sm text-muted-foreground">
              Authentication took more than 15 seconds. Check your internet connection or retry.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="outline" onClick={() => void navigate({ to: "/login" })}>
                <ArrowLeft className="mr-2 size-4" /> Back to Sign In
              </Button>
              <Button onClick={() => void processCallback()}>
                <RefreshCw className="mr-2 size-4" /> Retry
              </Button>
            </div>
          </div>
        )}

        {errorState && (
          <div className="space-y-4">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="size-6" />
            </div>
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Sign In Notice
            </h2>
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-left">
              <p className="text-sm text-foreground">{errorState}</p>
            </div>
            <Button
              className="w-full mt-2"
              onClick={() => void navigate({ to: "/login" })}
            >
              <ArrowLeft className="mr-2 size-4" /> Back to Sign In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

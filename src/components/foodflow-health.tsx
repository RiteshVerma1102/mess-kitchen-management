import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/features/marketing/brand";
import { supabase } from "@/integrations/supabase/client";

export type HealthStatus = "checking" | "healthy" | "missing_schema" | "missing_env" | "network_error";

export function useFoodFlowHealth() {
  const [status, setStatus] = useState<HealthStatus>("checking");
  const [details, setDetails] = useState<string>("");

  const checkHealth = async () => {
    setStatus("checking");
    const env = import.meta.env as Record<string, string | undefined>;
    const supabaseUrl = env["VITE_SUPABASE_URL"];
    const supabaseKey = env["VITE_SUPABASE_PUBLISHABLE_KEY"];

    if (!supabaseUrl || !supabaseKey) {
      setStatus("missing_env");
      setDetails("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env");
      return;
    }

    try {
      // Fast probe to check if foodflow tables exist
      const { error } = await supabase
        .from("foodflow_institutions")
        .select("id")
        .limit(1);

      if (error) {
        const msg = error.message.toLowerCase();
        if (
          error.code === "42P01" ||
          msg.includes("relation") ||
          msg.includes("does not exist") ||
          msg.includes("not found")
        ) {
          console.warn("[FoodFlow Health Check] Database schema missing:", error);
          setStatus("missing_schema");
          setDetails("The 'foodflow_institutions' table does not exist in your Supabase project yet.");
          return;
        }

        if (msg.includes("api key") || msg.includes("jwt") || error.code === "PGRST301") {
          setStatus("missing_env");
          setDetails("Invalid Supabase API key or project credentials.");
          return;
        }

        // Other non-fatal errors (e.g. permission or empty data) still count as schema existing
        setStatus("healthy");
      } else {
        setStatus("healthy");
      }
    } catch (err) {
      console.error("[FoodFlow Health Check] Connectivity error:", err);
      setStatus("network_error");
      setDetails(err instanceof Error ? err.message : "Unable to reach Supabase.");
    }
  };

  useEffect(() => {
    void checkHealth();
  }, []);

  return { status, details, retry: checkHealth };
}

export function HealthCheckBanner({
  status,
  details,
  onRetry,
  onDismiss,
}: {
  status: HealthStatus;
  details: string;
  onRetry: () => void;
  onDismiss?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  if (status === "healthy" || status === "checking") return null;

  const handleCopyPath = () => {
    void navigator.clipboard.writeText("supabase/schema.sql");
    setCopied(true);
    toast.success("Path copied: supabase/schema.sql");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-2xl border border-destructive/20 bg-card p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <BrandLogo />
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-xl bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-sm">
            <p className="font-semibold">
              {status === "missing_schema"
                ? "Database Schema Setup Required"
                : status === "missing_env"
                ? "Supabase Configuration Missing"
                : "Database Connection Error"}
            </p>
            <p className="mt-1 text-muted-foreground">{details}</p>
          </div>
        </div>

        {status === "missing_schema" && (
          <div className="mt-5 space-y-4 text-sm text-foreground">
            <p className="leading-relaxed">
              Your Supabase project is connected, but the FoodFlow database tables and security policies haven't been initialized yet.
            </p>
            <div className="rounded-xl border border-border bg-muted/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Setup Instructions:</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs text-muted-foreground">
                <li>
                  Open your{" "}
                  <a
                    href="https://supabase.com/dashboard/project/vqxzkirixwteljacfrfi/sql"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
                  >
                    Supabase SQL Editor <ExternalLink className="size-3" />
                  </a>
                </li>
                <li>
                  Copy and paste the contents of{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground font-semibold">
                    supabase/schema.sql
                  </code>
                </li>
                <li>Click <strong>Run</strong> in Supabase, then click "Retry Health Check" below.</li>
              </ol>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-2">
          {status === "missing_schema" ? (
            <Button variant="outline" size="sm" onClick={handleCopyPath} className="gap-2">
              {copied ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              {copied ? "Copied Path" : "Copy SQL File Path"}
            </Button>
          ) : <div />}

          <div className="flex items-center gap-2">
            {onDismiss && (
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                Preview in Demo Mode
              </Button>
            )}
            <Button size="sm" onClick={onRetry} className="gap-2 bg-primary text-primary-foreground">
              <RefreshCw className="size-3.5" />
              Retry Connection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

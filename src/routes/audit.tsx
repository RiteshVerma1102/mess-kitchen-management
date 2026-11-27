import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Download, LoaderCircle, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { useFirebaseAuth } from "@/components/firebase-provider";
import { FoodFlowShell } from "@/components/foodflow-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuditLogDoc } from "@/lib/domain/workspace-types";
import { exportToCSV, exportToPrintablePDF } from "@/lib/export-helpers";
import { foodFlowHead } from "@/lib/foodflow-route-head";
import { subscribeSubcollection } from "@/lib/workspace-firestore";

export const Route = createFileRoute("/audit")({
  head: () =>
    foodFlowHead(
      "Audit Log | FoodFlow Security",
      "Append-only workspace audit log of kitchen, inventory, billing, and role operations.",
    ),
  component: AuditLogPage,
});

function formatTimestamp(ts: unknown): string {
  if (!ts) return "Pending sync";
  if (typeof ts === "string") return ts.slice(0, 19).replace("T", " ");
  if (
    typeof ts === "object" &&
    ts !== null &&
    "toDate" in ts &&
    typeof (ts as { toDate: () => Date }).toDate === "function"
  ) {
    return (ts as { toDate: () => Date }).toDate().toISOString().slice(0, 19).replace("T", " ");
  }
  return "Recorded";
}

export function AuditLogPage() {
  const navigate = useNavigate();
  const {
    user,
    loading: authLoading,
    activeWorkspace,
    activeMember,
    role,
    signOutFirebase,
  } = useFirebaseAuth();
  const [logs, setLogs] = useState<AuditLogDoc[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("ALL");

  useEffect(() => {
    const wsId = activeWorkspace?.id;
    if (!wsId || !user?.emailVerified || !role || role === "student") {
      setLogs([]);
      return;
    }
    setLoadingLogs(true);
    const unsub = subscribeSubcollection<AuditLogDoc>(
      wsId,
      "auditLogs",
      (rows) => {
        setLogs(rows);
        setLoadingLogs(false);
      },
      { maxRows: 200 },
    );
    return () => unsub();
  }, [activeWorkspace?.id, role, user?.emailVerified]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesQuery =
        !q ||
        (log.actorEmail || "").toLowerCase().includes(q) ||
        (log.actorName || "").toLowerCase().includes(q) ||
        (log.targetCollection || "").toLowerCase().includes(q) ||
        (log.summary || "").toLowerCase().includes(q);
      const matchesAction = selectedAction === "ALL" || log.action === selectedAction;
      return matchesQuery && matchesAction;
    });
  }, [logs, query, selectedAction]);

  const handleExportCSV = () => {
    exportToCSV(
      "foodflow_audit_log",
      [
        { key: "timestamp", label: "Timestamp" },
        { key: "actor", label: "Actor" },
        { key: "role", label: "Role" },
        { key: "action", label: "Action" },
        { key: "target", label: "Target" },
        { key: "summary", label: "Details" },
      ],
      filtered.map((l) => ({
        timestamp: formatTimestamp(l.createdAt),
        actor: l.actorEmail || l.actorName,
        role: l.actorRole,
        action: l.action,
        target: `${l.targetCollection}/${l.targetId}`,
        summary: l.summary,
      })),
    );
    toast.success("Audit log exported to CSV.");
  };

  const handleExportPDF = () => {
    exportToPrintablePDF({
      title: "Workspace Security & Operational Audit Log",
      institutionName: activeWorkspace?.name || "FoodFlow Workspace",
      dateRange: "Latest 200 events",
      headers: ["Timestamp", "Actor", "Role", "Action", "Target", "Details"],
      rows: filtered.map((l) => [
        formatTimestamp(l.createdAt),
        l.actorEmail || l.actorName,
        l.actorRole,
        l.action,
        l.targetCollection,
        l.summary,
      ]),
    });
  };

  const currentName =
    activeMember?.name || user?.displayName || user?.email?.split("@")[0] || "Member";

  return (
    <FoodFlowShell
      currentPage="audit"
      currentName={currentName}
      institutionName={activeWorkspace?.name ?? null}
      unreadCount={0}
      dataMode={activeWorkspace ? "live" : "demo"}
      onToggleDemo={() => void navigate({ to: "/overview" })}
      onSignOut={() => {
        void signOutFirebase().then(() => navigate({ to: "/login" }));
      }}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-[#087E8B] text-white shadow-sm">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-[#172B3A]">
                Workspace Audit Log
              </h1>
              <span className="text-xs text-[#718096]">
                Live Firestore trail of workspace creation, invites, role changes, stock
                adjustments, and billing.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={filtered.length === 0}
              onClick={handleExportCSV}
              className="rounded-full text-xs font-bold"
            >
              <Download className="mr-1.5 size-3.5" /> CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={filtered.length === 0}
              onClick={handleExportPDF}
              className="rounded-full border-[#087E8B] text-xs font-bold text-[#087E8B]"
            >
              <Download className="mr-1.5 size-3.5" /> Print / PDF
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-[#E5EAF0] bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#718096]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search actor, collection, or operation summary..."
              className="h-10 rounded-xl pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {["ALL", "CREATE", "UPDATE", "DELETE", "ROLE", "INVITE", "PAYMENT"].map((act) => (
              <button
                key={act}
                type="button"
                onClick={() => setSelectedAction(act)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  selectedAction === act
                    ? "bg-[#087E8B] text-white shadow-xs"
                    : "bg-[#F5F8FA] text-[#718096] hover:text-[#172B3A]"
                }`}
              >
                {act}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-[#E5EAF0] bg-white shadow-sm">
          {authLoading || loadingLogs ? (
            <div className="flex items-center justify-center gap-2 py-12 text-xs text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin text-[#087E8B]" />
              Loading audit trail from Firestore...
            </div>
          ) : !activeWorkspace ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Sign in and select or create a workspace to inspect live audit logs.
            </div>
          ) : role === "student" ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Audit logs are visible only to workspace staff roles.
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-xs text-muted-foreground">
              No audit logs recorded yet for this filter. Workspace changes will appear here
              automatically.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E5EAF0] bg-[#F5F8FA] text-[#718096]">
                  <tr>
                    <th className="px-5 py-3.5 font-bold">Timestamp</th>
                    <th className="px-5 py-3.5 font-bold">Actor</th>
                    <th className="px-5 py-3.5 font-bold">Role</th>
                    <th className="px-5 py-3.5 font-bold">Action</th>
                    <th className="px-5 py-3.5 font-bold">Collection</th>
                    <th className="px-5 py-3.5 font-bold">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0]">
                  {filtered.map((log) => (
                    <tr key={log.id} className="transition-colors hover:bg-[#F5F8FA]/75">
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-[11px] text-[#718096]">
                        {formatTimestamp(log.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 font-semibold text-[#172B3A]">
                        {log.actorEmail || log.actorName}
                      </td>
                      <td className="px-5 py-3 font-mono text-[10px] text-[#718096]">
                        {log.actorRole}
                      </td>
                      <td className="px-5 py-3">
                        <Badge className="rounded-full border-none bg-[#DDF3EA] px-2 py-0.5 text-[10px] font-bold text-[#087E8B]">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-[#087E8B]">
                        {log.targetCollection}
                      </td>
                      <td className="max-w-md px-5 py-3 text-xs text-[#172B3A]">{log.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </FoodFlowShell>
  );
}

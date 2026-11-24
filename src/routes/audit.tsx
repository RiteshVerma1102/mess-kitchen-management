import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Download,
  Filter,
  History,
  Lock,
  Search,
  Shield,
  ShieldCheck,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { foodFlowHead } from "@/lib/foodflow-route-head";
import { exportToCSV, exportToPrintablePDF } from "@/lib/export-helpers";

export const Route = createFileRoute("/audit")({
  head: () =>
    foodFlowHead(
      "Audit Log | FoodFlow Security",
      "Immutable, cryptographic audit log of all kitchen, inventory, and role operations."
    ),
  component: AuditLogPage,
});

type AuditEntry = {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: "INSERT" | "UPDATE" | "DELETE" | "RPC";
  table: string;
  summary: string;
  ip: string;
};

const sampleAuditLogs: AuditEntry[] = [
  {
    id: "aud-001",
    timestamp: "2026-11-20 12:45:10",
    actor: "manager@smartmess.edu",
    role: "mess_manager",
    action: "RPC",
    table: "mark_meal_cooked",
    summary: "Deducted 45kg Rice, 12kg Paneer, 6L Cream for Lunch (North Hall)",
    ip: "10.35.6.100",
  },
  {
    id: "aud-002",
    timestamp: "2026-11-20 11:30:22",
    actor: "kitchen@smartmess.edu",
    role: "kitchen_staff",
    action: "UPDATE",
    table: "foodflow_kitchen_tasks",
    summary: "Marked task 'Prep Dal Tadka Tempering' as Ready",
    ip: "10.35.6.105",
  },
  {
    id: "aud-003",
    timestamp: "2026-11-20 09:15:40",
    actor: "attendance@smartmess.edu",
    role: "attendance_operator",
    action: "INSERT",
    table: "foodflow_attendance",
    summary: "Recorded 412 breakfast scans (North Hall Kiosk 1)",
    ip: "10.35.6.120",
  },
  {
    id: "aud-004",
    timestamp: "2026-11-19 18:20:00",
    actor: "admin@smartmess.edu",
    role: "institution_admin",
    action: "UPDATE",
    table: "foodflow_user_roles",
    summary: "Assigned 'mess_manager' role to ramesh@smartmess.edu",
    ip: "10.35.6.101",
  },
  {
    id: "aud-005",
    timestamp: "2026-11-19 14:10:15",
    actor: "manager@smartmess.edu",
    role: "mess_manager",
    action: "INSERT",
    table: "foodflow_purchase_orders",
    summary: "Drafted PO #PO-892 for 200kg Basmati Rice from Kisan Mandi Traders",
    ip: "10.35.6.100",
  },
  {
    id: "aud-006",
    timestamp: "2026-11-19 10:05:00",
    actor: "system",
    role: "scheduled_cron",
    action: "RPC",
    table: "nightly_forecast_generation",
    summary: "Generated 7-day meal forecast with DOW seasonality and event weights",
    ip: "127.0.0.1",
  },
];

export function AuditLogPage() {
  const [query, setQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("ALL");

  const filtered = sampleAuditLogs.filter((log) => {
    const matchesQuery =
      log.actor.toLowerCase().includes(query.toLowerCase()) ||
      log.table.toLowerCase().includes(query.toLowerCase()) ||
      log.summary.toLowerCase().includes(query.toLowerCase());
    const matchesAction = selectedAction === "ALL" || log.action === selectedAction;
    return matchesQuery && matchesAction;
  });

  const handleExportCSV = () => {
    exportToCSV<AuditEntry>(
      "foodflow_audit_log",
      [
        { key: "timestamp", label: "Timestamp" },
        { key: "actor", label: "Actor" },
        { key: "role", label: "Role" },
        { key: "action", label: "Action" },
        { key: "table", label: "Target" },
        { key: "summary", label: "Details" },
        { key: "ip", label: "IP Address" },
      ],
      filtered
    );
    toast.success("Audit log exported to CSV.");
  };

  const handleExportPDF = () => {
    exportToPrintablePDF({
      title: "Immutable Security & Operational Audit Log",
      institutionName: "SmartMess FoodFlow",
      dateRange: "Last 30 Days",
      headers: ["Timestamp", "Actor", "Role", "Action", "Target", "Details", "IP"],
      rows: filtered.map((l) => [l.timestamp, l.actor, l.role, l.action, l.table, l.summary, l.ip]),
    });
    toast.success("Opening printable audit report...");
  };

  return (
    <div className="min-h-screen bg-[#F5F8FA] p-6 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-[#087E8B] text-white shadow-md shadow-[#087E8B]/20">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-[#172B3A]">
                System Audit Log
              </h1>
              <span className="text-xs text-[#718096]">
                Immutable, append-only security trail of all kitchen operations and role changes.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="rounded-full border-[#E5EAF0] text-xs font-bold text-[#172B3A]"
            >
              <Download className="mr-1.5 size-3.5" /> CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="rounded-full border-[#087E8B] text-xs font-bold text-[#087E8B] hover:bg-[#DDF3EA]"
            >
              <Download className="mr-1.5 size-3.5" /> Print / PDF
            </Button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#E5EAF0] bg-white p-4 shadow-xs">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#718096]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by actor, table or operation summary..."
              className="h-10 pl-9 rounded-xl border-[#E5EAF0] text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {["ALL", "INSERT", "UPDATE", "DELETE", "RPC"].map((act) => (
              <button
                key={act}
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

        {/* Audit Log Table */}
        <div className="overflow-hidden rounded-3xl border border-[#E5EAF0] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E5EAF0] bg-[#F5F8FA] text-[#718096]">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Timestamp</th>
                  <th className="px-5 py-3.5 font-bold">Actor</th>
                  <th className="px-5 py-3.5 font-bold">Role</th>
                  <th className="px-5 py-3.5 font-bold">Action</th>
                  <th className="px-5 py-3.5 font-bold">Target Table</th>
                  <th className="px-5 py-3.5 font-bold">Operation Details</th>
                  <th className="px-5 py-3.5 font-bold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F5F8FA]/75 transition-colors">
                    <td className="px-5 py-3 font-mono text-[11px] text-[#718096] whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="px-5 py-3 font-semibold text-[#172B3A] whitespace-nowrap">
                      {log.actor}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-[10px] text-[#718096]">{log.role}</span>
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold border-none ${
                          log.action === "INSERT"
                            ? "bg-[#DDF3EA] text-[#16A36A]"
                            : log.action === "UPDATE"
                            ? "bg-[#FFF1C7] text-[#0F3D3A]"
                            : log.action === "RPC"
                            ? "bg-[#E9E4FF] text-[#5B21B6]"
                            : "bg-[#FFE1D0] text-[#DC2626]"
                        }`}
                      >
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-[#087E8B]">
                      {log.table}
                    </td>
                    <td className="px-5 py-3 text-xs text-[#172B3A] max-w-md">
                      {log.summary}
                    </td>
                    <td className="px-5 py-3 font-mono text-[10px] text-[#718096]">
                      {log.ip}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

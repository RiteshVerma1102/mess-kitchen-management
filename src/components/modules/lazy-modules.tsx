import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Database,
  FileText,
  IndianRupee,
  LoaderCircle,
  MessageSquareHeart,
  Plus,
  Printer,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/components/firebase-provider";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import {
  requestInsightsAI,
  type InsightsResponse,
  type SanitizedMessSummary,
} from "@/lib/ai-client";
import {
  analyzeDishQualityLoop,
  FEEDBACK_TAGS,
  formatSlaRemaining,
} from "@/lib/domain/feedback-ops";
import { formatISTDateKey } from "@/lib/domain/mess-ops";
import {
  formatWorkspaceRole,
  type ComplaintDoc,
  type FeedbackDoc,
  type InvoiceDoc,
  type LeaveRequestDoc,
  type PaymentDoc,
} from "@/lib/domain/workspace-types";
import { exportPaymentReceiptHTML, exportToPrintablePDF } from "@/lib/export-helpers";
import { TRANSLATIONS } from "@/lib/i18n";
import { compressImageFileToDataUrl } from "@/lib/image-compress";
import { moneyFromPaise, shiftDateKey } from "@/lib/foodflow-models";
import { runHealthReadTest, runHealthWriteTest } from "@/lib/workspace-firestore";

export function BillingPaymentsModule({
  invoices,
  payments,
  leaves,
  institutionName = "FoodFlow Workspace",
  minRebateDays = 3,
  dataMode,
  canManageFinance,
  onGenerateBills,
  onRecordPayment,
  onUpdateLeaveStatus,
}: {
  invoices: InvoiceDoc[];
  payments: PaymentDoc[];
  leaves: LeaveRequestDoc[];
  institutionName?: string;
  minRebateDays?: number;
  dataMode: "live" | "demo";
  canManageFinance: boolean;
  onGenerateBills: (monthKey: string) => Promise<void>;
  onRecordPayment: (
    invoice: InvoiceDoc,
    amountRupees: number,
    method: PaymentDoc["method"],
    referenceNo: string,
  ) => Promise<void>;
  onUpdateLeaveStatus: (leave: LeaveRequestDoc, status: "approved" | "rejected") => Promise<void>;
}) {
  const { language } = useFirebaseAuth();
  const t = TRANSLATIONS[language];
  const [monthKey, setMonthKey] = useState(() => new Date().toISOString().slice(0, 7));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [payingInvoice, setPayingInvoice] = useState<InvoiceDoc | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentDoc["method"]>("upi");
  const [payRef, setPayRef] = useState("");
  const [busy, setBusy] = useState(false);

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter(
      (inv) =>
        (!q ||
          inv.studentName.toLowerCase().includes(q) ||
          inv.studentCode.toLowerCase().includes(q)) &&
        inv.monthKey.startsWith(monthKey.slice(0, 4)),
    );
  }, [invoices, search, monthKey]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  const visibleInvoices = filteredInvoices.slice((page - 1) * pageSize, page * pageSize);

  const totalBilledPaise = filteredInvoices.reduce((s, i) => s + i.totalPayablePaise, 0);
  const totalCollectedPaise = filteredInvoices.reduce((s, i) => s + i.paidPaise, 0);
  const totalRebatesPaise = filteredInvoices.reduce((s, i) => s + i.leaveRebatePaise, 0);

  const handlePaymentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;
    const rupees = Number(payAmount);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      toast.error("Enter a valid payment amount in rupees.");
      return;
    }
    setBusy(true);
    try {
      await onRecordPayment(payingInvoice, rupees, payMethod, payRef);
      setPayingInvoice(null);
      setPayAmount("");
      setPayRef("");
    } finally {
      setBusy(false);
    }
  };

  const handlePrintInvoiceReceipt = (inv: InvoiceDoc) => {
    const matchingPay = payments.find((p) => p.invoiceId === inv.id);
    exportPaymentReceiptHTML({
      receiptNumber: `FF-${inv.monthKey}-${inv.studentCode}`,
      institutionName,
      studentName: inv.studentName,
      studentCode: inv.studentCode,
      monthKey: inv.monthKey,
      amountRupees: Math.round((matchingPay?.amountPaise ?? inv.paidPaise) / 100),
      method: matchingPay?.method ?? "upi",
      referenceNo: matchingPay?.referenceNo ?? `INV-${inv.id.slice(-6).toUpperCase()}`,
      paidAt: matchingPay?.paidAt ?? new Date().toISOString(),
    });
  };

  const handlePrintPaymentReceipt = (p: PaymentDoc) => {
    const matchingInv = invoices.find((inv) => inv.id === p.invoiceId);
    exportPaymentReceiptHTML({
      receiptNumber: `PAY-${p.id.slice(-6).toUpperCase()}`,
      institutionName,
      studentName: p.studentName,
      ...(matchingInv?.studentCode ? { studentCode: matchingInv.studentCode } : {}),
      ...(matchingInv?.monthKey ? { monthKey: matchingInv.monthKey } : {}),
      amountRupees: Number((p.amountPaise / 100).toFixed(2)),
      method: p.method,
      referenceNo: p.referenceNo,
      paidAt: p.paidAt,
    });
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            FOODFLOW FINANCE & REBATES
          </p>
          <h1 className="text-2xl font-semibold sm:text-[28px]">{t.pages["billing"]}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Whole-paise monthly bills with automatic approved leave rebates, guest meals, and 5%
            GST.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="month"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            className="h-9 w-40 rounded-xl"
          />
          {canManageFinance && dataMode === "live" && (
            <Button
              size="sm"
              className="h-9 bg-[#087E8B] text-white hover:bg-[#066873]"
              onClick={() => void onGenerateBills(monthKey)}
            >
              <Plus className="mr-1.5 size-4" />
              {t.actions.generateBills}
            </Button>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-[24px] border border-[#DDF3EA] bg-[#DDF3EA]/50 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#0F3D3A]/70">
            Total Billed
          </p>
          <p className="mt-3 font-display text-2xl font-extrabold text-[#0F3D3A]">
            {moneyFromPaise(totalBilledPaise)}
          </p>
          <p className="mt-1 text-[11px] text-[#0F3D3A]/70">{filteredInvoices.length} invoice(s)</p>
        </div>
        <div className="rounded-[24px] border border-[#c0e8d8] bg-[#DDF3EA] p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#0F3D3A]/70">Collected</p>
          <p className="mt-3 font-display text-2xl font-extrabold text-[#0F3D3A]">
            {moneyFromPaise(totalCollectedPaise)}
          </p>
          <p className="mt-1 text-[11px] text-[#0F3D3A]/70">UPI, cash & bank verified</p>
        </div>
        <div className="rounded-[24px] border border-[#FFF1C7] bg-[#FFF1C7]/70 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#0F3D3A]/70">
            Leave Rebates
          </p>
          <p className="mt-3 font-display text-2xl font-extrabold text-[#0F3D3A]">
            {moneyFromPaise(totalRebatesPaise)}
          </p>
          <p className="mt-1 text-[11px] text-[#0F3D3A]/70">
            Auto-credited (&ge; {minRebateDays} consecutive days)
          </p>
        </div>
        <div className="rounded-[24px] border border-[#FFE1D0] bg-[#FFE1D0]/70 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#0F3D3A]/70">
            Outstanding Due
          </p>
          <p className="mt-3 font-display text-2xl font-extrabold text-[#0F3D3A]">
            {moneyFromPaise(Math.max(0, totalBilledPaise - totalCollectedPaise))}
          </p>
          <p className="mt-1 text-[11px] text-[#0F3D3A]/70">Across unpaid & partial bills</p>
        </div>
      </div>

      {/* Invoices Table */}
      <section className="overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Monthly Mess Invoices</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Click Record Payment on any invoice to update paid balance & ledger atomically.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search student or code..."
              className="h-9 rounded-full pl-8 text-xs"
            />
          </div>
        </div>

        {visibleInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">Student</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Base Fee</th>
                  <th className="px-4 py-3">Leave Rebate</th>
                  <th className="px-4 py-3">Guests + GST</th>
                  <th className="px-4 py-3">Total Payable</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visibleInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold">{inv.studentName}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {inv.studentCode}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">{inv.monthKey}</td>
                    <td className="px-4 py-3.5 tabular-nums">
                      {moneyFromPaise(inv.baseProratedPaise)}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-emerald-700">
                      −{moneyFromPaise(inv.leaveRebatePaise)}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums">
                      {moneyFromPaise(inv.guestChargesPaise + inv.gstPaise)}
                    </td>
                    <td className="px-4 py-3.5 font-bold tabular-nums">
                      {moneyFromPaise(inv.totalPayablePaise)}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums">{moneyFromPaise(inv.paidPaise)}</td>
                    <td className="px-4 py-3.5">
                      <Badge
                        variant="outline"
                        className={`rounded-full text-[10px] font-bold uppercase ${
                          inv.status === "paid"
                            ? "border-emerald-500/30 bg-emerald-50 text-emerald-700"
                            : inv.status === "partial"
                              ? "border-amber-500/30 bg-amber-50 text-amber-800"
                              : "border-rose-500/30 bg-rose-50 text-rose-700"
                        }`}
                      >
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {canManageFinance && inv.status !== "paid" && dataMode === "live" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px]"
                            onClick={() => {
                              setPayingInvoice(inv);
                              setPayAmount(
                                String(Math.round((inv.totalPayablePaise - inv.paidPaise) / 100)),
                              );
                              setPayRef(`UPI-${Date.now().toString().slice(-6)}`);
                            }}
                          >
                            <IndianRupee className="mr-1 size-3" /> Record payment
                          </Button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">
                            {inv.status === "paid" ? "Settled" : "View only"}
                          </span>
                        )}
                        {inv.paidPaise > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px]"
                            onClick={() => handlePrintInvoiceReceipt(inv)}
                          >
                            <Printer className="mr-1 size-3" /> {t.ops.printReceipt}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <IndianRupee className="mx-auto size-8 text-muted-foreground" />
            <h3 className="mt-3 text-sm font-semibold">{t.empty.noInvoicesTitle}</h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
              {t.empty.noInvoicesDesc}
            </p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-5 py-3 text-xs">
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Inline Record Payment Drawer/Panel */}
      {payingInvoice && (
        <form
          onSubmit={(e) => void handlePaymentSubmit(e)}
          className="space-y-4 rounded-2xl border border-[#087E8B]/40 bg-[#DDF3EA]/30 p-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#172B3A]">
              Record Payment for {payingInvoice.studentName} ({payingInvoice.monthKey})
            </h3>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPayingInvoice(null)}>
              Cancel
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Amount (₹)</Label>
              <Input
                type="number"
                min={1}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Payment Method</Label>
              <Select
                value={payMethod}
                onValueChange={(v) => setPayMethod(v as PaymentDoc["method"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Reference / UTR No.</Label>
              <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} required />
            </div>
          </div>
          <Button type="submit" disabled={busy} className="bg-[#087E8B] text-white">
            {busy ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
            Save Payment Ledger Entry
          </Button>
        </form>
      )}

      {/* Leave Rebates Queue & Recent Payments */}
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-sm">
          <div className="border-b bg-muted/20 px-5 py-4">
            <h2 className="text-sm font-semibold">Student Leave Rebate Approvals</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Rebate applies automatically on &ge; {minRebateDays} consecutive approved leave days.
            </p>
          </div>
          {leaves.length > 0 ? (
            <div className="divide-y">
              {leaves.slice(0, 8).map((lv) => (
                <div
                  key={lv.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-xs"
                >
                  <div>
                    <p className="font-semibold">
                      {lv.studentName} ({lv.studentCode}) · {lv.days} day(s)
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {lv.startDate} to {lv.endDate} · {lv.reason}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {lv.status}
                    </Badge>
                    {canManageFinance && lv.status === "pending" && dataMode === "live" && (
                      <>
                        <Button
                          size="sm"
                          className="h-7 bg-emerald-600 text-[10px] text-white"
                          onClick={() => void onUpdateLeaveStatus(lv, "approved")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] text-rose-600"
                          onClick={() => void onUpdateLeaveStatus(lv, "rejected")}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-6 text-center text-xs text-muted-foreground">
              No leave requests submitted yet.
            </p>
          )}
        </section>

        <section className="overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-sm">
          <div className="border-b bg-muted/20 px-5 py-4">
            <h2 className="text-sm font-semibold">Payment Ledger</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Immutable student payment receipts with printable HTML/PDF export.
            </p>
          </div>
          {payments.length > 0 ? (
            <div className="divide-y">
              {payments.slice(0, 8).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 text-xs"
                >
                  <div>
                    <p className="font-semibold">{p.studentName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.method.toUpperCase()} · Ref {p.referenceNo}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-emerald-700 tabular-nums">
                      +{moneyFromPaise(p.amountPaise)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px]"
                      onClick={() => handlePrintPaymentReceipt(p)}
                    >
                      <Printer className="mr-1 size-3" /> {t.ops.printReceipt}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-6 text-center text-xs text-muted-foreground">
              No payments recorded yet.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

const SAMPLE_DEMO_FEEDBACK: FeedbackDoc[] = [
  {
    id: "demo-fb-1",
    workspaceId: "demo",
    userId: "demo-stu-1",
    studentName: "Aarav Sharma",
    mealType: "Lunch",
    serviceDate: shiftDateKey(0),
    rating: 5,
    category: "taste",
    tags: ["taste", "freshness", "temperature"],
    dishRatings: [{ dish: "Rajma Masala", rating: 5 }],
    isAnonymous: false,
    moderationStatus: "approved",
    comment: "Rajma Masala was piping hot and balanced spices.",
    status: "resolved",
    createdBy: "demo-stu-1",
  },
  {
    id: "demo-fb-2",
    workspaceId: "demo",
    userId: "demo-stu-2",
    studentName: "Priya Nair",
    mealType: "Breakfast",
    serviceDate: shiftDateKey(-1),
    rating: 4,
    category: "portion",
    tags: ["taste", "quantity"],
    dishRatings: [{ dish: "Aloo Paratha", rating: 4 }],
    isAnonymous: true,
    moderationStatus: "approved",
    comment: "Curd portion was generous; paratha crisp.",
    status: "acknowledged",
    createdBy: "demo-stu-2",
  },
  {
    id: "demo-fb-3",
    workspaceId: "demo",
    userId: "demo-stu-3",
    studentName: "Rohan Verma",
    mealType: "Dinner",
    serviceDate: shiftDateKey(-2),
    rating: 2,
    category: "taste",
    tags: ["temperature", "taste"],
    dishRatings: [{ dish: "Mix Veg Curry", rating: 2 }],
    isAnonymous: false,
    moderationStatus: "approved",
    comment: "Mix Veg Curry tasted under-seasoned and lukewarm at 9:15 PM.",
    status: "open",
    createdBy: "demo-stu-3",
  },
  {
    id: "demo-fb-4",
    workspaceId: "demo",
    userId: "demo-stu-4",
    studentName: "Neha Kulkarni",
    mealType: "Snacks",
    serviceDate: shiftDateKey(-3),
    rating: 5,
    category: "hygiene",
    tags: ["hygiene", "freshness"],
    dishRatings: [{ dish: "Veg Samosa", rating: 5 }],
    isAnonymous: false,
    moderationStatus: "approved",
    comment: "Clean serving counter and hot ginger tea.",
    status: "resolved",
    createdBy: "demo-stu-4",
  },
];

const SAMPLE_DEMO_COMPLAINTS: ComplaintDoc[] = [
  {
    id: "demo-comp-1",
    workspaceId: "demo",
    userId: "demo-stu-3",
    studentName: "Rohan Verma",
    category: "Hygiene",
    subject: "Warm water dispenser filter alert near Hall B",
    description: "Water dispenser nozzle near Counter 2 needs cleaning before dinner service.",
    priority: "high",
    status: "in_progress",
    assignedTo: "Sanitation Lead",
    slaDeadlineAt: new Date(Date.now() + 3 * 3_600_000).toISOString(),
    escalatedToRoles: ["admin", "warden"],
    createdBy: "demo-stu-3",
  },
];

export function FeedbackComplaintsModule({
  feedback,
  complaints,
  institutionName = "FoodFlow Workspace",
  messSummary,
  dataMode,
  canModerate,
  onSubmitFeedback,
  onUpdateFeedbackStatus,
  onModerateFeedback,
  onSubmitComplaint,
  onResolveComplaint,
}: {
  feedback: FeedbackDoc[];
  complaints: ComplaintDoc[];
  institutionName?: string;
  messSummary?: SanitizedMessSummary | undefined;
  dataMode: "live" | "demo";
  canModerate: boolean;
  onSubmitFeedback: (params: {
    mealType: string;
    rating: number;
    category: FeedbackDoc["category"];
    comment: string;
    tags?: string[];
    dishRatings?: { dish: string; rating: number }[];
    isAnonymous?: boolean;
  }) => Promise<void>;
  onUpdateFeedbackStatus: (fb: FeedbackDoc, status: FeedbackDoc["status"]) => Promise<void>;
  onModerateFeedback: (fb: FeedbackDoc, moderationStatus: "approved" | "hidden") => Promise<void>;
  onSubmitComplaint: (params: {
    category: string;
    subject: string;
    description: string;
    priority: ComplaintDoc["priority"];
    photoDataUrl?: string;
  }) => Promise<void>;
  onResolveComplaint: (
    c: ComplaintDoc,
    status: ComplaintDoc["status"],
    note: string,
    assignedTo?: string,
  ) => Promise<void>;
}) {
  const { language } = useFirebaseAuth();
  const t = TRANSLATIONS[language];
  const todayKey = formatISTDateKey(new Date());

  const displayFeedback = useMemo(
    () => (dataMode === "demo" && feedback.length === 0 ? SAMPLE_DEMO_FEEDBACK : feedback),
    [dataMode, feedback],
  );
  const displayComplaints = useMemo(
    () => (dataMode === "demo" && complaints.length === 0 ? SAMPLE_DEMO_COMPLAINTS : complaints),
    [complaints, dataMode],
  );

  const [fbMeal, setFbMeal] = useState("Lunch");
  const [fbRating, setFbRating] = useState(5);
  const [fbCat, setFbCat] = useState<FeedbackDoc["category"]>("taste");
  const [fbComment, setFbComment] = useState("");
  const [fbTags, setFbTags] = useState<string[]>(["taste"]);
  const [fbDishName, setFbDishName] = useState("");
  const [fbDishRating, setFbDishRating] = useState(5);
  const [fbAnonymous, setFbAnonymous] = useState(false);

  const [compSubject, setCompSubject] = useState("");
  const [compCat, setCompCat] = useState("Hygiene");
  const [compPriority, setCompPriority] = useState<ComplaintDoc["priority"]>("medium");
  const [compDesc, setCompDesc] = useState("");
  const [compPhotoDataUrl, setCompPhotoDataUrl] = useState<string | undefined>(undefined);
  const [compressingPhoto, setCompressingPhoto] = useState(false);

  const [assigneeById, setAssigneeById] = useState<Record<string, string>>({});
  const [topicSummary, setTopicSummary] = useState<InsightsResponse | null>(null);
  const [loadingTopicSummary, setLoadingTopicSummary] = useState(false);
  const [busy, setBusy] = useState(false);

  const analytics = useMemo(
    () =>
      analyzeDishQualityLoop({
        feedbackList: displayFeedback,
        complaints: displayComplaints,
        todayDateKey: todayKey,
      }),
    [displayComplaints, displayFeedback, todayKey],
  );

  const mealHeatmap = useMemo(() => {
    const slots = ["Breakfast", "Lunch", "Snacks", "Dinner"];
    return slots.map((slot) => {
      const matches = displayFeedback.filter(
        (f) => f.moderationStatus !== "hidden" && f.mealType.toLowerCase() === slot.toLowerCase(),
      );
      const avg = matches.length ? matches.reduce((s, m) => s + m.rating, 0) / matches.length : 0;
      return { slot, count: matches.length, avg };
    });
  }, [displayFeedback]);

  const toggleTag = (tag: string) => {
    setFbTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag].slice(0, 5),
    );
  };

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressingPhoto(true);
    try {
      const compactUrl = await compressImageFileToDataUrl(file);
      setCompPhotoDataUrl(compactUrl);
      toast.success("Photo compressed and attached.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not attach photo.");
    } finally {
      setCompressingPhoto(false);
      e.target.value = "";
    }
  };

  const handleGenerateTopicSummary = async () => {
    setLoadingTopicSummary(true);
    try {
      const topicAgg = FEEDBACK_TAGS.map((topic) => {
        const matched = displayFeedback.filter(
          (f) =>
            f.moderationStatus !== "hidden" && (f.tags?.includes(topic) || f.category === topic),
        );
        return {
          topic,
          count: matched.length,
          avgRating: matched.length
            ? Number((matched.reduce((s, r) => s + r.rating, 0) / matched.length).toFixed(1))
            : 0,
        };
      }).filter((row) => row.count > 0);

      const baseSummary: SanitizedMessSummary = messSummary ?? {
        lang: language,
        stock: {
          totalItems: 0,
          lowStockCount: 0,
          expiringSoonCount: 0,
          topLowStock: [],
          topExpiring: [],
        },
        menu: {
          todayMenus: [],
          recipeCount: 0,
          avgRecipeCostRupees: 0,
          topCostEffectiveRecipes: [],
        },
        billing: {
          invoiceCount: 0,
          unpaidCount: 0,
          totalBilledRupees: 0,
          totalCollectedRupees: 0,
          pendingRupees: 0,
        },
        waste: {
          logCount: 0,
          totalPreparedKg: 0,
          totalWastedKg: 0,
          totalWasteCostRupees: 0,
          wastePct: 0,
          topWastedDishes: [],
        },
        ratings: {
          feedbackCount: analytics.totalReviews,
          avgRating: analytics.avgRatingOverall,
          lowRatedMeals: displayFeedback
            .filter((f) => f.rating <= 3)
            .slice(0, 4)
            .map((f) => ({ mealType: f.mealType, rating: f.rating, category: f.category })),
          topicCounts: topicAgg,
          openComplaintsCount: analytics.openComplaintsCount,
        },
        operations: { activeStudentsCount: 0, pastAttendanceAvg: 0, upcomingHolidays: [] },
      };

      const resolvedTopics = topicAgg.length > 0 ? topicAgg : baseSummary.ratings.topicCounts;
      const enrichedSummary: SanitizedMessSummary = {
        ...baseSummary,
        lang: language,
        ratings: {
          ...baseSummary.ratings,
          feedbackCount: analytics.totalReviews,
          avgRating: analytics.avgRatingOverall,
          ...(resolvedTopics ? { topicCounts: resolvedTopics } : {}),
          openComplaintsCount: analytics.openComplaintsCount,
        },
      };

      const res = await requestInsightsAI({ kind: "feedback_summary", summary: enrichedSummary });
      setTopicSummary(res);
    } finally {
      setLoadingTopicSummary(false);
    }
  };

  const handlePrintWeeklyCommitteeReport = () => {
    exportToPrintablePDF({
      title: "Weekly Mess Committee Feedback & Quality Report",
      institutionName,
      subtitle: "Dish Quality Loop Leaderboard, Sentiment & Complaint SLA Summary",
      dateRange: `Ending ${todayKey}`,
      summary: [
        { label: "Avg Overall Rating", value: `${analytics.avgRatingOverall || "—"} / 5 ★` },
        {
          label: "Today's Rating",
          value: analytics.avgRatingToday ? `${analytics.avgRatingToday} / 5` : "—",
        },
        { label: "Total Reviews", value: String(analytics.totalReviews) },
        {
          label: "Open / Escalated SLA",
          value: `${analytics.openComplaintsCount} (${analytics.escalatedCount} esc.)`,
        },
      ],
      headers: ["Dish / Meal", "Avg Rating", "Reviews", "Quality Status"],
      rows: analytics.dishLeaderboard.map((d) => [
        d.dish,
        `${d.avgRating.toFixed(1)} ★`,
        d.count,
        d.status === "favorite"
          ? "Student Favorite"
          : d.status === "needs_review"
            ? "Needs Chef Review"
            : "Standard",
      ]),
    });
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            DINER EXPERIENCE & SLA
          </p>
          <h1 className="text-2xl font-semibold sm:text-[28px]">{t.pages["feedback"]}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dish-level quality loop, 7-day rating trend, moderation guardrails, and 4h–48h SLA
            escalation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            disabled={loadingTopicSummary}
            onClick={() => void handleGenerateTopicSummary()}
          >
            {loadingTopicSummary ? (
              <LoaderCircle className="mr-1.5 size-3.5 animate-spin text-[#087E8B]" />
            ) : (
              <Sparkles className="mr-1.5 size-3.5 text-[#087E8B]" />
            )}
            {t.ops.aiTopicSummary}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            onClick={handlePrintWeeklyCommitteeReport}
          >
            <FileText className="mr-1.5 size-3.5" />
            {t.ops.weeklyCommitteeReport}
          </Button>
        </div>
      </section>

      {topicSummary && (
        <section className="space-y-2 rounded-[24px] border border-[#087E8B]/30 bg-[#DDF3EA]/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-[#0F3D3A]">
              {t.ai.feedbackSummary} · {topicSummary.highlightMetric}
            </p>
            <Badge variant="outline" className="text-[10px] capitalize">
              {topicSummary.source === "formula-fallback"
                ? "Formula Fallback"
                : topicSummary.source}
            </Badge>
          </div>
          {topicSummary.notice && (
            <p className="text-[11px] font-medium text-amber-800">{topicSummary.notice}</p>
          )}
          <ul className="space-y-1 text-xs text-[#172B3A]">
            {topicSummary.tips.map((tip, idx) => (
              <li key={idx}>• {tip}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Meal Rating Heatmap */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {mealHeatmap.map((row) => (
          <div
            key={row.slot}
            className="rounded-[24px] border border-[#E5EAF0] bg-white p-5 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-[#718096]">
                {row.slot}
              </p>
              <Star className="size-4 text-[#FF7A1A]" />
            </div>
            <p className="mt-3 font-display text-2xl font-extrabold text-[#172B3A]">
              {row.count > 0 ? `${row.avg.toFixed(1)} / 5` : "—"}
            </p>
            <p className="mt-1 text-[11px] text-[#718096]">{row.count} rating(s)</p>
          </div>
        ))}
      </div>

      {/* Dish Quality Loop + 7-Day Trend */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">7-Day Rating Trend</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Today:{" "}
                {analytics.avgRatingToday ? `${analytics.avgRatingToday} ★` : "No ratings today"} ·
                Overall: {analytics.avgRatingOverall || "—"} ★ ({analytics.totalReviews} reviews)
              </p>
            </div>
            {analytics.flaggedCount > 0 && (
              <Badge
                variant="outline"
                className="border-amber-300 bg-amber-50 text-[10px] text-amber-800"
              >
                {analytics.flaggedCount} flagged
              </Badge>
            )}
          </div>
          <div className="h-[210px] p-4">
            {analytics.trend7Days.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={analytics.trend7Days}
                  margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                >
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <YAxis
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10 }}
                  />
                  <RechartsTooltip />
                  <Line
                    type="monotone"
                    dataKey="avgRating"
                    name="Avg Rating"
                    stroke="#087E8B"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-xs text-muted-foreground">
                No trend ratings recorded yet.
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-sm">
          <div className="flex items-center justify-between border-b bg-muted/20 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Dish Quality Loop</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Highlights Student Favorites (&ge; 4.2★) and dishes needing chef review (&lt; 3.0★).
              </p>
            </div>
          </div>
          <div className="divide-y p-4 space-y-3">
            {analytics.dishLeaderboard.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs">
                    <p className="text-[10px] font-bold uppercase text-emerald-700">
                      Best Rated Dish
                    </p>
                    <p className="mt-1 font-bold text-[#172B3A]">
                      {analytics.bestDish?.dish ?? "—"}
                    </p>
                    <p className="text-[11px] text-emerald-800">
                      {analytics.bestDish
                        ? `${analytics.bestDish.avgRating.toFixed(1)} ★ (${analytics.bestDish.count})`
                        : ""}
                    </p>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs">
                    <p className="text-[10px] font-bold uppercase text-rose-700">
                      Needs Chef Review (&lt; 3.0★)
                    </p>
                    <p className="mt-1 font-bold text-[#172B3A]">
                      {analytics.lowRatedDishesNeedingReview[0]?.dish ?? "None flagged"}
                    </p>
                    <p className="text-[11px] text-rose-800">
                      {analytics.lowRatedDishesNeedingReview[0]
                        ? `${analytics.lowRatedDishesNeedingReview[0].avgRating.toFixed(1)} ★ · Swap/adjust`
                        : "All dishes >= 3.0★"}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5 pt-1">
                  {analytics.dishLeaderboard.slice(0, 4).map((d) => (
                    <div key={d.dish} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#172B3A]">{d.dish}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold tabular-nums">{d.avgRating.toFixed(1)} ★</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            d.status === "favorite"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                              : d.status === "needs_review"
                                ? "border-rose-300 bg-rose-50 text-rose-700"
                                : "border-border"
                          }`}
                        >
                          {d.status === "favorite"
                            ? "Favorite"
                            : d.status === "needs_review"
                              ? "Review"
                              : "OK"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="py-10 text-center text-xs text-muted-foreground">
                Add dish-level ratings to see chef favorites & review alerts.
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Submit Meal Feedback */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (dataMode === "demo") {
              toast.info("Switch to Live Mode to submit feedback.");
              return;
            }
            setBusy(true);
            try {
              await onSubmitFeedback({
                mealType: fbMeal,
                rating: fbRating,
                category: fbCat,
                comment: fbComment,
                tags: fbTags,
                ...(fbDishName.trim()
                  ? { dishRatings: [{ dish: fbDishName.trim(), rating: fbDishRating }] }
                  : {}),
                isAnonymous: fbAnonymous,
              });
              setFbComment("");
              setFbDishName("");
            } finally {
              setBusy(false);
            }
          }}
          className="space-y-4 rounded-[24px] border border-border/70 bg-card p-5 shadow-sm"
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquareHeart className="size-4 text-[#087E8B]" /> Rate a Meal
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={fbMeal} onValueChange={setFbMeal}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Breakfast", "Lunch", "Snacks", "Dinner"].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(fbRating)} onValueChange={(v) => setFbRating(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 4, 3, 2, 1].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} Stars
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={fbCat} onValueChange={(v) => setFbCat(v as FeedbackDoc["category"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="taste">Taste</SelectItem>
                <SelectItem value="hygiene">Hygiene</SelectItem>
                <SelectItem value="portion">Portion</SelectItem>
                <SelectItem value="timing">Timing</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {FEEDBACK_TAGS.map((tag) => {
              const active = fbTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors ${
                    active
                      ? "border-[#087E8B] bg-[#DDF3EA] text-[#087E8B]"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_110px]">
            <Input
              value={fbDishName}
              onChange={(e) => setFbDishName(e.target.value)}
              placeholder="Optional dish name (e.g. Rajma Masala)"
              className="text-xs"
            />
            <Select value={String(fbDishRating)} onValueChange={(v) => setFbDishRating(Number(v))}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 4, 3, 2, 1].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    Dish: {n}★
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Textarea
            value={fbComment}
            onChange={(e) => setFbComment(e.target.value)}
            placeholder="Share feedback on dish quality, spice level, or serving speed..."
            rows={2}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={fbAnonymous}
                onChange={(e) => setFbAnonymous(e.target.checked)}
                className="size-3.5 accent-[#087E8B]"
              />
              Post anonymously (hide name on board)
            </label>
            <Button type="submit" disabled={busy} className="bg-[#087E8B] text-white">
              Submit Meal Feedback
            </Button>
          </div>
        </form>

        {/* File Complaint Ticket */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (dataMode === "demo") {
              toast.info("Switch to Live Mode to file a complaint.");
              return;
            }
            if (!compSubject.trim() || !compDesc.trim()) return;
            setBusy(true);
            try {
              await onSubmitComplaint({
                category: compCat,
                subject: compSubject,
                description: compDesc,
                priority: compPriority,
                ...(compPhotoDataUrl ? { photoDataUrl: compPhotoDataUrl } : {}),
              });
              setCompSubject("");
              setCompDesc("");
              setCompPhotoDataUrl(undefined);
            } finally {
              setBusy(false);
            }
          }}
          className="space-y-4 rounded-[24px] border border-border/70 bg-card p-5 shadow-sm"
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardCheck className="size-4 text-[#FF7A1A]" /> Raise Dining Complaint Ticket
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={compSubject}
              onChange={(e) => setCompSubject(e.target.value)}
              placeholder="Ticket subject (e.g. Cold chapatis at Counter 2)"
              className="sm:col-span-2"
              required
            />
            <Select value={compCat} onValueChange={setCompCat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Hygiene", "Quality", "Billing", "Timing", "Staff"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={compPriority}
              onValueChange={(v) => setCompPriority(v as ComplaintDoc["priority"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low (48h SLA)</SelectItem>
                <SelectItem value="medium">Medium (24h SLA)</SelectItem>
                <SelectItem value="high">High (4h SLA)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {compCat === "Hygiene" && (
            <p className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-900">
              <ShieldAlert className="size-3.5 text-amber-600" />
              Hygiene complaints auto-escalate to Admin & Warden with a 4-hour SLA.
            </p>
          )}
          <Textarea
            value={compDesc}
            onChange={(e) => setCompDesc(e.target.value)}
            placeholder="Describe the issue clearly so the Kitchen Head can resolve it..."
            rows={2}
            required
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium hover:bg-muted/40">
                <Camera className="size-3.5 text-[#087E8B]" />
                {compressingPhoto ? "Compressing..." : "Attach Photo (< 90 KB)"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handlePhotoChange(e)}
                />
              </label>
              {compPhotoDataUrl && (
                <div className="flex items-center gap-1.5">
                  <img
                    src={compPhotoDataUrl}
                    alt="Complaint attachment"
                    className="size-8 rounded-md border object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => setCompPhotoDataUrl(undefined)}
                    className="rounded-full bg-muted p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}
            </div>
            <Button
              type="submit"
              disabled={busy || compressingPhoto}
              className="bg-[#FF7A1A] text-[#0F3D3A] hover:bg-[#e56e17]"
            >
              File Complaint Ticket
            </Button>
          </div>
        </form>
      </div>

      {/* Lists */}
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-sm">
          <div className="flex items-center justify-between border-b bg-muted/20 px-5 py-4">
            <h2 className="text-sm font-semibold">
              Recent Meal Ratings ({displayFeedback.length})
            </h2>
            {canModerate && analytics.flaggedCount > 0 && (
              <Badge
                variant="outline"
                className="border-amber-300 bg-amber-50 text-[10px] text-amber-800"
              >
                {t.ops.moderationQueue}: {analytics.flaggedCount}
              </Badge>
            )}
          </div>
          {displayFeedback.length > 0 ? (
            <div className="divide-y">
              {displayFeedback
                .filter((fb) => fb.moderationStatus !== "hidden" || canModerate)
                .slice(0, 12)
                .map((fb) => {
                  const isFlagged = fb.moderationStatus === "flagged";
                  const isHidden = fb.moderationStatus === "hidden";
                  const author = fb.isAnonymous ? t.ops.anonymousLabel : fb.studentName;
                  return (
                    <div
                      key={fb.id}
                      className={`flex items-start justify-between gap-3 px-5 py-3.5 text-xs ${
                        isHidden ? "opacity-55" : ""
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="font-semibold">
                          {author} · {fb.mealType} ({fb.rating}/5 ★)
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {isFlagged
                            ? "[Flagged by auto-moderation — pending Kitchen Head / Warden approval]"
                            : fb.comment || "No comment"}{" "}
                          · {fb.serviceDate}
                        </p>
                        {(fb.tags?.length || fb.dishRatings?.length) && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {fb.tags?.map((tag) => (
                              <span
                                key={tag}
                                className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                              >
                                #{tag}
                              </span>
                            ))}
                            {fb.dishRatings?.map((dr) => (
                              <span
                                key={dr.dish}
                                className="rounded bg-[#DDF3EA]/70 px-1.5 py-0.5 text-[10px] font-semibold text-[#0F3D3A]"
                              >
                                {dr.dish}: {dr.rating}★
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <div className="flex items-center gap-1">
                          {isFlagged && (
                            <Badge
                              variant="outline"
                              className="border-amber-300 bg-amber-50 text-[10px] text-amber-800"
                            >
                              Flagged
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {fb.status}
                          </Badge>
                        </div>
                        {canModerate && isFlagged && dataMode === "live" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 border-emerald-300 px-2 text-[10px] text-emerald-700"
                              onClick={() => void onModerateFeedback(fb, "approved")}
                            >
                              {t.ops.approve}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 border-rose-300 px-2 text-[10px] text-rose-700"
                              onClick={() => void onModerateFeedback(fb, "hidden")}
                            >
                              {t.ops.hide}
                            </Button>
                          </div>
                        )}
                        {canModerate &&
                          fb.status !== "resolved" &&
                          !isFlagged &&
                          dataMode === "live" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px]"
                              onClick={() =>
                                void onUpdateFeedbackStatus(
                                  fb,
                                  fb.status === "open" ? "acknowledged" : "resolved",
                                )
                              }
                            >
                              {fb.status === "open" ? "Acknowledge" : "Resolve"}
                            </Button>
                          )}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="p-8 text-center text-xs text-muted-foreground">
              {t.empty.noFeedbackTitle}
            </p>
          )}
        </section>

        <section className="overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-sm">
          <div className="border-b bg-muted/20 px-5 py-4">
            <h2 className="text-sm font-semibold">
              Complaint Tickets ({displayComplaints.length})
            </h2>
          </div>
          {displayComplaints.length > 0 ? (
            <div className="divide-y">
              {displayComplaints.slice(0, 12).map((c) => {
                const sla = formatSlaRemaining(c.slaDeadlineAt, c.status);
                const assigneeVal = assigneeById[c.id] ?? c.assignedTo ?? "";
                return (
                  <div
                    key={c.id}
                    className="flex items-start justify-between gap-3 px-5 py-3.5 text-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-semibold">
                          {c.subject} <span className="text-muted-foreground">({c.category})</span>
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            sla.tone === "red"
                              ? "border-rose-300 bg-rose-50 text-rose-700"
                              : sla.tone === "amber"
                                ? "border-amber-300 bg-amber-50 text-amber-800"
                                : "border-emerald-300 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          <Clock3 className="mr-1 size-2.5" />
                          {sla.label}
                        </Badge>
                        {c.escalatedToRoles && c.escalatedToRoles.length > 0 && (
                          <Badge
                            variant="outline"
                            className="border-rose-300 bg-rose-50 text-[10px] text-rose-700"
                          >
                            <AlertTriangle className="mr-1 size-2.5" />
                            Escalated: {c.escalatedToRoles.join(", ")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {c.studentName} · {c.description}
                      </p>
                      {c.photoDataUrl && (
                        <img
                          src={c.photoDataUrl}
                          alt={`Evidence for ${c.subject}`}
                          className="mt-1 h-16 w-24 rounded-lg border object-cover"
                        />
                      )}
                      {c.assignedTo && (
                        <p className="text-[10px] font-medium text-[#087E8B]">
                          Assigned to: {c.assignedTo}
                        </p>
                      )}
                      {c.resolutionNote && (
                        <p className="text-[11px] font-medium text-emerald-700">
                          Resolution: {c.resolutionNote}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {c.status}
                      </Badge>
                      {canModerate && c.status !== "resolved" && dataMode === "live" && (
                        <div className="flex flex-col items-end gap-1">
                          <Input
                            value={assigneeVal}
                            onChange={(e) =>
                              setAssigneeById((prev) => ({ ...prev, [c.id]: e.target.value }))
                            }
                            placeholder="Assignee name"
                            className="h-7 w-32 text-[10px]"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px]"
                            onClick={() =>
                              void onResolveComplaint(
                                c,
                                c.status === "open" ? "in_progress" : "resolved",
                                c.status === "open"
                                  ? "Assigned to shift supervisor"
                                  : "Resolved by kitchen team",
                                assigneeVal.trim() || undefined,
                              )
                            }
                          >
                            {c.status === "open" ? "Start SLA" : "Mark Resolved"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="p-8 text-center text-xs text-muted-foreground">
              No complaints filed yet.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

export function DataHealthCard() {
  const {
    user,
    activeWorkspace,
    role,
    firestoreConnected,
    lastWriteIso,
    markWriteRecorded,
    language,
  } = useFirebaseAuth();
  const t = TRANSLATIONS[language];
  const [testingWrite, setTestingWrite] = useState(false);
  const [testingRead, setTestingRead] = useState(false);
  const [readResult, setReadResult] = useState<{
    workspaceName: string;
    memberCount: number;
    hallCount: number;
    latencyMs: number;
  } | null>(null);
  const [diagError, setDiagError] = useState<string | null>(null);

  const handleTestWrite = async () => {
    if (!user || !activeWorkspace) {
      toast.error("Sign in and select a workspace first.");
      return;
    }
    setTestingWrite(true);
    setDiagError(null);
    try {
      const iso = await runHealthWriteTest(activeWorkspace.id, user);
      markWriteRecorded(iso);
      toast.success("Firestore test write succeeded!");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Test write failed.";
      setDiagError(msg);
      toast.error("Firestore test write blocked or failed.");
    } finally {
      setTestingWrite(false);
    }
  };

  const handleTestRead = async () => {
    if (!activeWorkspace) {
      toast.error("No active workspace selected.");
      return;
    }
    setTestingRead(true);
    setDiagError(null);
    try {
      const res = await runHealthReadTest(activeWorkspace.id);
      setReadResult(res);
      toast.success(`Firestore read verified (${res.latencyMs} ms).`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Test read failed.";
      setDiagError(msg);
      toast.error("Firestore test read blocked or failed.");
    } finally {
      setTestingRead(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-[24px] border border-[#087E8B]/30 bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-[#DDF3EA]/40 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-[#087E8B] text-white">
            <Database className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#172B3A]">{t.dataHealth.title}</h2>
            <p className="text-[11px] text-[#718096]">{t.dataHealth.subtitle}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`rounded-full px-3 py-1 text-[11px] font-bold ${
            firestoreConnected
              ? "border-emerald-500/30 bg-emerald-50 text-emerald-700"
              : "border-rose-500/30 bg-rose-50 text-rose-700"
          }`}
        >
          {firestoreConnected ? t.dataHealth.connected : t.dataHealth.offline}
        </Badge>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 text-xs">
        <div className="rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#718096]">
            {t.dataHealth.uidLabel}
          </p>
          <p className="mt-1.5 break-all font-mono font-semibold text-[#172B3A]">
            {user?.uid ?? "Not signed in"}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#718096]">
            {t.dataHealth.workspaceIdLabel}
          </p>
          <p className="mt-1.5 break-all font-mono font-semibold text-[#172B3A]">
            {activeWorkspace?.id ?? "None"}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#718096]">
            {t.dataHealth.roleLabel}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 font-bold text-[#087E8B]">
            <ShieldCheck className="size-4" />
            {formatWorkspaceRole(role, language)}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-3.5 sm:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#718096]">
              {t.dataHealth.lastWriteLabel}
            </p>
            <p className="mt-1 font-mono text-xs font-semibold text-[#172B3A]">
              {lastWriteIso
                ? new Date(lastWriteIso).toLocaleString("en-IN")
                : "No write recorded in this session yet"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={testingRead || !activeWorkspace}
              onClick={() => void handleTestRead()}
            >
              {testingRead ? (
                <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Activity className="mr-1.5 size-3.5" />
              )}
              {t.dataHealth.runTestRead}
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-[#087E8B] text-white hover:bg-[#066873]"
              disabled={testingWrite || !activeWorkspace}
              onClick={() => void handleTestWrite()}
            >
              {testingWrite ? (
                <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 size-3.5" />
              )}
              {t.dataHealth.runTestWrite}
            </Button>
          </div>
        </div>
      </div>

      {readResult && (
        <div className="mx-5 mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          Verified live read of <strong>{readResult.workspaceName}</strong> (
          {readResult.memberCount} member(s), {readResult.hallCount} dining hall(s)) in{" "}
          {readResult.latencyMs} ms.
        </div>
      )}

      {diagError && (
        <div className="mx-5 mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 break-words">
          {diagError}
        </div>
      )}
    </section>
  );
}

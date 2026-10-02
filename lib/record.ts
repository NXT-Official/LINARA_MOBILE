import { formatHoursMinutes, formatPeso } from "./format";

/** The slice of a payslip My Record needs (services/api/payslips.ts `Payslip`). */
export interface RecordPayslip {
  netPay: number;
  statutoryEmployeeShare: number;
  payoutStatus: "pending_send" | "processing" | "succeeded" | "failed" | "needs_review";
  confirmedAt: string | null;
  /** "manual" for a payment made outside Linara; absent means Xendit. */
  payoutProvider?: string;
  /** Her answer to a manual payment. */
  helperAck?: "pending" | "confirmed" | "disputed" | null;
}

/**
 * Whether a payment counts as received on her record: a Xendit payout that
 * succeeded, or a payment made outside Linara that she confirmed. One she
 * hasn't answered, or disputes, is listed but not counted.
 */
export function countsAsReceived(p: RecordPayslip): boolean {
  if (p.payoutStatus !== "succeeded") return false;
  return p.payoutProvider !== "manual" || p.helperAck === "confirmed";
}

/**
 * Pay she has actually received: payouts that succeeded, and payments made
 * outside Linara that she confirmed (countsAsReceived). The
 * statutory figure is her employee share of SSS, PhilHealth and Pag-IBIG as
 * deducted on those payslips -- deducted, not "paid in": remittance to the
 * agencies isn't tracked yet (../LINARA/KNOWN_GAPS.md C46).
 */
export function summarizePay(payslips: RecordPayslip[]) {
  const paid = payslips.filter(countsAsReceived);
  const lastPaidAt = paid
    .map((p) => p.confirmedAt)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);
  return {
    paidCount: paid.length,
    paidTotal: paid.reduce((sum, p) => sum + p.netPay, 0),
    deductedStatutory: paid.reduce((sum, p) => sum + p.statutoryEmployeeShare, 0),
    lastPaidAt: lastPaidAt ?? null,
  };
}

/** Rest she has taken as time off: approved rest-off requests only. */
export function restTakenMinutes(requests: { status: string; minutes: number }[]): number {
  return requests.filter((r) => r.status === "approved").reduce((sum, r) => sum + r.minutes, 0);
}

/** The slice of a leave row her record needs (services/api/leave.ts `Leave`). */
export interface RecordLeave {
  kind: "sil" | "in_kind" | "unpaid" | "extra_paid";
  status: string;
  startDate: string;
  days: number;
}

const LEAVE_ORDER: RecordLeave["kind"][] = ["sil", "extra_paid", "in_kind", "unpaid"];

/**
 * Leave she has taken, per year (by the year it started) and kind: approved
 * leave only, in working days. Newest year first. Part of the RA 10361 record
 * she keeps (../LINARA/LEAVE_PLAN.md step 6).
 */
export function summarizeLeave(
  leave: RecordLeave[],
): { year: number; days: Partial<Record<RecordLeave["kind"], number>> }[] {
  const byYear = new Map<number, Partial<Record<RecordLeave["kind"], number>>>();
  for (const l of leave) {
    if (l.status !== "approved") continue;
    const year = Number(l.startDate.slice(0, 4));
    const days = byYear.get(year) ?? {};
    days[l.kind] = (days[l.kind] ?? 0) + l.days;
    byYear.set(year, days);
  }
  return [...byYear.entries()].sort((a, b) => b[0] - a[0]).map(([year, days]) => ({ year, days }));
}

/** "3 days SIL, 2 days unpaid", with the kinds' names given, in a fixed order. */
export function leaveDaysLabel(
  days: Partial<Record<RecordLeave["kind"], number>>,
  names: Record<RecordLeave["kind"], string>,
  unit: (n: number) => string,
): string {
  return LEAVE_ORDER.filter((k) => (days[k] ?? 0) > 0)
    .map((k) => `${unit(days[k] ?? 0)} ${names[k]}`)
    .join(", ");
}

const LEAVE_SHARE_NAMES: Record<RecordLeave["kind"], string> = {
  sil: "service incentive leave",
  extra_paid: "extra paid leave",
  in_kind: "off in kind",
  unpaid: "unpaid leave",
};
const englishDays = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

export interface RecordSummary {
  name: string;
  station: string;
  employment: "live-in" | "live-out" | null;
  recordSince: string;
  tasksDone: number;
  pay: ReturnType<typeof summarizePay>;
  restTaken: number;
  /** Her leave, any status; only approved leave is counted. */
  leave?: RecordLeave[];
}

const DATE = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });

/**
 * The text she can share (a loan, a visa, the next job). States only what the
 * app holds; it doesn't claim to be a certificate or that the record moves
 * with her to another household (O4 is still open).
 */
export function recordShareText(r: RecordSummary): string {
  return [
    `Work record from Linara — ${r.name}`,
    `Role: ${r.station}${r.employment ? ` (${r.employment})` : ""}`,
    `On record since: ${DATE(r.recordSince)}`,
    `Tasks completed: ${r.tasksDone}`,
    `Payslips received: ${r.pay.paidCount}, totalling ${formatPeso(r.pay.paidTotal)} net`,
    r.pay.lastPaidAt ? `Last paid: ${DATE(r.pay.lastPaidAt)}` : null,
    `SSS / PhilHealth / Pag-IBIG deducted (employee share): ${formatPeso(r.pay.deductedStatutory)}`,
    r.restTaken > 0 ? `Rest taken as time off: ${formatHoursMinutes(r.restTaken)}` : null,
    ...summarizeLeave(r.leave ?? []).map(
      (y) => `Leave taken in ${y.year}: ${leaveDaysLabel(y.days, LEAVE_SHARE_NAMES, englishDays)}`,
    ),
  ]
    .filter(Boolean)
    .join("\n");
}

import { formatHoursMinutes, formatPeso } from "./format";

/** The slice of a payslip My Record needs (services/api/payslips.ts `Payslip`). */
export interface RecordPayslip {
  netPay: number;
  statutoryEmployeeShare: number;
  payoutStatus: "pending_send" | "processing" | "succeeded" | "failed" | "needs_review";
  confirmedAt: string | null;
}

/**
 * Pay she has actually received: only payouts that succeeded count. The
 * statutory figure is her employee share of SSS, PhilHealth and Pag-IBIG as
 * deducted on those payslips -- deducted, not "paid in": remittance to the
 * agencies isn't tracked yet (../LINARA/KNOWN_GAPS.md C46).
 */
export function summarizePay(payslips: RecordPayslip[]) {
  const paid = payslips.filter((p) => p.payoutStatus === "succeeded");
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

export interface RecordSummary {
  name: string;
  station: string;
  employment: "live-in" | "live-out" | null;
  recordSince: string;
  tasksDone: number;
  pay: ReturnType<typeof summarizePay>;
  restTaken: number;
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
  ]
    .filter(Boolean)
    .join("\n");
}

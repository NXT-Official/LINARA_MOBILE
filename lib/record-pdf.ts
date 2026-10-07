import { formatHoursMinutes } from "./format";
import { leaveDaysLabel, summarizeLeave, type RecordLeave, type summarizePay } from "./record";

/**
 * The HTML for her downloadable work record (../LINARA/KNOWN_GAPS.md O4).
 * expo-print turns it into a PDF on the phone, so the file is hers: it
 * survives a household removing her, which is the one honest form of "your
 * record stays with you" the app can back today.
 *
 * Written in English for whoever she hands it to (a bank, an agency, the
 * next employer). It states only what the household's Linara records hold,
 * says "deducted", never "remitted" (remittance isn't tracked, C46), and says
 * plainly that it isn't a certificate of employment.
 */

export interface RecordPdfPayslip {
  cutoffStart: string;
  cutoffEnd: string;
  basePay: number;
  statutoryEmployeeShare: number;
  valeDeductions: number;
  /** Unpaid leave it deducted (../LINARA/supabase/add-unpaid-leave-pay.sql); absent before. */
  unpaidLeaveDeduction?: number;
  netPay: number;
  payoutStatus: string;
  confirmedAt: string | null;
  /** From add-pay-periods.sql; absent means a regular Xendit payout. */
  kind?: "regular" | "thirteenth_month";
  payoutProvider?: string;
  payoutChannelCode?: string;
  paidOn?: string | null;
  helperAck?: "pending" | "confirmed" | "disputed" | null;
}

const METHOD: Record<string, string> = {
  PH_GCASH: "GCash",
  PH_PAYMAYA: "Maya",
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  OTHER: "Other",
};

/** "GCash", or for a payment made outside Linara whether she has confirmed it. */
function howPaid(p: RecordPdfPayslip): string {
  const method = METHOD[p.payoutChannelCode ?? ""] ?? "—";
  if (p.payoutProvider !== "manual") return method;
  if (p.helperAck === "confirmed") return `${method}, confirmed by the helper`;
  if (p.helperAck === "disputed") return `${method}, disputed by the helper`;
  return `${method}, not yet confirmed by the helper`;
}

export interface RecordPdfRest {
  restDate: string;
  startTime: string;
  endTime: string;
  minutes: number;
  status: string;
}

export interface RecordPdfLeave extends RecordLeave {
  endDate: string;
  reason: "vacation" | "sick" | "family" | "other";
  /** Set when the household recorded it: her answer. */
  helperAck: "pending" | "confirmed" | "disputed" | null;
}

const LEAVE_KIND: Record<RecordLeave["kind"], string> = {
  sil: "Service incentive leave",
  extra_paid: "Extra paid leave",
  in_kind: "Day off in kind",
  unpaid: "Unpaid leave",
};
const LEAVE_KIND_SHORT: Record<RecordLeave["kind"], string> = {
  sil: "service incentive leave",
  extra_paid: "extra paid leave",
  in_kind: "off in kind",
  unpaid: "unpaid",
};
const LEAVE_REASON: Record<RecordPdfLeave["reason"], string> = {
  vacation: "Vacation",
  sick: "Sick",
  family: "Family",
  other: "Other",
};

/** Who put it on the record, and what she said about it. */
function leaveSource(l: RecordPdfLeave): string {
  if (l.helperAck === null) return "Asked by the helper; approved";
  if (l.helperAck === "confirmed") return "Recorded by the household; confirmed by the helper";
  if (l.helperAck === "disputed") return "Recorded by the household; disputed by the helper";
  return "Recorded by the household; not yet confirmed by the helper";
}

export interface RecordPdfInput {
  name: string;
  householdName: string | null;
  station: string;
  employment: "live-in" | "live-out" | null;
  recordSince: string;
  /** Her last day there ("YYYY-MM-DD"), for a household she has left. */
  endedOn?: string | null;
  shiftStart: string;
  shiftEnd: string;
  breakStart: string | null;
  breakEnd: string | null;
  weeklyRestDay: number;
  monthlyRate: number;
  paydayInterval: "semi_monthly" | "monthly";
  tasksDone: number;
  pay: ReturnType<typeof summarizePay>;
  restTaken: number;
  payslips: RecordPdfPayslip[];
  restOff: RecordPdfRest[];
  /** Her leave, any status; only approved leave is listed. */
  leave: RecordPdfLeave[];
  generatedAt: Date;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** "4,000.00" with the peso sign; payslips are exact, so no rounding here. */
export const pesos = (n: number) =>
  `₱${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** A "YYYY-MM-DD" date column read as that calendar day, whatever the phone's zone. */
function calendarDay(ymd: string): { y: number; m: number; d: number } {
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
  return { y, m: m - 1, d };
}

const localDay = (ymd: string) => {
  const { y, m, d } = calendarDay(ymd);
  return new Date(y, m, d);
};

/** A timestamp, or a "YYYY-MM-DD" date read as that calendar day. */
const asDay = (value: string) => (value.length === 10 ? localDay(value) : new Date(value));

const longDate = (d: Date) => `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
const shortDate = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
const shortDay = (ymd: string) => {
  const { y, m, d } = calendarDay(ymd);
  return `${MONTHS[m]} ${d}, ${y}`;
};

/** "Sep 1–15, 2026", or "Aug 16 – Sep 1, 2026" across months. */
export function formatPeriod(start: string, end: string): string {
  const a = calendarDay(start);
  const b = calendarDay(end);
  if (a.y === b.y && a.m === b.m) return `${MONTHS[a.m]} ${a.d}–${b.d}, ${b.y}`;
  if (a.y === b.y) return `${MONTHS[a.m]} ${a.d} – ${MONTHS[b.m]} ${b.d}, ${b.y}`;
  return `${shortDay(start)} – ${shortDay(end)}`;
}

/** "07:00:00" -> "7:00 AM". */
export function clock(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/** e.g. "Linara-work-record-Marites-Santos-2026-10-01.pdf" */
export function recordFileName(name: string, on: Date): string {
  const slug =
    name
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-") || "helper";
  const ymd = `${on.getFullYear()}-${String(on.getMonth() + 1).padStart(2, "0")}-${String(on.getDate()).padStart(2, "0")}`;
  return `Linara-work-record-${slug}-${ymd}.pdf`;
}

const row = (label: string, value: string) =>
  `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`;

export function recordPdfHtml(r: RecordPdfInput): string {
  const paid = r.payslips
    .filter((p) => p.payoutStatus === "succeeded")
    .sort((a, b) => b.cutoffStart.localeCompare(a.cutoffStart));
  const rest = r.restOff
    .filter((x) => x.status === "approved")
    .sort((a, b) => b.restDate.localeCompare(a.restDate));
  const leave = r.leave
    .filter((l) => l.status === "approved")
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
  const household =
    r.householdName && r.householdName !== "My Household"
      ? r.householdName
      : "the employer's household";

  const employment = [
    row("Role", r.station),
    row(
      "Arrangement",
      r.employment === "live-in"
        ? "Live-in"
        : r.employment === "live-out"
          ? "Live-out"
          : "Not recorded",
    ),
    r.endedOn
      ? row("Employed", `${longDate(asDay(r.recordSince))} – ${longDate(localDay(r.endedOn))}`)
      : row("On record since", longDate(asDay(r.recordSince))),
    row("Working hours", `${clock(r.shiftStart)} – ${clock(r.shiftEnd)}`),
    ...(r.breakStart && r.breakEnd
      ? [row("Daily break", `${clock(r.breakStart)} – ${clock(r.breakEnd)}`)]
      : []),
    row("Weekly rest day", DAYS[r.weeklyRestDay] ?? "Not recorded"),
    row("Monthly rate", pesos(r.monthlyRate)),
    row("Paid", r.paydayInterval === "semi_monthly" ? "Twice a month" : "Once a month"),
  ].join("");

  const summary = [
    row("Tasks completed", String(r.tasksDone)),
    row("Payslips paid", String(r.pay.paidCount)),
    row("Total net pay received", pesos(r.pay.paidTotal)),
    ...(r.pay.lastPaidAt ? [row("Last paid", longDate(new Date(r.pay.lastPaidAt)))] : []),
    row("SSS, PhilHealth and Pag-IBIG deducted (employee share)", pesos(r.pay.deductedStatutory)),
    row(
      "Rest taken as time off",
      r.restTaken > 0 ? formatHoursMinutes(r.restTaken) : "None recorded",
    ),
    ...summarizeLeave(r.leave).map((y) =>
      row(`Leave taken in ${y.year}`, leaveDaysLabel(y.days, LEAVE_KIND_SHORT, days)),
    ),
  ].join("");

  const payRows = paid.length
    ? paid
        .map(
          (p) => `<tr>
            <td class="nowrap">${escapeHtml(
              p.kind === "thirteenth_month"
                ? `13th-month pay ${p.cutoffEnd.slice(0, 4)}`
                : formatPeriod(p.cutoffStart, p.cutoffEnd),
            )}</td>
            <td class="nowrap">${
              p.paidOn
                ? escapeHtml(shortDay(p.paidOn))
                : p.confirmedAt
                  ? escapeHtml(shortDate(new Date(p.confirmedAt)))
                  : "—"
            }</td>
            <td>${escapeHtml(howPaid(p))}</td>
            <td class="num">${pesos(p.basePay)}</td>
            <td class="num">${pesos(p.statutoryEmployeeShare)}</td>
            <td class="num">${pesos(p.valeDeductions)}</td>
            <td class="num">${p.unpaidLeaveDeduction ? pesos(p.unpaidLeaveDeduction) : "—"}</td>
            <td class="num strong">${pesos(p.netPay)}</td>
          </tr>`,
        )
        .join("")
    : `<tr><td colspan="8" class="empty">No paid payslips recorded yet.</td></tr>`;

  const restRows = rest.length
    ? rest
        .map(
          (x) => `<tr>
            <td class="nowrap">${escapeHtml(shortDay(x.restDate))}</td>
            <td>${escapeHtml(`${clock(x.startTime)} – ${clock(x.endTime)}`)}</td>
            <td class="num">${escapeHtml(formatHoursMinutes(x.minutes))}</td>
          </tr>`,
        )
        .join("")
    : `<tr><td colspan="3" class="empty">No time off recorded.</td></tr>`;

  const leaveRows = leave.length
    ? leave
        .map(
          (l) => `<tr>
            <td class="nowrap">${escapeHtml(
              l.startDate === l.endDate
                ? shortDay(l.startDate)
                : `${shortDay(l.startDate)} – ${shortDay(l.endDate)}`,
            )}</td>
            <td>${escapeHtml(LEAVE_KIND[l.kind])}</td>
            <td>${escapeHtml(LEAVE_REASON[l.reason])}</td>
            <td>${escapeHtml(leaveSource(l))}</td>
            <td class="num">${escapeHtml(days(l.days))}</td>
          </tr>`,
        )
        .join("")
    : `<tr><td colspan="5" class="empty">No leave recorded.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Work record — ${escapeHtml(r.name)}</title>
<style>
  @page { margin: 48px 44px; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1d2624; font-size: 10.5pt; line-height: 1.4; margin: 0; }
  header { border-bottom: 2px solid #1F5A54; padding-bottom: 10px; margin-bottom: 8px; }
  .brand { color: #1F5A54; font-weight: 700; font-size: 10pt; letter-spacing: 0.02em; }
  h1 { font-size: 22pt; margin: 4px 0 2px; font-weight: 700; }
  .meta { color: #4d5a57; font-size: 10pt; margin: 0; }
  h2 { font-size: 12pt; color: #1F5A54; margin: 18px 0 4px; page-break-after: avoid; break-after: avoid; }
  .cols { display: flex; gap: 28px; }
  .cols > section { flex: 1; min-width: 0; }
  table { width: 100%; border-collapse: collapse; }
  .facts th { text-align: left; font-weight: 400; color: #4d5a57; width: 50%; }
  .facts th, .facts td { padding: 4px 0; border-bottom: 1px solid #e3ddd2; vertical-align: top; }
  .facts td { font-weight: 600; }
  .list th { text-align: left; font-size: 9pt; color: #4d5a57; font-weight: 600; padding: 6px 6px 6px 0; border-bottom: 1px solid #1d2624; }
  .list td { padding: 5px 6px 5px 0; border-bottom: 1px solid #e3ddd2; font-size: 10pt; }
  .nowrap { white-space: nowrap; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .list th.num { text-align: right; }
  .strong { font-weight: 700; }
  .empty { color: #4d5a57; font-style: italic; }
  tr { page-break-inside: avoid; }
  footer { page-break-inside: avoid; margin-top: 24px; padding-top: 10px; border-top: 1px solid #e3ddd2; color: #4d5a57; font-size: 9pt; }
  footer p { margin: 0 0 6px; }
</style>
</head>
<body>
  <header>
    <div class="brand">LINARA · WORK RECORD</div>
    <h1>${escapeHtml(r.name)}</h1>
    <p class="meta">Prepared ${escapeHtml(longDate(r.generatedAt))} from the records ${escapeHtml(household)} keeps in Linara.</p>
  </header>

  <div class="cols">
    <section>
      <h2>Employment</h2>
      <table class="facts">${employment}</table>
    </section>
    <section>
      <h2>Summary</h2>
      <table class="facts">${summary}</table>
    </section>
  </div>

  <h2>Pay received</h2>
  <table class="list">
    <thead><tr>
      <th>Pay period</th><th>Paid on</th><th>How</th><th class="num">Basic pay</th>
      <th class="num">SSS, PhilHealth, Pag&#8209;IBIG</th><th class="num">Vale (advance)</th><th class="num">Unpaid leave</th><th class="num">Net pay</th>
    </tr></thead>
    <tbody>${payRows}</tbody>
  </table>

  <h2>Time off taken</h2>
  <table class="list">
    <thead><tr><th>Date</th><th>Hours</th><th class="num">Length</th></tr></thead>
    <tbody>${restRows}</tbody>
  </table>

  <h2>Leave taken</h2>
  <table class="list">
    <thead><tr><th>Dates</th><th>Kind</th><th>Reason</th><th>On record</th><th class="num">Working days</th></tr></thead>
    <tbody>${leaveRows}</tbody>
  </table>

  <footer>
    <p>Pay figures are taken from payslips paid through Linara (GCash, Maya) and payments the household recorded as made outside it (cash, bank transfer, other). A payment made outside Linara counts in the totals only once the helper has confirmed it. Payslips still processing or failed are not included. Government contributions are shown as deducted from the helper's pay (employee share). This record does not show whether they were remitted to SSS, PhilHealth or Pag-IBIG.</p>
    <p>Leave is whole working days (the weekly rest day isn't counted), approved leave only. Service incentive leave is the five paid days a year RA 10361 gives after a year of service; a day off in kind is paid from rest earned working after hours; unpaid leave is deducted from the pay for the period it ends in, shown above.</p>
    <p>This is a summary of the household's records, not a certificate of employment.</p>
  </footer>
</body>
</html>`;
}

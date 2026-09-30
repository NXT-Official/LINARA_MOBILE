import { formatHoursMinutes } from "./format";
import type { summarizePay } from "./record";

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
  netPay: number;
  payoutStatus: string;
  confirmedAt: string | null;
}

export interface RecordPdfRest {
  restDate: string;
  startTime: string;
  endTime: string;
  minutes: number;
  status: string;
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
  const household =
    r.householdName && r.householdName !== "My Household"
      ? r.householdName
      : "her employer's household";

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
      ? row("Employed", `${longDate(new Date(r.recordSince))} – ${longDate(localDay(r.endedOn))}`)
      : row("On record since", longDate(new Date(r.recordSince))),
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
  ].join("");

  const payRows = paid.length
    ? paid
        .map(
          (p) => `<tr>
            <td class="nowrap">${escapeHtml(formatPeriod(p.cutoffStart, p.cutoffEnd))}</td>
            <td class="nowrap">${p.confirmedAt ? escapeHtml(shortDate(new Date(p.confirmedAt))) : "—"}</td>
            <td class="num">${pesos(p.basePay)}</td>
            <td class="num">${pesos(p.statutoryEmployeeShare)}</td>
            <td class="num">${pesos(p.valeDeductions)}</td>
            <td class="num strong">${pesos(p.netPay)}</td>
          </tr>`,
        )
        .join("")
    : `<tr><td colspan="6" class="empty">No paid payslips recorded yet.</td></tr>`;

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
      <th>Pay period</th><th>Paid on</th><th class="num">Basic pay</th>
      <th class="num">SSS, PhilHealth, Pag&#8209;IBIG</th><th class="num">Vale (advance)</th><th class="num">Net pay</th>
    </tr></thead>
    <tbody>${payRows}</tbody>
  </table>

  <h2>Time off taken</h2>
  <table class="list">
    <thead><tr><th>Date</th><th>Hours</th><th class="num">Length</th></tr></thead>
    <tbody>${restRows}</tbody>
  </table>

  <footer>
    <p>Pay figures are taken from payslips paid through Linara; payslips still processing or failed are not included. Government contributions are shown as deducted from her pay (employee share). This record does not show whether they were remitted to SSS, PhilHealth or Pag-IBIG.</p>
    <p>This is a summary of the household's records, not a certificate of employment.</p>
  </footer>
</body>
</html>`;
}

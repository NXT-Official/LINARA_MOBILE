const CUTOFF_DISPLAY = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" });

/**
 * "Aug 1 - Aug 15" from two ISO dates -- local display only. Ported from
 * the web reference's `formatCutoffRange`
 * (../LINARA/src/features/pay/pay.utils.ts) so payslip history reads the
 * same way in both apps.
 */
export function formatCutoffRange(cutoffStart: string, cutoffEnd: string): string {
  const start = CUTOFF_DISPLAY.format(new Date(`${cutoffStart}T00:00:00`));
  const end = CUTOFF_DISPLAY.format(new Date(`${cutoffEnd}T00:00:00`));
  return `${start} – ${end}`;
}

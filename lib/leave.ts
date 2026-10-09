import { parseIsoDate } from "./datetime-fields";

const MONTHS = ["Ene", "Peb", "Mar", "Abr", "May", "Hun", "Hul", "Ago", "Set", "Okt", "Nob", "Dis"];

/**
 * Working days in [start, end], both YYYY-MM-DD: every day but her rest day.
 * A preview only -- `request_leave` counts again and is the authority
 * (../LINARA/supabase/add-leave.sql, leave_working_days). 0 for a bad range.
 */
export function countLeaveDays(start: string, end: string, weeklyRestDay: number): number {
  const from = parseIsoDate(start);
  const to = parseIsoDate(end);
  if (!from || !to || to < from) return 0;
  let days = 0;
  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== weeklyRestDay) days++;
  }
  return days;
}

/**
 * Whether she can cancel it herself: a pending request, or approved leave
 * that hasn't started. Same rule as `cancel_leave_request`, which refuses the
 * rest anyway. `householdToday` is the household's date, never the phone's.
 */
export function canCancelLeave(
  leave: { status: string; startDate: string },
  householdToday: string | undefined,
): boolean {
  if (leave.status === "pending") return true;
  return leave.status === "approved" && !!householdToday && leave.startDate > householdToday;
}

const short = (iso: string) => {
  const d = parseIsoDate(iso);
  return d ? `${MONTHS[d.getMonth()]} ${d.getDate()}` : iso;
};

/** "Okt 5" or "Okt 5 – Okt 7". */
export function leaveDatesLabel(start: string, end: string): string {
  return start === end ? short(start) : `${short(start)} – ${short(end)}`;
}

/** Does this leave cover this YYYY-MM-DD? */
export const leaveCovers = (leave: { startDate: string; endDate: string }, iso: string) =>
  leave.startDate <= iso && iso <= leave.endDate;

/**
 * The few requests a card lists: waiting ones first (she can still cancel
 * them), then the rest, newest first as given. Ones she cancelled aren't
 * shown at all (../LINARA/KNOWN_GAPS.md O55, the user's choice 2026-10-09):
 * kept, they piled up and once pushed a waiting request, with its
 * Kanselahin, off the card (Maestro SA-066).
 */
export function requestsToList<T extends { status: string }>(requests: T[], max = 4): T[] {
  return requests
    .filter((r) => r.status !== "cancelled")
    .map((r, i) => ({ r, i }))
    .sort(
      (a, b) => Number(b.r.status === "pending") - Number(a.r.status === "pending") || a.i - b.i,
    )
    .slice(0, max)
    .map(({ r }) => r);
}

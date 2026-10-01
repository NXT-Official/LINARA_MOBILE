import { toIsoDate } from "./datetime-fields";

/**
 * Rosa's live reachability, mirroring the web dashboard's model (see
 * ../LINARA/src/features/availability/hooks/use-availability.ts) but scoped
 * to the single daily shift the mobile client actually has --
 * `helper_profiles.shift_start` / `shift_end` / `weekly_rest_day` -- not the
 * manager's full weekly schedule store, which this app never reads.
 */
export type RosaAvailabilityStatus = {
  status: "on_shift" | "available" | "off";
  until: number | null;
  quiet: boolean;
  restDay: boolean;
  /** Inside a day off a manager approved (rest_off_requests). */
  timeOff?: boolean;
};

/**
 * An approved day off: one date and a window. Mirrors the web's TimeOff
 * (../LINARA/src/features/shifts/time-off.ts) so both sides agree she's off
 * (../LINARA/KNOWN_GAPS.md O19).
 */
export interface TimeOffWindow {
  /** YYYY-MM-DD. */
  restDate: string;
  /** "HH:MM:SS" as returned by Postgres TIME columns. */
  startTime: string;
  endTime: string;
}

export interface ShiftWindow {
  /** "HH:MM:SS" as returned by Postgres TIME columns. */
  shiftStart: string;
  shiftEnd: string;
  /** 0 = Sunday, matching helper_profiles.weekly_rest_day. */
  weeklyRestDay: number;
  /**
   * The protected mid-shift break (`helper_profiles.break_start`/`break_end`,
   * added by ../LINARA/supabase/add-shift-break-columns.sql). Both null when
   * the household hasn't set one. Time inside this window is NOT on-shift --
   * it's exactly the "on a break" friction trigger from plan.md's After-Hours
   * Friction Gating section, and the manager dashboard's `isMinuteInShift`
   * (../LINARA/src/features/shifts/shift.utils.ts) excludes it too. Keep the
   * two in step: if they disagree, the manager sees a break the helper's own
   * device doesn't, and the Ledger's `rest_break` pay classification follows
   * the manager's view.
   */
  breakStart?: string | null;
  breakEnd?: string | null;
}

export type ManualAvailability = {
  manual: "available" | "off";
  availableUntil: number | null;
};

export const OFF_AVAILABILITY: ManualAvailability = { manual: "off", availableUntil: null };

// Overnight quiet-hours window (hard-off unless emergency), matching
// ../LINARA/src/features/availability/availability.constants.ts.
const QUIET_START_HOUR = 22;
const QUIET_END_HOUR = 6;

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Approved time off is off even mid-shift. Her own Available opt-in still
 * wins, because she set it, but she's not on shift then: it's her time.
 */
export function deriveRosaStatus(
  nowTs: number,
  shift: ShiftWindow,
  manual: ManualAvailability,
  timeOff: TimeOffWindow[] = [],
): RosaAvailabilityStatus {
  const now = new Date(nowTs);
  const hour = now.getHours();
  const isRestDay = now.getDay() === shift.weeklyRestDay;
  const isQuiet = hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;

  if (isQuiet) {
    return { status: "off", until: null, quiet: true, restDay: isRestDay };
  }

  const minutes = minutesOfDay(now);
  const onBreak =
    Boolean(shift.breakStart && shift.breakEnd) &&
    minutes >= parseTimeToMinutes(shift.breakStart as string) &&
    minutes < parseTimeToMinutes(shift.breakEnd as string);
  const today = toIsoDate(now);
  const inTimeOff = timeOff.some(
    (o) =>
      o.restDate === today &&
      minutes >= parseTimeToMinutes(o.startTime) &&
      minutes < parseTimeToMinutes(o.endTime),
  );
  const optedIn =
    manual.manual === "available" && !!manual.availableUntil && manual.availableUntil > nowTs;
  if (inTimeOff && !optedIn) {
    return { status: "off", until: null, quiet: false, restDay: isRestDay, timeOff: true };
  }
  const onShift =
    !inTimeOff &&
    !isRestDay &&
    !onBreak &&
    minutes >= parseTimeToMinutes(shift.shiftStart) &&
    minutes < parseTimeToMinutes(shift.shiftEnd);

  if (onShift) {
    return { status: "on_shift", until: null, quiet: false, restDay: false };
  }
  if (optedIn) {
    return { status: "available", until: manual.availableUntil, quiet: false, restDay: isRestDay };
  }
  return { status: "off", until: null, quiet: false, restDay: isRestDay };
}

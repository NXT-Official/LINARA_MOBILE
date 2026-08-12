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
};

export interface ShiftWindow {
  /** "HH:MM:SS" as returned by Postgres TIME columns. */
  shiftStart: string;
  shiftEnd: string;
  /** 0 = Sunday, matching helper_profiles.weekly_rest_day. */
  weeklyRestDay: number;
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

export function deriveRosaStatus(
  nowTs: number,
  shift: ShiftWindow,
  manual: ManualAvailability,
): RosaAvailabilityStatus {
  const now = new Date(nowTs);
  const hour = now.getHours();
  const isRestDay = now.getDay() === shift.weeklyRestDay;
  const isQuiet = hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;

  if (isQuiet) {
    return { status: "off", until: null, quiet: true, restDay: isRestDay };
  }

  const minutes = minutesOfDay(now);
  const onShift =
    !isRestDay &&
    minutes >= parseTimeToMinutes(shift.shiftStart) &&
    minutes < parseTimeToMinutes(shift.shiftEnd);

  if (onShift) {
    return { status: "on_shift", until: null, quiet: false, restDay: false };
  }
  if (manual.manual === "available" && manual.availableUntil && manual.availableUntil > nowTs) {
    return { status: "available", until: manual.availableUntil, quiet: false, restDay: isRestDay };
  }
  return { status: "off", until: null, quiet: false, restDay: isRestDay };
}

import { toIsoDate } from "./datetime-fields";
import { startOfToday } from "./today";
import { tr, trList } from "./i18n/instance";

/**
 * Sunday-first day names, matching Date.getDay() and
 * helper_profiles.weekly_rest_day, in the language she's using now
 * (locales/<lang>/dates.json).
 */
export const dayNames = (): string[] => trList("dates.days");
/** Short month names ("Okt"), in the current language. */
export const monthsShort = (): string[] => trList("dates.monthsShort");
/** Full month names ("Oktubre"), in the current language. */
export const monthNames = (): string[] => trList("dates.monthsLong");
/** "Okt 8", in the current language's order. */
export const monthDay = (d: Date): string =>
  tr("dates.monthDay", { month: monthsShort()[d.getMonth()], day: d.getDate() });

export interface WeekTicket {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done" | "blocked" | "cancelled";
  scheduledStart: string;
}

/** A day off she asked for or was given (rest_off_requests), as My Week shows it. */
export interface WeekTimeOff {
  id: string;
  /** YYYY-MM-DD. */
  restDate: string;
  /** "HH:MM:SS" as returned by Postgres TIME columns. */
  startTime: string;
  endTime: string;
  status: "pending" | "approved" | "declined" | "cancelled";
}

/** Whole-day leave (leave_requests), as My Week shows it. */
export interface WeekLeave {
  id: string;
  kind: "sil" | "in_kind" | "unpaid" | "extra_paid";
  /** YYYY-MM-DD, inclusive. */
  startDate: string;
  endDate: string;
  status: "pending" | "approved" | "declined" | "cancelled";
}

export interface WeekDay<T extends WeekTicket = WeekTicket> {
  /** Local midnight of this day. */
  date: Date;
  /** "Miyerkules, Set 30" */
  label: string;
  isToday: boolean;
  isPast: boolean;
  isRestDay: boolean;
  tickets: T[];
  /** Approved and still-waiting days off; declined and cancelled ones aren't shown. */
  timeOff: WeekTimeOff[];
  /** Approved and still-waiting leave covering this day. */
  leave: WeekLeave[];
}

export const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/**
 * `count` days from `start` (local midnight): which is her rest day, the
 * tickets scheduled on each (in time order), and her days off. Every day shows
 * up, including empty ones and the rest day: the concept doc asks that a
 * predictable week read as "her reliable week, not a list of orders".
 */
export function buildDays<T extends WeekTicket>(
  start: Date,
  count: number,
  now: Date,
  weeklyRestDay: number,
  tickets: T[],
  timeOff: WeekTimeOff[] = [],
  leave: WeekLeave[] = [],
): WeekDay<T>[] {
  const today = startOfToday(now).getTime();
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(start, i);
    const next = addDays(date, 1);
    const iso = toIsoDate(date);
    const inDay = tickets
      .filter((t) => {
        const ms = Date.parse(t.scheduledStart);
        return ms >= date.getTime() && ms < next.getTime();
      })
      .sort((a, b) => Date.parse(a.scheduledStart) - Date.parse(b.scheduledStart));
    return {
      date,
      label: tr("dates.weekdayMonthDay", {
        weekday: dayNames()[date.getDay()],
        month: monthsShort()[date.getMonth()],
        day: date.getDate(),
      }),
      isToday: date.getTime() === today,
      isPast: date.getTime() < today,
      isRestDay: date.getDay() === weeklyRestDay,
      tickets: inDay,
      timeOff: timeOff
        .filter((o) => o.restDate === iso && (o.status === "approved" || o.status === "pending"))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      leave: leave.filter(
        (l) =>
          l.startDate <= iso &&
          iso <= l.endDate &&
          (l.status === "approved" || l.status === "pending"),
      ),
    };
  });
}

/** Her next seven days, today first. */
export function buildWeek<T extends WeekTicket>(
  now: Date,
  weeklyRestDay: number,
  tickets: T[],
  timeOff: WeekTimeOff[] = [],
  leave: WeekLeave[] = [],
): WeekDay<T>[] {
  return buildDays(startOfToday(now), 7, now, weeklyRestDay, tickets, timeOff, leave);
}

/** The Sunday on or before the 1st, through the Saturday on or after the last day. */
export function monthRange(year: number, month: number): { start: Date; count: number } {
  const first = new Date(year, month, 1);
  const start = addDays(first, -first.getDay());
  const last = new Date(year, month + 1, 0);
  const end = addDays(last, 6 - last.getDay());
  const count = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return { start, count };
}

/** "Okt 1 – Okt 7". */
export function rangeLabel(start: Date, count: number): string {
  const end = addDays(start, count - 1);
  return tr("dates.range", { from: monthDay(start), to: monthDay(end) });
}

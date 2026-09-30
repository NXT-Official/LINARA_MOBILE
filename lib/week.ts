import { startOfToday } from "./today";

/** Sunday-first, matching Date.getDay() and helper_profiles.weekly_rest_day. */
export const DAY_NAMES = [
  "Linggo",
  "Lunes",
  "Martes",
  "Miyerkules",
  "Huwebes",
  "Biyernes",
  "Sabado",
] as const;

const MONTHS = ["Ene", "Peb", "Mar", "Abr", "May", "Hun", "Hul", "Ago", "Set", "Okt", "Nob", "Dis"];

export interface WeekTicket {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done" | "blocked";
  scheduledStart: string;
}

export interface WeekDay<T extends WeekTicket = WeekTicket> {
  /** Local midnight of this day. */
  date: Date;
  /** "Miyerkules, Set 30" */
  label: string;
  isToday: boolean;
  isRestDay: boolean;
  tickets: T[];
}

/**
 * Her next seven days, today first: which is her rest day, and the tickets
 * scheduled on each (in time order). The concept doc asks that a predictable
 * week read as "her reliable week, not a list of orders" -- so every day shows
 * up, including empty ones and the rest day.
 */
export function buildWeek<T extends WeekTicket>(
  now: Date,
  weeklyRestDay: number,
  tickets: T[],
): WeekDay<T>[] {
  const first = startOfToday(now);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(first);
    date.setDate(first.getDate() + i);
    const next = new Date(date);
    next.setDate(date.getDate() + 1);
    const inDay = tickets
      .filter((t) => {
        const ms = Date.parse(t.scheduledStart);
        return ms >= date.getTime() && ms < next.getTime();
      })
      .sort((a, b) => Date.parse(a.scheduledStart) - Date.parse(b.scheduledStart));
    return {
      date,
      label: `${DAY_NAMES[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`,
      isToday: i === 0,
      isRestDay: date.getDay() === weeklyRestDay,
      tickets: inDay,
    };
  });
}

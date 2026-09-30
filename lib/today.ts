/**
 * The Worker's Station is day-by-day, the same rule the manager's Pass follows
 * (../LINARA/src/features/tasks/task.utils.ts `isLaterThanToday`): today's
 * tickets and anything carried over from an earlier day are hers now; a ticket
 * scheduled from tomorrow on waits, unless she has already started it.
 *
 * Day boundaries are the phone's local midnight, which is the household's for
 * a helper in the home. Both apps render ticket times the same way.
 */

export type TicketStatus = "todo" | "in_progress" | "done" | "blocked";

export interface DayTicket {
  status: TicketStatus;
  scheduledStart: string;
}

/** Local midnight at the start of the day containing `now`. */
export function startOfToday(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Local midnight at the start of the day after `now`. */
export function startOfTomorrow(now: Date): Date {
  const d = startOfToday(now);
  d.setDate(d.getDate() + 1);
  return d;
}

/** Scheduled for a later day and not yet started. */
export function isLaterThanToday(ticket: DayTicket, now: Date): boolean {
  if (ticket.status === "in_progress") return false;
  const start = Date.parse(ticket.scheduledStart);
  return !Number.isNaN(start) && start >= startOfTomorrow(now).getTime();
}

/**
 * The one ticket the focus card shows. What she's already doing comes first,
 * then the earliest not-yet-started one; a ticket she has put on hold only
 * comes up once nothing else is left, so one "can't now" never stalls her day.
 * Expects `tickets` in scheduled order and already limited to today's.
 */
export function pickFocus<T extends DayTicket>(tickets: T[]): T | null {
  return (
    tickets.find((t) => t.status === "in_progress") ??
    tickets.find((t) => t.status === "todo") ??
    tickets.find((t) => t.status === "blocked") ??
    null
  );
}

/**
 * Today's count for the close: tickets scheduled today plus unfinished ones
 * carried over, and how many of those are done. A task finished on an earlier
 * day isn't part of today's list.
 */
export function summarizeToday(tickets: DayTicket[], now: Date) {
  const todayStart = startOfToday(now).getTime();
  const todays = tickets.filter(
    (t) =>
      !isLaterThanToday(t, now) &&
      (t.status !== "done" || Date.parse(t.scheduledStart) >= todayStart),
  );
  return {
    total: todays.length,
    done: todays.filter((t) => t.status === "done").length,
    onHold: todays.filter((t) => t.status === "blocked").length,
  };
}

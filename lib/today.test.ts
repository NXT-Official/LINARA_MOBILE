import { describe, expect, it } from "vitest";

import {
  dayPhase,
  greetingFor,
  isLaterThanToday,
  pickFocus,
  summarizeToday,
  type DayTicket,
} from "./today";

// Built from local parts, so these hold in any time zone the suite runs under.
const at = (d: number, h: number, m = 0) => new Date(2026, 8, d, h, m).toISOString();
const now = new Date(2026, 8, 30, 22, 0); // Wed 30 Sep, 10 PM

const t = (status: DayTicket["status"], scheduledStart: string, id = "x") => ({
  id,
  status,
  scheduledStart,
});

describe("isLaterThanToday", () => {
  it("keeps today, late or early, and carried-over tickets as today's", () => {
    expect(isLaterThanToday(t("todo", at(30, 0)), now)).toBe(false);
    expect(isLaterThanToday(t("todo", at(30, 23, 59)), now)).toBe(false);
    expect(isLaterThanToday(t("todo", at(25, 19, 30)), now)).toBe(false);
  });

  it("holds back anything from tomorrow's midnight on", () => {
    expect(isLaterThanToday(t("todo", at(31, 0)), now)).toBe(true); // Oct 1
  });

  it("never hides a ticket she has already started", () => {
    expect(isLaterThanToday(t("in_progress", at(31, 8)), now)).toBe(false);
  });
});

describe("pickFocus", () => {
  it("puts what she is doing first", () => {
    const list = [t("todo", at(30, 8), "a"), t("in_progress", at(30, 9), "b")];
    expect(pickFocus(list)?.id).toBe("b");
  });

  it("skips a ticket on hold while anything else is left", () => {
    const list = [t("blocked", at(30, 8), "a"), t("todo", at(30, 9), "b")];
    expect(pickFocus(list)?.id).toBe("b");
  });

  it("falls back to the ticket on hold, then to nothing", () => {
    expect(pickFocus([t("blocked", at(30, 8), "a")])?.id).toBe("a");
    expect(pickFocus([])).toBeNull();
  });
});

describe("summarizeToday", () => {
  it("counts today's and carried-over tickets, not finished old ones or tomorrow's", () => {
    const list = [
      t("done", at(30, 8)),
      t("done", at(30, 12)),
      t("blocked", at(30, 15)),
      t("todo", at(28, 19)), // carried over: counts
      t("done", at(28, 9)), // finished on an earlier day: doesn't
      t("todo", at(31, 7)), // tomorrow: doesn't
      t("cancelled", at(30, 10)), // called off: doesn't
    ];
    expect(summarizeToday(list, now)).toEqual({ total: 4, done: 2, onHold: 1 });
  });
});

describe("greetingFor", () => {
  const hour = (h: number) => new Date(2026, 8, 30, h, 0);
  it("follows the time of day", () => {
    expect(greetingFor(hour(5))).toBe("Magandang umaga");
    expect(greetingFor(hour(11))).toBe("Magandang tanghali");
    expect(greetingFor(hour(13))).toBe("Magandang hapon");
    expect(greetingFor(hour(18))).toBe("Magandang gabi");
    expect(greetingFor(hour(2))).toBe("Magandang gabi");
  });
});

describe("dayPhase", () => {
  // Wed 30 Sep 2026; rest day Sunday (0); shift 06:00-19:00, as Ate Marites.
  const shift = { shiftStart: "06:00:00", shiftEnd: "19:00:00", weeklyRestDay: 0 };
  const wed = (h: number, m = 0) => new Date(2026, 8, 30, h, m);

  it("tracks the shift through the day", () => {
    expect(dayPhase(wed(6), shift)).toBe("on_shift");
    expect(dayPhase(wed(12, 30), shift)).toBe("on_shift");
    expect(dayPhase(wed(19), shift)).toBe("after_shift");
  });

  it("treats the overnight window as night, not before the shift", () => {
    expect(dayPhase(wed(22), shift)).toBe("night");
    expect(dayPhase(wed(4), shift)).toBe("night");
  });

  it("knows a late start's morning is before the shift", () => {
    expect(dayPhase(wed(7), { ...shift, shiftStart: "09:00:00" })).toBe("before_shift");
  });

  it("puts the rest day first", () => {
    expect(dayPhase(new Date(2026, 9, 4, 10), shift)).toBe("rest_day"); // Sun 4 Oct
  });
});

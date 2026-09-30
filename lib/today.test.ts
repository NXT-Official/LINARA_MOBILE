import { describe, expect, it } from "vitest";

import { isLaterThanToday, pickFocus, summarizeToday, type DayTicket } from "./today";

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
    ];
    expect(summarizeToday(list, now)).toEqual({ total: 4, done: 2, onHold: 1 });
  });
});

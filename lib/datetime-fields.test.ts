import { describe, expect, it, vi } from "vitest";

import { combineLocalDateTime, parseHm, parseIsoDate, toHm, toIsoDate } from "./datetime-fields";

/**
 * The one thing these conversions must never do is round-trip through UTC.
 *
 * A picker returns an instant; the rest-off RPCs take a civil date and time.
 * `toISOString()` on a Date built from local parts is what broke cutoffs across
 * this whole product (../LINARA/KNOWN_GAPS.md C38) -- in Asia/Manila (UTC+8) it
 * shifts anything before 08:00 to the previous day. A date picker is the most
 * natural place for that to come back, so these run under the same three zones
 * ../LINARA's suite established as the precedent, including the positive offset
 * that actually broke and a negative one.
 */
const ZONES = ["UTC", "Asia/Manila", "America/Los_Angeles"] as const;

/**
 * `vi.stubEnv` rather than assigning `process.env.TZ` directly: this repo's
 * eslint config bans unvalidated `process.env` lookups (they belong in a typed
 * env module), and the stub is restored for us even if an assertion throws.
 */
function withTimeZone<T>(tz: string, fn: () => T): T {
  vi.stubEnv("TZ", tz);
  try {
    return fn();
  } finally {
    vi.unstubAllEnvs();
  }
}

describe("toIsoDate", () => {
  it.each(ZONES)("keeps an early-morning pick on its own day under TZ=%s", (tz) => {
    // 07:00 local. Under toISOString() in Manila this renders as the day
    // before -- the exact off-by-one C38 was.
    const result = withTimeZone(tz, () => toIsoDate(new Date(2026, 7, 20, 7, 0)));
    expect(result).toBe("2026-08-20");
  });

  it.each(ZONES)("keeps a late-evening pick on its own day under TZ=%s", (tz) => {
    // 23:00 local shifts FORWARD a day under UTC rendering in the Americas.
    const result = withTimeZone(tz, () => toIsoDate(new Date(2026, 7, 20, 23, 0)));
    expect(result).toBe("2026-08-20");
  });

  it("pads single-digit months and days", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("toHm", () => {
  it.each(ZONES)("reports the wall clock, not UTC, under TZ=%s", (tz) => {
    expect(withTimeZone(tz, () => toHm(new Date(2026, 7, 20, 7, 5)))).toBe("07:05");
    expect(withTimeZone(tz, () => toHm(new Date(2026, 7, 20, 23, 59)))).toBe("23:59");
  });

  it("renders midnight as 00:00, not 24:00", () => {
    expect(toHm(new Date(2026, 7, 20, 0, 0))).toBe("00:00");
  });
});

describe("parseIsoDate", () => {
  it.each(ZONES)("returns local midnight on the named day under TZ=%s", (tz) => {
    // The assertions live INSIDE the wrapper deliberately. A Date is an
    // instant, not a civil date: build local midnight in Manila, read it back
    // under another zone, and it genuinely is the previous day. Asserting
    // outside the wrapper tests the harness, not the code -- which is exactly
    // what the first draft of this test did, and it failed for that reason.
    withTimeZone(tz, () => {
      const date = parseIsoDate("2026-08-20");
      expect(date).not.toBeNull();
      // `new Date("2026-08-20")` would be UTC midnight -- the 19th in the
      // Americas. Built from parts, the day is whatever the string said.
      expect(date?.getDate()).toBe(20);
      expect(date?.getMonth()).toBe(7);
      expect(date?.getHours()).toBe(0);
    });
  });

  it("round-trips a leap day", () => {
    // 2028, not 2026 -- 2026 has no Feb 29, and parseIsoDate correctly refuses
    // it, which is what the rollover test below asserts.
    expect(toIsoDate(parseIsoDate("2028-02-29") as Date)).toBe("2028-02-29");
  });

  it("rejects a date that does not exist rather than rolling it over", () => {
    // JS turns Feb 31 into Mar 3 silently. A picker opening on the wrong month
    // because of that is worse than falling back to today.
    expect(parseIsoDate("2026-02-31")).toBeNull();
    expect(parseIsoDate("2026-13-01")).toBeNull();
  });

  it.each(["", "20-08-2026", "2026/08/20", "not a date"])("rejects %s", (bad) => {
    expect(parseIsoDate(bad)).toBeNull();
  });
});

describe("parseHm", () => {
  it("reads a 24-hour time", () => {
    expect(toHm(parseHm("07:05") as Date)).toBe("07:05");
    expect(toHm(parseHm("23:59") as Date)).toBe("23:59");
  });

  it.each(["24:00", "7:05", "12:60", "", "noon"])("rejects %s", (bad) => {
    expect(parseHm(bad)).toBeNull();
  });
});

describe("combineLocalDateTime", () => {
  it.each(ZONES)("is the picked wall-clock moment, round-tripping, under TZ=%s", (tz) => {
    withTimeZone(tz, () => {
      // 07:30 is the hour C38 moved to the day before in Manila.
      const at = combineLocalDateTime("2026-10-05", "07:30");
      expect(at).not.toBeNull();
      expect(toIsoDate(at as Date)).toBe("2026-10-05");
      expect(toHm(at as Date)).toBe("07:30");
    });
  });

  it("refuses a malformed half rather than guessing", () => {
    expect(combineLocalDateTime("2026-02-31", "07:30")).toBeNull();
    expect(combineLocalDateTime("2026-10-05", "25:00")).toBeNull();
  });
});

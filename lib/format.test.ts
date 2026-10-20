import { describe, expect, it } from "vitest";

import { formatClockTime, formatDateFil, formatTimeSpan } from "./format";

describe("formatTimeSpan", () => {
  // Built from local parts, so the test reads the same in any time zone.
  const at = new Date(2026, 9, 6, 14, 0).toISOString();

  it("is just the time when the task has no length", () => {
    expect(formatTimeSpan(at, null)).toBe(formatClockTime(at));
  });

  it("adds the end when it has one", () => {
    const end = new Date(2026, 9, 6, 15, 30).toISOString();
    expect(formatTimeSpan(at, 90)).toBe(`${formatClockTime(at)} – ${formatClockTime(end)}`);
  });
});

describe("formatDateFil (QA LM-14)", () => {
  it("writes the month in Filipino, as Okt 8 elsewhere in the app", () => {
    expect(formatDateFil(new Date(2026, 9, 8))).toBe("Okt 8, 2026");
    expect(formatDateFil(new Date(2026, 0, 1))).toBe("Ene 1, 2026");
    expect(formatDateFil(new Date(2025, 11, 31))).toBe("Dis 31, 2025");
  });
});

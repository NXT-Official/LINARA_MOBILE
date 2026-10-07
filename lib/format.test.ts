import { describe, expect, it } from "vitest";

import { formatClockTime, formatTimeSpan } from "./format";

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

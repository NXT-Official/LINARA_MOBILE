import { describe, expect, it } from "vitest";

import { canCancelLeave, countLeaveDays, leaveCovers, leaveDatesLabel } from "./leave";

describe("countLeaveDays", () => {
  it("counts every day but her rest day", () => {
    // Mon 5 to Sun 11 Oct 2026, resting Sundays.
    expect(countLeaveDays("2026-10-05", "2026-10-11", 0)).toBe(6);
    expect(countLeaveDays("2026-10-04", "2026-10-04", 0)).toBe(0);
  });

  it("is 0 for a backwards or broken range", () => {
    expect(countLeaveDays("2026-10-07", "2026-10-05", 0)).toBe(0);
    expect(countLeaveDays("", "2026-10-05", 0)).toBe(0);
  });
});

describe("canCancelLeave", () => {
  it("allows a pending request, or approved leave that hasn't started", () => {
    expect(canCancelLeave({ status: "pending", startDate: "2026-09-01" }, "2026-10-02")).toBe(true);
    expect(canCancelLeave({ status: "approved", startDate: "2026-10-05" }, "2026-10-02")).toBe(
      true,
    );
    expect(canCancelLeave({ status: "approved", startDate: "2026-10-02" }, "2026-10-02")).toBe(
      false,
    );
    expect(canCancelLeave({ status: "declined", startDate: "2026-10-05" }, "2026-10-02")).toBe(
      false,
    );
  });

  it("won't guess from the phone's date while the household's is loading", () => {
    expect(canCancelLeave({ status: "approved", startDate: "2026-10-05" }, undefined)).toBe(false);
  });
});

describe("labels and coverage", () => {
  it("reads in Filipino months, one date or a range", () => {
    expect(leaveDatesLabel("2026-10-05", "2026-10-05")).toBe("Okt 5");
    expect(leaveDatesLabel("2026-10-05", "2026-10-07")).toBe("Okt 5 – Okt 7");
  });

  it("covers its first and last day", () => {
    const l = { startDate: "2026-10-05", endDate: "2026-10-07" };
    expect(leaveCovers(l, "2026-10-05")).toBe(true);
    expect(leaveCovers(l, "2026-10-07")).toBe(true);
    expect(leaveCovers(l, "2026-10-08")).toBe(false);
  });
});

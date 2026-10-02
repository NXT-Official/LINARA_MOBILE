import { describe, expect, it } from "vitest";

import { OFF_AVAILABILITY, deriveRosaStatus, type ShiftWindow } from "./availability";

// Local-time instants so this holds in any time zone.
const shift: ShiftWindow = { shiftStart: "08:00:00", shiftEnd: "17:00:00", weeklyRestDay: 0 };
const twoPm = new Date(2026, 9, 2, 14, 0).getTime(); // Fri 2 Oct 2026
const dayOff = [{ restDate: "2026-10-02", startTime: "13:00:00", endTime: "17:00:00" }];

describe("deriveRosaStatus with a day off", () => {
  it("is off mid-shift during an approved day off, and says why", () => {
    expect(deriveRosaStatus(twoPm, shift, OFF_AVAILABILITY, dayOff)).toMatchObject({
      status: "off",
      timeOff: true,
    });
    expect(deriveRosaStatus(twoPm, shift, OFF_AVAILABILITY).status).toBe("on_shift");
  });

  it("lets her own Available opt-in win, without calling it on shift", () => {
    const manual = { manual: "available" as const, availableUntil: twoPm + 60 * 60_000 };
    expect(deriveRosaStatus(twoPm, shift, manual, dayOff).status).toBe("available");
  });
});

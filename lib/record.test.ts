import { describe, expect, it } from "vitest";

import { recordShareText, restTakenMinutes, summarizePay, type RecordPayslip } from "./record";

const slip = (over: Partial<RecordPayslip>): RecordPayslip => ({
  netPay: 4000,
  statutoryEmployeeShare: 250,
  payoutStatus: "succeeded",
  confirmedAt: "2026-08-31T10:00:00Z",
  ...over,
});

describe("summarizePay", () => {
  it("counts only payouts that succeeded", () => {
    const pay = summarizePay([
      slip({}),
      slip({ confirmedAt: "2026-09-15T10:00:00Z" }),
      slip({ payoutStatus: "failed", confirmedAt: null }),
      slip({ payoutStatus: "processing", confirmedAt: null }),
    ]);
    expect(pay).toEqual({
      paidCount: 2,
      paidTotal: 8000,
      deductedStatutory: 500,
      lastPaidAt: "2026-09-15T10:00:00Z",
    });
  });

  it("is empty-safe", () => {
    expect(summarizePay([])).toEqual({
      paidCount: 0,
      paidTotal: 0,
      deductedStatutory: 0,
      lastPaidAt: null,
    });
  });
});

describe("restTakenMinutes", () => {
  it("adds approved rest only", () => {
    expect(
      restTakenMinutes([
        { status: "approved", minutes: 120 },
        { status: "pending", minutes: 60 },
        { status: "approved", minutes: 30 },
        { status: "declined", minutes: 45 },
      ]),
    ).toBe(150);
  });
});

describe("recordShareText", () => {
  const base = {
    name: "Ate Marites",
    station: "Yaya",
    employment: "live-in" as const,
    recordSince: "2026-07-01T00:00:00Z",
    tasksDone: 42,
    pay: summarizePay([slip({})]),
    restTaken: 0,
  };

  it("says what the app holds, and says deducted, not remitted", () => {
    const text = recordShareText(base);
    expect(text).toContain("Ate Marites");
    expect(text).toContain("Yaya (live-in)");
    expect(text).toContain("Tasks completed: 42");
    expect(text).toContain("deducted (employee share)");
    expect(text).not.toMatch(/remit|certif/i);
  });

  it("leaves out rest taken when there is none", () => {
    expect(recordShareText(base)).not.toContain("Rest taken");
    expect(recordShareText({ ...base, restTaken: 90 })).toContain("Rest taken as time off: 1h 30m");
  });
});

describe("payments made outside Linara", () => {
  it("count only once she confirms them", () => {
    const manual = (helperAck: "pending" | "confirmed" | "disputed") =>
      slip({ payoutProvider: "manual", helperAck, netPay: 1000 });
    const pay = summarizePay([
      slip({}),
      manual("pending"),
      manual("confirmed"),
      manual("disputed"),
    ]);
    expect(pay.paidCount).toBe(2);
    expect(pay.paidTotal).toBe(5000);
  });
});

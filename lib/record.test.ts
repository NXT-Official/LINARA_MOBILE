import { describe, expect, it } from "vitest";

import {
  leaveDaysLabel,
  recordShareText,
  restTakenMinutes,
  summarizeLeave,
  summarizePay,
  type RecordPayslip,
} from "./record";

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

describe("summarizeLeave", () => {
  const leave = [
    { kind: "sil" as const, status: "approved", startDate: "2026-03-02", days: 2 },
    { kind: "sil" as const, status: "approved", startDate: "2026-08-03", days: 3 },
    { kind: "unpaid" as const, status: "approved", startDate: "2026-09-10", days: 1 },
    { kind: "unpaid" as const, status: "declined", startDate: "2026-09-20", days: 4 },
    { kind: "in_kind" as const, status: "approved", startDate: "2025-12-29", days: 1 },
  ];

  it("totals approved leave by year and kind, newest year first", () => {
    expect(summarizeLeave(leave)).toEqual([
      { year: 2026, days: { sil: 5, unpaid: 1 } },
      { year: 2025, days: { in_kind: 1 } },
    ]);
  });

  it("labels the kinds in a fixed order", () => {
    const names = { sil: "SIL", extra_paid: "extra", in_kind: "in kind", unpaid: "unpaid" };
    expect(leaveDaysLabel({ unpaid: 1, sil: 5 }, names, (n) => `${n}d`)).toBe("5d SIL, 1d unpaid");
  });

  it("puts it in the shared text", () => {
    const text = recordShareText({
      name: "Marites",
      station: "Yaya",
      employment: null,
      recordSince: "2026-01-01T00:00:00Z",
      tasksDone: 0,
      pay: summarizePay([]),
      restTaken: 0,
      leave,
    });
    expect(text).toContain(
      "Leave taken in 2026: 5 days service incentive leave, 1 day unpaid leave",
    );
    expect(text).toContain("Leave taken in 2025: 1 day off in kind");
  });
});

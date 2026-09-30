import { describe, expect, it } from "vitest";

import { summarizePay } from "./record";
import {
  clock,
  formatPeriod,
  pesos,
  recordFileName,
  recordPdfHtml,
  type RecordPdfInput,
} from "./record-pdf";

const base: RecordPdfInput = {
  name: "Marites Santos",
  householdName: "Reyes Household",
  station: "Yaya",
  employment: "live-in",
  recordSince: "2026-07-01T00:00:00Z",
  shiftStart: "07:00:00",
  shiftEnd: "19:00:00",
  breakStart: "12:00:00",
  breakEnd: "13:00:00",
  weeklyRestDay: 0,
  monthlyRate: 8000,
  paydayInterval: "semi_monthly",
  tasksDone: 42,
  pay: summarizePay([
    {
      netPay: 3750.5,
      statutoryEmployeeShare: 249.5,
      payoutStatus: "succeeded",
      confirmedAt: "2026-09-15T10:00:00Z",
    },
  ]),
  restTaken: 90,
  payslips: [
    {
      cutoffStart: "2026-09-01",
      cutoffEnd: "2026-09-15",
      basePay: 4000,
      statutoryEmployeeShare: 249.5,
      valeDeductions: 0,
      netPay: 3750.5,
      payoutStatus: "succeeded",
      confirmedAt: "2026-09-15T10:00:00Z",
    },
    {
      cutoffStart: "2026-09-16",
      cutoffEnd: "2026-09-30",
      basePay: 4000,
      statutoryEmployeeShare: 249.5,
      valeDeductions: 500,
      netPay: 3250.5,
      payoutStatus: "failed",
      confirmedAt: null,
    },
  ],
  restOff: [
    {
      restDate: "2026-09-20",
      startTime: "13:00:00",
      endTime: "14:30:00",
      minutes: 90,
      status: "approved",
    },
    {
      restDate: "2026-09-27",
      startTime: "09:00:00",
      endTime: "10:00:00",
      minutes: 60,
      status: "pending",
    },
  ],
  generatedAt: new Date(2026, 9, 1),
};

describe("recordPdfHtml", () => {
  const html = recordPdfHtml(base);

  it("lists only paid payslips and approved time off", () => {
    expect(html).toContain("Sep 1–15, 2026");
    expect(html).not.toContain("Sep 16–30, 2026");
    expect(html).toContain("Sep 20, 2026");
    expect(html).not.toContain("Sep 27, 2026");
  });

  it("names the household and her terms", () => {
    expect(html).toContain("the records Reyes Household keeps in Linara");
    expect(html).toContain("7:00 AM – 7:00 PM");
    expect(html).toContain("Sunday");
    expect(html).toContain("₱8,000.00");
    expect(html).toContain("Twice a month");
  });

  it("says deducted and not a certificate, and never claims remittance happened", () => {
    expect(html).toContain("deducted");
    expect(html).toContain("not a certificate of employment");
    expect(html).toContain("does not show whether they were remitted");
  });

  it("escapes text that came from the household", () => {
    const out = recordPdfHtml({ ...base, name: "<b>Ate</b>", householdName: "A & B" });
    expect(out).toContain("&lt;b&gt;Ate&lt;/b&gt;");
    expect(out).toContain("A &amp; B");
    expect(out).not.toContain("<b>Ate</b>");
  });

  it("falls back when the household kept the default name, and shows empty states", () => {
    const out = recordPdfHtml({
      ...base,
      householdName: "My Household",
      payslips: [],
      restOff: [],
    });
    expect(out).toContain("the records her employer&#39;s household keeps");
    expect(out).toContain("No paid payslips recorded yet.");
    expect(out).toContain("No time off recorded.");
  });
});

describe("helpers", () => {
  it("formats periods within and across months", () => {
    expect(formatPeriod("2026-08-16", "2026-08-31")).toBe("Aug 16–31, 2026");
    expect(formatPeriod("2026-08-16", "2026-09-01")).toBe("Aug 16 – Sep 1, 2026");
    expect(formatPeriod("2025-12-16", "2026-01-01")).toBe("Dec 16, 2025 – Jan 1, 2026");
  });

  it("formats clock times and pesos", () => {
    expect(clock("00:30:00")).toBe("12:30 AM");
    expect(clock("12:00:00")).toBe("12:00 PM");
    expect(pesos(1234.5)).toBe("₱1,234.50");
  });

  it("builds a readable file name", () => {
    expect(recordFileName("Maria Luz Peña", new Date(2026, 9, 1))).toBe(
      "Linara-work-record-Maria-Luz-Pena-2026-10-01.pdf",
    );
    expect(recordFileName("???", new Date(2026, 9, 1))).toBe(
      "Linara-work-record-helper-2026-10-01.pdf",
    );
  });
});

describe("a household she has left", () => {
  it("shows the whole period she worked there", () => {
    const out = recordPdfHtml({ ...base, endedOn: "2026-10-03" });
    expect(out).toContain("Employed");
    expect(out).toContain("1 July 2026 – 3 October 2026");
    expect(out).not.toContain("On record since");
  });
});

import { describe, expect, it } from "vitest";

import { computeStatutorySplit } from "./statutory";

/**
 * Half of the cross-repo pin on the statutory split. The other half is
 * ../LINARA/src/features/people/people.utils.test.ts, which asserts this SAME
 * table against its own copy and additionally compares the two function bodies
 * directly.
 *
 * Why both: a value table in one repo only catches a change made without
 * updating that repo's test. Two repos with the same table catch a change made
 * to one side and forgotten on the other -- which is the actual failure mode
 * here, since the two copies cannot import each other and nothing else ties
 * them together. The helper and the manager seeing different deductions on the
 * same wage is exactly what C41 closed one level up, for net pay.
 *
 * KEEP THESE NUMBERS IDENTICAL TO ../LINARA's. If a rate genuinely changes,
 * both repos move in the same pass.
 */
const CASES = [
  // Under ₱5,000/mo the employer pays every share (RA 10361): SSS on the
  // ₱5,000 floor credit (₱750 + ₱10 EC), PhilHealth on its ₱10,000 floor
  // (₱500), Pag-IBIG 2% + her 2% (1% at ₱1,500 or less).
  { wage: 0, employer: 1260, employee: 0, under5k: true },
  { wage: 1500, employer: 1305, employee: 0, under5k: true },
  { wage: 4999, employer: 1459.96, employee: 0, under5k: true },
  // ₱5,000 exactly is NOT "under" -- the boundary is where an off-by-one hides.
  { wage: 5000, employer: 860, employee: 600, under5k: false },
  // SSS 5% / 10% (+₱10 EC) of the credit, PhilHealth ₱250 each to ₱10,000, Pag-IBIG 2% each.
  { wage: 8000, employer: 1220, employee: 810, under5k: false },
  { wage: 9000, employer: 1340, employee: 880, under5k: false },
  // Above ₱10,000 PhilHealth grows with the wage and Pag-IBIG stops at ₱200.
  { wage: 12000, employer: 1710, employee: 1100, under5k: false },
  // EC goes from ₱10 to ₱30 at a ₱15,000 credit.
  { wage: 14500, employer: 2022.5, employee: 1287.5, under5k: false },
  { wage: 15000, employer: 2105, employee: 1325, under5k: false },
  // SSS stops at the ₱35,000 credit.
  { wage: 40000, employer: 4730, employee: 2950, under5k: false },
];

describe("computeStatutorySplit", () => {
  it.each(CASES)(
    "₱$wage/mo -> employer ₱$employer, employee ₱$employee",
    ({ wage, employer, employee, under5k }) => {
      const split = computeStatutorySplit(wage);
      expect(split.isUnder5k).toBe(under5k);
      expect(split.totalEmployer).toBe(employer);
      expect(split.totalEmployee).toBe(employee);
    },
  );

  it("totals equal the sum of their three parts", () => {
    // Guards a typo in one agency's line that happens to leave the total right,
    // or a total quietly hand-written instead of summed.
    const split = computeStatutorySplit(9000);
    expect(split.totalEmployer).toBe(
      split.sssEmployer + split.philhealthEmployer + split.pagibigEmployer,
    );
    expect(split.totalEmployee).toBe(
      split.sssEmployee + split.philhealthEmployee + split.pagibigEmployee,
    );
  });

  it("charges the employee nothing below the threshold", () => {
    const split = computeStatutorySplit(4999);
    expect(split.sssEmployee).toBe(0);
    expect(split.philhealthEmployee).toBe(0);
    expect(split.pagibigEmployee).toBe(0);
  });
});

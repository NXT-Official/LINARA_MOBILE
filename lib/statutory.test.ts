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
  // Under ₱5,000/mo the employer covers 100% (RA 10361), so the employee's
  // share is zero and none of it reaches net pay.
  { wage: 0, employer: 650, employee: 0, under5k: true },
  { wage: 4999, employer: 650, employee: 0, under5k: true },
  // ₱5,000 exactly is NOT "under", so the split applies -- the boundary is the
  // one place an off-by-one would be invisible in every other test.
  { wage: 5000, employer: 575, employee: 375, under5k: false },
  { wage: 9000, employer: 575, employee: 375, under5k: false },
  { wage: 12000, employer: 575, employee: 375, under5k: false },
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

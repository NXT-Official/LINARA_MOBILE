import { describe, expect, it } from "vitest";

import { cutoffsPerMonth, netPayForCutoff, perCutoff } from "./net-pay";

/**
 * The helper-side half of ../LINARA's Session E / E4 invariant
 * (../LINARA/KNOWN_GAPS.md C41): what this app tells the kasambahay she is
 * taking home must equal what the manager's Pay Dial shows and what
 * `initiate_payslip` actually writes.
 *
 * Those other two surfaces are asserted in ../LINARA/src/features/pay/
 * net-pay.test.ts. Before this file existed that suite reached across into this
 * repo to read digital-payslip.tsx as text -- which skipped entirely whenever
 * the two repos were not checked out side by side, i.e. in CI, which is
 * precisely when a guard is worth having.
 *
 * The rule: net = max(0, base - statutory employee share - unsettled approved
 * vales). No term from `ledger_entries` -- after-hours work is time, not money.
 */

const CASES = [
  // ₱9,000/mo semi-monthly: ₱4,500 base, ₱187.50 employee share per cutoff.
  { base: 4500, statutory: 187.5, vales: 0, expected: 4312.5 },
  { base: 4500, statutory: 187.5, vales: 500, expected: 3812.5 },
  // Monthly interval: nothing is halved.
  { base: 12000, statutory: 375, vales: 0, expected: 11625 },
];

describe("netPayForCutoff", () => {
  it.each(CASES)(
    "base $base - statutory $statutory - vales $vales = $expected",
    ({ base, statutory, vales, expected }) => {
      expect(netPayForCutoff(base, statutory, vales)).toBeCloseTo(expected, 2);
    },
  );

  it("floors at zero, matching Postgres GREATEST(0, ...)", () => {
    // A vale bigger than the cutoff. Showing a negative would tell the helper
    // she owes money, which no payout would ever collect.
    expect(netPayForCutoff(4500, 187.5, 99999)).toBe(0);
  });

  it("takes no ledger/rest-owed input at all", () => {
    // Arity is the assertion: there is no parameter a rest-owed total could
    // travel through, so the C39 defect cannot be reintroduced by accident.
    expect(netPayForCutoff.length).toBe(3);
  });
});

describe("cutoff division", () => {
  it("halves for semi_monthly and leaves monthly whole", () => {
    expect(cutoffsPerMonth("semi_monthly")).toBe(2);
    expect(cutoffsPerMonth("monthly")).toBe(1);
    expect(perCutoff(9000, "semi_monthly")).toBe(4500);
    expect(perCutoff(9000, "monthly")).toBe(9000);
  });

  it("splits base and statutory the same way", () => {
    // A mismatch here -- halving one and not the other -- would be invisible in
    // the total for a monthly helper and wrong by exactly the share for a
    // semi-monthly one.
    expect(perCutoff(375, "semi_monthly") * 2).toBeCloseTo(375, 6);
  });
});

/**
 * Deliberately NOT here: a check that digital-payslip.tsx actually calls these
 * functions. It would need `node:fs`, and pulling @types/node into this repo to
 * satisfy `tsc` would put Node's globals into a React Native app's typecheck --
 * where `setTimeout` and friends have different types -- for a test-only
 * convenience. That guard lives in ../LINARA/src/features/pay/net-pay.test.ts,
 * which already runs in a Node context and reads both repos.
 */

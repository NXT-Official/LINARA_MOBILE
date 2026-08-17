/**
 * What the kasambahay actually takes home for a cutoff, as this app shows it.
 *
 * Counterpart to ../LINARA/src/features/pay/net-pay.ts. The rule, identically:
 *
 *     net = max(0, base - statutory employee share - unsettled approved vales)
 *
 * and nothing else -- in particular NO term from `ledger_entries`. After-hours
 * work is time, not money (../LINARA/KNOWN_GAPS.md C39): rest owed accrues in
 * minutes and is redeemed through `rest_off_requests`, and rest-day premium is
 * not paid in cash either.
 *
 * Three surfaces have to agree on this number -- the manager's Pay Dial, this
 * app's DigitalPayslip, and the `net_pay` that `initiate_payslip` actually
 * writes. They did agree, but only because each was hand-written the same way,
 * which is not a guarantee. Pulled out of the component so net-pay.test.ts can
 * assert it without rendering React Native.
 *
 * Deliberately takes the base and statutory figures rather than a monthly rate:
 * `computeStatutorySplit` lives in a component module here, and importing that
 * would drag React Native into a plain unit test. The division by cutoffs is
 * included since that is where a semi-monthly/monthly mistake would hide.
 */

export type PaydayInterval = "semi_monthly" | "monthly";

export function cutoffsPerMonth(paydayInterval: PaydayInterval): 1 | 2 {
  return paydayInterval === "semi_monthly" ? 2 : 1;
}

export function perCutoff(monthlyAmount: number, paydayInterval: PaydayInterval): number {
  return monthlyAmount / cutoffsPerMonth(paydayInterval);
}

/**
 * `approvedValeTotal` must be approved vales that are not yet settled against
 * a payslip -- one already deducted from a previous cutoff would otherwise keep
 * shrinking this estimate forever.
 *
 * There is no parameter for ledger minutes, and that is the point: the
 * invariant is enforced by the signature rather than by a comment.
 */
export function netPayForCutoff(
  basePay: number,
  statutoryEmployeeShare: number,
  approvedValeTotal: number,
): number {
  return Math.max(0, basePay - statutoryEmployeeShare - approvedValeTotal);
}

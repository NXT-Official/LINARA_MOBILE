import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "@/lib/theme";
import { formatPeso } from "@/lib/format";
import { formatCutoffRange } from "@/lib/cutoff";
import { forWorkedShare, netPayForCutoff, perCutoff } from "@/lib/net-pay";
import { computeStatutorySplit, LegalContributionSplit } from "./legal-contribution-split";

/**
 * Digital payslip for the *current, not-yet-paid-out* cutoff (roadmap
 * Story 11 step 1) -- computed live from `helper_profiles`'
 * `monthly_rate`/`payday_interval`, same as the web reference's
 * `SpendAndPayday` Pay Dial. Once a manager runs "Pay Now" (LINARA's Money
 * tab) for this cutoff, the confirmed payout shows up in
 * `PayslipHistory` below instead (see payslip-history.tsx and
 * ../LINARA/KNOWN_GAPS.md's Closed Gap for #9) -- this card stays the live
 * estimate, and only says when this cutoff has been paid (`paid`).
 */
export function DigitalPayslip({
  monthlyRate,
  paydayInterval,
  approvedValeTotal,
  cutoffStart,
  cutoffEnd,
  workedShare = 1,
  unpaidLeave,
  paid = false,
}: {
  monthlyRate: number;
  paydayInterval: "semi_monthly" | "monthly";
  approvedValeTotal: number;
  /**
   * The current cutoff's boundaries, from `getHouseholdCutoff` (the shared
   * Postgres RPC). Optional so the card still renders while the query is in
   * flight -- it falls back to the interval label it showed before dates
   * existed here. Never computed locally: see services/api/cutoff.ts.
   */
  cutoffStart?: string;
  cutoffEnd?: string;
  /** Share of the cutoff worked -- less than 1 for her first one if she started
   * partway through, the same pro-rating the payout uses. */
  workedShare?: number;
  /** What the payout will take for unpaid leave this cutoff (getUnpaidLeaveDue). */
  unpaidLeave?: { days: number; deduction: number };
  /** A payslip for this cutoff has gone through: say so instead of "estimate"
   * (../LINARA/KNOWN_GAPS.md O55). Its exact figures are in PayslipHistory. */
  paid?: boolean;
}) {
  // The arithmetic lives in lib/net-pay.ts so it can be unit-tested without
  // rendering React Native, and so the rule this app displays is stated in one
  // place -- see that file, and ../LINARA/KNOWN_GAPS.md C41 for why "the three
  // surfaces happen to match" was not good enough.
  const basePay = forWorkedShare(perCutoff(monthlyRate, paydayInterval), workedShare);
  const split = computeStatutorySplit(monthlyRate);
  const employeeShareThisCutoff = forWorkedShare(
    perCutoff(split.totalEmployee, paydayInterval),
    workedShare,
  );
  const leaveDeduction = unpaidLeave?.deduction ?? 0;
  const netEstimate = netPayForCutoff(
    basePay,
    employeeShareThisCutoff,
    approvedValeTotal,
    leaveDeduction,
  );

  const intervalLabel =
    paydayInterval === "semi_monthly" ? "This cutoff (half-month)" : "This cutoff (monthly)";

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>
        {cutoffStart && cutoffEnd ? formatCutoffRange(cutoffStart, cutoffEnd) : intervalLabel}
      </Text>
      <Text style={styles.netPay}>{formatPeso(netEstimate)}</Text>
      <Text style={styles.netPayHint}>
        {paid
          ? "Nabayaran na. Nasa Mga payslip sa ibaba ang eksaktong natanggap mo."
          : "Tantiyang matatanggap mo"}
      </Text>

      <View style={styles.divider} />

      <View style={styles.lineRow}>
        <Text style={styles.lineLabel}>Basic na sahod</Text>
        <Text style={styles.lineValue}>{formatPeso(basePay)}</Text>
      </View>
      <View style={styles.lineRow}>
        {/* Ngayong cutoff: the table below is per month, and both are her
            share, so each says its period (QA LMM-A3). */}
        <Text style={styles.lineLabel}>
          Bahagi mo sa SSS / PhilHealth / Pag-IBIG (ngayong cutoff)
        </Text>
        <Text style={[styles.lineValue, styles.deduction]}>
          − {formatPeso(employeeShareThisCutoff)}
        </Text>
      </View>
      {approvedValeTotal > 0 ? (
        <View style={styles.lineRow}>
          <Text style={styles.lineLabel}>Bawas na vale</Text>
          <Text style={[styles.lineValue, styles.deduction]}>
            − {formatPeso(approvedValeTotal)}
          </Text>
        </View>
      ) : null}
      {leaveDeduction > 0 ? (
        <View style={styles.lineRow}>
          <Text style={styles.lineLabel}>Leave na walang bayad ({unpaidLeave?.days} araw)</Text>
          <Text style={[styles.lineValue, styles.deduction]}>− {formatPeso(leaveDeduction)}</Text>
        </View>
      ) : null}

      <LegalContributionSplit wagePHP={monthlyRate} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.terracottaGold,
  },
  netPay: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.ink,
  },
  netPayHint: {
    fontSize: 13,
    color: colors.mutedInk,
    marginTop: -8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  lineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  lineLabel: {
    fontSize: 13,
    color: colors.ink,
    flexShrink: 1,
    paddingRight: 8,
  },
  lineValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
  },
  deduction: {
    color: colors.mutedInk,
  },
});

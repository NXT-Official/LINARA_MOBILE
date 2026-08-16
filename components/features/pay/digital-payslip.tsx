import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "@/lib/theme";
import { formatPeso } from "@/lib/format";
import { formatCutoffRange } from "@/lib/cutoff";
import { computeStatutorySplit, LegalContributionSplit } from "./legal-contribution-split";

/**
 * Digital payslip for the *current, not-yet-paid-out* cutoff (roadmap
 * Story 11 step 1) -- computed live from `helper_profiles`'
 * `monthly_rate`/`payday_interval`, same as the web reference's
 * `SpendAndPayday` Pay Dial. Once a manager runs "Pay Now" (LINARA's Money
 * tab) for this cutoff, the confirmed payout shows up in
 * `PayslipHistory` below instead (see payslip-history.tsx and
 * ../LINARA/KNOWN_GAPS.md's Closed Gap for #9) -- this card never reflects
 * payout status itself, only the live estimate for whatever cutoff hasn't
 * been paid yet.
 */
export function DigitalPayslip({
  monthlyRate,
  paydayInterval,
  approvedValeTotal,
  cutoffStart,
  cutoffEnd,
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
}) {
  const cutoffsPerMonth = paydayInterval === "semi_monthly" ? 2 : 1;
  const basePay = monthlyRate / cutoffsPerMonth;
  const split = computeStatutorySplit(monthlyRate);
  const employeeShareThisCutoff = split.totalEmployee / cutoffsPerMonth;
  const netEstimate = Math.max(0, basePay - employeeShareThisCutoff - approvedValeTotal);

  const intervalLabel =
    paydayInterval === "semi_monthly" ? "This cutoff (half-month)" : "This cutoff (monthly)";

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>
        {cutoffStart && cutoffEnd ? formatCutoffRange(cutoffStart, cutoffEnd) : intervalLabel}
      </Text>
      <Text style={styles.netPay}>{formatPeso(netEstimate)}</Text>
      <Text style={styles.netPayHint}>Estimated take-home</Text>

      <View style={styles.divider} />

      <View style={styles.lineRow}>
        <Text style={styles.lineLabel}>Base pay</Text>
        <Text style={styles.lineValue}>{formatPeso(basePay)}</Text>
      </View>
      <View style={styles.lineRow}>
        <Text style={styles.lineLabel}>SSS / PhilHealth / Pag-IBIG share</Text>
        <Text style={[styles.lineValue, styles.deduction]}>
          − {formatPeso(employeeShareThisCutoff)}
        </Text>
      </View>
      {approvedValeTotal > 0 ? (
        <View style={styles.lineRow}>
          <Text style={styles.lineLabel}>Vale deduction</Text>
          <Text style={[styles.lineValue, styles.deduction]}>
            − {formatPeso(approvedValeTotal)}
          </Text>
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
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.terracottaGold,
  },
  netPay: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.ink,
  },
  netPayHint: {
    fontSize: 12,
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

import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "@/lib/theme";
import { formatPeso } from "@/lib/format";
import { formatCutoffRange } from "@/lib/cutoff";
import type { Payslip, PayoutStatus } from "@/services/api/payslips";

const STATUS_LABEL: Record<PayoutStatus, string> = {
  pending_send: "Sinesend...",
  processing: "Pinoproseso",
  succeeded: "Nabayaran",
  failed: "Hindi na-send",
};

const STATUS_COLOR: Record<PayoutStatus, string> = {
  pending_send: colors.mutedInk,
  processing: colors.terracottaGold,
  succeeded: colors.pineTeal,
  failed: colors.terracottaGold,
};

/**
 * The "multi-cutoff payslip history" digital-payslip.tsx's own doc comment
 * anticipated but couldn't show yet -- real as of ../LINARA/KNOWN_GAPS.md
 * gap #9's close. Read-only: "Pay Now" is a manager-only action on LINARA's
 * web Money tab, not something a helper triggers from here.
 */
export function PayslipHistory({ payslips }: { payslips: Payslip[] }) {
  if (payslips.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Payslip History</Text>
      {payslips.map((p) => (
        <View key={p.id} style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.amount}>{formatPeso(p.netPay)}</Text>
            <Text style={styles.meta}>
              {formatCutoffRange(p.cutoffStart, p.cutoffEnd)} ·{" "}
              {p.payoutChannelCode === "PH_GCASH" ? "GCash" : "Maya"}
            </Text>
          </View>
          <Text style={[styles.status, { color: STATUS_COLOR[p.payoutStatus] }]}>
            {STATUS_LABEL[p.payoutStatus]}
          </Text>
        </View>
      ))}
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
    gap: 10,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.terracottaGold,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  rowLeft: {
    flexShrink: 1,
  },
  amount: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.ink,
  },
  meta: {
    fontSize: 11,
    color: colors.mutedInk,
  },
  status: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
  },
});

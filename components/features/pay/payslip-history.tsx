import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "@/lib/theme";
import { formatPeso } from "@/lib/format";
import { formatCutoffRange } from "@/lib/cutoff";
import { METHOD_LABEL, type Payslip, type PayoutStatus } from "@/services/api/payslips";

/** Where a payment made outside Linara stands with her. */
const ACK_LABEL = {
  pending: "Hinihintay ang sagot mo",
  confirmed: "Kinumpirma mo",
  disputed: "Sinabi mong hindi natanggap",
} as const;

const STATUS_LABEL: Record<PayoutStatus, string> = {
  pending_send: "Sinesend...",
  processing: "Pinoproseso",
  succeeded: "Nabayaran",
  failed: "Hindi na-send",
  needs_review: "Nire-review",
};

const STATUS_COLOR: Record<PayoutStatus, string> = {
  pending_send: colors.mutedInk,
  processing: colors.terracottaGold,
  succeeded: colors.pineTeal,
  failed: colors.terracottaGold,
  needs_review: colors.terracottaGold,
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
      <Text style={styles.eyebrow}>Mga payslip</Text>
      {payslips.map((p) => (
        <View key={p.id} style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.amount}>{formatPeso(p.netPay)}</Text>
            <Text style={styles.meta}>
              {p.kind === "thirteenth_month"
                ? `13th-month pay ${p.cutoffEnd.slice(0, 4)}`
                : formatCutoffRange(p.cutoffStart, p.cutoffEnd)}{" "}
              · {METHOD_LABEL[p.payoutChannelCode] ?? "Iba pa"}
            </Text>
            {p.unpaidLeaveDeduction > 0 ? (
              <Text style={styles.meta}>
                Bawas na leave na walang bayad: {formatPeso(p.unpaidLeaveDeduction)} (
                {p.unpaidLeaveDays} araw)
              </Text>
            ) : null}
          </View>
          {p.payoutProvider === "manual" && p.helperAck ? (
            <Text
              style={[
                styles.status,
                { color: p.helperAck === "confirmed" ? colors.pineTeal : colors.terracottaInk },
              ]}
            >
              {ACK_LABEL[p.helperAck]}
            </Text>
          ) : (
            <Text style={[styles.status, { color: STATUS_COLOR[p.payoutStatus] }]}>
              {STATUS_LABEL[p.payoutStatus]}
            </Text>
          )}
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
    fontSize: 13,
    fontWeight: "700",
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
    fontSize: 13,
    color: colors.mutedInk,
  },
  status: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
  },
});

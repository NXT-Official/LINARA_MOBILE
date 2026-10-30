import { StyleSheet, View } from "react-native";

import { colors, fonts } from "@/lib/theme";
import { formatPeso } from "@/lib/format";
import { formatCutoffRange } from "@/lib/cutoff";
import { methodLabel, type Payslip, type PayoutStatus } from "@/services/api/payslips";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/instance";

/** Where a payment made outside Linara stands with her. */
const ACK_LABEL = {
  pending: "ack.pending",
  confirmed: "ack.confirmed",
  disputed: "ack.disputed",
} as const;

const STATUS_LABEL: Record<PayoutStatus, MessageKey> = {
  pending_send: "payout.sending",
  processing: "payout.processing",
  succeeded: "payout.paid",
  failed: "payout.failed",
  needs_review: "payout.review",
};

const STATUS_COLOR: Record<PayoutStatus, string> = {
  pending_send: colors.mutedInk,
  processing: colors.terracottaInk,
  succeeded: colors.pineTeal,
  failed: colors.terracottaInk,
  needs_review: colors.terracottaInk,
};

/**
 * The "multi-cutoff payslip history" digital-payslip.tsx's own doc comment
 * anticipated but couldn't show yet -- real as of ../LINARA/KNOWN_GAPS.md
 * gap #9's close. Read-only: "Pay Now" is a manager-only action on LINARA's
 * web Money tab, not something a helper triggers from here.
 */
export function PayslipHistory({ payslips }: { payslips: Payslip[] }) {
  const t = useT();
  if (payslips.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} accessibilityRole="header">
        {t("pay.mgaPayslip")}
      </Text>
      {payslips.map((p) => (
        <View key={p.id} style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.amount}>{formatPeso(p.netPay)}</Text>
            <Text style={styles.meta}>
              {p.kind === "thirteenth_month"
                ? t("pay.13thMonthPay", { v1: p.cutoffEnd.slice(0, 4) })
                : formatCutoffRange(p.cutoffStart, p.cutoffEnd)}{" "}
              · {methodLabel(p.payoutChannelCode)}
            </Text>
            {p.unpaidLeaveDeduction > 0 ? (
              <Text style={styles.meta}>
                {t("pay.leaveDeductionLine", {
                  amount: formatPeso(p.unpaidLeaveDeduction),
                  days: p.unpaidLeaveDays,
                  count: p.unpaidLeaveDays,
                })}
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
              {t(ACK_LABEL[p.helperAck])}
            </Text>
          ) : (
            <Text style={[styles.status, { color: STATUS_COLOR[p.payoutStatus] }]}>
              {t(STATUS_LABEL[p.payoutStatus])}
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
  // The card's own title, like the rest of the app's cards (was a small
  // coloured label above nothing: an eyebrow, audit 2026-10-29).
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.ink,
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

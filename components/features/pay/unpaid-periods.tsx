import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "@/lib/theme";
import { formatCutoffRange } from "@/lib/cutoff";
import type { PayPeriod } from "@/services/api/pay-periods";

/**
 * Cutoffs that closed with no payment on record -- the same list the manager
 * sees on the web (helper_pay_periods), so she can raise it and they can pay
 * it or record how they paid. Shown, not argued: no totals owed, since a
 * payment made outside Linara may simply not be recorded yet.
 */
export function UnpaidPeriods({ periods }: { periods: PayPeriod[] }) {
  const unpaid = periods.filter((p) => !p.payslipId && !p.isCurrent);
  if (unpaid.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Walang naka-record na bayad</Text>
      <Text style={styles.sub}>
        Tapos na ang mga cutoff na ito pero walang bayad sa record. Kung nabayaran ka na sa labas ng
        Linara, hilingin sa employer mo na i-record ito para makumpirma mo.
      </Text>
      {unpaid.map((p) => (
        <Text key={p.fullStart} style={styles.period}>
          {formatCutoffRange(p.workedStart, p.workedEnd)}
          {p.isFinal ? " · huling cutoff" : ""}
        </Text>
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
    gap: 6,
  },
  title: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  sub: { fontSize: 13, lineHeight: 18, color: colors.mutedInk },
  period: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

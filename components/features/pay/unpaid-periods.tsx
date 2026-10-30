import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { colors, fonts } from "@/lib/theme";
import { formatCutoffRange } from "@/lib/cutoff";
import type { PayPeriod } from "@/services/api/pay-periods";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";

/**
 * Cutoffs that closed with no payment on record -- the same list the manager
 * sees on the web (helper_pay_periods), so she can raise it and they can pay
 * it or record how they paid. Shown, not argued: no totals owed, since a
 * payment made outside Linara may simply not be recorded yet.
 */
const SHOWN = 3;

export function UnpaidPeriods({ periods }: { periods: PayPeriod[] }) {
  const t = useT();
  const [showAll, setShowAll] = useState(false);
  const unpaid = periods.filter((p) => !p.payslipId && !p.isCurrent);
  if (unpaid.length === 0) return null;
  // Oldest first, the first few only: a long run of unpaid cutoffs shouldn't
  // fill her whole My Pay screen.
  const hidden = unpaid.length - SHOWN;
  const shown = showAll || hidden <= 0 ? unpaid : unpaid.slice(0, SHOWN);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("pay.unpaidTitle", { count: unpaid.length })}</Text>
      <Text style={styles.sub}>{t("pay.taposNaAngMgaCutoff")}</Text>
      {shown.map((p) => (
        <Text key={p.fullStart} style={styles.period}>
          {formatCutoffRange(p.workedStart, p.workedEnd)}
          {p.isFinal ? t("pay.hulingCutoff") : ""}
        </Text>
      ))}
      {hidden > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowAll((v) => !v)}
          style={styles.toggle}
        >
          <Text style={styles.toggleText}>
            {showAll ? t("pay.itago") : t("pay.ipakitaAngPa", { hidden })}
          </Text>
        </Pressable>
      ) : null}
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
  toggle: { minHeight: 44, justifyContent: "center" },
  toggleText: { fontSize: 14, fontWeight: "700", color: colors.pineTeal },
  period: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

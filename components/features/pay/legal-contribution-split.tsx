import { StyleSheet, View } from "react-native";

import { colors, fonts } from "@/lib/theme";
import { formatPeso } from "@/lib/format";
import { computeStatutorySplit } from "@/lib/statutory";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";

/**
 * The split itself lives in lib/statutory.ts so it can be unit-tested without
 * React Native, and so ../LINARA's suite can compare the two repos' copies
 * directly (see that file). Re-exported here because this module was the
 * original home and other files import it from here.
 */
export { computeStatutorySplit, type StatutorySplit } from "@/lib/statutory";

/** Roadmap Story 11 step 1's statutory split display. */
export function LegalContributionSplit({ wagePHP }: { wagePHP: number }) {
  const t = useT();
  const split = computeStatutorySplit(wagePHP);
  const isUnder5k = split.isUnder5k;

  const rows: { label: string; employer: number; employee: number }[] = [
    { label: t("pay.sssPremium"), employer: split.sssEmployer, employee: split.sssEmployee },
    {
      label: "PhilHealth",
      employer: split.philhealthEmployer,
      employee: split.philhealthEmployee,
    },
    {
      label: t("pay.pagIbigFund"),
      employer: split.pagibigEmployer,
      employee: split.pagibigEmployee,
    },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} accessibilityRole="header">
        {t("pay.hatianNgKontribusyonKadaBuwan")}
      </Text>

      <View style={styles.headerRow}>
        <Text style={[styles.cell, styles.headerCell, styles.labelCol]}>
          {t("pay.kontribusyon")}
        </Text>
        <Text style={[styles.cell, styles.headerCell, styles.amountCol]}>{t("pay.employer")}</Text>
        <Text style={[styles.cell, styles.headerCell, styles.amountCol]}>{t("pay.ikaw")}</Text>
      </View>

      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={[styles.cell, styles.labelCol]}>{row.label}</Text>
          <Text style={[styles.cell, styles.amountCol]}>{formatPeso(row.employer)}</Text>
          <Text style={[styles.cell, styles.amountCol, isUnder5k && styles.zeroShare]}>
            {formatPeso(row.employee)}
          </Text>
        </View>
      ))}

      <View style={[styles.row, styles.totalRow]}>
        <Text style={[styles.cell, styles.labelCol, styles.totalText]}>{t("pay.kabuuan")}</Text>
        <Text style={[styles.cell, styles.amountCol, styles.totalText]}>
          {formatPeso(split.totalEmployer)}
        </Text>
        <Text
          style={[styles.cell, styles.amountCol, styles.totalText, isUnder5k && styles.zeroShare]}
        >
          {formatPeso(split.totalEmployee)}
        </Text>
      </View>

      <Text style={styles.note}>{t("pay.ayonSa2026NaRates")}</Text>
      {isUnder5k ? <Text style={styles.note}>{t("pay.dahilAngBuwanangSweldoAy")}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.sand,
    padding: 14,
    gap: 8,
  },
  // The card's own title, like the rest of the app's cards (was a small
  // coloured label above nothing: an eyebrow, audit 2026-10-29).
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.ink,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
    marginTop: 2,
  },
  cell: {
    fontSize: 13,
    color: colors.ink,
  },
  headerCell: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.mutedInk,
  },
  labelCol: {
    flex: 1.4,
  },
  amountCol: {
    flex: 1,
    textAlign: "right",
  },
  totalText: {
    fontWeight: "700",
    color: colors.pineTeal,
  },
  zeroShare: {
    fontWeight: "700",
    color: colors.pineTeal,
  },
  note: {
    fontSize: 13,
    fontStyle: "italic",
    color: colors.pineTeal,
    lineHeight: 18,
  },
});

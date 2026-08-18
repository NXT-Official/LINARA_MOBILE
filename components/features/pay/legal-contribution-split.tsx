import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/lib/theme";
import { formatPeso } from "@/lib/format";

/**
 * The split itself lives in lib/statutory.ts so it can be unit-tested without
 * React Native, and so ../LINARA's suite can compare the two repos' copies
 * directly (see that file). Re-exported here because this module was the
 * original home and other files import it from here.
 */
export { computeStatutorySplit, type StatutorySplit } from "@/lib/statutory";
import { computeStatutorySplit } from "@/lib/statutory";

/** Roadmap Story 11 step 1's statutory split display. */
export function LegalContributionSplit({ wagePHP }: { wagePHP: number }) {
  const split = computeStatutorySplit(wagePHP);
  const isUnder5k = split.isUnder5k;

  const rows: { label: string; employer: number; employee: number }[] = [
    { label: "SSS Premium", employer: split.sssEmployer, employee: split.sssEmployee },
    {
      label: "PhilHealth",
      employer: split.philhealthEmployer,
      employee: split.philhealthEmployee,
    },
    { label: "Pag-IBIG Fund", employer: split.pagibigEmployer, employee: split.pagibigEmployee },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Legal Contribution Split (Batas Kasambahay)</Text>

      <View style={styles.headerRow}>
        <Text style={[styles.cell, styles.headerCell, styles.labelCol]}>Contribution</Text>
        <Text style={[styles.cell, styles.headerCell, styles.amountCol]}>Employer</Text>
        <Text style={[styles.cell, styles.headerCell, styles.amountCol]}>You</Text>
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
        <Text style={[styles.cell, styles.labelCol, styles.totalText]}>Total</Text>
        <Text style={[styles.cell, styles.amountCol, styles.totalText]}>
          {formatPeso(split.totalEmployer)}
        </Text>
        <Text
          style={[styles.cell, styles.amountCol, styles.totalText, isUnder5k && styles.zeroShare]}
        >
          {formatPeso(split.totalEmployee)}
        </Text>
      </View>

      {isUnder5k ? (
        <Text style={styles.note}>
          Dahil ang buwanang sweldo ay mas mababa sa ₱5,000, ang Employer ay obligadong magbayad ng
          100% ng kontribusyon ayon sa batas.
        </Text>
      ) : null}
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
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.mutedInk,
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
    fontSize: 12,
    color: colors.ink,
  },
  headerCell: {
    fontSize: 10,
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
    fontSize: 10,
    fontStyle: "italic",
    color: colors.pineTeal,
    lineHeight: 15,
  },
});

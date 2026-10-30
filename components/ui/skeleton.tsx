import { StyleSheet, View, type DimensionValue } from "react-native";

import { colors } from "@/lib/theme";
import { useT } from "@/lib/i18n/locale-context";

/**
 * The shape of a screen while its data loads, instead of a spinner in an
 * empty page: she sees where things will be. Still blocks, no shimmer, so
 * there is no looping motion to switch off for Reduce Motion.
 */
export function Skeleton({ lines = 3, header = true }: { lines?: number; header?: boolean }) {
  const t = useT();
  const widths: DimensionValue[] = ["92%", "70%", "84%", "60%"];
  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("common.nagloLoad")}
    >
      {header ? <View style={styles.header} /> : null}
      <View style={styles.card}>
        {Array.from({ length: lines }, (_, i) => (
          <View key={i} style={[styles.line, { width: widths[i % widths.length] }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 16,
  },
  header: {
    height: 120,
    borderRadius: 24,
    backgroundColor: colors.border,
  },
  card: {
    gap: 12,
    borderRadius: 20,
    padding: 16,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  line: {
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.border,
  },
});

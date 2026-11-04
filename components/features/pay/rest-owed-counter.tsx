import { StyleSheet, View } from "react-native";

import { colors, fonts } from "@/lib/theme";
import { formatHoursMinutes } from "@/lib/format";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";

/**
 * Rest Owed Counter (roadmap Story 11 step 3 / plan.md 3.2): a live total of
 * time-off-in-lieu accrued from off-shift work, in hours/minutes -- not
 * pesos. Architecture.md Section 5.2 pays premium-pay entries in cash at a
 * multiplier of the helper's "hourly rate equivalent," but no divisor for
 * that equivalent is specified anywhere in plan.md/architecture.md, so this
 * counter deliberately stays a time balance rather than inventing one.
 */
export function RestOwedCounter({ minutes }: { minutes: number }) {
  const t = useT();
  return (
    <View style={styles.card}>
      <View style={styles.textCol}>
        <Text style={styles.eyebrow}>{t("pay.restOwedMo")}</Text>
        <Text style={styles.value}>{formatHoursMinutes(minutes)}</Text>
        <Text style={styles.hint}>{t("pay.pahingangNaiponMulaSaTrabaho")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 20,
    padding: 16,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textCol: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.mutedInk,
  },
  value: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.ink,
  },
  hint: {
    fontSize: 13,
    color: colors.mutedInk,
  },
});

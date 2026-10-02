import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts } from "@/lib/theme";
import { formatHoursMinutes } from "@/lib/format";

/**
 * Rest Owed Counter (roadmap Story 11 step 3 / plan.md 3.2): a live total of
 * time-off-in-lieu accrued from off-shift work, in hours/minutes -- not
 * pesos. Architecture.md Section 5.2 pays premium-pay entries in cash at a
 * multiplier of the helper's "hourly rate equivalent," but no divisor for
 * that equivalent is specified anywhere in plan.md/architecture.md, so this
 * counter deliberately stays a time balance rather than inventing one.
 */
export function RestOwedCounter({ minutes }: { minutes: number }) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="time-outline" size={20} color={colors.pineTeal} />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.eyebrow}>Rest Owed</Text>
        <Text style={styles.value}>{formatHoursMinutes(minutes)}</Text>
        <Text style={styles.hint}>Time-off in lieu accrued from off-shift work</Text>
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
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sand,
  },
  textCol: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.mutedInk,
  },
  value: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.ink,
  },
  hint: {
    fontSize: 11,
    color: colors.mutedInk,
  },
});

import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/lib/theme";
import type { Workplaces } from "@/hooks/use-workplaces";
import type { PlaceRef } from "@/services/api/workplaces";

/**
 * Where a task is: "Main House → School" for a trip, or the house's name when
 * she works in more than one. Nothing for a one-house helper's plain task.
 */
export function PlaceTag({
  places,
  householdId,
  from,
  to,
}: {
  places: Workplaces;
  householdId?: string | null;
  from?: PlaceRef | null;
  to?: PlaceRef | null;
}) {
  const a = places.placeName(from);
  const b = places.placeName(to);
  const text =
    from || to
      ? a && b
        ? `${a} → ${b}`
        : a
          ? `Mula ${a}`
          : b
            ? `Papunta ${b}`
            : null
      : places.multi
        ? places.houseName(householdId)
        : null;
  if (!text) return null;
  return (
    <View style={styles.row}>
      <Ionicons
        name={from || to ? "car-outline" : "home-outline"}
        size={13}
        color={colors.mutedInk}
      />
      <Text style={styles.text} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  text: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colors.mutedInk,
  },
});

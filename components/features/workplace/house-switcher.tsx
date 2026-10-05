import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { colors } from "@/lib/theme";
import type { Workplaces } from "@/hooks/use-workplaces";

/**
 * Which house she's looking at, for a helper who works in more than one of
 * the family's houses. Today can show all of them at once; the pantry is one
 * house's. Renders nothing for a helper with one house.
 */
export function HouseSwitcher({
  places,
  allowAll = false,
}: {
  places: Workplaces;
  /** Offer "Lahat" (every house): Today does; the pantry doesn't. */
  allowAll?: boolean;
}) {
  if (!places.multi) return null;
  const active = allowAll ? places.house : places.oneHouse;
  const chips = [
    ...(allowAll ? [{ key: "all", label: "Lahat ng bahay" }] : []),
    ...places.workplaces.map((w) => ({ key: w.householdId, label: w.name })),
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
      accessibilityRole="tablist"
    >
      {chips.map((c) => {
        const on = c.key === active;
        return (
          <Pressable
            key={c.key}
            onPress={() => places.setHouse(c.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chips: {
    gap: 6,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardCream,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipOn: {
    borderColor: colors.pineTeal,
    backgroundColor: colors.pineTeal,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
  },
  chipTextOn: {
    color: colors.cardCream,
  },
});

import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/lib/theme";

export interface FilterChip<K extends string> {
  key: K;
  label: string;
}

/**
 * Search box plus a row of filter chips, shared by the palengke list and
 * pantry stock (client feedback, 2026-10-02: both need search and filter).
 */
export function ListFilter<K extends string>({
  query,
  onQuery,
  chips,
  active,
  onChip,
}: {
  query: string;
  onQuery: (q: string) => void;
  chips: FilterChip<K>[];
  active: K;
  onChip: (key: K) => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.search}>
        <Ionicons name="search" size={16} color={colors.mutedInk} />
        <TextInput
          value={query}
          onChangeText={onQuery}
          placeholder="Hanapin…"
          placeholderTextColor={colors.mutedInk}
          autoCorrect={false}
          style={styles.searchInput}
          accessibilityLabel="Hanapin"
        />
        {query ? (
          <Pressable
            onPress={() => onQuery("")}
            hitSlop={8}
            accessibilityLabel="Burahin ang hinahanap"
          >
            <Ionicons name="close-circle" size={16} color={colors.mutedInk} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {chips.map((chip) => {
          const on = chip.key === active;
          return (
            <Pressable
              key={chip.key}
              onPress={() => onChip(chip.key)}
              accessibilityState={{ selected: on }}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{chip.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Case-insensitive "contains", for the search box. */
export function matchesQuery(name: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  return !q || name.toLowerCase().includes(q);
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardCream,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 8,
  },
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

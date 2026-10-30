import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/lib/theme";
import { Text, TextInput } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/instance";

export interface FilterChip<K extends string> {
  key: K;
  label: MessageKey;
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
  const t = useT();
  return (
    <View style={styles.wrap}>
      <View style={styles.search}>
        <Ionicons name="search" size={16} color={colors.mutedInk} />
        <TextInput
          value={query}
          onChangeText={onQuery}
          placeholder={t("pantry.hanapin")}
          placeholderTextColor={colors.mutedInk}
          autoCorrect={false}
          style={styles.searchInput}
          accessibilityLabel={t("pantry.hanapin2")}
        />
        {query ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => onQuery("")}
            hitSlop={16}
            accessibilityLabel={t("pantry.burahinAngHinahanap")}
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
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8 }}
              key={chip.key}
              onPress={() => onChip(chip.key)}
              accessibilityState={{ selected: on }}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{t(chip.label)}</Text>
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

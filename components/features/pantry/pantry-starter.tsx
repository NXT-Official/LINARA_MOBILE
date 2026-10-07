import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts } from "@/lib/theme";
import { CATEGORY_LABEL, STARTER_ITEMS, STARTER_ORDER, unitFor } from "@/lib/pantry";
import type { PantryItemInput } from "@/services/api/pantry";
import { PrimaryButton } from "@/components/ui/primary-button";

/**
 * What an empty pantry shows instead of "Walang laman" (client feedback,
 * 2026-10-02: an empty Pantry gave them nothing to do). The usual staples,
 * ticked by shelf, go in with one button; she unticks what the home doesn't
 * keep, or adds her own instead.
 */
export function PantryStarter({
  saving,
  onAdd,
  onAddOwn,
}: {
  saving: boolean;
  onAdd: (items: PantryItemInput[]) => void;
  onAddOwn: () => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(STARTER_ITEMS.filter((i) => i.picked).map((i) => i.name)),
  );
  const toggle = (name: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  const chosen = STARTER_ITEMS.filter((i) => picked.has(i.name));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Simulan sa mga karaniwan</Text>
      <Text style={styles.sub}>
        I-tsek ang mga meron sa bahay. Nagsisimula silang puno; kapag paubos na, ilista lang sa
        palengke.
      </Text>

      {STARTER_ORDER.map((cat) => {
        const items = STARTER_ITEMS.filter((i) => i.category === cat);
        if (items.length === 0) return null;
        return (
          <View key={cat} style={styles.group}>
            <Text style={styles.groupLabel}>{CATEGORY_LABEL[cat]}</Text>
            {items.map((item) => {
              const on = picked.has(item.name);
              return (
                <Pressable
                  key={item.name}
                  onPress={() => toggle(item.name)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={item.name}
                  style={styles.row}
                >
                  <Ionicons
                    name={on ? "checkbox" : "square-outline"}
                    size={24}
                    color={on ? colors.pineTeal : colors.mutedInk}
                  />
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.par}>
                    laging may {item.par} {unitFor(item.par, item.unit)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        );
      })}

      <PrimaryButton
        label={`Idagdag ang ${chosen.length}`}
        loading={saving}
        disabled={chosen.length === 0}
        onPress={() => onAdd(chosen.map(({ picked: _picked, ...item }) => item))}
      />
      <PrimaryButton label="Sarili kong listahan" variant="secondary" onPress={onAddOwn} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 10,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  sub: { fontSize: 14, lineHeight: 20, color: colors.mutedInk },
  group: { marginTop: 4 },
  groupLabel: { fontSize: 13, fontWeight: "700", color: colors.mutedInk, marginBottom: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  name: { flex: 1, fontSize: 15, color: colors.ink },
  par: { fontSize: 13, color: colors.mutedInk },
});

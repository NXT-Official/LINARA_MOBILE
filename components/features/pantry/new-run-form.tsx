import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/lib/theme";
import { PrimaryButton } from "@/components/ui/primary-button";
import type { GroceryItemRow } from "@/services/api/grocery";

/**
 * A pantry lead makes a draft run from what's in Kailangan: a name and the
 * lines to take. It goes to a manager for approval from its card.
 */
export function NewRunForm({
  pool,
  saving,
  onSubmit,
  onCancel,
}: {
  pool: GroceryItemRow[];
  saving: boolean;
  onSubmit: (title: string, itemIds: string[]) => void;
  onCancel: () => void;
}) {
  const toBuy = pool.filter((g) => !g.bought);
  const [title, setTitle] = useState("Palengke");
  const [picked, setPicked] = useState<Set<string>>(() => new Set(toBuy.map((g) => g.id)));
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = () => {
    if (!title.trim()) return setError("Lagyan ng pangalan ang run.");
    if (picked.size === 0) return setError("Pumili ng kahit isang bibilhin.");
    setError(null);
    onSubmit(title.trim(), [...picked]);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Pangalan ng run</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        maxLength={60}
        accessibilityLabel="Pangalan ng run"
        style={styles.input}
      />
      <Text style={styles.label}>Mga bibilhin · {picked.size}</Text>
      <View style={styles.list}>
        {toBuy.map((g) => {
          const on = picked.has(g.id);
          return (
            <Pressable
              key={g.id}
              onPress={() => toggle(g.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={g.name}
              style={styles.row}
            >
              <View style={[styles.box, on && styles.boxOn]}>
                {on && <Ionicons name="checkmark" size={14} color={colors.cardCream} />}
              </View>
              <Text style={styles.itemName} numberOfLines={1}>
                {g.name}
              </Text>
              <Text style={styles.itemQty}>
                {g.qty} {g.unit}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.hint}>
        Draft muna ito. Ipa-approve mo sa manager, at siya ang magbibigay ng pera.
      </Text>
      <PrimaryButton label="Gawin ang draft" onPress={submit} loading={saving} />
      <PrimaryButton label="Kanselahin" variant="secondary" onPress={onCancel} disabled={saving} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    borderRadius: 24,
    padding: 16,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.mutedInk,
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.sand,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.ink,
  },
  list: {
    gap: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: {
    backgroundColor: colors.pineTeal,
    borderColor: colors.pineTeal,
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
  },
  itemQty: {
    fontSize: 13,
    color: colors.mutedInk,
  },
  error: {
    fontSize: 13,
    color: colors.terracottaInk,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedInk,
  },
});

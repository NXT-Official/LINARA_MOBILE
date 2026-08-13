import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/lib/theme";
import type { GroceryItemRow } from "@/services/api/grocery";

/**
 * Keyed by `item.actualCost` from the parent map (see PalengkeChecklist
 * below) so an external cost change (e.g. a query refetch after another
 * device edits it) remounts this field with a fresh draft instead of
 * syncing via a set-state-in-effect, which eslint-config-expo's
 * react-hooks rules flag as a cascading-render risk.
 */
function CostField({
  item,
  onCost,
}: {
  item: GroceryItemRow;
  onCost: (cost: number | null) => void;
}) {
  const [draft, setDraft] = useState(item.actualCost != null ? String(item.actualCost) : "");

  const commit = () => {
    if (draft.trim() === "") {
      onCost(null);
      return;
    }
    const parsed = parseFloat(draft);
    if (!Number.isNaN(parsed) && parsed >= 0) onCost(parsed);
  };

  return (
    <View style={styles.costField}>
      <Text style={styles.costPeso}>₱</Text>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onBlur={commit}
        onSubmitEditing={commit}
        keyboardType="decimal-pad"
        placeholder="—"
        placeholderTextColor={colors.mutedInk}
        style={styles.costInput}
      />
    </View>
  );
}

/**
 * The active Palengke shopping checklist (roadmap Story 8, step 2).
 * Checking an item off marks it bought and reveals a cost field, which
 * feeds the BudgetBar's spent total.
 */
export function PalengkeChecklist({
  items,
  onToggle,
  onCost,
}: {
  items: GroceryItemRow[];
  onToggle: (item: GroceryItemRow) => void;
  onCost: (item: GroceryItemRow, cost: number | null) => void;
}) {
  if (items.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>Walang laman ang palengke list ngayon.</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item.id} style={styles.row}>
          <Pressable
            onPress={() => onToggle(item)}
            style={[styles.checkbox, item.bought && styles.checkboxChecked]}
          >
            {item.bought && <Ionicons name="checkmark" size={14} color={colors.cardCream} />}
          </Pressable>

          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, item.bought && styles.itemNameBought]}>{item.name}</Text>
            <Text style={styles.itemQty}>
              {item.qty} {item.unit}
            </Text>
          </View>

          {item.bought && (
            <CostField
              key={item.actualCost ?? "none"}
              item={item}
              onCost={(cost) => onCost(item, cost)}
            />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: colors.mutedInk,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardCream,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.pineTeal,
    borderColor: colors.pineTeal,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
  },
  itemNameBought: {
    color: colors.mutedInk,
    textDecorationLine: "line-through",
  },
  itemQty: {
    marginTop: 1,
    fontSize: 11,
    color: colors.mutedInk,
  },
  costField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  costPeso: {
    fontSize: 12,
    color: colors.mutedInk,
  },
  costInput: {
    minWidth: 44,
    fontSize: 13,
    color: colors.ink,
    textAlign: "right",
  },
});

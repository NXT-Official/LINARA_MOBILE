import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/lib/theme";
import type { PantryItemRow } from "@/services/api/pantry";

import { ItemForm, type ItemFormValues } from "./item-form";

/**
 * Pantry stock (roadmap Story 8, step 1). Items at or below their PAR level
 * get a "Low" badge. She keeps the counts herself (plan.md §2.5's Cook;
 * client feedback 2026-10-02): − and + step the count, tapping the name
 * edits the item, and a low item can go straight onto the palengke list.
 * Deleting an item stays with the manager, on the web.
 */
export function PantryStockList({
  items,
  emptyText = "Walang laman sa pantry list.",
  listedIds,
  savingId,
  onStep,
  onEdit,
  onList,
}: {
  items: PantryItemRow[];
  emptyText?: string;
  /** Pantry items already waiting on the palengke list. */
  listedIds: Set<string>;
  savingId: string | null;
  onStep: (item: PantryItemRow, delta: number) => void;
  onEdit: (item: PantryItemRow, values: ItemFormValues, done: () => void) => void;
  onList: (item: PantryItemRow) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {items.map((item) => {
        if (editingId === item.id) {
          return (
            <ItemForm
              key={item.id}
              kind="pantry"
              initial={item}
              submitLabel="I-save"
              saving={savingId === item.id}
              onSubmit={(values) => onEdit(item, values, () => setEditingId(null))}
              onCancel={() => setEditingId(null)}
            />
          );
        }
        const low = item.qty <= item.par;
        const listed = listedIds.has(item.id);
        return (
          <View key={item.id} style={[styles.row, low && styles.rowLow]}>
            <Pressable
              style={styles.rowMain}
              onPress={() => setEditingId(item.id)}
              accessibilityHint="Ayusin ang item"
            >
              <View style={styles.nameRow}>
                <Text style={styles.name}>{item.name}</Text>
                {low && (
                  <View style={styles.lowBadge}>
                    <Text style={styles.lowBadgeText}>Low</Text>
                  </View>
                )}
              </View>
              <Text style={styles.parText}>
                par {item.par} {item.unit} · {item.category}
              </Text>
              {low &&
                (listed ? (
                  <Text style={styles.listedText}>Nasa palengke list na</Text>
                ) : (
                  <Pressable
                    onPress={() => onList(item)}
                    hitSlop={6}
                    style={styles.listButton}
                    accessibilityLabel={`Ilagay ang ${item.name} sa palengke list`}
                  >
                    <Ionicons name="cart-outline" size={14} color={colors.pineTeal} />
                    <Text style={styles.listButtonText}>Ilista sa palengke</Text>
                  </Pressable>
                ))}
            </Pressable>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => onStep(item, -1)}
                disabled={item.qty <= 0}
                accessibilityLabel={`Bawasan ang ${item.name}`}
                style={[styles.stepButton, item.qty <= 0 && styles.stepDisabled]}
              >
                <Ionicons name="remove" size={16} color={colors.ink} />
              </Pressable>
              <Text style={styles.qtyText}>
                {item.qty} <Text style={styles.unitText}>{item.unit}</Text>
              </Text>
              <Pressable
                onPress={() => onStep(item, 1)}
                accessibilityLabel={`Dagdagan ang ${item.name}`}
                style={styles.stepButton}
              >
                <Ionicons name="add" size={16} color={colors.ink} />
              </Pressable>
            </View>
          </View>
        );
      })}
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
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardCream,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowLow: {
    borderColor: colors.terracottaGold,
    backgroundColor: "rgba(217,154,108,0.1)",
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  lowBadge: {
    borderRadius: 999,
    backgroundColor: colors.terracottaGold,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  lowBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.cardCream,
  },
  parText: {
    fontSize: 11,
    color: colors.mutedInk,
  },
  listedText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.mutedInk,
  },
  listButton: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingVertical: 4,
  },
  listButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.pineTeal,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDisabled: {
    opacity: 0.4,
  },
  qtyText: {
    minWidth: 48,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  unitText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.mutedInk,
  },
});

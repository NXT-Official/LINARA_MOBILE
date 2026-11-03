import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/lib/theme";
import { CATEGORY_KEY, rowActions, STOCK_KEY, stockState, unitFor } from "@/lib/pantry";
import type { PantryItemRow } from "@/services/api/pantry";

import { ItemForm, type ItemFormValues } from "./item-form";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";

/**
 * Pantry stock (roadmap Story 8, step 1), one card with a line per item.
 * She keeps the counts herself (plan.md §2.5's Cook; client feedback
 * 2026-10-02): − and + step the count, tapping the name edits the item.
 * "Ubos na" says the most common thing about stock in one tap: it's gone, put
 * it on the palengke list. Deleting an item stays with the manager, on the web.
 *
 * Without `canManage` (she buys from the list but doesn't keep the pantry,
 * ../LINARA/supabase/add-pantry-roles.sql) the list is to look at, and
 * "Ubos na" is the one thing she can do: say something ran out.
 */
export function PantryStockList({
  items,
  emptyText,
  canManage,
  listedIds,
  savingId,
  onStep,
  onEdit,
  onList,
  onMarkOut,
}: {
  items: PantryItemRow[];
  emptyText?: string;
  /** She keeps the pantry: counts, edits, listing. Otherwise only "Ubos na". */
  canManage: boolean;
  /** Pantry items already waiting on the palengke list. */
  listedIds: Set<string>;
  savingId: string | null;
  onStep: (item: PantryItemRow, delta: number) => void;
  onEdit: (item: PantryItemRow, values: ItemFormValues, done: () => void) => void;
  onList: (item: PantryItemRow) => void;
  onMarkOut: (item: PantryItemRow, alreadyListed: boolean) => void;
}) {
  const t = useT();
  const [editingId, setEditingId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>{emptyText ?? t("pantry.walangLamanSaPantryList")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {items.map((item, index) => {
        if (editingId === item.id) {
          return (
            <View key={item.id} style={[styles.editWrap, index > 0 && styles.divider]}>
              <ItemForm
                kind="pantry"
                initial={item}
                submitLabel="I-save"
                saving={savingId === item.id}
                onSubmit={(values) => onEdit(item, values, () => setEditingId(null))}
                onCancel={() => setEditingId(null)}
              />
            </View>
          );
        }
        const state = stockState(item);
        const listed = listedIds.has(item.id);
        const offers = rowActions(state, listed, canManage);
        const saving = savingId === item.id;
        return (
          <View key={item.id} style={[styles.row, index > 0 && styles.divider]}>
            <View style={styles.rowTop}>
              <Pressable
                style={styles.rowMain}
                disabled={!canManage}
                onPress={() => setEditingId(item.id)}
                accessibilityRole={canManage ? "button" : undefined}
                accessibilityHint={canManage ? t("pantry.ayusinAngItem") : undefined}
              >
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{item.name}</Text>
                  {state !== "ok" && (
                    <View style={[styles.badge, state === "out" && styles.badgeOut]}>
                      <Text style={styles.badgeText}>{t(STOCK_KEY[state])}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.parText}>
                  {t("pantry.parLine", {
                    par: item.par,
                    unit: unitFor(item.par, item.unit),
                    category: t(CATEGORY_KEY[item.category]),
                  })}
                </Text>
              </Pressable>
              {canManage ? (
                <View style={styles.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={4}
                    onPress={() => onStep(item, -1)}
                    disabled={item.qty <= 0}
                    accessibilityState={{ disabled: item.qty <= 0 }}
                    accessibilityLabel={t("pantry.bawasanAng", { name: item.name })}
                    style={[styles.stepButton, item.qty <= 0 && styles.stepDisabled]}
                  >
                    <Ionicons name="remove" size={16} color={colors.ink} />
                  </Pressable>
                  <Text style={styles.qtyText}>
                    {item.qty} <Text style={styles.unitText}>{unitFor(item.qty, item.unit)}</Text>
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={4}
                    onPress={() => onStep(item, 1)}
                    accessibilityLabel={t("pantry.dagdaganAng", { name: item.name })}
                    style={styles.stepButton}
                  >
                    <Ionicons name="add" size={16} color={colors.ink} />
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.qtyText}>
                  {item.qty} <Text style={styles.unitText}>{unitFor(item.qty, item.unit)}</Text>
                </Text>
              )}
            </View>

            <View style={styles.actions}>
              {offers.listedNote && (
                <Text style={styles.listedText}>{t("pantry.nasaPalengkeListNa")}</Text>
              )}
              {offers.list && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onList(item)}
                  disabled={saving}
                  hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
                  style={styles.action}
                  accessibilityLabel={t("pantry.ilagayAngSaPalengkeList", { name: item.name })}
                >
                  <Ionicons name="cart-outline" size={15} color={colors.pineTeal} />
                  <Text style={styles.actionText}>{t("pantry.ilistaSaPalengke")}</Text>
                </Pressable>
              )}
              {offers.markOut && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onMarkOut(item, listed)}
                  disabled={saving}
                  hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
                  style={styles.action}
                  accessibilityLabel={t("pantry.ubosNaAng", { name: item.name })}
                  accessibilityHint={
                    listed
                      ? t("pantry.gagawingZeroAngBilang")
                      : t("pantry.gagawingZeroAtIlilistaSa")
                  }
                >
                  <Ionicons name="close-circle-outline" size={15} color={colors.terracottaInk} />
                  <Text style={[styles.actionText, styles.actionOut]}>{t("pantry.ubosNa")}</Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    paddingHorizontal: 14,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
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
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  editWrap: {
    paddingVertical: 10,
  },
  row: {
    paddingVertical: 12,
    gap: 6,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  badge: {
    borderRadius: 999,
    backgroundColor: colors.terracottaWash,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeOut: {
    backgroundColor: colors.terracottaGold,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  parText: {
    fontSize: 13,
    color: colors.mutedInk,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
  },
  listedText: {
    fontSize: 13,
    color: colors.mutedInk,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.pineTeal,
  },
  actionOut: {
    color: colors.terracottaInk,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 13,
    fontWeight: "500",
    color: colors.mutedInk,
  },
});

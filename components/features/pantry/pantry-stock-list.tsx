import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/lib/theme";
import type { PantryItemRow } from "@/services/api/pantry";

/**
 * Read-only pantry stock monitor (roadmap Story 8, step 1). Items at or
 * below their PAR level get a "Low" badge, matching the web reference's
 * PantryRow highlight. Mobile has no quantity adjust/remove controls --
 * restocking pantry counts is a manager/web action per plan.md 3.2.
 */
export function PantryStockList({ items }: { items: PantryItemRow[] }) {
  if (items.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>Walang laman sa pantry list.</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {items.map((item) => {
        const low = item.qty <= item.par;
        return (
          <View key={item.id} style={[styles.row, low && styles.rowLow]}>
            <View style={styles.rowMain}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{item.name}</Text>
                {low && (
                  <View style={styles.lowBadge}>
                    <Text style={styles.lowBadgeText}>Low</Text>
                  </View>
                )}
              </View>
              <Text style={styles.parText}>
                par {item.par} {item.unit}
              </Text>
            </View>
            <Text style={styles.qtyText}>
              {item.qty} <Text style={styles.unitText}>{item.unit}</Text>
            </Text>
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
  qtyText: {
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

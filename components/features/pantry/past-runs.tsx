import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/lib/theme";
import { formatPeso } from "@/lib/format";
import type { GroceryRun } from "@/services/api/grocery";

const closedOn = (iso: string) =>
  new Date(iso).toLocaleDateString("fil-PH", { month: "short", day: "numeric" });

/** Her last few closed runs: what each cost against the cash, and the change. */
export function PastRuns({ runs, spent }: { runs: GroceryRun[]; spent: Record<string, number> }) {
  if (runs.length === 0) return null;
  return (
    <View style={styles.card}>
      {runs.map((r) => (
        <View key={r.id} style={styles.row}>
          <View style={styles.text}>
            <Text style={styles.title} numberOfLines={1}>
              {r.title}
            </Text>
            <Text style={styles.sub}>
              {[
                r.closedAt && closedOn(r.closedAt),
                r.changeReturned !== null && `sukli ${formatPeso(r.changeReturned)}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
          <Text style={styles.amount}>
            {formatPeso(spent[r.id] ?? 0)}
            {r.cashGiven !== null ? ` / ${formatPeso(r.cashGiven)}` : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    color: colors.ink,
  },
  sub: {
    fontSize: 13,
    color: colors.mutedInk,
  },
  amount: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.mutedInk,
  },
});

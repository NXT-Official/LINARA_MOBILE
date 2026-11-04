import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { colors, fonts } from "@/lib/theme";
import { parseAmount } from "@/lib/money";
import { Text, TextInput } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";

function fmtPeso(amount: number): string {
  return `₱${Math.round(amount).toLocaleString()}`;
}

/**
 * Spent-vs-allocated budget dial for the Palengke run (roadmap Story 8,
 * step 2 / plan.md 3.2). Mirrors the web reference's BudgetBar layout.
 * `onChangeBudget` is optional: `households.petty_cash_budget` is
 * manager-writable from the web dashboard only (see
 * hooks/use-palengke-budget.ts and services/api/household.ts) -- when this
 * prop isn't passed, the allocated figure renders as plain, non-tappable
 * text instead of opening an inline editor.
 */
export function BudgetBar({
  spent,
  budget,
  onChangeBudget,
}: {
  spent: number;
  budget: number;
  onChangeBudget?: (n: number) => void;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(budget));

  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const over = spent > budget;

  const commit = () => {
    const parsed = parseAmount(draft);
    if (parsed !== null) {
      onChangeBudget?.(parsed);
    } else {
      setDraft(String(budget));
    }
    setEditing(false);
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.figureRow}>
          <Text style={styles.spent}>{fmtPeso(spent)}</Text>
          {editing ? (
            <TextInput
              autoFocus
              value={draft}
              onChangeText={setDraft}
              onBlur={commit}
              onSubmitEditing={commit}
              keyboardType="decimal-pad"
              style={styles.budgetInput}
            />
          ) : onChangeBudget ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("pantry.palitanAngBudget", { v1: fmtPeso(budget) })}
              hitSlop={14}
              onPress={() => setEditing(true)}
            >
              <Text style={styles.budget}>/ {fmtPeso(budget)}</Text>
            </Pressable>
          ) : (
            <Text style={styles.budget}>/ {fmtPeso(budget)}</Text>
          )}
        </View>
        <Text style={[styles.remaining, over && styles.remainingOver]}>
          {over
            ? t("pantry.sobraNg", { v1: fmtPeso(spent - budget) })
            : t("pantry.paAngNatitira", { v1: fmtPeso(budget - spent) })}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, over && styles.fillOver, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  figureRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  spent: {
    fontSize: 22,
    fontFamily: fonts.displayBold,
    color: colors.ink,
  },
  budget: {
    fontSize: 13,
    color: colors.mutedInk,
  },
  budgetInput: {
    minWidth: 70,
    fontSize: 13,
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.pineTeal,
    paddingVertical: 2,
  },
  remaining: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.mutedInk,
  },
  remainingOver: {
    color: colors.statusLateInk,
  },
  track: {
    marginTop: 10,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.pineTeal,
  },
  fillOver: {
    backgroundColor: colors.statusLate,
  },
});

import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { colors, fonts } from "@/lib/theme";
import { formatPeso } from "@/lib/format";
import { PrimaryButton } from "@/components/ui/primary-button";
import type { GroceryItemRow, GroceryRun } from "@/services/api/grocery";

import { BudgetBar } from "./budget-bar";
import { PalengkeChecklist } from "./palengke-checklist";

export const runDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fil-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

/**
 * A run she's shopping (approved, cash in hand): its list to tick and
 * price, what's spent against the cash, a receipt for it, and "Tapos na"
 * -- the change she hands back closes it. Whatever wasn't bought goes back
 * to Kailangan for the next run.
 */
export function RunCard({
  run,
  items,
  onToggle,
  onCost,
  onSnap,
  snapping,
  snapped,
  closing,
  onClose,
}: {
  run: GroceryRun;
  items: GroceryItemRow[];
  onToggle: (item: GroceryItemRow) => void;
  onCost: (item: GroceryItemRow, cost: number | null) => void;
  onSnap: () => void;
  snapping: boolean;
  /** A receipt was saved for this run while the tab was open. */
  snapped: boolean;
  closing: boolean;
  onClose: (change: number | null) => Promise<boolean>;
}) {
  const [finishing, setFinishing] = useState(false);
  const spent = items.reduce((s, g) => s + (g.bought ? (g.actualCost ?? 0) : 0), 0);
  const expected = run.cashGiven === null ? null : Math.max(0, run.cashGiven - spent);
  const [change, setChange] = useState(
    expected === null ? "" : String(Math.round(expected * 100) / 100),
  );
  const [changeError, setChangeError] = useState<string | null>(null);
  const unbought = items.filter((g) => !g.bought).length;
  const bought = items.length - unbought;

  const finish = async () => {
    const t = change.trim();
    const n = t === "" ? null : Number(t.replace(/[,₱\s]/g, ""));
    if (n !== null && (!Number.isFinite(n) || n < 0)) {
      setChangeError("Ilagay ang sukli bilang halaga, o iwanang blangko.");
      return;
    }
    setChangeError(null);
    if (await onClose(n)) setFinishing(false);
  };

  return (
    <View style={styles.card}>
      <View>
        <Text style={styles.title}>{run.title}</Text>
        <Text style={styles.sub}>
          {[
            run.shopOn && runDay(run.shopOn),
            run.cashGiven !== null && `Pera: ${formatPeso(run.cashGiven)}`,
            `${bought} sa ${items.length} nabili`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        {run.note ? <Text style={styles.note}>{run.note}</Text> : null}
      </View>

      {run.cashGiven !== null && <BudgetBar spent={spent} budget={run.cashGiven} />}

      <PalengkeChecklist
        items={items}
        emptyText="Wala pang laman ang run na ito."
        canEdit={false}
        savingId={null}
        onToggle={onToggle}
        onCost={onCost}
        onEdit={() => {}}
        onRemove={() => {}}
      />

      {finishing ? (
        <View style={styles.finish}>
          <Text style={styles.label}>Sukli na ibinalik</Text>
          {expected !== null && (
            <Text style={styles.sub}>
              {formatPeso(run.cashGiven ?? 0)} − {formatPeso(spent)} nagastos ={" "}
              {formatPeso(expected)}
            </Text>
          )}
          <View style={styles.changeRow}>
            <Text style={styles.peso}>₱</Text>
            <TextInput
              value={change}
              onChangeText={setChange}
              keyboardType="decimal-pad"
              accessibilityLabel="Sukli na ibinalik"
              style={styles.changeInput}
            />
          </View>
          {changeError ? <Text style={styles.error}>{changeError}</Text> : null}
          {unbought > 0 && (
            <Text style={styles.sub}>Ibabalik sa Kailangan ang {unbought} na hindi nabili.</Text>
          )}
          <PrimaryButton label="Isara ang run" onPress={() => void finish()} loading={closing} />
          <PrimaryButton
            label="Hindi pa"
            variant="secondary"
            onPress={() => setFinishing(false)}
            disabled={closing}
          />
        </View>
      ) : (
        <View style={styles.actions}>
          <PrimaryButton
            label={snapped ? "Kunan ulit ang resibo" : "Kunan ang resibo"}
            variant="secondary"
            onPress={onSnap}
            loading={snapping}
            style={styles.action}
          />
          <PrimaryButton
            label="Tapos na"
            onPress={() => setFinishing(true)}
            style={styles.action}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    borderRadius: 24,
    padding: 16,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.ink,
  },
  sub: {
    marginTop: 2,
    fontSize: 13,
    color: colors.mutedInk,
  },
  note: {
    marginTop: 6,
    fontSize: 14,
    color: colors.ink,
  },
  finish: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.mutedInk,
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  peso: {
    fontSize: 18,
    color: colors.mutedInk,
  },
  changeInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.sand,
    paddingHorizontal: 12,
    fontSize: 18,
    color: colors.ink,
  },
  error: {
    fontSize: 13,
    color: colors.terracottaInk,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  action: {
    flex: 1,
  },
});

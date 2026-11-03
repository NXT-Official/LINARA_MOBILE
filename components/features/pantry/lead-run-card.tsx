import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts } from "@/lib/theme";
import { PrimaryButton } from "@/components/ui/primary-button";
import type { GroceryItemRow, GroceryRun } from "@/services/api/grocery";

import { runDay } from "./run-card";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";

/**
 * A pantry lead's run that isn't out yet: a draft she can send to a manager
 * for approval (the manager sets the cash), or one waiting for that, which
 * she can take back. A line can go back to Kailangan.
 */
export function LeadRunCard({
  run,
  items,
  busy,
  onSubmit,
  onWithdraw,
  onDelete,
  onBackToPool,
}: {
  run: GroceryRun;
  items: GroceryItemRow[];
  busy: boolean;
  onSubmit: () => void;
  onWithdraw: () => void;
  onDelete: () => void;
  onBackToPool: (item: GroceryItemRow) => void;
}) {
  const t = useT();
  const pending = run.status === "pending";
  const confirmDelete = () =>
    Alert.alert(
      t("pantry.burahinAng", { title: run.title }),
      t("pantry.babalikSaKailanganAngMga"),
      [
        { text: "Kanselahin", style: "cancel" },
        { text: "Burahin", style: "destructive", onPress: onDelete },
      ],
      { cancelable: true },
    );

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.title}>{run.title}</Text>
          <Text style={styles.sub}>
            {[run.shopOn && runDay(run.shopOn), `${items.length} item`].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <View style={[styles.pill, pending && styles.pillPending]}>
          <Text style={[styles.pillText, pending && styles.pillTextPending]}>
            {pending ? t("pantry.hinihintayAngManager") : t("pantry.draft")}
          </Text>
        </View>
      </View>

      <View style={styles.list}>
        {items.map((g) => (
          <View key={g.id} style={styles.row}>
            <Text style={styles.itemName} numberOfLines={1}>
              {g.name}
            </Text>
            <Text style={styles.itemQty}>
              {g.qty} {g.unit}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => onBackToPool(g)}
              hitSlop={8}
              disabled={busy}
              accessibilityLabel={t("pantry.ibalikSaKailanganAng", { name: g.name })}
              style={styles.iconButton}
            >
              <Ionicons name="arrow-undo-outline" size={18} color={colors.mutedInk} />
            </Pressable>
          </View>
        ))}
        {items.length === 0 && <Text style={styles.sub}>{t("pantry.walaPangNakalista")}</Text>}
      </View>

      {pending ? (
        <>
          <Text style={styles.sub}>{t("pantry.angManagerAngMagA")}</Text>
          <PrimaryButton
            label={t("pantry.bawiin")}
            variant="secondary"
            onPress={onWithdraw}
            loading={busy}
          />
        </>
      ) : (
        <View style={styles.actions}>
          <PrimaryButton
            label={t("pantry.burahin")}
            variant="secondary"
            onPress={confirmDelete}
            disabled={busy}
            style={styles.action}
          />
          <PrimaryButton
            label={t("pantry.ipaApprove")}
            onPress={onSubmit}
            loading={busy}
            disabled={items.length === 0}
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
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  headText: {
    flex: 1,
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
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.sand,
  },
  pillPending: {
    backgroundColor: colors.terracottaWash,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.mutedInk,
  },
  pillTextPending: {
    color: colors.terracottaInk,
  },
  list: {
    gap: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 36,
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
  iconButton: {
    padding: 6,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  action: {
    flex: 1,
  },
});

import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/lib/theme";
import { formatPeso } from "@/lib/format";
import { TextField } from "@/components/ui/text-field";
import { PrimaryButton } from "@/components/ui/primary-button";
import type { ValeRequest } from "@/services/api/vales";

const STATUS_LABEL: Record<ValeRequest["status"], string> = {
  pending: "Waiting",
  approved: "Approved",
  declined: "Declined",
};

/**
 * Vale Requests Form (roadmap Story 11 step 2 / plan.md 3.2). Submitting
 * calls through to `requestVale` (services/api/vales.ts), a real insert into
 * `public.vales` -- not buffered offline, unlike the flows Story 10 wired
 * up, since architecture.md's offline diagram only covers task status,
 * receipt photos, and notes.
 */
export function ValeRequestForm({
  vales,
  onSubmit,
  submitting,
}: {
  vales: ValeRequest[];
  onSubmit: (amount: number, reason: string) => void;
  submitting: boolean;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const parsedAmount = parseFloat(amount);
  const canSubmit = Number.isFinite(parsedAmount) && parsedAmount > 0 && reason.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(parsedAmount, reason.trim());
    setAmount("");
    setReason("");
  };

  const openRequests = vales.filter((v) => v.status !== "approved");

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Vale (cash advance)</Text>

      <TextField
        label="Amount (₱)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="500"
      />
      <TextField
        label="Reason"
        value={reason}
        onChangeText={setReason}
        placeholder="Gamot para sa anak"
        multiline
      />
      <PrimaryButton
        label="Request cash advance"
        onPress={handleSubmit}
        disabled={!canSubmit}
        loading={submitting}
      />

      {openRequests.length > 0 ? (
        <View style={styles.list}>
          {openRequests.map((vale) => (
            <View key={vale.id} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowAmount}>{formatPeso(vale.amount)}</Text>
                <Text style={styles.rowReason} numberOfLines={1}>
                  “{vale.reason}”
                </Text>
              </View>
              <View
                style={[styles.badge, vale.status === "declined" ? styles.badgeDeclined : null]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    vale.status === "declined" ? styles.badgeTextDeclined : null,
                  ]}
                >
                  {STATUS_LABEL[vale.status]}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.terracottaGold,
  },
  list: {
    gap: 8,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  rowText: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  rowAmount: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  rowReason: {
    fontSize: 12,
    color: colors.mutedInk,
    flexShrink: 1,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.sand,
  },
  badgeDeclined: {
    backgroundColor: colors.border,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.pineTeal,
  },
  badgeTextDeclined: {
    color: colors.mutedInk,
  },
});

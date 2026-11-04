import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { colors, fonts } from "@/lib/theme";
import { formatPeso } from "@/lib/format";
import { parseAmount } from "@/lib/money";
import { TextField } from "@/components/ui/text-field";
import { PrimaryButton } from "@/components/ui/primary-button";
import type { ValeRequest } from "@/services/api/vales";

import { RequestDisclosure } from "./request-disclosure";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/instance";

const STATUS_LABEL: Record<ValeRequest["status"], MessageKey> = {
  pending: "request.pending",
  approved: "request.approved",
  declined: "request.declined",
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
  /** Rejects with a message to show; the form keeps what she typed. */
  onSubmit: (amount: number, reason: string) => Promise<void>;
  submitting: boolean;
}) {
  const t = useT();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const parsedAmount = parseAmount(amount);
  const amountError =
    amount.trim() !== "" && parsedAmount === null ? t("pay.ilagayAngHalagaHal1") : null;
  const canSubmit = parsedAmount !== null && parsedAmount > 0 && reason.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || parsedAmount === null || submitting) return;
    setSendError(null);
    try {
      await onSubmit(parsedAmount, reason.trim());
    } catch (e) {
      setSendError(e instanceof Error ? e.message : String(e));
      return;
    }
    setAmount("");
    setReason("");
    setOpen(false);
  };

  const openRequests = vales.filter((v) => v.status !== "approved");

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} accessibilityRole="header">
        {t("pay.mgaVale")}
      </Text>

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
                  {t(STATUS_LABEL[vale.status])}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
      <RequestDisclosure open={open} onOpenChange={setOpen} openLabel={t("pay.humilingNgVale")}>
        <TextField
          label={t("pay.halaga")}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="500"
          error={amountError}
        />
        <TextField
          label={t("pay.dahilan")}
          value={reason}
          onChangeText={setReason}
          placeholder={t("pay.gamotParaSaAnak")}
          multiline
        />
        {sendError ? <Text style={styles.sendError}>{sendError}</Text> : null}
        <PrimaryButton
          label={t("pay.ipadalaSaManager")}
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={submitting}
        />
      </RequestDisclosure>
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
  // The card's own title, like the rest of the app's cards (was a small
  // coloured label above nothing: an eyebrow, audit 2026-10-29).
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.ink,
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
    fontSize: 13,
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
    fontSize: 13,
    fontWeight: "700",
    color: colors.pineTeal,
  },
  badgeTextDeclined: {
    color: colors.mutedInk,
  },
  sendError: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.terracottaInk,
  },
});

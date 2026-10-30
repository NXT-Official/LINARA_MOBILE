import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { colors, fonts } from "@/lib/theme";
import { formatPeso } from "@/lib/format";
import { formatCutoffRange } from "@/lib/cutoff";
import {
  acknowledgePayment,
  getPaymentsAwaitingMe,
  methodLabel,
  type Payslip,
} from "@/services/api/payslips";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TextField } from "@/components/ui/text-field";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";
import { textParts } from "@/lib/i18n/translate";
import { intlLocale } from "@/lib/i18n/instance";

const day = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(intlLocale(), { month: "short", day: "numeric" });
};

/**
 * "Natanggap mo ba?": payments her employer recorded as made outside Linara
 * (cash, bank transfer, other), waiting for her answer. Until she confirms,
 * a payment isn't counted on her record, and a manager can take it back; if
 * she says it didn't arrive, the manager sees that in Needs You. Covers every
 * household she has worked for, so a payment for a job she has left can
 * still be answered.
 */
export function PaymentConfirmations() {
  const t = useT();
  const queryClient = useQueryClient();
  const awaitingQuery = useQuery({
    queryKey: ["payments-awaiting-me"],
    queryFn: getPaymentsAwaitingMe,
  });
  const [disputing, setDisputing] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const answer = useMutation({
    mutationFn: ({ id, received }: { id: string; received: boolean }) =>
      acknowledgePayment(id, received, received ? undefined : note),
    onSuccess: () => {
      setDisputing(null);
      setNote("");
      void queryClient.invalidateQueries({ queryKey: ["payments-awaiting-me"] });
      void queryClient.invalidateQueries({ queryKey: ["payslips"] });
    },
  });

  const awaiting = awaitingQuery.data ?? [];
  if (awaiting.length === 0) return null;

  const label = (p: Payslip) =>
    p.kind === "thirteenth_month"
      ? t("pay.13thMonthPay", { v1: p.cutoffEnd.slice(0, 4) })
      : formatCutoffRange(p.cutoffStart, p.cutoffEnd);

  return (
    <View style={styles.card} accessibilityRole="alert">
      <Text style={styles.title}>{t("pay.natanggapMoBaAngBayad")}</Text>
      {awaiting.map((p) => (
        <View key={p.id} style={styles.item}>
          <Text style={styles.line}>
            {/* The amount stays bold wherever the language puts it. */}
            {textParts(
              t("pay.employerSaysPaid", {
                method: methodLabel(p.payoutChannelCode),
                period: label(p),
                paidOn: p.paidOn ? t("pay.paidOn", { date: day(p.paidOn) }) : "",
              }),
            ).map((part, i) =>
              typeof part === "string" ? (
                part
              ) : (
                <Text key={i} style={styles.strong}>
                  {formatPeso(p.netPay)}
                </Text>
              ),
            )}
          </Text>
          {p.manualNote ? <Text style={styles.note}>“{p.manualNote}”</Text> : null}
          {disputing === p.id ? (
            <>
              <TextField
                label={t("pay.anoAngNangyariKungMeron")}
                value={note}
                onChangeText={setNote}
                placeholder={t("pay.hal500LangAngNatanggap")}
                maxLength={300}
                multiline
              />
              <PrimaryButton
                label={t("pay.sabihinSaEmployer")}
                loading={answer.isPending}
                onPress={() => answer.mutate({ id: p.id, received: false })}
              />
              <PrimaryButton
                label={t("pay.bumalik")}
                variant="secondary"
                onPress={() => setDisputing(null)}
              />
            </>
          ) : (
            <View style={styles.actions}>
              <PrimaryButton
                label={t("pay.ooNatanggapKo")}
                style={styles.action}
                loading={answer.isPending && answer.variables?.id === p.id}
                onPress={() => answer.mutate({ id: p.id, received: true })}
              />
              <PrimaryButton
                label={t("pay.hindiKoNatanggap")}
                variant="secondary"
                style={styles.action}
                onPress={() => {
                  setNote("");
                  setDisputing(p.id);
                }}
              />
            </View>
          )}
        </View>
      ))}
      {answer.isError ? (
        <Text style={styles.error}>
          {answer.error instanceof Error
            ? answer.error.message
            : t("pay.hindiNaipadalaSubukanUlit")}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: colors.terracottaWash,
    gap: 10,
  },
  title: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  item: { gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  line: { fontSize: 14, lineHeight: 20, color: colors.ink },
  strong: { fontWeight: "700" },
  note: { fontSize: 13, lineHeight: 18, color: colors.mutedInk, fontStyle: "italic" },
  actions: { flexDirection: "row", gap: 8 },
  action: { flex: 1 },
  error: { fontSize: 13, color: colors.terracottaInk },
});

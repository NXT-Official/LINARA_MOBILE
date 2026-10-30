import { useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { colors, fonts } from "@/lib/theme";
import { formatDateFil } from "@/lib/format";
import { DELETION_WINDOW_DAYS, PRIVACY_URL, TERMS_URL } from "@/lib/legal";
import {
  cancelAccountDeletion,
  getMyDeletionRequest,
  requestAccountDeletion,
} from "@/services/api/account";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TextField } from "@/components/ui/text-field";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";

const longDate = (iso: string) => formatDateFil(new Date(iso));

/**
 * The end of My Record: the privacy policy and terms, and the in-app way to
 * have her account deleted that both app stores require (KNOWN_GAPS.md O8).
 * Shown with or without a household, so she can leave Linara entirely. Her
 * records with each household stay with them, as the law requires; she's told
 * so, and pointed at her PDF first.
 *
 * While she's employed she can't ask yet (../LINARA/supabase/
 * restrict-account-deletion.sql): she gives notice first (NoticeCard, above),
 * the household ends the employment on her last day with her final pay, and
 * then she can (KNOWN_GAPS.md O55, the user's choice 2026-10-09).
 */
export function PrivacyAccountCard({
  employed,
  noticeGiven = false,
}: {
  employed: boolean;
  /** She already gave notice, so the first step is done (QA F-LM-010). */
  noticeGiven?: boolean;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const requestQuery = useQuery({
    queryKey: ["my-deletion-request"],
    queryFn: getMyDeletionRequest,
  });
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["my-deletion-request"] });
  const ask = useMutation({
    mutationFn: () => requestAccountDeletion(note),
    onSuccess: async () => {
      setAsking(false);
      setNote("");
      await refresh();
    },
  });
  const keep = useMutation({ mutationFn: cancelAccountDeletion, onSuccess: refresh });

  const pending = requestQuery.data ?? null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("record.privacyAtAccount")}</Text>
      <View style={styles.links}>
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(PRIVACY_URL)}
          style={styles.link}
        >
          <Text style={styles.linkText}>{t("record.patakaranSaPrivacy")}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(TERMS_URL)}
          style={styles.link}
        >
          <Text style={styles.linkText}>{t("record.mgaTuntunin")}</Text>
        </Pressable>
      </View>

      {pending ? (
        <>
          <Text style={styles.body}>
            {t("record.deletionPending", {
              date: longDate(pending.requestedAt),
              days: DELETION_WINDOW_DAYS,
            })}
          </Text>
          <PrimaryButton
            label={t("record.huwagNangBurahin")}
            variant="secondary"
            loading={keep.isPending}
            onPress={() => keep.mutate()}
          />
          {keep.isError ? (
            <Text style={styles.error}>{t("record.hindiNabawiSubukanUlit")}</Text>
          ) : null}
        </>
      ) : asking && employed ? (
        <>
          <Text style={styles.body}>{t("record.mayTrabahoKaPaKaya")}</Text>
          <Text style={styles.body}>
            {noticeGiven ? t("record.1NakapagbigayKaNaNg") : t("record.1MagbigayNgAbisoSa")}
          </Text>
          <Text style={styles.body}>{t("record.2TatapusinNilaAngEmployment")}</Text>
          <Text style={styles.body}>{t("record.3BumalikDitoAtBurahin")}</Text>
          <PrimaryButton
            label={t("record.sige")}
            variant="secondary"
            onPress={() => setAsking(false)}
          />
        </>
      ) : asking ? (
        <>
          <Text style={styles.body}>
            {t("record.deletionWhat", { days: DELETION_WINDOW_DAYS })}
          </Text>
          <Text style={styles.body}>{t("record.angPayslipsOrasAtLeave")}</Text>
          <TextField
            label={t("record.bakitKungMeron")}
            value={note}
            onChangeText={setNote}
            maxLength={300}
            multiline
          />
          {ask.isError ? (
            <Text style={styles.error}>
              {ask.error instanceof Error
                ? ask.error.message
                : t("record.hindiNaipadalaSubukanUlit")}
            </Text>
          ) : null}
          <PrimaryButton
            label={t("record.burahinAngAccountKo")}
            loading={ask.isPending}
            onPress={() => ask.mutate()}
          />
          <PrimaryButton
            label={t("record.huwagNa")}
            variant="secondary"
            onPress={() => setAsking(false)}
          />
        </>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setAsking(true)} style={styles.link}>
          <Text style={styles.dangerText}>{t("record.burahinAngAccountKo")}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  title: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  links: { flexDirection: "row", gap: 20 },
  link: { minHeight: 44, justifyContent: "center" },
  linkText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.pineTeal,
    textDecorationLine: "underline",
  },
  dangerText: { fontSize: 14, fontWeight: "700", color: colors.terracottaInk },
  body: { fontSize: 13, lineHeight: 18, color: colors.mutedInk },
  error: { fontSize: 13, color: colors.terracottaInk },
});

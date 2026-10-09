import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { colors, fonts } from "@/lib/theme";
import { DELETION_WINDOW_DAYS, PRIVACY_URL, TERMS_URL } from "@/lib/legal";
import {
  cancelAccountDeletion,
  getMyDeletionRequest,
  requestAccountDeletion,
} from "@/services/api/account";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TextField } from "@/components/ui/text-field";

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });

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
export function PrivacyAccountCard({ employed }: { employed: boolean }) {
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
      <Text style={styles.title}>Privacy at account</Text>
      <View style={styles.links}>
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(PRIVACY_URL)}
          style={styles.link}
        >
          <Text style={styles.linkText}>Privacy policy</Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(TERMS_URL)}
          style={styles.link}
        >
          <Text style={styles.linkText}>Terms</Text>
        </Pressable>
      </View>

      {pending ? (
        <>
          <Text style={styles.body}>
            Humiling ka noong {longDate(pending.requestedAt)} na burahin ang account mo. Gagawin ito
            sa loob ng {DELETION_WINDOW_DAYS} araw. Hanggang doon, gumagana pa rin ang lahat.
          </Text>
          <PrimaryButton
            label="Huwag nang burahin"
            variant="secondary"
            loading={keep.isPending}
            onPress={() => keep.mutate()}
          />
          {keep.isError ? <Text style={styles.error}>Hindi nabawi. Subukan ulit.</Text> : null}
        </>
      ) : asking && employed ? (
        <>
          <Text style={styles.body}>
            May trabaho ka pa, kaya hindi pa mabubura ang account mo. Kailangan munang matapos ang
            employment mo, para maayos ang huling sahod at record mo.
          </Text>
          <Text style={styles.body}>
            1. Magbigay ng abiso sa employer mo: &quot;Aalis ka na ba? Magbigay ng abiso&quot;, sa
            itaas.
          </Text>
          <Text style={styles.body}>2. Tatapusin nila ang employment mo sa huling araw mo.</Text>
          <Text style={styles.body}>3. Bumalik dito at burahin ang account mo.</Text>
          <PrimaryButton label="Sige" variant="secondary" onPress={() => setAsking(false)} />
        </>
      ) : asking ? (
        <>
          <Text style={styles.body}>
            Mabubura ang login mo, ang profile mo at ang private notes mo, sa loob ng{" "}
            {DELETION_WINDOW_DAYS} araw. Puwede mo pa itong bawiin hanggang doon.
          </Text>
          <Text style={styles.body}>
            Ang payslips, oras at leave mo ay mananatili sa household na pinagtrabahuhan mo nang
            hindi bababa sa tatlong taon, dahil iyon ang hinihingi ng batas. Kung gusto mo ng kopya,
            i-download muna ang PDF ng record mo sa itaas.
          </Text>
          <TextField
            label="Bakit? (optional)"
            value={note}
            onChangeText={setNote}
            maxLength={300}
            multiline
          />
          {ask.isError ? (
            <Text style={styles.error}>
              {ask.error instanceof Error ? ask.error.message : "Hindi naipadala. Subukan ulit."}
            </Text>
          ) : null}
          <PrimaryButton
            label="Burahin ang account ko"
            loading={ask.isPending}
            onPress={() => ask.mutate()}
          />
          <PrimaryButton label="Huwag na" variant="secondary" onPress={() => setAsking(false)} />
        </>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setAsking(true)} style={styles.link}>
          <Text style={styles.dangerText}>Burahin ang account ko</Text>
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

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { colors } from "@/lib/theme";
import { formatShiftTime, weekdayName } from "@/lib/format";
import { verifyInviteCode } from "@/services/api/handshake";
import { PrimaryButton } from "@/components/ui/primary-button";

function TermRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

/**
 * Pre-claim terms audit (roadmap Story 6, step 2 / plan.md 3.1 step 2).
 * Read-only -- the helper confirms these match what was verbally agreed
 * before either flagging a mismatch or proceeding to claim the account.
 */
export default function ReviewTermsScreen() {
  const { code, flagged } = useLocalSearchParams<{ code: string; flagged?: string }>();

  const termsQuery = useQuery({
    queryKey: ["invite-terms", code],
    queryFn: () => verifyInviteCode(code),
    enabled: Boolean(code),
    retry: false,
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>Step 2 of 3</Text>
      <Text style={styles.title}>Tingnan mo muna — ito ba ang usapan?</Text>

      {termsQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.pineTeal} />
        </View>
      ) : termsQuery.isError || !termsQuery.data ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            Hindi namin nahanap ang code na iyan, o na-claim na ito. Paki-check at subukan ulit.
          </Text>
          <PrimaryButton
            label="Bumalik"
            variant="secondary"
            onPress={() => router.replace("/(auth)/welcome")}
          />
        </View>
      ) : (
        <>
          {flagged === "1" && (
            <View style={styles.flaggedBanner}>
              <Text style={styles.flaggedText}>
                Salamat — sinabi na namin sa manager mo. Pwede ka pa ring mag-continue, o mag-antay
                muna ng ayos.
              </Text>
            </View>
          )}

          <View style={styles.card}>
            <TermRow label="Pangalan" value={termsQuery.data.name} />
            <TermRow label="Role / station" value={termsQuery.data.station} />
            <TermRow
              label="Shift hours"
              value={`${formatShiftTime(termsQuery.data.shiftStart)} – ${formatShiftTime(termsQuery.data.shiftEnd)}`}
            />
            <TermRow label="Rest day" value={weekdayName(termsQuery.data.weeklyRestDay)} />
            <TermRow
              label="Monthly wage"
              value={`₱${termsQuery.data.monthlyRate.toLocaleString()}`}
            />
          </View>

          <PrimaryButton
            label="Something's not right? →"
            variant="secondary"
            onPress={() => router.push({ pathname: "/(auth)/flag-terms", params: { code } })}
          />

          <View style={styles.actions}>
            <PrimaryButton
              label="Back"
              variant="secondary"
              style={styles.actionButton}
              onPress={() => router.replace("/(auth)/welcome")}
            />
            <PrimaryButton
              label="Looks right — continue"
              style={styles.actionButton}
              onPress={() => router.push({ pathname: "/(auth)/claim-account", params: { code } })}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.sand,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.terracottaGold,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink,
  },
  loading: {
    paddingVertical: 40,
    alignItems: "center",
  },
  errorBox: {
    gap: 16,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  flaggedBanner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.terracottaGold,
    backgroundColor: "rgba(217,154,108,0.12)",
    padding: 12,
  },
  flaggedText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.ink,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  row: {
    gap: 2,
  },
  rowLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.mutedInk,
  },
  rowValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.ink,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});

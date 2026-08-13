import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { colors, fonts } from "@/lib/theme";
import { getMyHelperProfile } from "@/services/api/helper-profile";
import { getMyLedgerEntries, restOwedMinutes } from "@/services/api/ledger";
import { getMyVales, requestVale } from "@/services/api/vales";
import { DigitalPayslip } from "@/components/features/pay/digital-payslip";
import { RestOwedCounter } from "@/components/features/pay/rest-owed-counter";
import { ValeRequestForm } from "@/components/features/pay/vale-request-form";

/**
 * My Pay tab (roadmap Story 11). Digital payslip, vale request form, and
 * the Rest Owed time counter -- all real, fetched from `helper_profiles`,
 * `ledger_entries`, and `vales` for the signed-in helper.
 */
export default function PayScreen() {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["my-helper-profile"],
    queryFn: getMyHelperProfile,
  });
  const helperId = profileQuery.data?.id ?? null;

  const ledgerQuery = useQuery({
    queryKey: ["ledger-entries", helperId],
    queryFn: () => getMyLedgerEntries(helperId as string),
    enabled: Boolean(helperId),
  });

  const valesQuery = useQuery({
    queryKey: ["vales", helperId],
    queryFn: () => getMyVales(helperId as string),
    enabled: Boolean(helperId),
  });

  const valeMutation = useMutation({
    mutationFn: ({ amount, reason }: { amount: number; reason: string }) =>
      requestVale(helperId as string, amount, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vales", helperId] }),
  });

  const vales = valesQuery.data ?? [];
  const approvedValeTotal = vales
    .filter((v) => v.status === "approved")
    .reduce((sum, v) => sum + v.amount, 0);
  const restMinutes = restOwedMinutes(ledgerQuery.data ?? []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.header}>My Pay</Text>

      {profileQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.pineTeal} />
        </View>
      ) : profileQuery.isError || !profileQuery.data ? (
        <Text style={styles.errorText}>Hindi ma-load ang iyong sahod. Subukan ulit mamaya.</Text>
      ) : (
        <>
          <DigitalPayslip
            monthlyRate={profileQuery.data.monthlyRate}
            paydayInterval={profileQuery.data.paydayInterval}
            approvedValeTotal={approvedValeTotal}
          />

          {ledgerQuery.isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.pineTeal} />
            </View>
          ) : (
            <RestOwedCounter minutes={restMinutes} />
          )}

          {valesQuery.isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.pineTeal} />
            </View>
          ) : (
            <ValeRequestForm
              vales={vales}
              submitting={valeMutation.isPending}
              onSubmit={(amount, reason) => valeMutation.mutate({ amount, reason })}
            />
          )}
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
    padding: 16,
    gap: 16,
  },
  header: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.ink,
  },
  loading: {
    paddingVertical: 24,
    alignItems: "center",
  },
  errorText: {
    fontSize: 13,
    color: colors.terracottaGold,
  },
});

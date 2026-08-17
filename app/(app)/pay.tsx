import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { colors, fonts } from "@/lib/theme";
import { getHouseholdCutoff } from "@/services/api/cutoff";
import { getMyHelperProfile } from "@/services/api/helper-profile";
import { getMyLedgerEntries, restOwedMinutes } from "@/services/api/ledger";
import { getMyPayslips } from "@/services/api/payslips";
import {
  cancelRestOffRequest,
  getMyRestOffRequests,
  getRestOwedBalance,
  requestRestOff,
} from "@/services/api/rest-off";
import { getMyVales, requestVale } from "@/services/api/vales";
import { RestOffRequestForm } from "@/components/features/pay/rest-off-request-form";
import { DigitalPayslip } from "@/components/features/pay/digital-payslip";
import { PayslipHistory } from "@/components/features/pay/payslip-history";
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

  const payslipsQuery = useQuery({
    queryKey: ["payslips", helperId],
    queryFn: () => getMyPayslips(helperId as string),
    enabled: Boolean(helperId),
  });

  // Server-derived cutoff boundaries -- keyed on the interval because that is
  // what the RPC takes. See services/api/cutoff.ts for why this isn't computed
  // locally.
  const paydayInterval = profileQuery.data?.paydayInterval ?? null;
  const cutoffQuery = useQuery({
    queryKey: ["household-cutoff", paydayInterval],
    queryFn: () => getHouseholdCutoff(paydayInterval as "semi_monthly" | "monthly"),
    enabled: Boolean(paydayInterval),
  });

  // Rest-off redemption. Balance comes from the shared Postgres function, not
  // summed here, so it matches the manager's number and the approval guard's.
  const restOffQuery = useQuery({
    queryKey: ["rest-off-requests", helperId],
    queryFn: () => getMyRestOffRequests(helperId as string),
    enabled: Boolean(helperId),
  });

  const restBalanceQuery = useQuery({
    queryKey: ["rest-owed-balance", helperId],
    queryFn: () => getRestOwedBalance(helperId as string),
    enabled: Boolean(helperId),
  });

  const restOffMutation = useMutation({
    mutationFn: ({
      restDate,
      startTime,
      endTime,
      note,
    }: {
      restDate: string;
      startTime: string;
      endTime: string;
      note?: string;
    }) => requestRestOff(helperId as string, restDate, startTime, endTime, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rest-off-requests", helperId] });
      queryClient.invalidateQueries({ queryKey: ["rest-owed-balance", helperId] });
    },
  });

  // Withdrawing a pending request. Invalidates the balance as well as the list
  // even though cancelling a PENDING request cannot change it -- pending
  // minutes were never debited. Cheap, and it keeps the refresh rule the same
  // for every rest-off mutation rather than making the reader remember which
  // ones move the number.
  const restOffCancelMutation = useMutation({
    mutationFn: (requestId: string) => cancelRestOffRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rest-off-requests", helperId] });
      queryClient.invalidateQueries({ queryKey: ["rest-owed-balance", helperId] });
    },
  });

  const valeMutation = useMutation({
    mutationFn: ({ amount, reason }: { amount: number; reason: string }) =>
      requestVale(helperId as string, amount, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vales", helperId] }),
  });

  const vales = valesQuery.data ?? [];
  const approvedValeTotal = vales
    .filter((v) => v.status === "approved" && !v.settledInPayslipId)
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
            cutoffStart={cutoffQuery.data?.cutoffStart}
            cutoffEnd={cutoffQuery.data?.cutoffEnd}
          />

          {!payslipsQuery.isLoading && <PayslipHistory payslips={payslipsQuery.data ?? []} />}

          {ledgerQuery.isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.pineTeal} />
            </View>
          ) : (
            // The REDEEMABLE balance (accrued minus already-approved rest off),
            // not the raw accrual -- same number the manager's dashboard shows
            // and the same one the approval guard enforces. Falls back to the
            // local accrual only while the balance query is still resolving.
            <RestOwedCounter minutes={restBalanceQuery.data ?? restMinutes} />
          )}

          {!restBalanceQuery.isLoading && (
            <RestOffRequestForm
              balanceMinutes={restBalanceQuery.data ?? 0}
              requests={restOffQuery.data ?? []}
              submitting={restOffMutation.isPending}
              onSubmit={(restDate, startTime, endTime, note) =>
                restOffMutation.mutate({ restDate, startTime, endTime, note })
              }
              onCancel={(requestId) => restOffCancelMutation.mutate(requestId)}
              cancellingId={
                restOffCancelMutation.isPending ? (restOffCancelMutation.variables ?? null) : null
              }
              // The household's civil date from Postgres, never the device's --
              // a phone with a wrong date must not decide what "past" means.
              householdToday={cutoffQuery.data?.today}
            />
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

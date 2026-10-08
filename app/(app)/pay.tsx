import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { colors, fonts } from "@/lib/theme";
import { getHouseholdCutoff } from "@/services/api/cutoff";
import { getMyHelperProfile } from "@/services/api/helper-profile";
import { getMyLedgerEntries, restOwedMinutes } from "@/services/api/ledger";
import { workedShareOfPeriod } from "@/lib/net-pay";
import { getMyPayPeriods } from "@/services/api/pay-periods";
import { getMyPayslips } from "@/services/api/payslips";
import {
  cancelRestOffRequest,
  getMyRestOffRequests,
  getRestOwedBalance,
  requestRestOff,
} from "@/services/api/rest-off";
import { getMyVales, requestVale } from "@/services/api/vales";
import {
  ackLeave,
  cancelLeave,
  getMyLeave,
  getSilBalance,
  getUnpaidLeaveDue,
  requestLeave,
  type LeaveKind,
  type LeaveReason,
} from "@/services/api/leave";
import { LeaveRequestForm } from "@/components/features/pay/leave-request-form";
import { RestOffRequestForm } from "@/components/features/pay/rest-off-request-form";
import { DigitalPayslip } from "@/components/features/pay/digital-payslip";
import { PaymentConfirmations } from "@/components/features/pay/payment-confirmations";
import { PayoutAccountCard } from "@/components/features/pay/payout-account-card";
import { UnpaidPeriods } from "@/components/features/pay/unpaid-periods";
import { PayslipHistory } from "@/components/features/pay/payslip-history";
import { RestOwedCounter } from "@/components/features/pay/rest-owed-counter";
import { ValeRequestForm } from "@/components/features/pay/vale-request-form";
import { SignOutButton } from "@/components/features/account/sign-out-button";

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

  // The same pay periods the manager sees (helper_pay_periods): which cutoffs
  // closed unpaid, and how much of the current one she has worked.
  const periodsQuery = useQuery({
    queryKey: ["pay-periods", helperId],
    queryFn: () => getMyPayPeriods(helperId as string),
    enabled: Boolean(helperId),
  });
  const currentPeriod = periodsQuery.data?.find((p) => p.isCurrent);
  const workedShare = currentPeriod
    ? workedShareOfPeriod(
        currentPeriod.workedStart,
        currentPeriod.workedEnd,
        currentPeriod.fullStart,
        currentPeriod.fullEnd,
      )
    : 1;

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

  // Leave: whole days off (../LINARA/LEAVE_PLAN.md). Balances come from the
  // same Postgres functions the approval checks use.
  const householdToday = cutoffQuery.data?.today;
  // What this cutoff's payout will take for unpaid leave, asked of the same
  // function the payout uses. Refetched with her leave.
  const currentCutoffEnd = currentPeriod?.workedEnd ?? cutoffQuery.data?.cutoffEnd;
  const unpaidLeaveQuery = useQuery({
    queryKey: ["leave", helperId, "unpaid-due", currentCutoffEnd],
    queryFn: () => getUnpaidLeaveDue(helperId as string, currentCutoffEnd as string),
    enabled: Boolean(helperId && currentCutoffEnd),
  });
  const leaveQuery = useQuery({
    queryKey: ["leave", helperId],
    queryFn: () => getMyLeave(helperId as string),
    enabled: Boolean(helperId),
  });
  const silQuery = useQuery({
    queryKey: ["sil-balance", helperId, householdToday],
    queryFn: () => getSilBalance(helperId as string, householdToday as string),
    enabled: Boolean(helperId && householdToday),
  });
  const refreshLeave = () => {
    queryClient.invalidateQueries({ queryKey: ["leave", helperId] });
    queryClient.invalidateQueries({ queryKey: ["sil-balance", helperId] });
    queryClient.invalidateQueries({ queryKey: ["rest-owed-balance", helperId] });
  };
  const leaveMutation = useMutation({
    mutationFn: (v: {
      kind: LeaveKind;
      reason: LeaveReason;
      startDate: string;
      endDate: string;
      note?: string;
    }) => requestLeave(helperId as string, v.kind, v.reason, v.startDate, v.endDate, v.note),
    onSuccess: refreshLeave,
  });
  const leaveCancelMutation = useMutation({
    mutationFn: (id: string) => cancelLeave(id),
    onSuccess: refreshLeave,
  });
  const leaveAckMutation = useMutation({
    mutationFn: (v: { id: string; ack: "confirmed" | "disputed" }) => ackLeave(v.id, v.ack),
    onSuccess: refreshLeave,
  });
  const leaveBusyId = leaveCancelMutation.isPending
    ? (leaveCancelMutation.variables ?? null)
    : leaveAckMutation.isPending
      ? (leaveAckMutation.variables?.id ?? null)
      : null;

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
      <Text style={styles.header}>Sahod ko</Text>

      {profileQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.pineTeal} />
        </View>
      ) : profileQuery.isError || !profileQuery.data ? (
        <Text style={styles.errorText}>Hindi ma-load ang iyong sahod. Subukan ulit mamaya.</Text>
      ) : (
        <>
          <PaymentConfirmations />
          <PayoutAccountCard defaultName={profileQuery.data.name} />
          <DigitalPayslip
            monthlyRate={currentPeriod?.monthlyRate ?? profileQuery.data.monthlyRate}
            paydayInterval={profileQuery.data.paydayInterval}
            approvedValeTotal={approvedValeTotal}
            cutoffStart={currentPeriod?.workedStart ?? cutoffQuery.data?.cutoffStart}
            cutoffEnd={cutoffQuery.data?.cutoffEnd}
            workedShare={workedShare}
            unpaidLeave={unpaidLeaveQuery.data}
          />
          <UnpaidPeriods periods={periodsQuery.data ?? []} />

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

          {!leaveQuery.isLoading && (
            <LeaveRequestForm
              sil={silQuery.data}
              restOwedMinutes={restBalanceQuery.data ?? 0}
              weeklyRestDay={profileQuery.data.weeklyRestDay}
              leave={leaveQuery.data ?? []}
              householdToday={householdToday}
              submitting={leaveMutation.isPending}
              error={
                (leaveMutation.error ?? leaveCancelMutation.error ?? leaveAckMutation.error)
                  ?.message ?? null
              }
              onSubmit={(kind, reason, startDate, endDate, note) =>
                leaveMutation.mutate({ kind, reason, startDate, endDate, note })
              }
              onCancel={(id) => leaveCancelMutation.mutate(id)}
              onAck={(id, ack) => leaveAckMutation.mutate({ id, ack })}
              busyId={leaveBusyId}
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

      <SignOutButton />
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

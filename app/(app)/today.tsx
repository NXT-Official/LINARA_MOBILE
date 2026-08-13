import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { colors } from "@/lib/theme";
import { useRosaAvailability } from "@/hooks/use-rosa-availability";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { DignityHeader } from "@/components/features/today/dignity-header";
import { ActiveFocusCard } from "@/components/features/today/active-focus-card";
import { FloatingQuickUtosFeed } from "@/components/features/utos/floating-quick-utos-feed";
import { getMyHelperProfile } from "@/services/api/helper-profile";
import { getFocusTask, startTicket, completeTicket } from "@/services/api/tickets";
import { acknowledgeQuickUto, getPendingQuickUtos } from "@/services/api/quick-utos";

/**
 * Today tab (roadmap Story 7). Hosts the Dignity Header (Story 5), the
 * Active Focus Card with its swipable SOP deck, and the floating Quick
 * Utos feed, all kept live via useRealtimeSubscription's postgres_changes
 * listeners invalidating the relevant query.
 */
export default function TodayScreen() {
  const queryClient = useQueryClient();
  const [ackingId, setAckingId] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["my-helper-profile"],
    queryFn: getMyHelperProfile,
  });
  const helperId = profileQuery.data?.id ?? null;

  const availability = useRosaAvailability(
    profileQuery.data
      ? {
          shiftStart: profileQuery.data.shiftStart,
          shiftEnd: profileQuery.data.shiftEnd,
          weeklyRestDay: profileQuery.data.weeklyRestDay,
        }
      : null,
  );

  const focusTaskQuery = useQuery({
    queryKey: ["focus-task", helperId],
    queryFn: () => getFocusTask(helperId as string),
    enabled: Boolean(helperId),
  });

  const quickUtosQuery = useQuery({
    queryKey: ["quick-utos", helperId],
    queryFn: () => getPendingQuickUtos(helperId as string),
    enabled: Boolean(helperId),
  });

  const startMutation = useMutation({
    mutationFn: startTicket,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["focus-task", helperId] }),
  });

  const completeMutation = useMutation({
    mutationFn: (ticketId: string) => completeTicket(ticketId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["focus-task", helperId] }),
  });

  const ackMutation = useMutation({
    mutationFn: ({ id, ack }: { id: string; ack: "seen" | "done" }) => acknowledgeQuickUto(id, ack),
    onMutate: ({ id }) => setAckingId(id),
    onSettled: () => {
      setAckingId(null);
      queryClient.invalidateQueries({ queryKey: ["quick-utos", helperId] });
    },
  });

  const focusTask = focusTaskQuery.data;

  useRealtimeSubscription(helperId, {
    onTicketChange: () => queryClient.invalidateQueries({ queryKey: ["focus-task", helperId] }),
    onQuickUtoChange: () => queryClient.invalidateQueries({ queryKey: ["quick-utos", helperId] }),
  });

  return (
    <View style={styles.flex}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {profileQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.pineTeal} />
          </View>
        ) : profileQuery.isError || !profileQuery.data ? (
          <Text style={styles.errorText}>
            Couldn&apos;t load your shift details. Pull to refresh in a moment, po.
          </Text>
        ) : (
          <>
            <DignityHeader
              profile={profileQuery.data}
              availability={availability.status}
              onAvailable={availability.setAvailable}
              onOff={availability.setOff}
            />

            {focusTaskQuery.isLoading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.pineTeal} />
              </View>
            ) : focusTaskQuery.isError ? (
              <Text style={styles.errorText}>
                Hindi ma-load ang task mo ngayon. Subukan ulit mamaya.
              </Text>
            ) : focusTask ? (
              <ActiveFocusCard
                task={focusTask}
                onStart={() => startMutation.mutate(focusTask.id)}
                onComplete={() => completeMutation.mutate(focusTask.id)}
                isStarting={startMutation.isPending}
                isCompleting={completeMutation.isPending}
              />
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Walang task ngayon. Magandang break, po!</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <FloatingQuickUtosFeed
        utosList={quickUtosQuery.data ?? []}
        onAck={(id, ack) => ackMutation.mutate({ id, ack })}
        ackingId={ackingId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.sand,
  },
  screen: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  loading: {
    paddingVertical: 40,
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    color: colors.ink,
    textAlign: "center",
    paddingVertical: 24,
  },
  emptyCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
  },
});

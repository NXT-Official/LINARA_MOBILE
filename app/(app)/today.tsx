import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { colors } from "@/lib/theme";
import { OFF_AVAILABILITY, type ManualAvailability } from "@/lib/availability";
import { useRosaAvailability } from "@/hooks/use-rosa-availability";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { DignityHeader } from "@/components/features/today/dignity-header";
import { ActiveFocusCard } from "@/components/features/today/active-focus-card";
import { DayCloseCard, type CloseReason } from "@/components/features/today/day-close-card";
import { MovedTasksBanner } from "@/components/features/today/moved-tasks-banner";
import { TodayTaskList } from "@/components/features/today/today-task-list";
import { FocusDeck } from "@/components/features/today/focus-deck";
import { getBoardClosed } from "@/services/api/household";
import { dayPhase, deckFor, focusIndex } from "@/lib/today";
import { FloatingQuickUtosFeed } from "@/components/features/utos/floating-quick-utos-feed";
import { PrivateScratchpad } from "@/components/features/notes/PrivateScratchpad";
import { getMyHelperProfile } from "@/services/api/helper-profile";
import { getMyRestOffRequests } from "@/services/api/rest-off";
import { getMyLeave } from "@/services/api/leave";
import { leaveCovers } from "@/lib/leave";
import { toIsoDate } from "@/lib/datetime-fields";
import { setHelperAvailability, setHelperOff } from "@/services/api/availability";
import {
  blockTicket,
  completeTicket,
  getFocusTasks,
  getTodayProgress,
  startTicket,
  type FocusTask,
} from "@/services/api/tickets";
import { acknowledgeQuickUto, getPendingQuickUtos } from "@/services/api/quick-utos";
import { enqueueSyncAction } from "@/services/sqlite-queue";
import { uploadEvidenceImage } from "@/services/media-upload";
import { isOffline } from "@/lib/network";

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

  const manual: ManualAvailability =
    profileQuery.data?.manualStatus === "available" && profileQuery.data.manualAvailableUntil
      ? { manual: "available", availableUntil: profileQuery.data.manualAvailableUntil }
      : OFF_AVAILABILITY;

  // Same key as My Pay and My Week, so one fetch serves all three.
  const restOffQuery = useQuery({
    queryKey: ["rest-off-requests", helperId],
    queryFn: () => getMyRestOffRequests(helperId as string),
    enabled: Boolean(helperId),
  });
  const leaveQuery = useQuery({
    queryKey: ["leave", helperId],
    queryFn: () => getMyLeave(helperId as string),
    enabled: Boolean(helperId),
  });
  // Approved leave today counts as off all day, like an approved day off.
  const todayIso = toIsoDate(new Date());
  const approvedTimeOff = [
    ...(restOffQuery.data ?? []).filter((r) => r.status === "approved"),
    ...(leaveQuery.data ?? [])
      .filter((l) => l.status === "approved" && leaveCovers(l, todayIso))
      .map(() => ({ restDate: todayIso, startTime: "00:00", endTime: "24:00" })),
  ];

  const availability = useRosaAvailability(
    profileQuery.data
      ? {
          shiftStart: profileQuery.data.shiftStart,
          shiftEnd: profileQuery.data.shiftEnd,
          breakStart: profileQuery.data.breakStart,
          breakEnd: profileQuery.data.breakEnd,
          weeklyRestDay: profileQuery.data.weeklyRestDay,
        }
      : null,
    manual,
    approvedTimeOff,
  );

  const invalidateProfile = () =>
    queryClient.invalidateQueries({ queryKey: ["my-helper-profile"] });
  const setAvailableMutation = useMutation({
    mutationFn: (hours: number) => setHelperAvailability(helperId as string, hours),
    onSuccess: invalidateProfile,
  });
  const setOffMutation = useMutation({
    mutationFn: () => setHelperOff(helperId as string),
    onSuccess: invalidateProfile,
  });

  // Every open task today; the card shows one and she swipes between them.
  // The key keeps its old name so other screens' refreshes still reach it.
  const focusTaskQuery = useQuery({
    queryKey: ["focus-task", helperId],
    queryFn: () => getFocusTasks(helperId as string),
    enabled: Boolean(helperId),
  });
  // The task she swiped to; null follows pickFocus's choice.
  const [chosenId, setChosenId] = useState<string | null>(null);

  const progressQuery = useQuery({
    queryKey: ["today-progress", helperId],
    queryFn: () => getTodayProgress(helperId as string),
    enabled: Boolean(helperId),
  });

  // The manager closes the board from the web Pass; there's no realtime
  // channel on households, so check once a minute.
  const householdId = profileQuery.data?.householdId ?? null;
  const boardClosedQuery = useQuery({
    queryKey: ["board-closed", householdId],
    queryFn: () => getBoardClosed(householdId as string),
    enabled: Boolean(householdId),
    refetchInterval: 60_000,
  });

  const refreshToday = () => {
    queryClient.invalidateQueries({ queryKey: ["focus-task", helperId] });
    queryClient.invalidateQueries({ queryKey: ["today-progress", helperId] });
    queryClient.invalidateQueries({ queryKey: ["moved-tasks", helperId] });
    queryClient.invalidateQueries({ queryKey: ["today-tasks", helperId] });
    // A palengke run ticked off or unticked here changes the Pantry tab's receipt step.
    queryClient.invalidateQueries({ queryKey: ["palengke-ticket", helperId] });
  };

  const quickUtosQuery = useQuery({
    queryKey: ["quick-utos", helperId],
    queryFn: () => getPendingQuickUtos(helperId as string),
    enabled: Boolean(helperId),
  });

  const startMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      if (await isOffline()) {
        await enqueueSyncAction("start_ticket", { ticketId });
        return { queued: true };
      }
      await startTicket(ticketId);
      return { queued: false };
    },
    onMutate: async (ticketId) => {
      await queryClient.cancelQueries({ queryKey: ["focus-task", helperId] });
      const previous = queryClient.getQueryData<FocusTask[]>(["focus-task", helperId]);
      queryClient.setQueryData<FocusTask[]>(["focus-task", helperId], (old) =>
        old?.map((t) => (t.id === ticketId ? { ...t, status: "in_progress" } : t)),
      );
      return { previous };
    },
    onError: (_err, _ticketId, context) => {
      if (context) {
        queryClient.setQueryData(["focus-task", helperId], context.previous);
      }
    },
    onSuccess: (result) => {
      if (!result.queued) {
        refreshToday();
      }
    },
  });

  // Done, with an optional photo of the finished work. Offline, it queues
  // with the local photo (uploaded on reconnect, same as the palengke
  // receipt). Online, a failed upload leaves the task in progress rather than
  // marking it done without the photo she meant to attach.
  const [completeError, setCompleteError] = useState<string | null>(null);
  const completeMutation = useMutation({
    mutationFn: async ({ ticketId, photoUri }: { ticketId: string; photoUri: string | null }) => {
      const householdId = profileQuery.data?.householdId ?? "";
      if (await isOffline()) {
        await enqueueSyncAction("complete_ticket", { ticketId, householdId }, photoUri);
        return { queued: true };
      }
      let photoUrl: string | undefined;
      if (photoUri) {
        const uploaded = await uploadEvidenceImage(
          photoUri,
          `${householdId}/tickets/${ticketId}-${Date.now()}.jpg`,
        );
        photoUrl = uploaded.signedUrl;
      }
      await completeTicket(ticketId, photoUrl);
      return { queued: false };
    },
    onMutate: async ({ ticketId }) => {
      setCompleteError(null);
      await queryClient.cancelQueries({ queryKey: ["focus-task", helperId] });
      const previous = queryClient.getQueryData<FocusTask[]>(["focus-task", helperId]);
      queryClient.setQueryData<FocusTask[]>(["focus-task", helperId], (old) =>
        old?.filter((t) => t.id !== ticketId),
      );
      // On to whatever comes next, not a neighbour of the one just finished.
      setChosenId(null);
      return { previous };
    },
    onError: (_err, vars, context) => {
      if (context) {
        queryClient.setQueryData(["focus-task", helperId], context.previous);
      }
      setCompleteError(
        vars.photoUri
          ? "Hindi na-upload ang litrato. Subukan ulit, o alisin ang litrato at i-Done."
          : "Hindi na-save. Subukan ulit.",
      );
    },
    onSuccess: (result) => {
      if (!result.queued) {
        refreshToday();
      }
    },
  });

  // "Can't now": on hold with her reason. Shown as on hold straight away, and
  // the card moves on to her next task.
  const holdMutation = useMutation({
    mutationFn: async ({ ticketId, reason }: { ticketId: string; reason: string }) => {
      if (await isOffline()) {
        await enqueueSyncAction("block_ticket", { ticketId, reason });
        return { queued: true };
      }
      await blockTicket(ticketId, reason);
      return { queued: false };
    },
    onMutate: async ({ ticketId, reason }) => {
      await queryClient.cancelQueries({ queryKey: ["focus-task", helperId] });
      const previous = queryClient.getQueryData<FocusTask[]>(["focus-task", helperId]);
      queryClient.setQueryData<FocusTask[]>(["focus-task", helperId], (old) =>
        old?.map((t) => (t.id === ticketId ? { ...t, status: "blocked", blockReason: reason } : t)),
      );
      setChosenId(null);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context) {
        queryClient.setQueryData(["focus-task", helperId], context.previous);
      }
    },
    onSuccess: (result) => {
      if (!result.queued) {
        refreshToday();
      }
    },
  });

  const ackMutation = useMutation({
    mutationFn: ({ id, ack }: { id: string; ack: "seen" | "done" }) => acknowledgeQuickUto(id, ack),
    onMutate: ({ id }) => setAckingId(id),
    onSettled: () => {
      setAckingId(null);
      queryClient.invalidateQueries({ queryKey: ["quick-utos", helperId] });
    },
  });

  useRealtimeSubscription(
    helperId,
    {
      onTicketChange: refreshToday,
      onQuickUtoChange: () => queryClient.invalidateQueries({ queryKey: ["quick-utos", helperId] }),
    },
    profileQuery.data?.householdId,
  );

  // The close replaces the next task once her day is over -- unless she has
  // opted in as Available. A task she already started, or one the manager
  // deliberately sent off-hours, still shows under it.
  const phase = profileQuery.data ? dayPhase(new Date(), profileQuery.data) : "on_shift";
  const closeReason: CloseReason | null = boardClosedQuery.data
    ? "closed"
    : availability.status === "available"
      ? null
      : phase === "rest_day" || phase === "night" || phase === "after_shift"
        ? phase
        : null;
  const progress = progressQuery.data;
  const allDone = Boolean(progress && progress.total > 0 && progress.done === progress.total);
  const deck = deckFor(focusTaskQuery.data ?? [], Boolean(closeReason));
  const deckIndex = focusIndex(deck, chosenId);
  const focusTask = deckIndex >= 0 ? deck[deckIndex] : null;

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
              availability={availability}
              onAvailable={(hours) => {
                if (availability.quiet || !helperId) return;
                setAvailableMutation.mutate(hours);
              }}
              onOff={() => helperId && setOffMutation.mutate()}
            />

            <MovedTasksBanner helperId={profileQuery.data.id} />

            {focusTaskQuery.isLoading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.pineTeal} />
              </View>
            ) : focusTaskQuery.isError ? (
              <Text style={styles.errorText}>
                Hindi ma-load ang task mo ngayon. Subukan ulit mamaya.
              </Text>
            ) : (
              <>
                {closeReason ? (
                  <DayCloseCard reason={closeReason} progress={progress} />
                ) : !focusTask && allDone ? (
                  <DayCloseCard reason="all_done" progress={progress} />
                ) : null}

                {focusTask ? (
                  <>
                    {closeReason ? (
                      <Text style={styles.afterHoursNote}>
                        {focusTask.status === "in_progress"
                          ? "Tapusin mo lang itong sinimulan mo."
                          : "Ipinadala ito kahit off-shift ka. Kapag tinapos mo, naka-log ito bilang rest owed."}
                      </Text>
                    ) : null}
                    <FocusDeck
                      count={deck.length}
                      index={deckIndex}
                      onIndexChange={(next) => setChosenId(deck[next].id)}
                    >
                      <ActiveFocusCard
                        // Fresh per task: a photo or half-typed reason never carries
                        // over to the next one.
                        key={focusTask.id}
                        task={focusTask}
                        myUserId={profileQuery.data.userId}
                        onStart={() => startMutation.mutate(focusTask.id)}
                        onComplete={(photoUri) =>
                          completeMutation.mutate({ ticketId: focusTask.id, photoUri })
                        }
                        onCantNow={(reason) =>
                          holdMutation.mutate({ ticketId: focusTask.id, reason })
                        }
                        isStarting={startMutation.isPending}
                        isCompleting={completeMutation.isPending}
                        isHolding={holdMutation.isPending}
                      />
                    </FocusDeck>
                    {completeError ? <Text style={styles.errorText}>{completeError}</Text> : null}
                  </>
                ) : !closeReason && !allDone ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>Walang task ngayon. Magandang break, po!</Text>
                  </View>
                ) : null}
              </>
            )}

            <TodayTaskList
              helperId={profileQuery.data.id}
              householdId={profileQuery.data.householdId}
              myUserId={profileQuery.data.userId}
              onChanged={refreshToday}
            />

            <PrivateScratchpad
              helperId={profileQuery.data.id}
              householdId={profileQuery.data.householdId}
              userId={profileQuery.data.userId}
              station={profileQuery.data.station}
            />
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
  afterHoursNote: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.terracottaInk,
    paddingHorizontal: 4,
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

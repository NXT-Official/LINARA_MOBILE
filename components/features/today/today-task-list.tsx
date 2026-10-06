import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { colors, fonts } from "@/lib/theme";
import { formatClockTime, formatTimeSpan } from "@/lib/format";
import { isOffline } from "@/lib/network";
import { reopenedStatus } from "@/lib/today";
import {
  completeTicket,
  getTodayTasks,
  reopenTicket,
  type FocusTask,
  type TodayTask,
} from "@/services/api/tickets";
import { enqueueSyncAction } from "@/services/sqlite-queue";
import type { Workplaces } from "@/hooks/use-workplaces";
import { PlaceTag } from "@/components/features/workplace/place-tag";

import { TaskUpdates } from "./task-updates";

const STATUS: Record<TodayTask["status"], { label: string; color: string }> = {
  done: { label: "Tapos na", color: colors.pineTeal },
  in_progress: { label: "Ginagawa", color: colors.terracottaGold },
  blocked: { label: "Naka-hold", color: colors.terracottaInk },
  todo: { label: "Gagawin", color: colors.mutedInk },
  cancelled: { label: "Kinansela", color: colors.mutedInk },
};

/**
 * "Lahat ng task ngayon" (tester feedback: Today showed only one task). The
 * whole day as a shared checklist: she ticks a task off in whatever order she
 * does them, and unticks one she ticked by mistake (client feedback,
 * 2026-10-02). Tapping a task shows its note and its updates thread with the
 * household. The focus card above is still where Start, the photo and "Hindi
 * ko magagawa ngayon" live.
 *
 * "timeline" (her choice of Today layout) keeps it open and marks where now
 * falls in the day. With more than one house, each task says where it is,
 * and the house she picked narrows the list.
 */
export function TodayTaskList({
  helperId,
  householdId,
  myUserId,
  onChanged,
  places,
  variant = "list",
}: {
  helperId: string;
  householdId: string;
  myUserId: string;
  /** Refreshes the rest of Today (focus card, tally) after a tick. */
  onChanged: () => void;
  places: Workplaces;
  variant?: "list" | "timeline";
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  // The timeline's "now", moved along once a minute.
  const [nowAt, setNowAt] = useState(() => Date.now());
  useEffect(() => {
    if (variant !== "timeline") return;
    const timer = setInterval(() => setNowAt(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [variant]);
  // Same key family as the focus card, so a ticket change refreshes both.
  const tasksQuery = useQuery({
    queryKey: ["today-tasks", helperId],
    queryFn: () => getTodayTasks(helperId),
  });

  // Tick: done, from any open status. Untick: back to where it was. Offline,
  // either one queues and replays on reconnect, like the focus card's Done.
  const toggleMutation = useMutation({
    mutationFn: async (task: TodayTask) => {
      const offline = await isOffline();
      if (task.status === "done") {
        if (offline) {
          await enqueueSyncAction("reopen_ticket", { ticketId: task.id, started: task.started });
          return { queued: true };
        }
        await reopenTicket(task.id, task.started);
        return { queued: false };
      }
      if (offline) {
        // The task's own house: its photo folder, if one is added on replay.
        await enqueueSyncAction("complete_ticket", {
          ticketId: task.id,
          householdId: task.householdId ?? householdId,
        });
        return { queued: true };
      }
      await completeTicket(task.id);
      return { queued: false };
    },
    onMutate: async (task) => {
      setToggleError(null);
      await queryClient.cancelQueries({ queryKey: ["today-tasks", helperId] });
      const previous = queryClient.getQueryData<TodayTask[]>(["today-tasks", helperId]);
      queryClient.setQueryData<TodayTask[]>(["today-tasks", helperId], (old) =>
        old?.map((t) =>
          t.id !== task.id
            ? t
            : task.status === "done"
              ? { ...t, status: reopenedStatus(task.started) }
              : { ...t, status: "done", blockReason: null },
        ),
      );
      // A ticked task leaves the focus card straight away; an unticked one
      // comes back with the refetch.
      if (task.status !== "done") {
        queryClient.setQueryData<FocusTask[]>(["focus-task", helperId], (old) =>
          old?.filter((t) => t.id !== task.id),
        );
      }
      return { previous };
    },
    onError: (_err, _task, context) => {
      if (context) queryClient.setQueryData(["today-tasks", helperId], context.previous);
      setToggleError("Hindi na-save. Subukan ulit.");
      onChanged();
    },
    onSuccess: (result) => {
      if (!result.queued) onChanged();
    },
  });

  const tasks = (tasksQuery.data ?? []).filter(
    (t) => places.house === "all" || t.householdId === places.house,
  );
  if (tasks.length === 0) return null;
  const done = tasks.filter((t) => t.status === "done").length;
  const timeline = variant === "timeline";
  const shown = open || timeline;
  // Where "now" falls: before the first task still to come.
  const nowIndex = timeline
    ? (() => {
        const i = tasks.findIndex((t) => new Date(t.scheduledStart).getTime() > nowAt);
        return i === -1 ? tasks.length : i;
      })()
    : -1;

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.header}
      >
        <View style={styles.headerText}>
          <Text style={styles.title}>Lahat ng task ngayon</Text>
          <Text style={styles.sub}>
            {done} sa {tasks.length} tapos na
            {open && done < tasks.length ? " · i-tsek ang natapos mo" : ""}
          </Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={22} color={colors.mutedInk} />
      </Pressable>

      {shown
        ? tasks.map((task, index) => {
            const status = STATUS[task.status];
            const expanded = expandedId === task.id;
            const isDone = task.status === "done";
            return (
              <View key={task.id} style={styles.row}>
                {index === nowIndex ? <NowLine at={nowAt} /> : null}
                <View style={styles.rowHead}>
                  <Pressable
                    onPress={() => toggleMutation.mutate(task)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isDone }}
                    accessibilityLabel={task.title}
                    accessibilityHint={
                      isDone ? "Ibalik bilang hindi pa tapos" : "Markahang tapos na"
                    }
                    hitSlop={6}
                    style={styles.check}
                  >
                    <Ionicons
                      name={isDone ? "checkmark-circle" : "ellipse-outline"}
                      size={30}
                      color={isDone ? colors.pineTeal : colors.mutedInk}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => setExpandedId(expanded ? null : task.id)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    style={styles.rowTap}
                  >
                    <Text style={[styles.time, isDone && styles.taskDone]}>
                      {formatTimeSpan(task.scheduledStart, task.durationMinutes)}
                    </Text>
                    <View style={styles.rowMain}>
                      <Text
                        style={[styles.taskTitle, isDone && styles.taskDone]}
                        numberOfLines={expanded ? undefined : 2}
                      >
                        {task.title}
                      </Text>
                      <PlaceTag
                        places={places}
                        householdId={task.householdId}
                        from={task.from}
                        to={task.to}
                      />
                      <Text style={[styles.status, { color: status.color }]}>{status.label}</Text>
                    </View>
                    <Ionicons
                      name={expanded ? "chevron-up" : "chatbubble-ellipses-outline"}
                      size={18}
                      color={colors.mutedInk}
                    />
                  </Pressable>
                </View>
                {expanded ? (
                  <View style={styles.detail}>
                    {task.notes ? <Text style={styles.note}>{task.notes}</Text> : null}
                    {task.status === "blocked" && task.blockReason ? (
                      <Text style={styles.note}>Naka-hold: {task.blockReason}</Text>
                    ) : null}
                    <TaskUpdates ticketId={task.id} myUserId={myUserId} />
                  </View>
                ) : null}
              </View>
            );
          })
        : null}
      {shown && nowIndex === tasks.length ? <NowLine at={nowAt} /> : null}
      {shown && toggleError ? <Text style={styles.error}>{toggleError}</Text> : null}
    </View>
  );
}

/** "Ngayon": where the clock is, in the timeline layout. */
function NowLine({ at }: { at: number }) {
  return (
    <View style={styles.nowLine} accessibilityLabel="Ngayon">
      <Text style={styles.nowText}>Ngayon · {formatClockTime(new Date(at).toISOString())}</Text>
      <View style={styles.nowRule} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    gap: 12,
  },
  headerText: { flex: 1 },
  title: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  sub: { fontSize: 13, color: colors.mutedInk },
  row: { borderTopWidth: 1, borderTopColor: colors.border },
  rowHead: { flexDirection: "row", alignItems: "center", gap: 4 },
  check: { width: 44, minHeight: 52, alignItems: "flex-start", justifyContent: "center" },
  rowTap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingVertical: 10,
  },
  time: { width: 64, fontSize: 13, fontWeight: "700", color: colors.mutedInk },
  rowMain: { flex: 1, gap: 2 },
  taskTitle: { fontSize: 15, color: colors.ink },
  taskDone: { color: colors.mutedInk, textDecorationLine: "line-through" },
  status: { fontSize: 12, fontWeight: "700" },
  detail: { gap: 10, paddingBottom: 14 },
  note: { fontSize: 14, lineHeight: 20, color: colors.mutedInk },
  error: { fontSize: 13, color: colors.terracottaInk, paddingBottom: 12 },
  nowLine: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  nowText: { fontSize: 13, fontWeight: "700", color: colors.terracottaInk },
  nowRule: { flex: 1, height: 2, borderRadius: 1, backgroundColor: colors.terracottaGold },
});

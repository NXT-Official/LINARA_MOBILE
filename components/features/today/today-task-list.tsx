import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { colors, fonts } from "@/lib/theme";
import { formatClockTime } from "@/lib/format";
import { getTodayTasks, type TodayTask } from "@/services/api/tickets";

import { TaskUpdates } from "./task-updates";

const STATUS: Record<TodayTask["status"], { label: string; color: string }> = {
  done: { label: "Tapos na", color: colors.pineTeal },
  in_progress: { label: "Ginagawa", color: colors.terracottaGold },
  blocked: { label: "Naka-hold", color: colors.terracottaInk },
  todo: { label: "Gagawin", color: colors.mutedInk },
};

/**
 * "Lahat ng task ngayon" (tester feedback: Today showed only one task). The
 * focus card above stays the one to work on; this is the whole day at a
 * glance. Tapping a task shows its note and its updates thread with the
 * household.
 */
export function TodayTaskList({ helperId, myUserId }: { helperId: string; myUserId: string }) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Same key family as the focus card, so a ticket change refreshes both.
  const tasksQuery = useQuery({
    queryKey: ["today-tasks", helperId],
    queryFn: () => getTodayTasks(helperId),
  });

  const tasks = tasksQuery.data ?? [];
  if (tasks.length === 0) return null;
  const done = tasks.filter((t) => t.status === "done").length;

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
          </Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={22} color={colors.mutedInk} />
      </Pressable>

      {open
        ? tasks.map((task) => {
            const status = STATUS[task.status];
            const expanded = expandedId === task.id;
            return (
              <View key={task.id} style={styles.row}>
                <Pressable
                  onPress={() => setExpandedId(expanded ? null : task.id)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  style={styles.rowHead}
                >
                  <Text style={styles.time}>{formatClockTime(task.scheduledStart)}</Text>
                  <View style={styles.rowMain}>
                    <Text
                      style={[styles.taskTitle, task.status === "done" && styles.taskDone]}
                      numberOfLines={expanded ? undefined : 2}
                    >
                      {task.title}
                    </Text>
                    <Text style={[styles.status, { color: status.color }]}>{status.label}</Text>
                  </View>
                  <Ionicons
                    name={expanded ? "chevron-up" : "chatbubble-ellipses-outline"}
                    size={18}
                    color={colors.mutedInk}
                  />
                </Pressable>
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
  rowHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingVertical: 10,
  },
  time: { width: 72, fontSize: 13, fontWeight: "700", color: colors.mutedInk },
  rowMain: { flex: 1, gap: 2 },
  taskTitle: { fontSize: 15, color: colors.ink },
  taskDone: { color: colors.mutedInk, textDecorationLine: "line-through" },
  status: { fontSize: 12, fontWeight: "700" },
  detail: { gap: 10, paddingBottom: 14 },
  note: { fontSize: 14, lineHeight: 20, color: colors.mutedInk },
});

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { colors, fonts } from "@/lib/theme";
import { formatClockTime, formatShiftTime } from "@/lib/format";
import { buildWeek } from "@/lib/week";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { getMyHelperProfile } from "@/services/api/helper-profile";
import { getMyWeek, type WeekTask } from "@/services/api/tickets";

/**
 * My Week (concept doc §7, "the dignity win"): her shift, break and rest day,
 * and what's scheduled for her over the next seven days, so she can see her
 * rest day coming and plan her own life around a predictable week. Only her
 * own tickets -- never the household's whole calendar.
 */
export default function WeekScreen() {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["my-helper-profile"],
    queryFn: getMyHelperProfile,
  });
  const profile = profileQuery.data;
  const helperId = profile?.id ?? null;

  const weekQuery = useQuery({
    queryKey: ["my-week", helperId],
    queryFn: () => getMyWeek(helperId as string),
    enabled: Boolean(helperId),
  });

  useRealtimeSubscription(helperId, {
    onTicketChange: () => queryClient.invalidateQueries({ queryKey: ["my-week", helperId] }),
  });

  const shiftLine = profile
    ? `${formatShiftTime(profile.shiftStart)} – ${formatShiftTime(profile.shiftEnd)}` +
      (profile.breakStart && profile.breakEnd
        ? ` · break ${formatShiftTime(profile.breakStart)}–${formatShiftTime(profile.breakEnd)}`
        : "")
    : "";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Linggo ko</Text>
      <Text style={styles.sub}>
        Ang shift mo, ang rest day mo, at ang mga naka-schedule para sa iyo sa susunod na pitong
        araw.
      </Text>

      {profileQuery.isLoading || weekQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.pineTeal} />
        </View>
      ) : !profile || weekQuery.isError ? (
        <Text style={styles.errorText}>Hindi ma-load ang linggo mo. Subukan ulit mamaya.</Text>
      ) : (
        buildWeek(new Date(), profile.weeklyRestDay, weekQuery.data ?? []).map((day) => (
          <View
            key={day.date.toISOString()}
            style={[styles.day, day.isRestDay && styles.restDay]}
            accessibilityLabel={`${day.label}${day.isRestDay ? ", rest day" : ""}`}
          >
            <View style={styles.dayHead}>
              <Text style={styles.dayLabel}>{day.label}</Text>
              {day.isToday ? <Text style={styles.todayTag}>Ngayon</Text> : null}
            </View>
            <Text style={day.isRestDay ? styles.restLine : styles.shiftLine}>
              {day.isRestDay ? "Rest day mo. Pahinga." : shiftLine}
            </Text>
            {day.tickets.length === 0 ? (
              day.isRestDay ? null : (
                <Text style={styles.none}>Wala pang naka-schedule.</Text>
              )
            ) : (
              day.tickets.map((task) => (
                <WeekRow key={task.id} task={task} myUserId={profile.userId} />
              ))
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

function WeekRow({ task, myUserId }: { task: WeekTask; myUserId: string }) {
  const done = task.status === "done";
  const from =
    task.createdById === myUserId
      ? "Ikaw"
      : task.createdByName
        ? `Mula kay ${task.createdByName}`
        : null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowTime}>{formatClockTime(task.scheduledStart)}</Text>
      <View style={styles.rowBody}>
        <View style={styles.titleLine}>
          {done ? (
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={colors.pineTeal}
              accessibilityLabel="Tapos na"
            />
          ) : null}
          <Text style={[styles.rowTitle, done && styles.rowDone]}>{task.title}</Text>
        </View>
        {task.appointmentTitle ? (
          <Text style={styles.rowMeta}>Para sa {task.appointmentTitle}</Text>
        ) : null}
        {from ? <Text style={styles.rowMeta}>{from}</Text> : null}
        <View style={styles.tags}>
          {task.moved ? <Text style={styles.tagMoved}>Inilipat</Text> : null}
          {task.waiting ? <Text style={styles.tagWaiting}>Pag-bukas ng board</Text> : null}
          {task.status === "blocked" ? <Text style={styles.tagWaiting}>Naka-hold</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.sand,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  header: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.ink,
  },
  sub: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedInk,
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
  day: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  restDay: {
    backgroundColor: colors.terracottaWash,
    borderColor: colors.terracottaWash,
  },
  dayHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayLabel: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.ink,
  },
  todayTag: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.pineTeal,
  },
  shiftLine: {
    fontSize: 13,
    color: colors.mutedInk,
  },
  restLine: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.terracottaInk,
  },
  none: {
    fontSize: 13,
    color: colors.mutedInk,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowTime: {
    width: 68,
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  titleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowTitle: {
    flexShrink: 1,
    fontSize: 15,
    color: colors.ink,
  },
  rowDone: {
    color: colors.mutedInk,
    textDecorationLine: "line-through",
  },
  rowMeta: {
    fontSize: 13,
    color: colors.mutedInk,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagMoved: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.terracottaInk,
  },
  tagWaiting: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.mutedInk,
  },
});

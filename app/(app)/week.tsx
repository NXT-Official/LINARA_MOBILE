import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { colors, fonts } from "@/lib/theme";
import { formatClockTime, formatShiftTime } from "@/lib/format";
import { startOfToday } from "@/lib/today";
import {
  MONTH_NAMES,
  addDays,
  buildDays,
  monthRange,
  rangeLabel,
  type WeekDay,
  type WeekTimeOff,
} from "@/lib/week";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { MonthGrid } from "@/components/features/week/month-grid";
import { getMyHelperProfile } from "@/services/api/helper-profile";
import { getMyLeave, type LeaveKind } from "@/services/api/leave";
import { getMyRestOffRequests } from "@/services/api/rest-off";
import { getMyTasksBetween, type WeekTask } from "@/services/api/tickets";

type Mode = "week" | "month";

const LEAVE_LABEL: Record<LeaveKind, string> = {
  sil: "SIL",
  in_kind: "day off in kind",
  unpaid: "walang bayad",
  extra_paid: "bayad na day off",
};

/**
 * My Week (concept doc section 7, "the dignity win"): her shift, break and
 * rest day, her days off, and what's scheduled for her, so she can see her
 * rest coming and plan her own life around a predictable week. Seven days
 * from today by default; she can page through weeks or look at a whole month.
 * Only her own tickets -- never the household's whole calendar.
 */
export default function WeekScreen() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("week");
  const [weekStart, setWeekStart] = useState(() => startOfToday(new Date()));
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const profileQuery = useQuery({
    queryKey: ["my-helper-profile"],
    queryFn: getMyHelperProfile,
  });
  const profile = profileQuery.data;
  const helperId = profile?.id ?? null;

  const range =
    mode === "week" ? { start: weekStart, count: 7 } : monthRange(month.year, month.month);
  const from = range.start;
  const to = addDays(range.start, range.count);

  const weekQuery = useQuery({
    queryKey: ["my-week", helperId, from.toISOString(), to.toISOString()],
    queryFn: () => getMyTasksBetween(helperId as string, from, to),
    enabled: Boolean(helperId),
  });
  // Same key as My Pay and Today, so one fetch serves all three.
  const restOffQuery = useQuery({
    queryKey: ["rest-off-requests", helperId],
    queryFn: () => getMyRestOffRequests(helperId as string),
    enabled: Boolean(helperId),
  });

  // Same key as My Pay, so one fetch serves both.
  const leaveQuery = useQuery({
    queryKey: ["leave", helperId],
    queryFn: () => getMyLeave(helperId as string),
    enabled: Boolean(helperId),
  });

  useRealtimeSubscription(
    helperId,
    { onTicketChange: () => queryClient.invalidateQueries({ queryKey: ["my-week", helperId] }) },
    profile?.householdId,
  );

  const shiftLine = profile
    ? `${formatShiftTime(profile.shiftStart)} – ${formatShiftTime(profile.shiftEnd)}` +
      (profile.breakStart && profile.breakEnd
        ? ` · break ${formatShiftTime(profile.breakStart)}–${formatShiftTime(profile.breakEnd)}`
        : "")
    : "";

  const today = startOfToday(new Date());
  const showingNow =
    mode === "week"
      ? weekStart.getTime() === today.getTime()
      : month.year === today.getFullYear() && month.month === today.getMonth();
  const step = (dir: -1 | 1) =>
    mode === "week"
      ? setWeekStart((d) => addDays(d, 7 * dir))
      : setMonth(({ year, month: m }) => {
          const d = new Date(year, m + dir, 1);
          return { year: d.getFullYear(), month: d.getMonth() };
        });
  const goToday = () => {
    setWeekStart(today);
    setMonth({ year: today.getFullYear(), month: today.getMonth() });
  };

  const timeOff: WeekTimeOff[] = restOffQuery.data ?? [];
  const days: WeekDay<WeekTask>[] = profile
    ? buildDays(
        range.start,
        range.count,
        new Date(),
        profile.weeklyRestDay,
        weekQuery.data ?? [],
        timeOff,
        leaveQuery.data ?? [],
      )
    : [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Linggo ko</Text>
      <Text style={styles.sub}>
        Ang shift mo, ang rest day at mga day off mo, at ang mga naka-schedule para sa iyo.
      </Text>

      <View style={styles.toggle} accessibilityRole="tablist">
        {(["week", "month"] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === m }}
            style={[styles.toggleItem, mode === m && styles.toggleActive]}
          >
            <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
              {m === "week" ? "Linggo" : "Buwan"}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.nav}>
        <Pressable
          onPress={() => step(-1)}
          accessibilityRole="button"
          accessibilityLabel={mode === "week" ? "Nakaraang linggo" : "Nakaraang buwan"}
          style={styles.navButton}
        >
          <Ionicons name="chevron-back" size={22} color={colors.pineTeal} />
        </Pressable>
        <View style={styles.navCenter}>
          <Text style={styles.navLabel}>
            {mode === "week"
              ? rangeLabel(weekStart, 7)
              : `${MONTH_NAMES[month.month]} ${month.year}`}
          </Text>
          {!showingNow ? (
            <Pressable onPress={goToday} accessibilityRole="button">
              <Text style={styles.navToday}>Bumalik sa ngayon</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => step(1)}
          accessibilityRole="button"
          accessibilityLabel={mode === "week" ? "Susunod na linggo" : "Susunod na buwan"}
          style={styles.navButton}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.pineTeal} />
        </Pressable>
      </View>

      {profileQuery.isLoading || weekQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.pineTeal} />
        </View>
      ) : !profile || weekQuery.isError ? (
        <Text style={styles.errorText}>Hindi ma-load ang linggo mo. Subukan ulit mamaya.</Text>
      ) : mode === "month" ? (
        <MonthGrid
          days={days}
          month={month.month}
          onOpenDay={(date) => {
            setWeekStart(date);
            setMode("week");
          }}
        />
      ) : (
        days.map((day) => (
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
            {day.leave.map((l) => (
              <Text key={l.id} style={l.status === "approved" ? styles.offLine : styles.offPending}>
                {l.status === "approved" ? "Naka-leave" : "Hiniling na leave"} ·{" "}
                {LEAVE_LABEL[l.kind]}
                {l.status === "pending" ? " · naghihintay pa" : ""}
              </Text>
            ))}
            {day.timeOff.map((o) => (
              <Text key={o.id} style={o.status === "approved" ? styles.offLine : styles.offPending}>
                {o.status === "approved" ? "Day off" : "Hiniling na day off"} ·{" "}
                {formatShiftTime(o.startTime)} – {formatShiftTime(o.endTime)}
                {o.status === "pending" ? " · naghihintay pa" : ""}
              </Text>
            ))}
            {day.tickets.length === 0 ? (
              day.isRestDay ? null : (
                <Text style={styles.none}>
                  {day.isPast ? "Walang naka-schedule." : "Wala pang naka-schedule."}
                </Text>
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
  offLine: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.terracottaInk,
  },
  offPending: {
    fontSize: 13,
    color: colors.mutedInk,
  },
  toggle: {
    flexDirection: "row",
    alignSelf: "flex-start",
    padding: 4,
    borderRadius: 14,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleItem: {
    minHeight: 40,
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: colors.pineTeal,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.mutedInk,
  },
  toggleTextActive: {
    color: colors.cardCream,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  navCenter: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  navLabel: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.ink,
  },
  navToday: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.pineTeal,
    paddingVertical: 4,
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

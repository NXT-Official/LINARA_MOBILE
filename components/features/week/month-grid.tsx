import { Pressable, StyleSheet, View } from "react-native";

import { colors } from "@/lib/theme";
import { type WeekDay, type WeekTicket } from "@/lib/week";
import { trList } from "@/lib/i18n/instance";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";

const DOTS = 3;

/**
 * Her month at a glance, Sunday first like the rest-day numbering. Each day
 * shows a dot per task (up to three), her rest day washed in terracotta, and
 * an outlined day when she has a day off. Tapping a day opens its week.
 */
export function MonthGrid<T extends WeekTicket>({
  days,
  month,
  onOpenDay,
}: {
  days: WeekDay<T>[];
  /** 0-11; days from the months either side are dimmed. */
  month: number;
  onOpenDay: (date: Date) => void;
}) {
  const t = useT();
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {trList("dates.daysShort").map((name) => (
          <Text key={name} style={styles.weekday} accessibilityElementsHidden>
            {name}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {days.map((day) => {
          const inMonth = day.date.getMonth() === month;
          const open = day.tickets.filter(
            (t) => t.status !== "done" && t.status !== "cancelled",
          ).length;
          const approvedOff =
            day.timeOff.some((o) => o.status === "approved") ||
            day.leave.some((l) => l.status === "approved");
          const summary = [
            day.label,
            day.isRestDay ? t("week.restDay2") : null,
            approvedOff ? t("week.mayDayOff") : null,
            day.tickets.length === 0
              ? t("week.walangNakaSchedule2")
              : `${day.tickets.length} task${open < day.tickets.length ? t("week.paAngGagawin", { open }) : ""}`,
          ]
            .filter(Boolean)
            .join(", ");
          return (
            <Pressable
              key={day.date.toISOString()}
              onPress={() => onOpenDay(day.date)}
              accessibilityRole="button"
              accessibilityLabel={summary}
              style={({ pressed }) => [
                styles.cell,
                day.isRestDay && styles.restDay,
                approvedOff && styles.timeOff,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.dateWrap, day.isToday && styles.today]}>
                <Text
                  style={[
                    styles.date,
                    !inMonth && styles.outside,
                    day.isPast && styles.outside,
                    day.isToday && styles.todayText,
                  ]}
                >
                  {day.date.getDate()}
                </Text>
              </View>
              <View style={styles.dots}>
                {day.tickets.slice(0, DOTS).map((t) => (
                  <View
                    key={t.id}
                    style={[
                      styles.dot,
                      (t.status === "done" || t.status === "cancelled") && styles.dotDone,
                    ]}
                  />
                ))}
              </View>
              {day.tickets.length > DOTS ? (
                <Text style={styles.more}>+{day.tickets.length - DOTS}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 8,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: "row",
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    color: colors.mutedInk,
    paddingVertical: 6,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    minHeight: 56,
    alignItems: "center",
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  restDay: {
    backgroundColor: colors.terracottaWash,
  },
  timeOff: {
    borderColor: colors.terracottaInk,
  },
  pressed: {
    opacity: 0.6,
  },
  dateWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  today: {
    backgroundColor: colors.pineTeal,
  },
  date: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
  },
  todayText: {
    color: colors.cardCream,
  },
  outside: {
    color: colors.mutedInk,
  },
  dots: {
    flexDirection: "row",
    gap: 3,
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.pineTeal,
  },
  dotDone: {
    opacity: 0.35,
  },
  more: {
    fontSize: 13,
    color: colors.mutedInk,
  },
});

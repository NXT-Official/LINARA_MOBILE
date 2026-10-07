import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { colors, fonts } from "@/lib/theme";
import { formatClockTime } from "@/lib/format";
import { startOfToday, startOfTomorrow } from "@/lib/today";
import type { Workplaces } from "@/hooks/use-workplaces";
import { getTeamDay, type TeamDayTask } from "@/services/api/workplaces";

import { PlaceTag } from "./place-tag";

const STATUS: Record<TeamDayTask["status"], string> = {
  todo: "Gagawin",
  in_progress: "Ginagawa",
  blocked: "Naka-hold",
  done: "Tapos na",
};

/**
 * "Ang team ko ngayon": what her teammates are on today, in every team she's
 * on or covers, so they can work it out between them. Read-only, and only
 * who, what, when, where and how far (team_day() returns nothing else).
 * Closed until she opens it; nothing at all if she's on no team.
 */
export function TeamDay({ places, helperId }: { places: Workplaces; helperId: string }) {
  const [open, setOpen] = useState(false);
  const onTeam = places.workplaces.some((w) => w.teamId);
  const query = useQuery({
    queryKey: ["team-day", helperId],
    queryFn: () => getTeamDay(startOfToday(new Date()), startOfTomorrow(new Date())),
    enabled: open && onTeam,
    refetchInterval: open ? 60_000 : false,
  });
  if (!onTeam) return null;

  const tasks = (query.data ?? []).filter(
    (t) => places.house === "all" || t.householdId === places.house,
  );
  const byTeam = new Map<string, TeamDayTask[]>();
  for (const t of tasks) byTeam.set(t.teamName, [...(byTeam.get(t.teamName) ?? []), t]);

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.header}
      >
        <Ionicons name="people-outline" size={18} color={colors.pineTeal} />
        <Text style={styles.title}>Ang team ko ngayon</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedInk} />
      </Pressable>
      {open &&
        (query.isLoading ? (
          <ActivityIndicator color={colors.pineTeal} />
        ) : query.isError ? (
          <Text style={styles.muted}>Hindi ma-load ngayon. Subukan ulit mamaya.</Text>
        ) : tasks.length === 0 ? (
          <Text style={styles.muted}>Wala pang task ang team mo ngayon.</Text>
        ) : (
          [...byTeam.entries()].map(([team, list]) => (
            <View key={team} style={styles.group}>
              <Text style={styles.team}>{team}</Text>
              {list.map((t) => (
                <View key={t.id} style={styles.row}>
                  <Text style={styles.time}>{formatClockTime(t.scheduledStart)}</Text>
                  <View style={styles.body}>
                    <Text
                      style={[styles.taskTitle, t.status === "done" && styles.done]}
                      numberOfLines={2}
                    >
                      {t.helperName}: {t.title}
                    </Text>
                    <PlaceTag places={places} householdId={t.householdId} from={t.from} to={t.to} />
                  </View>
                  <Text style={styles.status}>{STATUS[t.status]}</Text>
                </View>
              ))}
            </View>
          ))
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 16,
    gap: 12,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 32,
  },
  title: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.ink,
  },
  muted: {
    fontSize: 14,
    color: colors.mutedInk,
  },
  group: {
    gap: 8,
  },
  team: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.mutedInk,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  time: {
    width: 64,
    fontSize: 13,
    fontWeight: "600",
    color: colors.mutedInk,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  taskTitle: {
    fontSize: 14,
    color: colors.ink,
  },
  done: {
    color: colors.mutedInk,
    textDecorationLine: "line-through",
  },
  status: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.mutedInk,
  },
});

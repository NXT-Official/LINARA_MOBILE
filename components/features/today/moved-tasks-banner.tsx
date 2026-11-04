import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { colors } from "@/lib/theme";
import { formatClockTime } from "@/lib/format";
import { dayNames } from "@/lib/week";
import { getMovedTasks, type MovedTask } from "@/services/api/tickets";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";

const SEEN_KEY = "linara.seenMovedTasks";

const dayAndTime = (iso: string) =>
  `${dayNames()[new Date(iso).getDay()]}, ${formatClockTime(iso)}`;

/** A move is "seen" per ticket and time, so a second move of the same task shows again. */
const moveKey = (t: MovedTask) => `${t.id}@${t.scheduledStart}`;

async function readSeen(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * "May binago sa schedule mo": the heads-up the concept doc asks for when a
 * manager moves an appointment and her prep tasks move with it ("your
 * pack-bags moved to 8pm") -- her evening just changed and she deserves to
 * know, not find a silently shifted board. Dismissing is remembered on this
 * phone only; there's no column for it and none is needed.
 */
export function MovedTasksBanner({ helperId }: { helperId: string }) {
  const t = useT();
  const movedQuery = useQuery({
    queryKey: ["moved-tasks", helperId],
    queryFn: () => getMovedTasks(helperId),
  });
  const [seen, setSeen] = useState<string[] | null>(null);

  useEffect(() => {
    void readSeen().then(setSeen);
  }, []);

  if (!seen || !movedQuery.data) return null;
  const unseen = movedQuery.data.filter((t) => !seen.includes(moveKey(t)));
  if (unseen.length === 0) return null;

  const markSeen = async () => {
    // Keep only keys for moves that still exist, so the list can't grow forever.
    const current = new Set(movedQuery.data.map(moveKey));
    const next = [...seen.filter((k) => current.has(k)), ...unseen.map(moveKey)];
    setSeen(next);
    try {
      await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(next));
    } catch {
      // Not saved on this phone; it will show again next time, which is safe.
    }
  };

  return (
    <View style={styles.card} accessibilityRole="alert">
      <Text style={styles.title}>{t("today.mayBinagoSaScheduleMo")}</Text>
      {unseen.map((task) => (
        <Text key={moveKey(task)} style={styles.line}>
          <Text style={styles.task}>{task.title}</Text>:{" "}
          {t("today.movedNow", { when: dayAndTime(task.scheduledStart) })}
          {task.previousStart ? t("today.movedWas", { when: dayAndTime(task.previousStart) }) : ""}
          {task.appointmentTitle
            ? t("today.movedBecause", { appointment: task.appointmentTitle })
            : task.movedBy
              ? t("today.movedBy", { name: task.movedBy })
              : t("today.inilipatNgManager")}
        </Text>
      ))}
      <PrimaryButton
        label={t("today.nakitaKo")}
        variant="secondary"
        onPress={() => void markSeen()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: colors.terracottaWash,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  line: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  task: {
    fontWeight: "700",
  },
});

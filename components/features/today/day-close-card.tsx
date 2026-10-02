import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "@/lib/theme";
import type { TodayProgress } from "@/services/api/tickets";

export type CloseReason = "closed" | "rest_day" | "night" | "after_shift" | "all_done";

const REST_LINE: Record<CloseReason, string> = {
  closed: "Sarado na ang board para ngayong gabi. Ang mga bagong task ay para na bukas.",
  rest_day: "Rest day mo ngayon. Pahinga ka.",
  night: "Gabi na. Pahinga ka na.",
  after_shift: "Tapos na ang shift mo. Pahinga ka na.",
  all_done: "Lahat ng task mo ngayon, tapos na.",
};

/**
 * The close (concept doc §6): "Great work today -- 8 of 8 done", then rest.
 * Replaces the focus card once the board is closed, on her rest day, overnight,
 * or after her shift -- the app keeping her rest instead of offering the next
 * task. Only says what the counts support.
 */
export function DayCloseCard({
  reason,
  progress,
}: {
  reason: CloseReason;
  progress: TodayProgress | undefined;
}) {
  const total = progress?.total ?? 0;
  const done = progress?.done ?? 0;
  const onHold = progress?.onHold ?? 0;
  const left = total - done - onHold;

  const headline =
    total === 0
      ? "Walang task ngayon."
      : done === total
        ? `Great work today — ${done} of ${total}, tapos!`
        : `${done} of ${total} tapos ngayon.`;

  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.rest}>{REST_LINE[reason]}</Text>
      {reason !== "all_done" && left > 0 ? (
        <Text style={styles.note}>
          May {left} pang natitira. Nasa listahan mo pa rin sila para sa susunod mong shift.
        </Text>
      ) : null}
      {onHold > 0 ? (
        <Text style={styles.note}>{onHold} naka-hold. Nakikita ito ng manager sa Pass nila.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  headline: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.ink,
  },
  rest: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.ink,
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedInk,
  },
});

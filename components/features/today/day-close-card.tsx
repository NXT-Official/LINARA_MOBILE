import { StyleSheet, View } from "react-native";

import { colors, fonts } from "@/lib/theme";
import type { TodayProgress } from "@/services/api/tickets";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/instance";

export type CloseReason = "closed" | "rest_day" | "night" | "after_shift" | "all_done";

const REST_LINE: Record<CloseReason, MessageKey> = {
  closed: "close.closed",
  rest_day: "close.restDay",
  night: "close.night",
  after_shift: "close.afterShift",
  all_done: "close.allDone",
};

/**
 * The close (concept doc §6): "Ang galing mo ngayon -- 8 sa 8, tapos!", then rest.
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
  const t = useT();
  const total = progress?.total ?? 0;
  const done = progress?.done ?? 0;
  const onHold = progress?.onHold ?? 0;
  const left = total - done - onHold;

  const headline =
    total === 0
      ? t("today.walangTaskNgayon")
      : done === total
        ? t("today.angGalingMoNgayonSa", { done, total })
        : t("today.saAngTaposNgayon", { done, total });

  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.rest}>{t(REST_LINE[reason])}</Text>
      {reason !== "all_done" && left > 0 ? (
        <Text style={styles.note}>{t("today.leftForNextShift", { count: left })}</Text>
      ) : null}
      {onHold > 0 ? (
        <Text style={styles.note}>{t("today.onHoldCount", { count: onHold })}</Text>
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
